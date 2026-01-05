import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/api-auth";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// GET /api/tags - List all tags for the user
export async function GET(request: NextRequest) {
  const me = await getCurrentUser(request);
  if (!me) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const tags = await prisma.tag.findMany({
    where: { ownerId: me.id },
    orderBy: { name: "asc" },
    include: {
      _count: { select: { tasks: true } },
    },
  });

  return NextResponse.json({ tags });
}

// POST /api/tags - Create a new tag
export async function POST(request: NextRequest) {
  const me = await getCurrentUser(request);
  if (!me) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  try {
    const body = await request.json();
    const { name, color } = body;

    if (!name || !name.trim()) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    // Check if tag already exists
    const existing = await prisma.tag.findUnique({
      where: { ownerId_name: { ownerId: me.id, name: name.trim() } },
    });

    if (existing) {
      return NextResponse.json({ error: "Tag already exists" }, { status: 409 });
    }

    const tag = await prisma.tag.create({
      data: {
        name: name.trim(),
        color: color || "#6366f1",
        ownerId: me.id,
      },
    });

    return NextResponse.json({ tag }, { status: 201 });
  } catch (error) {
    console.error("Error creating tag:", error);
    return NextResponse.json({ error: "Failed to create tag" }, { status: 500 });
  }
}

