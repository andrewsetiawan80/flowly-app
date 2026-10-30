import { redirect } from "next/navigation";
import { noteUser } from "@/lib/notes";
import NotesWorkspace from "@/components/notes/notes-workspace";
export default async function NotesPage(){const me=await noteUser();if(!me)redirect("/signin");return <NotesWorkspace ownerId={me.id}/>;}
