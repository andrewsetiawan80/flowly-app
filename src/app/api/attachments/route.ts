import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/api-auth";
import { NextRequest, NextResponse } from "next/server";
import { logActivity } from "@/lib/activity";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import crypto from "crypto";

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const UPLOAD_DIR = process.env.UPLOAD_DIR || "/var/www/flowly/uploads";
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/plain",
  "text/csv",
];

// GET /api/attachments - Get attachments for an entity
export async function GET(request: NextRequest) {
  const me = await getCurrentUser(request);
  if (!me) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const entityType = searchParams.get("entityType");
  const entityId = searchParams.get("entityId");

  if (!entityType || !entityId) {
    return NextResponse.json(
      { error: "entityType and entityId are required" },
      { status: 400 }
    );
  }

  // Verify ownership based on entity type
  if (entityType === "task") {
    const task = await prisma.task.findFirst({
      where: { id: entityId, ownerId: me.id },
    });
    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }
  } else if (entityType === "list") {
    const list = await prisma.list.findFirst({
      where: { id: entityId, ownerId: me.id },
    });
    if (!list) {
      return NextResponse.json({ error: "List not found" }, { status: 404 });
    }
  }

  const attachments = await prisma.attachment.findMany({
    where: { entityType, entityId },
    orderBy: { createdAt: "desc" },
  });

  // Add download URLs
  const attachmentsWithUrls = attachments.map((att: typeof attachments[number]) => ({
    ...att,
    url: `/api/attachments/${att.id}/download`,
  }));

  return NextResponse.json({ attachments: attachmentsWithUrls });
}

// POST /api/attachments - Upload a file
export async function POST(request: NextRequest) {
  const me = await getCurrentUser(request);
  if (!me) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const entityType = formData.get("entityType") as string | null;
    const entityId = formData.get("entityId") as string | null;

    if (!file || !entityType || !entityId) {
      return NextResponse.json(
        { error: "file, entityType, and entityId are required" },
        { status: 400 }
      );
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "File size exceeds 10MB limit" },
        { status: 400 }
      );
    }

    // Validate file type
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: "File type not allowed" },
        { status: 400 }
      );
    }

    // Verify ownership
    let taskId: string | null = null;
    if (entityType === "task") {
      const task = await prisma.task.findFirst({
        where: { id: entityId, ownerId: me.id },
      });
      if (!task) {
        return NextResponse.json({ error: "Task not found" }, { status: 404 });
      }
      taskId = entityId;
    } else if (entityType === "list") {
      const list = await prisma.list.findFirst({
        where: { id: entityId, ownerId: me.id },
      });
      if (!list) {
        return NextResponse.json({ error: "List not found" }, { status: 404 });
      }
    }

    // Generate unique filename
    const ext = path.extname(file.name);
    const uniqueFilename = `${crypto.randomUUID()}${ext}`;
    const uploadPath = path.join(UPLOAD_DIR, entityType, entityId);
    const filePath = path.join(uploadPath, uniqueFilename);

    // Ensure directory exists
    await mkdir(uploadPath, { recursive: true });

    // Write file
    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(filePath, buffer);

    // Create database record
    const attachment = await prisma.attachment.create({
      data: {
        filename: uniqueFilename,
        originalName: file.name,
        mimetype: file.type,
        size: file.size,
        path: filePath,
        entityType,
        entityId,
        taskId,
      },
    });

    // Log activity
    await logActivity({
      action: "CREATE",
      entityType: "attachment",
      entityId: attachment.id,
      entityTitle: file.name,
    });

    return NextResponse.json(
      {
        attachment: {
          ...attachment,
          url: `/api/attachments/${attachment.id}/download`,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error uploading attachment:", error);
    return NextResponse.json(
      { error: "Failed to upload attachment" },
      { status: 500 }
    );
  }
}

