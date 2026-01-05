import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/api-auth";
import { NextRequest, NextResponse } from "next/server";
import { Priority, Status } from "@prisma/client";
import { logActivity } from "@/lib/activity";
import { triggerWebhooks } from "@/lib/webhooks";

// Disable caching for this route
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const me = await getCurrentUser(request);
  if (!me) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { id } = await params;

  const task = await prisma.task.findFirst({
    where: { id, ownerId: me.id },
    include: {
      list: {
        select: {
          id: true,
          name: true,
          color: true,
        },
      },
      subtasks: {
        orderBy: { order: "asc" },
      },
    },
  });

  if (!task) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
  }

  return NextResponse.json({ task });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const me = await getCurrentUser(request);
  if (!me) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { id } = await params;

  try {
    // Verify task belongs to user
    const existingTask = await prisma.task.findFirst({
      where: { id, ownerId: me.id },
    });

    if (!existingTask) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    const body = await request.json();
    const { status, title, notes, priority, dueAt, listId, recurrenceRule, recurrenceInterval, nextDueAt } = body;

    const updateData: any = {};
    if (status !== undefined) updateData.status = status as Status;
    if (title !== undefined) updateData.title = title;
    if (notes !== undefined) updateData.notes = notes;
    if (priority !== undefined) updateData.priority = priority as Priority;
    if (dueAt !== undefined) updateData.dueAt = dueAt ? new Date(dueAt) : null;
    if (listId !== undefined) updateData.listId = listId;
    // Recurrence fields
    if (recurrenceRule !== undefined) updateData.recurrenceRule = recurrenceRule || null;
    if (recurrenceInterval !== undefined) updateData.recurrenceInterval = recurrenceInterval || 1;
    if (nextDueAt !== undefined) updateData.nextDueAt = nextDueAt ? new Date(nextDueAt) : null;

    const task = await prisma.task.update({
      where: { id },
      data: updateData,
      include: {
        list: {
          select: {
            id: true,
            name: true,
            color: true,
          },
        },
        subtasks: {
          orderBy: { order: "asc" },
        },
      },
    });

    // Build changes object for activity log
    const changes: Record<string, { old: any; new: any }> = {};
    if (status !== undefined && existingTask.status !== status) {
      changes.status = { old: existingTask.status, new: status };
    }
    if (title !== undefined && existingTask.title !== title) {
      changes.title = { old: existingTask.title, new: title };
    }
    if (priority !== undefined && existingTask.priority !== priority) {
      changes.priority = { old: existingTask.priority, new: priority };
    }

    // Log activity
    await logActivity({
      action: "UPDATE",
      entityType: "task",
      entityId: task.id,
      entityTitle: task.title,
      changes: Object.keys(changes).length > 0 ? changes : undefined,
    });

    // Trigger webhooks
    await triggerWebhooks("task.updated", { task, changes });
    if (status === "DONE" && existingTask.status !== "DONE") {
      await triggerWebhooks("task.completed", { task });
    }

    return NextResponse.json({ task });
  } catch (error) {
    console.error("Error updating task:", error);
    return NextResponse.json(
      { error: "Failed to update task" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const me = await getCurrentUser(request);
  if (!me) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { id } = await params;

  try {
    // Verify task belongs to user
    const existingTask = await prisma.task.findFirst({
      where: { id, ownerId: me.id },
    });

    if (!existingTask) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    // Delete subtasks first
    await prisma.subtask.deleteMany({
      where: { taskId: id },
    });

    // Delete the task
    await prisma.task.delete({
      where: { id },
    });

    // Log activity and trigger webhooks
    await logActivity({
      action: "DELETE",
      entityType: "task",
      entityId: id,
      entityTitle: existingTask.title,
    });
    await triggerWebhooks("task.deleted", { task: existingTask });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting task:", error);
    return NextResponse.json(
      { error: "Failed to delete task" },
      { status: 500 }
    );
  }
}

