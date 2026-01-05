import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/api-auth";
import { NextRequest, NextResponse } from "next/server";
import { Priority, Status } from "@prisma/client";
import { logActivity } from "@/lib/activity";
import { triggerWebhooks } from "@/lib/webhooks";

// Disable caching for this route
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: NextRequest) {
  const me = await getCurrentUser(request);
  if (!me) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  
  const tasks = await prisma.task.findMany({
    where: {
      ownerId: me.id,
    },
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
      _count: {
        select: { subtasks: true },
      },
    },
    orderBy: [
      { priority: "desc" },
      { dueAt: "asc" },
      { createdAt: "desc" },
    ],
  });
  
  // Add subtask completion stats
  const tasksWithStats = tasks.map((task: typeof tasks[number]) => ({
    ...task,
    subtaskCount: task._count.subtasks,
    subtaskCompletedCount: task.subtasks.filter((s: { completed: boolean }) => s.completed).length,
  }));
  
  return NextResponse.json({ tasks: tasksWithStats });
}

export async function POST(request: NextRequest) {
  const me = await getCurrentUser(request);
  if (!me) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  try {
    const body = await request.json();
    const { title, notes, priority, dueAt, listId, recurrenceRule, recurrenceInterval } = body;

    if (!title || !listId) {
      return NextResponse.json(
        { error: "Title and listId are required" },
        { status: 400 }
      );
    }

    // Verify list belongs to user
    const list = await prisma.list.findFirst({
      where: { id: listId, ownerId: me.id },
    });

    if (!list) {
      return NextResponse.json({ error: "List not found" }, { status: 404 });
    }

    // Calculate nextDueAt for recurring tasks
    let nextDueAt = null;
    if (recurrenceRule && dueAt) {
      nextDueAt = new Date(dueAt);
    }

    const task = await prisma.task.create({
      data: {
        title,
        notes: notes || null,
        priority: (priority as Priority) || "MEDIUM",
        dueAt: dueAt ? new Date(dueAt) : null,
        listId,
        ownerId: me.id,
        status: "TODO",
        recurrenceRule: recurrenceRule || null,
        recurrenceInterval: recurrenceInterval || 1,
        nextDueAt,
      },
      include: {
        list: {
          select: {
            name: true,
            color: true,
          },
        },
      },
    });

    // Log activity and trigger webhooks
    await logActivity({
      action: "CREATE",
      entityType: "task",
      entityId: task.id,
      entityTitle: task.title,
    });
    await triggerWebhooks("task.created", { task });

    return NextResponse.json({ task }, { status: 201 });
  } catch (error) {
    console.error("Error creating task:", error);
    return NextResponse.json(
      { error: "Failed to create task" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  const me = await getCurrentUser(request);
  if (!me) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  try {
    const body = await request.json();
    const { id, status, ...updates } = body;

    if (!id) {
      return NextResponse.json({ error: "Task id is required" }, { status: 400 });
    }

    // Verify task belongs to user
    const existingTask = await prisma.task.findFirst({
      where: { id, ownerId: me.id },
    });

    if (!existingTask) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    const updateData: any = {};
    if (status !== undefined) updateData.status = status as Status;
    if (updates.title !== undefined) updateData.title = updates.title;
    if (updates.notes !== undefined) updateData.notes = updates.notes;
    if (updates.priority !== undefined) updateData.priority = updates.priority as Priority;
    if (updates.dueAt !== undefined) updateData.dueAt = updates.dueAt ? new Date(updates.dueAt) : null;
    if (updates.listId !== undefined) updateData.listId = updates.listId;
    // Recurrence fields
    if (updates.recurrenceRule !== undefined) updateData.recurrenceRule = updates.recurrenceRule || null;
    if (updates.recurrenceInterval !== undefined) updateData.recurrenceInterval = updates.recurrenceInterval || 1;
    if (updates.nextDueAt !== undefined) updateData.nextDueAt = updates.nextDueAt ? new Date(updates.nextDueAt) : null;

    const task = await prisma.task.update({
      where: { id },
      data: updateData,
      include: {
        list: {
          select: {
            name: true,
            color: true,
          },
        },
      },
    });

    // Build changes object for activity log
    const changes: Record<string, { old: any; new: any }> = {};
    if (status !== undefined && existingTask.status !== status) {
      changes.status = { old: existingTask.status, new: status };
    }
    if (updates.title !== undefined && existingTask.title !== updates.title) {
      changes.title = { old: existingTask.title, new: updates.title };
    }
    if (updates.priority !== undefined && existingTask.priority !== updates.priority) {
      changes.priority = { old: existingTask.priority, new: updates.priority };
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

export async function DELETE(request: NextRequest) {
  const me = await getCurrentUser(request);
  if (!me) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  try {
    const body = await request.json();
    const { id } = body;

    if (!id) {
      return NextResponse.json({ error: "Task id is required" }, { status: 400 });
    }

    // Verify task belongs to user
    const existingTask = await prisma.task.findFirst({
      where: { id, ownerId: me.id },
    });

    if (!existingTask) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

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
