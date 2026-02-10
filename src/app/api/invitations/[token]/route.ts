import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/api-auth";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// GET /api/invitations/:token - Get invitation details (for invite page)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  const invitation = await prisma.invitation.findUnique({
    where: { token },
    include: {
      workspace: { select: { id: true, name: true, color: true } },
      invitedBy: { select: { name: true, email: true } },
    },
  });

  if (!invitation) {
    return NextResponse.json({ error: "Invitation not found" }, { status: 404 });
  }

  if (invitation.status !== "PENDING") {
    return NextResponse.json({ error: `Invitation already ${invitation.status.toLowerCase()}` }, { status: 410 });
  }

  if (invitation.expiresAt < new Date()) {
    await prisma.invitation.update({ where: { id: invitation.id }, data: { status: "EXPIRED" } });
    return NextResponse.json({ error: "Invitation has expired" }, { status: 410 });
  }

  return NextResponse.json({ invitation });
}

// POST /api/invitations/:token - Accept invitation
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const me = await getCurrentUser(request);
  if (!me) return NextResponse.json({ error: "Please sign in to accept the invitation" }, { status: 401 });

  const { token } = await params;

  const invitation = await prisma.invitation.findUnique({
    where: { token },
    include: { workspace: true },
  });

  if (!invitation) {
    return NextResponse.json({ error: "Invitation not found" }, { status: 404 });
  }

  if (invitation.status !== "PENDING") {
    return NextResponse.json({ error: `Invitation already ${invitation.status.toLowerCase()}` }, { status: 410 });
  }

  if (invitation.expiresAt < new Date()) {
    await prisma.invitation.update({ where: { id: invitation.id }, data: { status: "EXPIRED" } });
    return NextResponse.json({ error: "Invitation has expired" }, { status: 410 });
  }

  // Check if the user email matches the invitation email
  if (me.email.toLowerCase() !== invitation.email.toLowerCase()) {
    return NextResponse.json(
      { error: `This invitation was sent to ${invitation.email}. Please sign in with that email.` },
      { status: 403 }
    );
  }

  // Check if already a member
  const existingMember = await prisma.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId: invitation.workspaceId, userId: me.id } },
  });
  if (existingMember) {
    await prisma.invitation.update({ where: { id: invitation.id }, data: { status: "ACCEPTED" } });
    return NextResponse.json({ workspace: invitation.workspace, message: "Already a member" });
  }

  // Accept: create membership + update invitation
  await prisma.$transaction([
    prisma.workspaceMember.create({
      data: {
        workspaceId: invitation.workspaceId,
        userId: me.id,
        role: invitation.role,
      },
    }),
    prisma.invitation.update({
      where: { id: invitation.id },
      data: { status: "ACCEPTED" },
    }),
  ]);

  return NextResponse.json({ workspace: invitation.workspace, message: "Joined workspace!" });
}

// DELETE /api/invitations/:token - Decline invitation
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  const invitation = await prisma.invitation.findUnique({ where: { token } });
  if (!invitation || invitation.status !== "PENDING") {
    return NextResponse.json({ error: "Invitation not found or already processed" }, { status: 404 });
  }

  await prisma.invitation.update({
    where: { id: invitation.id },
    data: { status: "DECLINED" },
  });

  return NextResponse.json({ success: true });
}
