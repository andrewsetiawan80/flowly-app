import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/api-auth";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// GET /api/tasks/:taskId/tags - Get tags for a task
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const me = await getCurrentUser(request);
  if (!me) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { id: taskId } = await params;

  const task = await prisma.task.findFirst({
    where: { id: taskId, ownerId: me.id },
    include: {
      tags: {
        include: { tag: true },
      },
    },
  });

  if (!task) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
  }

  const tags = task.tags.map((tt: { tag: any }) => tt.tag);
  return NextResponse.json({ tags });
}

// POST /api/tasks/:taskId/tags - Add a tag to a task
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const me = await getCurrentUser(request);
  if (!me) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { id: taskId } = await params;

  try {
    const task = await prisma.task.findFirst({
      where: { id: taskId, ownerId: me.id },
    });

    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    const body = await request.json();
    const { tagId, tagName, tagColor } = body;

    let finalTagId = tagId;

    // If tagName is provided, find or create the tag
    if (!tagId && tagName) {
      let tag = await prisma.tag.findUnique({
        where: { ownerId_name: { ownerId: me.id, name: tagName.trim() } },
      });

      if (!tag) {
        tag = await prisma.tag.create({
          data: {
            name: tagName.trim(),
            color: tagColor || "#6366f1",
            ownerId: me.id,
          },
        });
      }
      finalTagId = tag.id;
    }

    if (!finalTagId) {
      return NextResponse.json({ error: "tagId or tagName required" }, { status: 400 });
    }

    // Verify tag belongs to user
    const tag = await prisma.tag.findFirst({
      where: { id: finalTagId, ownerId: me.id },
    });

    if (!tag) {
      return NextResponse.json({ error: "Tag not found" }, { status: 404 });
    }

    // Check if already attached
    const existing = await prisma.taskTag.findUnique({
      where: { taskId_tagId: { taskId, tagId: finalTagId } },
    });

    if (existing) {
      return NextResponse.json({ message: "Tag already attached" });
    }

    await prisma.taskTag.create({
      data: { taskId, tagId: finalTagId },
    });

    return NextResponse.json({ success: true, tag }, { status: 201 });
  } catch (error) {
    console.error("Error adding tag to task:", error);
    return NextResponse.json({ error: "Failed to add tag" }, { status: 500 });
  }
}

// DELETE /api/tasks/:taskId/tags - Remove a tag from a task
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const me = await getCurrentUser(request);
  if (!me) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { id: taskId } = await params;

  try {
    const task = await prisma.task.findFirst({
      where: { id: taskId, ownerId: me.id },
    });

    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    const body = await request.json();
    const { tagId } = body;

    if (!tagId) {
      return NextResponse.json({ error: "tagId is required" }, { status: 400 });
    }

    await prisma.taskTag.delete({
      where: { taskId_tagId: { taskId, tagId } },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error removing tag from task:", error);
    return NextResponse.json({ error: "Failed to remove tag" }, { status: 500 });
  }
}

