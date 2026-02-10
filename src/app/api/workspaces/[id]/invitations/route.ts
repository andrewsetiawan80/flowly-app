import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/api-auth";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// GET /api/workspaces/:id/invitations - Get pending invitations
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const me = await getCurrentUser(request);
  if (!me) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { id: workspaceId } = await params;

  // Verify membership
  const membership = await prisma.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId, userId: me.id } },
  });
  if (!membership) {
    return NextResponse.json({ error: "Not a member" }, { status: 403 });
  }

  const invitations = await prisma.invitation.findMany({
    where: { workspaceId, status: "PENDING" },
    include: {
      invitedBy: { select: { id: true, name: true, email: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ invitations });
}

// POST /api/workspaces/:id/invitations - Invite a member
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const me = await getCurrentUser(request);
  if (!me) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { id: workspaceId } = await params;

  // Check permission (OWNER or ADMIN)
  const myMembership = await prisma.workspaceMember.findFirst({
    where: { workspaceId, userId: me.id, role: { in: ["OWNER", "ADMIN"] } },
  });
  if (!myMembership) {
    return NextResponse.json({ error: "Not authorized to invite" }, { status: 403 });
  }

  const body = await request.json();
  const { email, role } = body;

  if (!email?.trim()) {
    return NextResponse.json({ error: "Email is required" }, { status: 400 });
  }

  const inviteRole = role || "MEMBER";
  if (!["ADMIN", "MEMBER", "VIEWER"].includes(inviteRole)) {
    return NextResponse.json({ error: "Invalid role" }, { status: 400 });
  }

  // Check if already a member
  const existingUser = await prisma.user.findUnique({ where: { email: email.trim().toLowerCase() } });
  if (existingUser) {
    const existingMember = await prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId, userId: existingUser.id } },
    });
    if (existingMember) {
      return NextResponse.json({ error: "User is already a member" }, { status: 409 });
    }
  }

  // Check for existing pending invitation
  const existingInvitation = await prisma.invitation.findFirst({
    where: { workspaceId, email: email.trim().toLowerCase(), status: "PENDING" },
  });
  if (existingInvitation) {
    return NextResponse.json({ error: "Invitation already sent" }, { status: 409 });
  }

  const invitation = await prisma.invitation.create({
    data: {
      workspaceId,
      email: email.trim().toLowerCase(),
      role: inviteRole,
      invitedById: me.id,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    },
  });

  return NextResponse.json({ invitation }, { status: 201 });
}
