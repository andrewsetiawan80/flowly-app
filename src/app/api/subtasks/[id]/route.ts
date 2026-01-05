import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/api-auth";
import { NextRequest, NextResponse } from "next/server";
import { logActivity } from "@/lib/activity";
import { triggerWebhooks } from "@/lib/webhooks";

// Disable caching for this route
export const dynamic = 'force-dynamic';
export const revalidate = 0;

// GET a single subtask
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const me = await getCurrentUser(request);
  if (!me) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { id } = await params;

  const subtask = await prisma.subtask.findFirst({
    where: { id },
    include: { task: true },
  });

  if (!subtask || subtask.task.ownerId !== me.id) {
    return NextResponse.json({ error: "Subtask not found" }, { status: 404 });
  }

  return NextResponse.json({ subtask });
}

// UPDATE a subtask (toggle completed/status or rename)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const me = await getCurrentUser(request);
  if (!me) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { id } = await params;

  try {
    // Verify subtask belongs to user's task
    const subtask = await prisma.subtask.findFirst({
      where: { id },
      include: { task: true },
    });

    if (!subtask || subtask.task.ownerId !== me.id) {
      return NextResponse.json({ error: "Subtask not found" }, { status: 404 });
    }

    const body = await request.json();
    const { title, completed, status } = body;

    // Build update data
    const updateData: { title?: string; completed?: boolean } = {};

    if (title !== undefined) {
      updateData.title = title.trim();
    }

    // Support both `completed` (boolean) and `status` (string)
    if (completed !== undefined) {
      updateData.completed = completed;
    } else if (status !== undefined) {
      // Map status string to completed boolean
      updateData.completed = status === "DONE";
    }

    const updated = await prisma.subtask.update({
      where: { id },
      data: updateData,
    });

    // Build changes object
    const changes: Record<string, { old: any; new: any }> = {};
    if (updateData.title !== undefined && subtask.title !== updateData.title) {
      changes.title = { old: subtask.title, new: updateData.title };
    }
    if (updateData.completed !== undefined && subtask.completed !== updateData.completed) {
      changes.completed = { old: subtask.completed, new: updateData.completed };
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

    // Return with status field for compatibility
    return NextResponse.json({
      subtask: {
        ...updated,
        status: updated.completed ? "DONE" : "TODO",
      },
    });
  } catch (error) {
    console.error("Failed to update subtask:", error);
    return NextResponse.json({ error: "Failed to update subtask" }, { status: 500 });
  }
}

// DELETE a subtask
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const me = await getCurrentUser(request);
  if (!me) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { id } = await params;

  try {
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

