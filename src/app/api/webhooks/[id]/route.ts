import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/api-auth";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const VALID_EVENTS = [
  "task.created",
  "task.updated",
  "task.deleted",
  "task.completed",
  "list.created",
  "list.updated",
  "list.deleted",
  "subtask.created",
  "subtask.updated",
  "subtask.deleted",
  "comment.created",
  "comment.updated",
  "comment.deleted",
];

// GET /api/webhooks/:id - Get webhook details with recent logs
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const me = await getCurrentUser(request);
  if (!me) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { id } = await params;

  const webhook = await prisma.webhook.findUnique({
    where: { id },
    include: {
      logs: {
        orderBy: { createdAt: "desc" },
        take: 20,
      },
    },
  });

  if (!webhook) {
    return NextResponse.json({ error: "Webhook not found" }, { status: 404 });
  }

  return NextResponse.json({ webhook });
}

// PATCH /api/webhooks/:id - Update a webhook
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const me = await getCurrentUser(request);
  if (!me) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { id } = await params;

  try {
    const webhook = await prisma.webhook.findUnique({ where: { id } });
    if (!webhook) {
      return NextResponse.json({ error: "Webhook not found" }, { status: 404 });
    }

    const body = await request.json();
    const { url, events, isActive } = body;

    const updateData: any = {};

    if (url !== undefined) {
      try {
        new URL(url);
        updateData.url = url;
      } catch {
        return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
      }
    }

    if (events !== undefined) {
      if (!Array.isArray(events) || events.length === 0) {
        return NextResponse.json(
          { error: "events must be a non-empty array" },
          { status: 400 }
        );
      }
      const invalidEvents = events.filter((e: string) => !VALID_EVENTS.includes(e));
      if (invalidEvents.length > 0) {
        return NextResponse.json(
          { error: `Invalid events: ${invalidEvents.join(", ")}` },
          { status: 400 }
        );
      }
      updateData.events = events;
    }

    if (isActive !== undefined) {
      updateData.isActive = isActive;
      // Reset failure count when re-enabling
      if (isActive) {
        updateData.failureCount = 0;
      }
    }

    const updated = await prisma.webhook.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({ webhook: updated });
  } catch (error) {
    console.error("Error updating webhook:", error);
    return NextResponse.json(
      { error: "Failed to update webhook" },
      { status: 500 }
    );
  }
}

// DELETE /api/webhooks/:id - Delete a webhook
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const me = await getCurrentUser(request);
  if (!me) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { id } = await params;

  try {
    const webhook = await prisma.webhook.findUnique({ where: { id } });
    if (!webhook) {
      return NextResponse.json({ error: "Webhook not found" }, { status: 404 });
    }

    await prisma.webhook.delete({ where: { id } });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error("Error deleting webhook:", error);
    return NextResponse.json(
      { error: "Failed to delete webhook" },
      { status: 500 }
    );
  }
}

