import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/api-auth";
import { NextRequest, NextResponse } from "next/server";
import { logActivity } from "@/lib/activity";
import { triggerWebhooks } from "@/lib/webhooks";

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// GET /api/tasks/:taskId/comments - Get all comments for a task
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const me = await getCurrentUser(request);
  if (!me) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { id: taskId } = await params;

  // Verify task belongs to user
  const task = await prisma.task.findFirst({
    where: { id: taskId, ownerId: me.id },
  });

  if (!task) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
  }

  const comments = await prisma.comment.findMany({
    where: { taskId },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json({ comments });
}

// POST /api/tasks/:taskId/comments - Create a new comment
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const me = await getCurrentUser(request);
  if (!me) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { id: taskId } = await params;

  try {
    // Verify task belongs to user
    const task = await prisma.task.findFirst({
      where: { id: taskId, ownerId: me.id },
    });

    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    const body = await request.json();
    const { content } = body;

    if (!content || !content.trim()) {
      return NextResponse.json({ error: "Content is required" }, { status: 400 });
    }

    const comment = await prisma.comment.create({
      data: {
        content: content.trim(),
        taskId,
      },
    });

    // Log activity
    await logActivity({
      action: "CREATE",
      entityType: "comment",
      entityId: comment.id,
      entityTitle: content.trim().substring(0, 50),
    });

    // Trigger webhooks
    await triggerWebhooks("comment.created", { comment, task });

    return NextResponse.json({ comment }, { status: 201 });
  } catch (error) {
    console.error("Error creating comment:", error);
    return NextResponse.json({ error: "Failed to create comment" }, { status: 500 });
  }
}

