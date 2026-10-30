import { NextRequest, NextResponse as R } from "next/server";
import { prisma } from "@/lib/prisma";
import { noteUser, noteInput, validNoteLinks } from "@/lib/notes";
export const dynamic="force-dynamic";
type Context={params:Promise<{id:string}>};
export async function GET(_req:NextRequest,ctx:Context) {
  const me=await noteUser(); if(!me) return R.json({error:"Sign in required"},{status:401});
  const {id}=await ctx.params;
  const note=await prisma.note.findFirst({where:{id,ownerId:me.id},include:{revisions:{select:{id:true,createdAt:true,title:true},orderBy:{createdAt:"desc"},take:30}}});
  return note?R.json(note,{headers:{"Cache-Control":"private, no-store"}}):R.json({error:"Note not found"},{status:404});
}
export async function PATCH(req:NextRequest,ctx:Context) {
  const me=await noteUser(); if(!me) return R.json({error:"Sign in required"},{status:401});
  const {id}=await ctx.params; const body=await req.json().catch(()=>null);
  const parsed=noteInput.safeParse(body);
  if(!parsed.success || !Number.isInteger(body?.version) || !await validNoteLinks(me.id,parsed.data)) return R.json({error:"Invalid note"},{status:400});
  const old=await prisma.note.findFirst({where:{id,ownerId:me.id}});
  if(!old) return R.json({error:"Note not found"},{status:404});
  if(old.version!==body.version)return R.json({error:"This note changed elsewhere. Copy your draft, then reload before saving."},{status:409});
  try {
    const note=await prisma.$transaction(async tx=>{
      const result=await tx.note.updateMany({where:{id,ownerId:me.id,version:body.version},data:{...parsed.data,version:{increment:1},...(parsed.data.isArchived!==undefined?{archivedAt:parsed.data.isArchived?new Date():null}:{})}});
      if(!result.count) throw new Error("conflict");
      if((parsed.data.content!==undefined && parsed.data.content!==old.content)||(parsed.data.title!==undefined && parsed.data.title!==old.title)) await tx.noteRevision.create({data:{noteId:id,title:old.title,content:old.content}});
      return tx.note.findUnique({where:{id}});
    });
    return R.json(note);
  } catch(e) {
    if(e instanceof Error && e.message==="conflict") return R.json({error:"This note changed elsewhere. Copy your draft, then reload before saving."},{status:409});
    throw e;
  }
}
