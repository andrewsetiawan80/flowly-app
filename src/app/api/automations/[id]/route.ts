import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/api-auth";

export const dynamic = "force-dynamic";
export const revalidate = 0;

// GET /api/automations/:id - get automation with recent logs
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const automation = await prisma.automation.findFirst({
    where: { id, ownerId: user.id },
    include: {
      logs: {
        orderBy: { createdAt: "desc" },
        take: 20,
      },
    },
  });

  if (!automation) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(automation);
}

// PATCH /api/automations/:id - update automation
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();

  const existing = await prisma.automation.findFirst({
    where: { id, ownerId: user.id },
  });

  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const updateData: Record<string, any> = {};
  if (body.name !== undefined) updateData.name = body.name;
  if (body.isActive !== undefined) updateData.isActive = body.isActive;
  if (body.trigger !== undefined) updateData.trigger = body.trigger;
  if (body.action !== undefined) updateData.action = body.action;

  const automation = await prisma.automation.update({
    where: { id },
    data: updateData,
  });

  return NextResponse.json(automation);
}

// DELETE /api/automations/:id - delete automation
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const existing = await prisma.automation.findFirst({
    where: { id, ownerId: user.id },
  });

  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.automation.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
