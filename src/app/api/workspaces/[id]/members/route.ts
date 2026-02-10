import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/api-auth";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// GET /api/workspaces/:id/members - Get workspace members
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const me = await getCurrentUser(request);
  if (!me) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { id } = await params;

  // Verify membership
  const membership = await prisma.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId: id, userId: me.id } },
  });
  if (!membership) {
    return NextResponse.json({ error: "Not a member" }, { status: 403 });
  }

  const members = await prisma.workspaceMember.findMany({
    where: { workspaceId: id },
    include: {
      user: { select: { id: true, name: true, email: true, image: true } },
    },
    orderBy: { joinedAt: "asc" },
  });

  return NextResponse.json({ members });
}
