import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/api-auth";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// GET /api/workspaces - Get all workspaces for the current user
export async function GET(request: NextRequest) {
  const me = await getCurrentUser(request);
  if (!me) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const workspaces = await prisma.workspace.findMany({
    where: {
      OR: [
        { ownerId: me.id },
        { members: { some: { userId: me.id } } },
      ],
    },
    include: {
      _count: { select: { members: true, lists: true } },
      members: {
        where: { userId: me.id },
        select: { role: true },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  const formatted = workspaces.map((w) => ({
    ...w,
    myRole: w.members[0]?.role || (w.ownerId === me.id ? "OWNER" : "MEMBER"),
    members: undefined,
  }));

  return NextResponse.json({ workspaces: formatted });
}

// POST /api/workspaces - Create a new workspace
export async function POST(request: NextRequest) {
  const me = await getCurrentUser(request);
  if (!me) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await request.json();
  const { name, description, color } = body;

  if (!name?.trim()) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

  // Generate slug from name
  const baseSlug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  
  // Ensure slug uniqueness
  let slug = baseSlug;
  let counter = 0;
  while (await prisma.workspace.findUnique({ where: { slug } })) {
    counter++;
    slug = `${baseSlug}-${counter}`;
  }

  const workspace = await prisma.workspace.create({
    data: {
      name: name.trim(),
      description: description?.trim() || null,
      color: color || "#6366f1",
      slug,
      ownerId: me.id,
      members: {
        create: {
          userId: me.id,
          role: "OWNER",
        },
      },
    },
    include: {
      _count: { select: { members: true, lists: true } },
    },
  });

  return NextResponse.json({ workspace }, { status: 201 });
}
