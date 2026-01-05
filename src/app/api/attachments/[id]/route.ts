import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/api-auth";
import { NextRequest, NextResponse } from "next/server";
import { logActivity } from "@/lib/activity";
import { unlink } from "fs/promises";

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// GET /api/attachments/:id - Get attachment info
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const me = await getCurrentUser(request);
  if (!me) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { id } = await params;

  const attachment = await prisma.attachment.findUnique({
    where: { id },
    include: { task: true },
  });

  if (!attachment) {
    return NextResponse.json({ error: "Attachment not found" }, { status: 404 });
  }

  // Verify ownership via task or list
  if (attachment.task && attachment.task.ownerId !== me.id) {
    return NextResponse.json({ error: "Attachment not found" }, { status: 404 });
  }

  return NextResponse.json({
    attachment: {
      ...attachment,
      url: `/api/attachments/${attachment.id}/download`,
    },
  });
}

// DELETE /api/attachments/:id - Delete an attachment
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const me = await getCurrentUser(request);
  if (!me) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { id } = await params;

  try {
    const attachment = await prisma.attachment.findUnique({
      where: { id },
      include: { task: true },
    });

    if (!attachment) {
      return NextResponse.json({ error: "Attachment not found" }, { status: 404 });
    }

    // Verify ownership via task
    if (attachment.task && attachment.task.ownerId !== me.id) {
      return NextResponse.json({ error: "Attachment not found" }, { status: 404 });
    }

    // Delete file from disk
    try {
      await unlink(attachment.path);
    } catch (err) {
      console.error("Failed to delete file from disk:", err);
    }

    // Delete database record
    await prisma.attachment.delete({ where: { id } });

    // Log activity
    await logActivity({
      action: "DELETE",
      entityType: "attachment",
      entityId: id,
      entityTitle: attachment.originalName,
    });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error("Error deleting attachment:", error);
    return NextResponse.json(
      { error: "Failed to delete attachment" },
      { status: 500 }
    );
  }
}

