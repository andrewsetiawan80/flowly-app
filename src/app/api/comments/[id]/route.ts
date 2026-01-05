import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/api-auth";
import { NextRequest, NextResponse } from "next/server";
import { logActivity } from "@/lib/activity";
import { triggerWebhooks } from "@/lib/webhooks";

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// GET /api/comments/:id - Get a single comment
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const me = await getCurrentUser(request);
  if (!me) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { id } = await params;

  const comment = await prisma.comment.findFirst({
    where: { id },
    include: { task: true },
  });

  if (!comment || comment.task.ownerId !== me.id) {
    return NextResponse.json({ error: "Comment not found" }, { status: 404 });
  }

  return NextResponse.json({ comment });
}

// PATCH /api/comments/:id - Update a comment
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const me = await getCurrentUser(request);
  if (!me) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { id } = await params;

  try {
    const comment = await prisma.comment.findFirst({
      where: { id },
      include: { task: true },
    });

    if (!comment || comment.task.ownerId !== me.id) {
      return NextResponse.json({ error: "Comment not found" }, { status: 404 });
    }

    const body = await request.json();
    const { content } = body;

    if (!content || !content.trim()) {
      return NextResponse.json({ error: "Content is required" }, { status: 400 });
    }

    const oldContent = comment.content;
    const updated = await prisma.comment.update({
      where: { id },
      data: { content: content.trim() },
    });

    // Log activity
    await logActivity({
      action: "UPDATE",
      entityType: "comment",
      entityId: id,
      entityTitle: content.trim().substring(0, 50),
      changes: { content: { old: oldContent, new: content.trim() } },
    });

    // Trigger webhooks
    await triggerWebhooks("comment.updated", { comment: updated });

    return NextResponse.json({ comment: updated });
  } catch (error) {
    console.error("Error updating comment:", error);
    return NextResponse.json({ error: "Failed to update comment" }, { status: 500 });
  }
}

// DELETE /api/comments/:id - Delete a comment
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const me = await getCurrentUser(request);
  if (!me) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { id } = await params;

  try {
    const comment = await prisma.comment.findFirst({
      where: { id },
      include: { task: true },
    });

    if (!comment || comment.task.ownerId !== me.id) {
      return NextResponse.json({ error: "Comment not found" }, { status: 404 });
    }

    await prisma.comment.delete({ where: { id } });

    // Log activity
    await logActivity({
      action: "DELETE",
      entityType: "comment",
      entityId: id,
      entityTitle: comment.content.substring(0, 50),
    });

    // Trigger webhooks
    await triggerWebhooks("comment.deleted", { comment });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error("Error deleting comment:", error);
    return NextResponse.json({ error: "Failed to delete comment" }, { status: 500 });
  }
}

