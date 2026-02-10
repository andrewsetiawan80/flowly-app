import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/api-auth";

export const dynamic = "force-dynamic";
export const revalidate = 0;

// GET /api/automations - list user's automations
export async function GET(req: NextRequest) {
  const user = await getCurrentUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const automations = await prisma.automation.findMany({
    where: { ownerId: user.id },
    include: {
      _count: { select: { logs: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ automations });
}

// POST /api/automations - create a new automation
export async function POST(req: NextRequest) {
  const user = await getCurrentUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { name, trigger, action, workspaceId } = await req.json();

  if (!name || !trigger || !action) {
    return NextResponse.json(
      { error: "name, trigger, and action are required" },
      { status: 400 }
    );
  }

  if (!trigger.event) {
    return NextResponse.json(
      { error: "trigger.event is required" },
      { status: 400 }
    );
  }

  if (!action.type) {
    return NextResponse.json(
      { error: "action.type is required" },
      { status: 400 }
    );
  }

  const automation = await prisma.automation.create({
    data: {
      name,
      ownerId: user.id,
      workspaceId: workspaceId || null,
      trigger,
      action,
    },
  });

  return NextResponse.json(automation, { status: 201 });
}
