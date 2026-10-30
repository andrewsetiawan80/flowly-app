// Usage: node --env-file=.env scripts/import-noteflow.cjs /private/export.json owner-email
// Snapshot must be a single transaction from the source PostgreSQL database.
const fs=require('node:fs');
const crypto=require('node:crypto');
const {PrismaClient}=require('@prisma/client');
const p=new PrismaClient();
const hash=x=>crypto.createHash('sha256').update(x).digest('hex');
const date=x=>x==null?null:new Date(Number(x));
(async()=>{
 const source=JSON.parse(fs.readFileSync(process.argv[2],'utf8'));
 const owner=await p.user.findUniqueOrThrow({where:{email:process.argv[3]}});
 if(source.attachments.length||source.webhooks.length)throw new Error('Attachments/webhooks need a separate migration before proceeding');
 const folderIds=new Set(source.folders.map(f=>f.id));
 if(source.notes.some(n=>n.folder_id&&!folderIds.has(n.folder_id)))throw new Error('Orphaned source folder');
 await p.$transaction(async tx=>{
  for(const f of source.folders){
   const old=await tx.noteFolder.findUnique({where:{id:f.id}});
   if(old){if(old.ownerId!==owner.id||old.name!==f.name||old.parentId!==(f.parent_id||null))throw new Error('Existing folder differs; refusing overwrite');continue;}
   await tx.noteFolder.create({data:{id:f.id,ownerId:owner.id,name:f.name,color:f.color,createdAt:date(f.created_at)}});
  }
  for(const f of source.folders)if(f.parent_id)await tx.noteFolder.update({where:{id:f.id},data:{parentId:f.parent_id}});
  for(const n of source.notes){
   const data={id:n.id,ownerId:owner.id,title:n.title,content:n.content||'',folderId:n.folder_id||null,tags:n.tags||[],isPinned:!!n.is_pinned,isStarred:!!n.is_starred,isArchived:!!n.is_archived,archivedAt:date(n.archived_at),color:n.color,reminder:date(n.reminder),version:n.version||1,createdAt:date(n.created_at),updatedAt:date(n.updated_at)};
   const old=await tx.note.findUnique({where:{id:n.id}});
   if(old){if(old.ownerId!==owner.id||hash(old.content)!==hash(data.content)||old.title!==n.title)throw new Error('Existing note differs; refusing overwrite');continue;}
   await tx.note.create({data});
  }
 },{timeout:120000});
 let verified=0;
 for(const n of source.notes){const v=await p.note.findUniqueOrThrow({where:{id:n.id}});
  if(hash(v.content)!==hash(n.content||'')||v.title!==n.title||v.folderId!==(n.folder_id||null)||JSON.stringify(v.tags)!==JSON.stringify(n.tags||[])||v.isPinned!==!!n.is_pinned||v.isStarred!==!!n.is_starred||v.isArchived!==!!n.is_archived||v.createdAt.getTime()!==Number(n.created_at)||v.updatedAt.getTime()!==Number(n.updated_at))throw new Error('Verification failed');verified++;
 }
 console.log(JSON.stringify({verifiedNotes:verified,folders:source.folders.length,attachments:source.attachments.length,historyRowsPreservedInBackup:source.activity_logs.length,contentChecksums:'all match'}));
})().finally(()=>p.$disconnect()).catch(e=>{console.error(e.message);process.exitCode=1});
