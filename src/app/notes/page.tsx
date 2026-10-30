import { redirect } from "next/navigation";
import { noteUser } from "@/lib/notes";
import NotesWorkspace from "@/components/notes/notes-workspace";
export default async function NotesPage(){if(!await noteUser())redirect("/signin");return <NotesWorkspace/>;}
