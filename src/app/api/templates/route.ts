import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/api-auth";

export const dynamic = "force-dynamic";
export const revalidate = 0;

// GET /api/templates - list templates
export async function GET(req: NextRequest) {
  const user = await getCurrentUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const templates = await prisma.projectTemplate.findMany({
    where: { ownerId: user.id },
    orderBy: { updatedAt: "desc" },
  });

  return NextResponse.json({ templates });
}

// POST /api/templates - create template from project OR create project from template
export async function POST(req: NextRequest) {
  const user = await getCurrentUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();

  // Create template from existing project
  if (body.fromProjectId) {
    const project = await prisma.list.findFirst({
      where: { id: body.fromProjectId, ownerId: user.id },
      include: {
        tasks: {
          include: { subtasks: true },
          orderBy: { order: "asc" },
        },
      },
    });

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    const templateData = {
      name: project.name,
      description: project.description,
      color: project.color,
      type: project.type,
      tasks: project.tasks.map((t) => ({
        title: t.title,
        notes: t.notes,
        priority: t.priority,
        order: t.order,
        subtasks: t.subtasks.map((s) => ({
          title: s.title,
          order: s.order,
        })),
      })),
    };

    const template = await prisma.projectTemplate.create({
      data: {
        name: body.name || `${project.name} Template`,
        description: body.description || project.description,
        color: project.color,
        ownerId: user.id,
        data: templateData,
      },
    });

    return NextResponse.json(template, { status: 201 });
  }

  // Create project from template
  if (body.fromTemplateId) {
    const template = await prisma.projectTemplate.findFirst({
      where: { id: body.fromTemplateId, ownerId: user.id },
    });

    if (!template) {
      return NextResponse.json({ error: "Template not found" }, { status: 404 });
    }

    const data = template.data as any;

    const project = await prisma.list.create({
      data: {
        name: body.name || data.name || template.name,
        description: data.description,
        color: data.color,
        type: data.type || "PROJECT",
        ownerId: user.id,
        workspaceId: body.workspaceId || null,
      },
    });

    // Create tasks
    if (data.tasks && Array.isArray(data.tasks)) {
      for (const taskData of data.tasks) {
        const task = await prisma.task.create({
          data: {
            title: taskData.title,
            notes: taskData.notes || null,
            priority: taskData.priority || "MEDIUM",
            order: taskData.order || 0,
            listId: project.id,
            ownerId: user.id,
            workspaceId: body.workspaceId || null,
          },
        });

        if (taskData.subtasks && Array.isArray(taskData.subtasks)) {
          await prisma.subtask.createMany({
            data: taskData.subtasks.map((s: any) => ({
              title: s.title,
              order: s.order || 0,
              taskId: task.id,
            })),
          });
        }
      }
    }

    return NextResponse.json(project, { status: 201 });
  }

  // Create a blank template
  const template = await prisma.projectTemplate.create({
    data: {
      name: body.name || "Untitled Template",
      description: body.description,
      color: body.color,
      ownerId: user.id,
      data: body.data || { tasks: [] },
    },
  });

  return NextResponse.json(template, { status: 201 });
}

// DELETE /api/templates - delete a template
export async function DELETE(req: NextRequest) {
  const user = await getCurrentUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await req.json();
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  await prisma.projectTemplate.deleteMany({
    where: { id, ownerId: user.id },
  });

  return NextResponse.json({ success: true });
}
