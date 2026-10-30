import {redirect} from "next/navigation";
import {noteUser} from "@/lib/notes";
import ProjectHub from "@/components/projects/project-hub";
export default async function ProjectPage({params}:{params:Promise<{id:string}>}){const me=await noteUser();if(!me)redirect("/signin");const {id}=await params;return <ProjectHub projectId={id} ownerId={me.id}/>;}
