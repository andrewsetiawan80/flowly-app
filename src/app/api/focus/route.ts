import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/api-auth";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// GET /api/focus - Get focus sessions
export async function GET(request: NextRequest) {
  const me = await getCurrentUser(request);
  if (!me) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const limit = Math.min(parseInt(searchParams.get("limit") || "20"), 100);
  const active = searchParams.get("active") === "true";

  const where: any = { ownerId: me.id };
  if (active) {
    where.endedAt = null;
  }

  const sessions = await prisma.focusSession.findMany({
    where,
    orderBy: { startedAt: "desc" },
    take: limit,
  });

  return NextResponse.json({ sessions });
}

// POST /api/focus - Start a new focus session
export async function POST(request: NextRequest) {
  const me = await getCurrentUser(request);
  if (!me) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  try {
    const body = await request.json();
    const { taskId, duration, type } = body;

    // End any active sessions first
    await prisma.focusSession.updateMany({
      where: {
        ownerId: me.id,
        endedAt: null,
      },
      data: {
        endedAt: new Date(),
        completed: false,
      },
    });

    const session = await prisma.focusSession.create({
      data: {
        ownerId: me.id,
        taskId: taskId || null,
        duration: duration || 25,
        type: type || "focus",
      },
    });

    return NextResponse.json({ session }, { status: 201 });
  } catch (error) {
    console.error("Error starting focus session:", error);
    return NextResponse.json({ error: "Failed to start session" }, { status: 500 });
  }
}

// PATCH /api/focus - End or update active session
export async function PATCH(request: NextRequest) {
  const me = await getCurrentUser(request);
  if (!me) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  try {
    const body = await request.json();
    const { sessionId, completed, actualMinutes } = body;

    // Find active session or specific session
    let session;
    if (sessionId) {
      session = await prisma.focusSession.findFirst({
        where: { id: sessionId, ownerId: me.id },
      });
    } else {
      session = await prisma.focusSession.findFirst({
        where: { ownerId: me.id, endedAt: null },
        orderBy: { startedAt: "desc" },
      });
    }

    if (!session) {
      return NextResponse.json({ error: "No active session found" }, { status: 404 });
    }

    // Calculate actual minutes if not provided
    const calculatedMinutes = actualMinutes || 
      Math.round((new Date().getTime() - new Date(session.startedAt).getTime()) / 60000);

    const updated = await prisma.focusSession.update({
      where: { id: session.id },
      data: {
        endedAt: new Date(),
        completed: completed !== undefined ? completed : true,
        actualMinutes: calculatedMinutes,
      },
    });

    // If completed and linked to a task, add time to task
    if (updated.completed && updated.taskId) {
      await prisma.task.update({
        where: { id: updated.taskId },
        data: {
          actualMinutes: { increment: calculatedMinutes },
        },
      });
    }

    return NextResponse.json({ session: updated });
  } catch (error) {
    console.error("Error updating focus session:", error);
    return NextResponse.json({ error: "Failed to update session" }, { status: 500 });
  }
}

