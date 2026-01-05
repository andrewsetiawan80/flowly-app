import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/api-auth";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// GET /api/tags/:id - Get a single tag with its tasks
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const me = await getCurrentUser(request);
  if (!me) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { id } = await params;

  const tag = await prisma.tag.findFirst({
    where: { id, ownerId: me.id },
    include: {
      tasks: {
        include: {
          task: {
            include: {
              list: { select: { id: true, name: true, color: true } },
            },
          },
        },
      },
    },
  });

  if (!tag) {
    return NextResponse.json({ error: "Tag not found" }, { status: 404 });
  }

  return NextResponse.json({ tag });
}

// PATCH /api/tags/:id - Update a tag
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const me = await getCurrentUser(request);
  if (!me) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { id } = await params;

  try {
    const tag = await prisma.tag.findFirst({
      where: { id, ownerId: me.id },
    });

    if (!tag) {
      return NextResponse.json({ error: "Tag not found" }, { status: 404 });
    }

    const body = await request.json();
    const { name, color } = body;

    const updateData: any = {};
    if (name !== undefined) updateData.name = name.trim();
    if (color !== undefined) updateData.color = color;

    const updated = await prisma.tag.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({ tag: updated });
  } catch (error) {
    console.error("Error updating tag:", error);
    return NextResponse.json({ error: "Failed to update tag" }, { status: 500 });
  }
}

// DELETE /api/tags/:id - Delete a tag
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const me = await getCurrentUser(request);
  if (!me) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { id } = await params;

  try {
    const tag = await prisma.tag.findFirst({
      where: { id, ownerId: me.id },
    });

    if (!tag) {
      return NextResponse.json({ error: "Tag not found" }, { status: 404 });
    }

    await prisma.tag.delete({ where: { id } });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error("Error deleting tag:", error);
    return NextResponse.json({ error: "Failed to delete tag" }, { status: 500 });
  }
}

