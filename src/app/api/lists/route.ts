import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/api-auth";
import { NextRequest, NextResponse } from "next/server";
import { logActivity } from "@/lib/activity";
import { triggerWebhooks } from "@/lib/webhooks";

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

  const lists = await prisma.list.findMany({
    where: { ownerId: me.id },
    orderBy: { createdAt: "asc" },
    include: {
      _count: { select: { tasks: true, children: true } },
      tasks: {
        include: {
          subtasks: {
            orderBy: { order: "asc" },
          },
          _count: {
            select: { subtasks: true },
          },
        },
      },
    },
  });

  // Add subtask stats to tasks
  const listsWithStats = lists.map((list: typeof lists[number]) => ({
    ...list,
    tasks: list.tasks.map((task: typeof list.tasks[number]) => ({
      ...task,
      subtaskCount: task._count.subtasks,
      subtaskCompletedCount: task.subtasks.filter((s: { completed: boolean }) => s.completed).length,
    })),
    childCount: list._count.children,
    taskCount: list._count.tasks,
  }));

  // Build hierarchical tree (root projects have parentId = null)
  const projectTree = buildProjectTree(listsWithStats, null);

  // Also return flat list for compatibility
  return NextResponse.json({ 
    lists: listsWithStats,  // Flat list (for dropdowns, etc.)
    projects: projectTree,  // Hierarchical tree (for sidebar)
  });
}

export async function POST(request: NextRequest) {
  const me = await getCurrentUser(request);
  if (!me) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  try {
    const body = await request.json();
    const { name, description, color, parentId, type } = body;

    if (!name || typeof name !== "string") {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    // Validate type if provided
    const validTypes = ["PROJECT", "CHECKLIST"];
    if (type && !validTypes.includes(type)) {
      return NextResponse.json({ error: "Invalid type" }, { status: 400 });
    }

    // If parentId provided, verify it belongs to user
    if (parentId) {
      const parentProject = await prisma.list.findFirst({
        where: { id: parentId, ownerId: me.id },
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
        ownerId: me.id,
      },
      include: {
        _count: { select: { tasks: true, children: true } },
      },
    });

    // Log activity and trigger webhooks
    await logActivity({
      action: "CREATE",
      entityType: "list",
      entityId: list.id,
      entityTitle: list.name,
    });
    await triggerWebhooks("list.created", { list });

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

    // Verify the project belongs to the user
    const project = await prisma.list.findFirst({
      where: { id, ownerId: me.id },
      include: { children: true },
    });

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    // Recursively delete all children, their tasks, and subtasks
    async function deleteProjectRecursively(projectId: string) {
      // Get all children
      const children = await prisma.list.findMany({
        where: { parentId: projectId },
      });

      // Recursively delete children first
      for (const child of children) {
        await deleteProjectRecursively(child.id);
      }

      // Delete all subtasks of tasks in this project
      await prisma.subtask.deleteMany({
        where: { task: { listId: projectId } },
      });

      // Delete all tasks in this project
      await prisma.task.deleteMany({
        where: { listId: projectId },
      });

      // Delete the project itself
      await prisma.list.delete({
        where: { id: projectId },
      });
    }

    await deleteProjectRecursively(id);

    // Log activity and trigger webhooks
    await logActivity({
      action: "DELETE",
      entityType: "list",
      entityId: id,
      entityTitle: project.name,
    });
    await triggerWebhooks("list.deleted", { list: project });

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

    // Verify the project belongs to the user
    const existingProject = await prisma.list.findFirst({
      where: { id, ownerId: me.id },
    });

    if (!existingProject) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    // If changing parent, verify new parent belongs to user and isn't a descendant
    if (parentId !== undefined && parentId !== existingProject.parentId) {
      if (parentId) {
        // Can't make a project its own parent or a descendant's parent
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

    // Log activity and trigger webhooks
    await logActivity({
      action: "UPDATE",
      entityType: "list",
      entityId: project.id,
      entityTitle: project.name,
      changes: Object.keys(changes).length > 0 ? changes : undefined,
    });
    await triggerWebhooks("list.updated", { list: project, changes });

    return NextResponse.json({ list: project });
  } catch (error) {
    console.error("Failed to update project:", error);
    return NextResponse.json({ error: "Failed to update project" }, { status: 500 });
  }
}
