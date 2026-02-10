import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/api-auth";
import { NextRequest, NextResponse } from "next/server";
import { logActivity } from "@/lib/activity";
import { triggerWebhooks } from "@/lib/webhooks";
import { triggerAutomations } from "@/lib/automations";

// Disable caching for this route
export const dynamic = 'force-dynamic';
export const revalidate = 0;

// Helper to recursively build project tree
function buildProjectTree(projects: any[], parentId: string | null = null): any[] {
  return projects
    .filter(p => p.parentId === parentId)
    .map(project => ({
      ...project,
      children: buildProjectTree(projects, project.id),
    }));
}

export async function GET(request: NextRequest) {
  const me = await getCurrentUser(request);
  if (!me) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const url = new URL(request.url);
  const includeTasks = url.searchParams.get("includeTasks") === "true";
  const listId = url.searchParams.get("listId");
  const workspaceId = url.searchParams.get("workspaceId");

  // Build ownership/membership filter
  const ownershipFilter = workspaceId
    ? { workspaceId }   // Workspace-scoped: show all lists in workspace
    : { ownerId: me.id, workspaceId: null }; // Personal: only user's non-workspace lists

  // If requesting a specific list with tasks (for project detail page)
  if (listId && includeTasks) {
    const list = await prisma.list.findFirst({
      where: {
        id: listId,
        OR: [
          { ownerId: me.id },
          { workspace: { members: { some: { userId: me.id } } } },
        ],
      },
      include: {
        _count: { select: { tasks: true, children: true } },
        children: {
          include: { _count: { select: { tasks: true, children: true } } },
          orderBy: { createdAt: "asc" },
        },
        tasks: {
          include: {
            subtasks: { orderBy: { order: "asc" } },
            _count: { select: { subtasks: true } },
            assignee: { select: { id: true, name: true, email: true, image: true } },
          },
          orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
        },
      },
    });

    if (!list) {
      return NextResponse.json({ error: "List not found" }, { status: 404 });
    }

    const listWithStats = {
      ...list,
      tasks: list.tasks.map((task: typeof list.tasks[number]) => ({
        ...task,
        subtaskCount: task._count.subtasks,
        subtaskCompletedCount: task.subtasks.filter((s: { completed: boolean }) => s.completed).length,
      })),
      childCount: list._count.children,
      taskCount: list._count.tasks,
    };

    return NextResponse.json({ list: listWithStats });
  }

  // Default: lightweight list of all projects (no nested tasks)
  const lists = await prisma.list.findMany({
    where: workspaceId
      ? { workspaceId }
      : { ownerId: me.id, workspaceId: null },
    orderBy: { createdAt: "asc" },
    include: {
      _count: { select: { tasks: true, children: true } },
    },
  });

  const listsWithStats = lists.map((list: typeof lists[number]) => ({
    ...list,
    childCount: list._count.children,
    taskCount: list._count.tasks,
    tasks: [], // Empty array for backward compatibility
  }));

  // Build hierarchical tree (root projects have parentId = null)
  const projectTree = buildProjectTree(listsWithStats, null);

  return NextResponse.json({
    lists: listsWithStats,   // Flat list (for dropdowns, etc.)
    projects: projectTree,   // Hierarchical tree (for sidebar)
  });
}

