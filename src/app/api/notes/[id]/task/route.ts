import { NextRequest, NextResponse as R } from "next/server";
import { prisma } from "@/lib/prisma";
import { noteUser } from "@/lib/notes";
export async function POST(req:NextRequest,ctx:{params:Promise<{id:string}>}) {
 const me=await noteUser();if(!me)return R.json({error:"Sign in required"},{status:401});
 const {id}=await ctx.params;
 const note=await prisma.note.findFirst({where:{id,ownerId:me.id}});
 if(!note)return R.json({error:"Note not found"},{status:404});
 const body=await req.json().catch(()=>null);
 if(typeof body?.projectId!=="string")return R.json({error:"Choose a personal project first"},{status:400});
 const list=await prisma.list.findFirst({where:{id:body.projectId,ownerId:me.id,workspaceId:null}});
 if(!list)return R.json({error:"Project not found"},{status:404});
 const task=await prisma.task.create({data:{title:note.title,listId:list.id,ownerId:me.id,notes:`Source note: /notes?note=${encodeURIComponent(id)}`}});
 return R.json({id:task.id},{status:201});
}
