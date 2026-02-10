import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/api-auth";
import crypto from "crypto";

export const dynamic = "force-dynamic";
export const revalidate = 0;

// GET /api/settings - get user settings
export async function GET(req: NextRequest) {
  const user = await getCurrentUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { settings: true, calendarToken: true, email: true, name: true },
  });

  return NextResponse.json({
    settings: dbUser?.settings || {},
    calendarToken: dbUser?.calendarToken || null,
    email: dbUser?.email,
    name: dbUser?.name,
  });
}

// PATCH /api/settings - update user settings
export async function PATCH(req: NextRequest) {
  const user = await getCurrentUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();

  // Merge with existing settings
  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { settings: true },
  });

  const currentSettings = (dbUser?.settings as Record<string, any>) || {};
  const newSettings = { ...currentSettings, ...body.settings };

  const updated = await prisma.user.update({
    where: { id: user.id },
    data: { settings: newSettings },
    select: { settings: true },
  });

  return NextResponse.json({ settings: updated.settings });
}

// POST /api/settings - special actions (generate calendar token, etc.)
export async function POST(req: NextRequest) {
  const user = await getCurrentUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { action } = await req.json();

  if (action === "generate_calendar_token") {
    const token = crypto.randomBytes(32).toString("hex");
    await prisma.user.update({
      where: { id: user.id },
      data: { calendarToken: token },
    });
    return NextResponse.json({ calendarToken: token });
  }

  if (action === "revoke_calendar_token") {
    await prisma.user.update({
      where: { id: user.id },
      data: { calendarToken: null },
    });
    return NextResponse.json({ calendarToken: null });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
