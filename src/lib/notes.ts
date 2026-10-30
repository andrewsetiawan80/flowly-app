import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
// Notes use signed-in user identity only; never the legacy default API user.
export async function noteUser() {
  const session = await auth();
  if (!session?.user?.email) return null;
  return prisma.user.findUnique({where: {email: session.user.email}, select: {id: true}});
}
export const noteInput = z.object({
  title: z.string().trim().min(1).max(500), content: z.string().max(20_000_000),
  folderId: z.string().nullable(), projectId: z.string().nullable(),
  tags: z.array(z.string().trim().min(1).max(100)).max(100),
  isPinned: z.boolean(), isStarred: z.boolean(), isArchived: z.boolean(),
  reminder: z.string().datetime().nullable(), color: z.string().max(50).nullable(),
}).partial();
export async function validNoteLinks(ownerId: string, data: {folderId?: string|null;projectId?: string|null}) {
  if(data.folderId && !await prisma.noteFolder.findFirst({where:{id:data.folderId,ownerId}})) return false;
  if(data.projectId && !await prisma.list.findFirst({where:{id:data.projectId,ownerId,workspaceId:null}})) return false;
  return true;
}
