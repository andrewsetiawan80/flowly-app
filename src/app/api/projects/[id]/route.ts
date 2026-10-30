import {NextResponse as R} from "next/server";
import {prisma} from "@/lib/prisma";
import {noteUser} from "@/lib/notes";
export const dynamic="force-dynamic";
export async function GET(_req:Request,ctx:{params:Promise<{id:string}>}){
 const me=await noteUser();if(!me)return R.json({error:"Sign in required"},{status:401});
 const {id}=await ctx.params;
 const project=await prisma.list.findFirst({where:{id,OR:[{ownerId:me.id},{workspace:{ownerId:me.id}},{workspace:{members:{some:{userId:me.id}}}}]},include:{tasks:{include:{subtasks:true},orderBy:{createdAt:"desc"}},children:{select:{id:true,name:true,type:true}}}});
 if(!project)return R.json({error:"Project not found"},{status:404});
 const notes=await prisma.note.findMany({where:{ownerId:me.id,projectId:id,isArchived:false},select:{id:true,title:true},orderBy:{updatedAt:"desc"}});
 const [noteFiles,taskFiles]=await Promise.all([
  prisma.noteFile.findMany({where:{ownerId:me.id,entityType:"note",entityId:{in:notes.map(n=>n.id)}},select:{id:true,originalName:true,size:true,entityId:true}}),
  prisma.attachment.findMany({where:{OR:[{entityType:"task",task:{listId:id,ownerId:me.id}},...(project.ownerId===me.id?[{entityType:"list",entityId:id}]:[])]},select:{id:true,originalName:true,size:true,entityId:true,entityType:true}})
 ]);
 return R.json({project,notes,files:[...noteFiles.map(f=>({...f,source:"Note",url:`/api/note-files/${f.id}`})),...taskFiles.map(f=>({...f,source:f.entityType==="list"?"Project":"Task",url:`/api/attachments/${f.id}/download`}))],canManageFiles:project.ownerId===me.id,canLinkNotes:project.ownerId===me.id&&!project.workspaceId},{headers:{"Cache-Control":"private, no-store"}});
}