export async function POST(request: NextRequest) {
  const me = await getCurrentUser(request);
  if (!me) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  try {
    const body = await request.json();
    const { name, description, color, parentId, type, workspaceId } = body;

    if (!name || typeof name !== "string") {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    // Validate type if provided
    const validTypes = ["PROJECT", "CHECKLIST"];
    if (type && !validTypes.includes(type)) {
      return NextResponse.json({ error: "Invalid type" }, { status: 400 });
    }

    // If workspace, verify membership
    if (workspaceId) {
      const membership = await prisma.workspaceMember.findUnique({
        where: { workspaceId_userId: { workspaceId, userId: me.id } },
      });
      if (!membership) {
        return NextResponse.json({ error: "Not a workspace member" }, { status: 403 });
      }
    }

    // If parentId provided, verify it belongs to user or workspace
    if (parentId) {
      const parentProject = await prisma.list.findFirst({
        where: {
          id: parentId,
          OR: [
            { ownerId: me.id },
            { workspace: { members: { some: { userId: me.id } } } },
          ],
        },
      });
      if (!parentProject) {
        return NextResponse.json({ error: "Parent project not found" }, { status: 404 });
      }
    }

    const list = await prisma.list.create({
      data: {
        name: name.trim(),
        description: description || null,
        color: color || null,
        type: type || "PROJECT",
        parentId: parentId || null,
        workspaceId: workspaceId || null,
        ownerId: me.id,
      },
      include: {
        _count: { select: { tasks: true, children: true } },
      },
    });

    // Fire-and-forget: log activity and trigger webhooks
    logActivity({
      action: "CREATE",
      entityType: "list",
      entityId: list.id,
      entityTitle: list.name,
    }).catch(() => {});
    triggerWebhooks("list.created", { list }).catch(() => {});
    triggerAutomations("list.created", list, list.ownerId).catch(() => {});

    return NextResponse.json({ list }, { status: 201 });
  } catch (error) {
    console.error("Failed to create project:", error);
    return NextResponse.json({ error: "Failed to create project" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const me = await getCurrentUser(request);
  if (!me) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  try {
    const body = await request.json();
    const { id } = body;

    if (!id) {
      return NextResponse.json({ error: "Project ID is required" }, { status: 400 });
    }

    // Verify the project belongs to the user or workspace
    const project = await prisma.list.findFirst({
      where: {
        id,
        OR: [
          { ownerId: me.id },
          { workspace: { members: { some: { userId: me.id, role: { in: ["OWNER", "ADMIN"] } } } } },
        ],
      },
    });

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    // Collect all descendant IDs with a recursive helper
    async function collectDescendantIds(parentId: string): Promise<string[]> {
      const children = await prisma.list.findMany({
        where: { parentId },
        select: { id: true },
      });
      const childIds = children.map((c: { id: string }) => c.id);
      const grandchildIds = await Promise.all(
        childIds.map((cid: string) => collectDescendantIds(cid))
      );
      return [...childIds, ...grandchildIds.flat()];
    }

    const descendantIds = await collectDescendantIds(id);
    const allIds = [id, ...descendantIds];

    // Batch delete: subtasks -> tasks -> lists (in correct order)
    await prisma.$transaction([
      prisma.subtask.deleteMany({ where: { task: { listId: { in: allIds } } } }),
      prisma.task.deleteMany({ where: { listId: { in: allIds } } }),
      // Delete from leaves up (children first, then parents)
      prisma.list.deleteMany({ where: { id: { in: descendantIds } } }),
      prisma.list.delete({ where: { id } }),
    ]);

    // Fire-and-forget
    logActivity({
      action: "DELETE",
      entityType: "list",
      entityId: id,
      entityTitle: project.name,
    }).catch(() => {});
    triggerWebhooks("list.deleted", { list: project }).catch(() => {});

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete project:", error);
    return NextResponse.json({ error: "Failed to delete project" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  const me = await getCurrentUser(request);
  if (!me) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  try {
    const body = await request.json();
    const { id, name, description, color, parentId, type } = body;

    if (!id) {
      return NextResponse.json({ error: "Project ID is required" }, { status: 400 });
    }

    // Validate type if provided
    const validTypes = ["PROJECT", "CHECKLIST"];
    if (type && !validTypes.includes(type)) {
      return NextResponse.json({ error: "Invalid type" }, { status: 400 });
    }

    // Verify the project belongs to the user or workspace
    const existingProject = await prisma.list.findFirst({
      where: {
        id,
        OR: [
          { ownerId: me.id },
          { workspace: { members: { some: { userId: me.id } } } },
        ],
      },
    });

    if (!existingProject) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    // If changing parent, verify new parent belongs to user and isn't a descendant
    if (parentId !== undefined && parentId !== existingProject.parentId) {
      if (parentId) {
        if (parentId === id) {
          return NextResponse.json({ error: "Project cannot be its own parent" }, { status: 400 });
        }
        const newParent = await prisma.list.findFirst({
          where: { id: parentId, ownerId: me.id },
        });
        if (!newParent) {
          return NextResponse.json({ error: "Parent project not found" }, { status: 404 });
        }
      }
    }

    const project = await prisma.list.update({
      where: { id },
      data: {
        ...(name !== undefined && { name: name.trim() }),
        ...(description !== undefined && { description }),
        ...(color !== undefined && { color }),
        ...(parentId !== undefined && { parentId }),
        ...(type !== undefined && { type }),
      },
      include: {
        _count: { select: { tasks: true, children: true } },
      },
    });

    // Build changes object
    const changes: Record<string, { old: any; new: any }> = {};
    if (name !== undefined && existingProject.name !== name.trim()) {
      changes.name = { old: existingProject.name, new: name.trim() };
    }
    if (type !== undefined && existingProject.type !== type) {
      changes.type = { old: existingProject.type, new: type };
    }

    // Fire-and-forget
    logActivity({
      action: "UPDATE",
      entityType: "list",
      entityId: project.id,
      entityTitle: project.name,
      changes: Object.keys(changes).length > 0 ? changes : undefined,
    }).catch(() => {});
    triggerWebhooks("list.updated", { list: project, changes }).catch(() => {});

    return NextResponse.json({ list: project });
  } catch (error) {
    console.error("Failed to update project:", error);
    return NextResponse.json({ error: "Failed to update project" }, { status: 500 });
  }
}
