import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/api-auth";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// GET /api/workspaces/:id - Get workspace details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const me = await getCurrentUser(request);
  if (!me) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { id } = await params;

  const workspace = await prisma.workspace.findFirst({
    where: {
      id,
      OR: [
        { ownerId: me.id },
        { members: { some: { userId: me.id } } },
      ],
    },
    include: {
      members: {
        include: {
          user: { select: { id: true, name: true, email: true, image: true } },
        },
        orderBy: { joinedAt: "asc" },
      },
      invitations: {
        where: { status: "PENDING" },
        orderBy: { createdAt: "desc" },
      },
      _count: { select: { lists: true, tasks: true } },
    },
  });

  if (!workspace) {
    return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
  }

  return NextResponse.json({ workspace });
}

// PATCH /api/workspaces/:id - Update workspace
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const me = await getCurrentUser(request);
  if (!me) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { id } = await params;

  // Check permission (OWNER or ADMIN)
  const membership = await prisma.workspaceMember.findFirst({
    where: { workspaceId: id, userId: me.id, role: { in: ["OWNER", "ADMIN"] } },
  });
  if (!membership) {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  const body = await request.json();
  const { name, description, color } = body;

  const workspace = await prisma.workspace.update({
    where: { id },
    data: {
      ...(name !== undefined && { name: name.trim() }),
      ...(description !== undefined && { description: description?.trim() || null }),
      ...(color !== undefined && { color }),
    },
  });

  return NextResponse.json({ workspace });
}

// DELETE /api/workspaces/:id - Delete workspace (owner only)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const me = await getCurrentUser(request);
  if (!me) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { id } = await params;

  const workspace = await prisma.workspace.findFirst({
    where: { id, ownerId: me.id },
  });
  if (!workspace) {
    return NextResponse.json({ error: "Only the owner can delete a workspace" }, { status: 403 });
  }

  // Delete cascade: members, invitations, lists/tasks scoped via Prisma cascade
  await prisma.workspace.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
