import { NextResponse as R } from "next/server";
import { prisma } from "@/lib/prisma";
import { noteUser } from "@/lib/notes";
export async function GET(_req:Request,ctx:{params:Promise<{id:string;revisionId:string}>}) {
 const me=await noteUser();if(!me)return R.json({error:"Sign in required"},{status:401});
 const {id,revisionId}=await ctx.params;
 const revision=await prisma.noteRevision.findFirst({where:{id:revisionId,noteId:id,note:{ownerId:me.id}}});
 return revision?R.json(revision):R.json({error:"Not found"},{status:404});
}
