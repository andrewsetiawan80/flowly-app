import { NextRequest, NextResponse as R } from "next/server";
import { prisma } from "@/lib/prisma";
import { noteUser, noteInput, validNoteLinks } from "@/lib/notes";
export const dynamic = "force-dynamic";
export async function GET(req: NextRequest) {
  const me=await noteUser(); if(!me) return R.json({error:"Sign in required"},{status:401});
  const q=req.nextUrl.searchParams.get("q")?.slice(0,500);
  const notes=await prisma.note.findMany({where:{ownerId:me.id,...(q?{OR:[{title:{contains:q,mode:"insensitive"}},{content:{contains:q,mode:"insensitive"}},{tags:{has:q}}]}:{})},orderBy:[{isPinned:"desc"},{updatedAt:"desc"}],select:{id:true,title:true,content:true,folderId:true,projectId:true,tags:true,isPinned:true,isStarred:true,isArchived:true,updatedAt:true,createdAt:true,reminder:true}});
  const [folders,projects]=await Promise.all([prisma.noteFolder.findMany({where:{ownerId:me.id},orderBy:{name:"asc"}}),prisma.list.findMany({where:{ownerId:me.id,workspaceId:null},select:{id:true,name:true}})]);
  const summaries=notes.map(({content,...note})=>({...note,preview:content.replace(/<[^>]*>/g," ").replace(/&nbsp;/g," ").replace(/&amp;/g,"&").replace(/\s+/g," ").trim().slice(0,140)}));
  return R.json({notes:summaries,folders,projects},{headers:{"Cache-Control":"private, no-store"}});
}
export async function POST(req: NextRequest) {
  const me=await noteUser(); if(!me) return R.json({error:"Sign in required"},{status:401});
  const parsed=noteInput.safeParse(await req.json().catch(()=>null));
  if(!parsed.success || !await validNoteLinks(me.id,parsed.data)) return R.json({error:"Invalid note or folder/project"},{status:400});
  return R.json(await prisma.note.create({data:{...parsed.data,ownerId:me.id}}),{status:201});
}
