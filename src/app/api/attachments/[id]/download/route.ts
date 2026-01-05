import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/api-auth";
import { NextRequest, NextResponse } from "next/server";
import { readFile } from "fs/promises";

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// GET /api/attachments/:id/download - Download an attachment
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

  // Verify ownership via task
  if (attachment.task && attachment.task.ownerId !== me.id) {
    return NextResponse.json({ error: "Attachment not found" }, { status: 404 });
  }

  try {
    const fileBuffer = await readFile(attachment.path);

    return new NextResponse(fileBuffer, {
      headers: {
        "Content-Type": attachment.mimetype,
        "Content-Disposition": `attachment; filename="${attachment.originalName}"`,
        "Content-Length": attachment.size.toString(),
      },
    });
  } catch (error) {
    console.error("Error reading file:", error);
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }
}

