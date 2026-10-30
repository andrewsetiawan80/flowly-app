import { NextRequest, NextResponse as R } from "next/server";
import { prisma } from "@/lib/prisma";
import { noteUser } from "@/lib/notes";
import { mkdir, writeFile, unlink } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";
export const dynamic="force-dynamic";
const FILE_ROOT=process.env.NOTE_UPLOAD_DIR||"/var/www/flowly/note-uploads";
async function owned(ownerId:string,entityType:string,entityId:string){return entityType==="note"?!!await prisma.note.findFirst({where:{id:entityId,ownerId}}):entityType==="folder"?!!await prisma.noteFolder.findFirst({where:{id:entityId,ownerId}}):false;}
export async function GET(req:NextRequest){
 const me=await noteUser();if(!me)return R.json({error:"Sign in required"},{status:401});
 const entityType=req.nextUrl.searchParams.get("entityType")||"note",entityId=req.nextUrl.searchParams.get("entityId")||"";
 if(!await owned(me.id,entityType,entityId))return R.json({error:"Not found"},{status:404});
 const files=await prisma.noteFile.findMany({where:{ownerId:me.id,entityType,entityId},select:{id:true,originalName:true,size:true},orderBy:{createdAt:"desc"}});
 return R.json({files});
}
export async function POST(req:NextRequest){
 const me=await noteUser();if(!me)return R.json({error:"Sign in required"},{status:401});
 if(Number(req.headers.get("content-length"))>11*1024*1024)return R.json({error:"Maximum file size is 10 MB"},{status:413});
 const form=await req.formData();const file=form.get("file"),entityId=String(form.get("entityId")||""),entityType=String(form.get("entityType")||"note");
 if(!(file instanceof File)||file.size>10*1024*1024||!file.size)return R.json({error:"Choose a file up to 10 MB"},{status:400});
 if(!await owned(me.id,entityType,entityId))return R.json({error:"Not found"},{status:404});
 const filename=randomUUID();await mkdir(FILE_ROOT,{recursive:true,mode:0o700});const target=path.join(FILE_ROOT,filename);
 await writeFile(target,Buffer.from(await file.arrayBuffer()),{mode:0o600});
 try{const data=await prisma.noteFile.create({data:{ownerId:me.id,entityType,entityId,filename,originalName:path.basename(file.name).slice(0,250),mimetype:file.type||"application/octet-stream",size:file.size,path:filename}});return R.json({id:data.id,originalName:data.originalName,size:data.size},{status:201});}catch(e){await unlink(target).catch(()=>{});throw e;}
}
