import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/api-auth";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// PATCH /api/workspaces/:id/members/:memberId - Update member role
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; memberId: string }> }
) {
  const me = await getCurrentUser(request);
  if (!me) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { id: workspaceId, memberId } = await params;

  // Check requester is OWNER or ADMIN
  const myMembership = await prisma.workspaceMember.findFirst({
    where: { workspaceId, userId: me.id, role: { in: ["OWNER", "ADMIN"] } },
  });
  if (!myMembership) {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  const body = await request.json();
  const { role } = body;

  if (!["ADMIN", "MEMBER", "VIEWER"].includes(role)) {
    return NextResponse.json({ error: "Invalid role" }, { status: 400 });
  }

  // Cannot change the owner's role
  const targetMember = await prisma.workspaceMember.findUnique({
    where: { id: memberId },
  });
  if (!targetMember || targetMember.workspaceId !== workspaceId) {
    return NextResponse.json({ error: "Member not found" }, { status: 404 });
  }
  if (targetMember.role === "OWNER") {
    return NextResponse.json({ error: "Cannot change owner role" }, { status: 403 });
  }

  // Non-owners can only manage people below them
  if (myMembership.role === "ADMIN" && (role === "OWNER" || targetMember.role === "ADMIN")) {
    return NextResponse.json({ error: "Admins cannot promote to owner or demote other admins" }, { status: 403 });
  }

  const updated = await prisma.workspaceMember.update({
    where: { id: memberId },
    data: { role },
    include: {
      user: { select: { id: true, name: true, email: true, image: true } },
    },
  });

  return NextResponse.json({ member: updated });
}

// DELETE /api/workspaces/:id/members/:memberId - Remove member
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; memberId: string }> }
) {
  const me = await getCurrentUser(request);
  if (!me) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { id: workspaceId, memberId } = await params;

  const targetMember = await prisma.workspaceMember.findUnique({
    where: { id: memberId },
  });
  if (!targetMember || targetMember.workspaceId !== workspaceId) {
    return NextResponse.json({ error: "Member not found" }, { status: 404 });
  }

  // Self-leave: anyone can leave (except owner must transfer ownership first)
  const isSelfLeave = targetMember.userId === me.id;
  
  if (isSelfLeave) {
    if (targetMember.role === "OWNER") {
      return NextResponse.json({ error: "Owner cannot leave. Transfer ownership first." }, { status: 403 });
    }
  } else {
    // Removing someone else: need OWNER or ADMIN
    const myMembership = await prisma.workspaceMember.findFirst({
      where: { workspaceId, userId: me.id, role: { in: ["OWNER", "ADMIN"] } },
    });
    if (!myMembership) {
      return NextResponse.json({ error: "Not authorized to remove members" }, { status: 403 });
    }
    // Admins can't remove other admins or owner
    if (myMembership.role === "ADMIN" && (targetMember.role === "ADMIN" || targetMember.role === "OWNER")) {
      return NextResponse.json({ error: "Cannot remove this member" }, { status: 403 });
    }
  }

  // Unassign tasks and remove membership
  await prisma.$transaction([
    prisma.task.updateMany({
      where: { workspaceId, assigneeId: targetMember.userId },
      data: { assigneeId: null },
    }),
    prisma.workspaceMember.delete({ where: { id: memberId } }),
  ]);

  return NextResponse.json({ success: true });
}
