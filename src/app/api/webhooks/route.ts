import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/api-auth";
import { NextRequest, NextResponse } from "next/server";
import { generateWebhookSecret } from "@/lib/webhooks";

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

// GET /api/webhooks - List all webhooks
export async function GET(request: NextRequest) {
  const me = await getCurrentUser(request);
  if (!me) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const webhooks = await prisma.webhook.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      url: true,
      events: true,
      isActive: true,
      lastTriggeredAt: true,
      failureCount: true,
      createdAt: true,
      // Don't expose secret in list
    },
  });

  return NextResponse.json({ webhooks });
}

// POST /api/webhooks - Create a new webhook
export async function POST(request: NextRequest) {
  const me = await getCurrentUser(request);
  if (!me) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  try {
    const body = await request.json();
    const { url, events } = body;

    if (!url || !events || !Array.isArray(events) || events.length === 0) {
      return NextResponse.json(
        { error: "url and events array are required" },
        { status: 400 }
      );
    }

    // Validate URL
    try {
      new URL(url);
    } catch {
      return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
    }

    // Validate events
    const invalidEvents = events.filter((e: string) => !VALID_EVENTS.includes(e));
    if (invalidEvents.length > 0) {
      return NextResponse.json(
        { error: `Invalid events: ${invalidEvents.join(", ")}` },
        { status: 400 }
      );
    }

    const secret = generateWebhookSecret();

    const webhook = await prisma.webhook.create({
      data: {
        url,
        events,
        secret,
      },
    });

    return NextResponse.json({ webhook }, { status: 201 });
  } catch (error) {
    console.error("Error creating webhook:", error);
    return NextResponse.json(
      { error: "Failed to create webhook" },
      { status: 500 }
    );
  }
}

