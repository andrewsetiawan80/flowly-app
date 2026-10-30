import { NextRequest, NextResponse as R } from "next/server";
import { prisma } from "@/lib/prisma";
import { noteUser } from "@/lib/notes";
export async function PATCH(req:NextRequest,ctx:{params:Promise<{id:string}>}) {
 const me=await noteUser();if(!me)return R.json({error:"Sign in required"},{status:401});
 const {id}=await ctx.params; const body=await req.json().catch(()=>null);
 if(typeof body?.name!=="string"||!body.name.trim()||body.name.length>255)return R.json({error:"Invalid name"},{status:400});
 const r=await prisma.noteFolder.updateMany({where:{id,ownerId:me.id},data:{name:body.name.trim()}});
 return R.json({ok:!!r.count},{status:r.count?200:404});
}
export async function DELETE(_req:NextRequest,ctx:{params:Promise<{id:string}>}) {
 const me=await noteUser();if(!me)return R.json({error:"Sign in required"},{status:401});
 const {id}=await ctx.params;
 const folder=await prisma.noteFolder.findFirst({where:{id,ownerId:me.id},include:{_count:{select:{children:true,notes:true}}}});
 if(!folder)return R.json({error:"Not found"},{status:404});
 if(folder._count.children||folder._count.notes)return R.json({error:"Move all notes and subfolders before removing this folder"},{status:409});
 try{await prisma.noteFolder.delete({where:{id}});return R.json({ok:true});}catch{return R.json({error:"Folder is not empty"},{status:409});}
}
