import {redirect} from "next/navigation";
import Link from "next/link";
import {prisma} from "@/lib/prisma";
import {noteUser} from "@/lib/notes";
import ProjectHub from "@/components/projects/project-hub";
export const dynamic="force-dynamic";
export default async function Inbox(){const me=await noteUser();if(!me)redirect("/signin");const inbox=await prisma.list.findFirst({where:{ownerId:me.id,workspaceId:null,name:{equals:"Inbox",mode:"insensitive"}},orderBy:{createdAt:"asc"}});if(inbox)return <ProjectHub projectId={inbox.id} ownerId={me.id}/>;
return <div className="space-y-4"><h1 className="text-3xl">Inbox</h1><p className="text-muted-foreground">A place to capture tasks before organizing them into projects.</p><Link href="/lists/new?name=Inbox" className="inline-flex rounded-lg bg-primary px-4 py-2 text-primary-foreground">Create your inbox</Link></div>;}
