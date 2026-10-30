import { NextResponse as R } from "next/server";
import { prisma } from "@/lib/prisma";
import { noteUser } from "@/lib/notes";
import { readFile } from "fs/promises";
import path from "path";
export const dynamic="force-dynamic";
export async function GET(_req:Request,ctx:{params:Promise<{id:string}>}){
 const me=await noteUser();if(!me)return R.json({error:"Sign in required"},{status:401});
 const {id}=await ctx.params;const file=await prisma.noteFile.findFirst({where:{id,ownerId:me.id}});
 if(!file)return R.json({error:"Not found"},{status:404});
 const root=path.resolve(process.env.NOTE_UPLOAD_DIR||"/var/www/flowly/note-uploads"),target=path.resolve(root,file.path);
 if(!target.startsWith(root+path.sep))return R.json({error:"Invalid path"},{status:400});
 try {const bytes=await readFile(target);return new Response(bytes,{headers:{"Content-Type":"application/octet-stream","Content-Disposition":`attachment; filename*=UTF-8''${encodeURIComponent(file.originalName)}`,"X-Content-Type-Options":"nosniff","Cache-Control":"private, no-store","Content-Security-Policy":"default-src 'none'; sandbox"}});}catch{return R.json({error:"File unavailable"},{status:404});}
}
