import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/api-auth";
import { NextRequest, NextResponse } from "next/server";
import { logActivity } from "@/lib/activity";
import { triggerWebhooks } from "@/lib/webhooks";

// Disable caching for this route
export const dynamic = 'force-dynamic';
export const revalidate = 0;

// GET subtasks for a task
export async function GET(request: NextRequest) {
  const me = await getCurrentUser(request);
  if (!me) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const taskId = searchParams.get("taskId");

  if (!taskId) {
    return NextResponse.json({ error: "taskId is required" }, { status: 400 });
  }

  // Verify task belongs to user
  const task = await prisma.task.findFirst({
    where: { id: taskId, ownerId: me.id },
  });

  if (!task) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
  }

  const subtasks = await prisma.subtask.findMany({
    where: { taskId },
    orderBy: { order: "asc" },
  });

  return NextResponse.json({ subtasks });
}

// CREATE a subtask
export async function POST(request: NextRequest) {
  const me = await getCurrentUser(request);
  if (!me) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  try {
    const body = await request.json();
    const { taskId, title } = body;

    if (!taskId || !title) {
      return NextResponse.json({ error: "taskId and title are required" }, { status: 400 });
    }

    // Verify task belongs to user
    const task = await prisma.task.findFirst({
      where: { id: taskId, ownerId: me.id },
    });

    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    // Get the highest order number
    const lastSubtask = await prisma.subtask.findFirst({
      where: { taskId },
      orderBy: { order: "desc" },
    });

    const subtask = await prisma.subtask.create({
      data: {
        taskId,
        title: title.trim(),
        order: lastSubtask ? lastSubtask.order + 1 : 0,
      },
    });

    // Log activity and trigger webhooks
    await logActivity({
      action: "CREATE",
      entityType: "subtask",
      entityId: subtask.id,
      entityTitle: subtask.title,
    });
    await triggerWebhooks("subtask.created", { subtask, task });

    return NextResponse.json({ subtask }, { status: 201 });
  } catch (error) {
    console.error("Failed to create subtask:", error);
    return NextResponse.json({ error: "Failed to create subtask" }, { status: 500 });
  }
}

// UPDATE a subtask (toggle completed or rename)
export async function PATCH(request: NextRequest) {
  const me = await getCurrentUser(request);
  if (!me) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  try {
    const body = await request.json();
    const { id, title, completed } = body;

    if (!id) {
      return NextResponse.json({ error: "Subtask ID is required" }, { status: 400 });
    }

    // Verify subtask belongs to user's task
    const subtask = await prisma.subtask.findFirst({
      where: { id },
      include: { task: true },
    });

    if (!subtask || subtask.task.ownerId !== me.id) {
      return NextResponse.json({ error: "Subtask not found" }, { status: 404 });
    }

    const updated = await prisma.subtask.update({
      where: { id },
      data: {
        ...(title !== undefined && { title: title.trim() }),
        ...(completed !== undefined && { completed }),
      },
    });

    // Build changes object
    const changes: Record<string, { old: any; new: any }> = {};
    if (title !== undefined && subtask.title !== title.trim()) {
      changes.title = { old: subtask.title, new: title.trim() };
    }
    if (completed !== undefined && subtask.completed !== completed) {
      changes.completed = { old: subtask.completed, new: completed };
    }

    // Log activity and trigger webhooks
    await logActivity({
      action: "UPDATE",
      entityType: "subtask",
      entityId: updated.id,
      entityTitle: updated.title,
      changes: Object.keys(changes).length > 0 ? changes : undefined,
    });
    await triggerWebhooks("subtask.updated", { subtask: updated, changes });

    return NextResponse.json({ subtask: updated });
  } catch (error) {
    console.error("Failed to update subtask:", error);
    return NextResponse.json({ error: "Failed to update subtask" }, { status: 500 });
  }
}

// DELETE a subtask
export async function DELETE(request: NextRequest) {
  const me = await getCurrentUser(request);
  if (!me) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  try {
    const body = await request.json();
    const { id } = body;

    if (!id) {
      return NextResponse.json({ error: "Subtask ID is required" }, { status: 400 });
    }

    // Verify subtask belongs to user's task
    const subtask = await prisma.subtask.findFirst({
      where: { id },
      include: { task: true },
    });

    if (!subtask || subtask.task.ownerId !== me.id) {
      return NextResponse.json({ error: "Subtask not found" }, { status: 404 });
    }

    await prisma.subtask.delete({
      where: { id },
    });

    // Log activity and trigger webhooks
    await logActivity({
      action: "DELETE",
      entityType: "subtask",
      entityId: id,
      entityTitle: subtask.title,
    });
    await triggerWebhooks("subtask.deleted", { subtask });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete subtask:", error);
    return NextResponse.json({ error: "Failed to delete subtask" }, { status: 500 });
  }
}


