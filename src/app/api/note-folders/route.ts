import { NextRequest, NextResponse as R } from "next/server";
import { prisma } from "@/lib/prisma";
import { noteUser } from "@/lib/notes";
import { z } from "zod";
export async function POST(req:NextRequest) {
 const me=await noteUser();if(!me)return R.json({error:"Sign in required"},{status:401});
 const p=z.object({name:z.string().trim().min(1).max(255),parentId:z.string().nullable().optional()}).safeParse(await req.json().catch(()=>null));
 if(!p.success)return R.json({error:"Enter a folder name"},{status:400});
 if(p.data.parentId&&!await prisma.noteFolder.findFirst({where:{id:p.data.parentId,ownerId:me.id}}))return R.json({error:"Parent not found"},{status:404});
 return R.json(await prisma.noteFolder.create({data:{...p.data,ownerId:me.id}}),{status:201});
}
