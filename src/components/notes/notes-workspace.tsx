"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import dynamic from "next/dynamic";
import { Archive, ArrowLeft, BookOpen, Check, Download, FileText, FolderPlus, Plus, Search, Star, Pin, Save, ListTodo, Paperclip, X } from "lucide-react";
import { useNoteDraft } from "./use-note-draft";
import { cn } from "@/lib/utils";
const Editor=dynamic(()=>import("./rich-text-editor"),{ssr:false,loading:()=> <p className="p-6 text-muted-foreground">Loading editor…</p>});
type Summary={id:string;title:string;folderId:string|null;projectId:string|null;tags:string[];isPinned:boolean;isStarred:boolean;isArchived:boolean;preview?:string;updatedAt:string;reminder:string|null};
type Note=Summary&{content:string;version:number;color:string|null;revisions?:{id:string;title:string;createdAt:string}[]};
type Folder={id:string;name:string;parentId:string|null};
type Project={id:string;name:string};
type Attachment={id:string;originalName:string;size:number};
async function api(url:string,method="GET",body?:unknown) {
 const r=await fetch(url,{method,headers:body?{"Content-Type":"application/json"}:undefined,body:body?JSON.stringify(body):undefined});
 const data=await r.json(); if(!r.ok)throw new Error(data.error||"Request failed. Please retry.");return data;
}
const button="inline-flex items-center justify-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed";
export default function NotesWorkspace({ownerId,projectId,embedded=false}:{ownerId:string;projectId?:string;embedded?:boolean}){
 const params=useSearchParams();
 const [notes,setNotes]=useState<Summary[]>([]),[folders,setFolders]=useState<Folder[]>([]),[projects,setProjects]=useState<Project[]>([]);
 const [query,setQuery]=useState(""),[filter,setFilter]=useState("all"),[folder,setFolder]=useState("");
 const [loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[error,setError]=useState(""),[message,setMessage]=useState("");
 const [files,setFiles]=useState<Attachment[]>([]),[newFolder,setNewFolder]=useState(false),[folderName,setFolderName]=useState("");
 const [editorEpoch,setEditorEpoch]=useState(0);
 const [revision,setRevision]=useState<{title:string;content:string}|null>(null),[taskId,setTaskId]=useState("");
 const draft=useNoteDraft<Note>(ownerId,async n=>{
  const saved=await api(`/api/notes/${n.id}`,"PATCH",{title:n.title.trim()||"Untitled note",content:n.content,tags:n.tags,folderId:n.folderId,projectId:n.projectId,isStarred:n.isStarred,isPinned:n.isPinned,isArchived:n.isArchived,reminder:n.reminder,version:n.version});
  setNotes(items=>items.map(item=>item.id===saved.id?{...item,...saved,preview:saved.content.replace(/<[^>]*>/g," ").replace(/\s+/g," ").trim().slice(0,140)}:item));
  return saved;
 },busy);
 const {draft:note,dirty,saving}=draft;
 const setNote=draft.load;
 const dirtyRef=useRef(false),busyRef=useRef(false),requestId=useRef(0),searchId=useRef(0);
 dirtyRef.current=dirty;
 const savingRef=useRef(false);savingRef.current=saving;
 const fileInput=useRef<HTMLInputElement>(null),importInput=useRef<HTMLInputElement>(null);
 const refresh=useCallback(async()=>{
  const seq=++searchId.current;
  try{const data=await api(`/api/notes?q=${encodeURIComponent(query)}`);if(seq!==searchId.current)return;setNotes(data.notes);setFolders(data.folders);setProjects(data.projects);}
  catch(e){if(seq===searchId.current)setError((e as Error).message);}finally{if(seq===searchId.current)setLoading(false);}
 },[query]);
 useEffect(()=>{const t=setTimeout(refresh,200);return()=>clearTimeout(t);},[refresh]);
 useEffect(()=>{const handler=(e:BeforeUnloadEvent)=>{if(dirtyRef.current){e.preventDefault();e.returnValue="";}};
 window.addEventListener("beforeunload",handler);
 // Catch app navigation too, so drafts are not silently discarded by Next links.
 const click=(e:MouseEvent)=>{const a=(e.target as Element).closest("a[href]");if(dirtyRef.current&&a&&!window.confirm("Leave this note? Your unsaved draft will remain in this tab for recovery.")){e.preventDefault();e.stopPropagation();}};
 document.addEventListener("click",click,true);return()=>{window.removeEventListener("beforeunload",handler);document.removeEventListener("click",click,true);};},[]);
 const change=(patch:Partial<Note>)=>{draft.edit(patch);dirtyRef.current=true;setMessage("");};
 const canLeave=()=>!busyRef.current&&!savingRef.current&&(!dirtyRef.current||window.confirm("Leave this note? Your unsaved draft will remain in this tab for recovery."));
 const open=useCallback(async(id:string)=>{
  if(busyRef.current||savingRef.current||(dirtyRef.current&&!window.confirm("Leave this note? Your unsaved draft will remain in this tab for recovery.")))return;
  const seq=++requestId.current;setBusy(true);busyRef.current=true;setError("");
  try{const [n,f]=await Promise.all([api(`/api/notes/${encodeURIComponent(id)}`),api(`/api/note-files?entityType=note&entityId=${encodeURIComponent(id)}`)]);if(seq!==requestId.current)return;setNote(n);setFiles(f.files);setRevision(null);setTaskId("");setMessage("");}
  catch(e){setError((e as Error).message);}finally{setBusy(false);busyRef.current=false;}
 },[draft.load]);
 useEffect(()=>{const id=params.get("note");if(id)open(id);},[params,open]);
 async function action(fn:()=>Promise<void>){if(busyRef.current||savingRef.current)return;setBusy(true);busyRef.current=true;setError("");setMessage("");try{await fn();}catch(e){setError((e as Error).message);}finally{setBusy(false);busyRef.current=false;}}
 async function save(){await draft.save();}

 async function create(content="",title="Untitled note"){if(!canLeave())return;await action(async()=>{const n=await api("/api/notes","POST",{title,content,folderId:folder||null,projectId:(projectId||params.get("project"))||null});setNote(n);setFiles([]);setRevision(null);setTaskId("");await refresh();});}
 function exportNote(){if(!note)return;const a=document.createElement("a");const url=URL.createObjectURL(new Blob([JSON.stringify(note,null,2)],{type:"application/json"}));a.href=url;a.download=`${note.title.replace(/[^a-z0-9 _-]/gi,"").slice(0,80)||"note"}.json`;a.click();URL.revokeObjectURL(url);}
 function folderPath(f:Folder){let s=f.name,p=f.parentId;const seen=new Set([f.id]);while(p&&!seen.has(p)){seen.add(p);const parent=folders.find(x=>x.id===p);if(!parent)break;s=parent.name+" / "+s;p=parent.parentId;}return s;}
 const visible=notes.filter(n=>(filter==="archived"?n.isArchived:!n.isArchived)&&(!(projectId||params.get("project"))||n.projectId===(projectId||params.get("project")))&&(!folder||n.folderId===folder)&&(filter!=="starred"||n.isStarred));
 const activeFolder=folders.find(f=>f.id===folder);
 return <div className="notes-surface space-y-5">
  {!embedded&&<header className="flex flex-wrap items-start justify-between gap-4">
   <div><p className="mb-1 text-xs font-semibold uppercase tracking-[.18em] text-primary">Your personal workspace</p><h1 className="text-3xl font-semibold tracking-tight">Notes</h1><p className="mt-1 text-sm text-muted-foreground">Ideas, reference and plans. Connected to what you do next.</p></div>
   <div className="flex gap-2"><button className={button} disabled={busy} onClick={()=>importInput.current?.click()}><Download size={16}/>Import</button><button className={cn(button,"bg-primary text-primary-foreground border-primary hover:bg-primary/90")} disabled={busy||saving} onClick={()=>create()}><Plus size={16}/>New note</button></div>
  </header>}
  {embedded&&<div className="flex justify-between items-center"><p className="text-sm text-muted-foreground">Your private notes for this project</p><button className={button} disabled={busy||saving} onClick={()=>create()}><Plus size={16}/>New note</button></div>}
  {draft.recovered&&dirty&&<p role="status" className="rounded-lg border border-primary/30 bg-primary/5 p-3 text-sm">Recovered an unfinished draft from this tab.</p>}
  {draft.storageError&&dirty&&<p role="alert" className="text-sm text-amber-500">Browser storage is full or unavailable. Keep this page open until the note is saved.</p>}
  {draft.error&&<div role="alert" className="rounded-lg border border-red-500/30 bg-red-500/5 p-3 text-sm space-y-2"><p>{draft.error}</p><div className="flex flex-wrap gap-2"><button className={button} onClick={save} disabled={saving}>Retry save</button><button className={button} onClick={exportNote}>Export draft</button><button className={button} disabled={saving} onClick={()=>{if(note&&window.confirm("Load the latest saved version and discard this draft? Export it first if you need to keep it."))action(async()=>{draft.discard(await api(`/api/notes/${note.id}`));setEditorEpoch(v=>v+1);});}}>Load latest</button></div></div>}
  {error&&<div role="alert" className="rounded-lg border border-red-500/40 bg-red-500/10 p-3 text-sm">{error} <button className="ml-2 underline" onClick={()=>{setError("");refresh();}}>Retry loading</button></div>}
  {message&&<p role="status" className="flex items-center gap-2 text-sm text-primary"><Check size={16}/>{message}{taskId&&<Link className="underline" href={`/tasks?task=${taskId}`}>Open task</Link>}</p>}
  <div className="grid min-h-[65vh] gap-4 xl:grid-cols-[280px_minmax(0,1fr)]">
   <aside aria-label="Note library" className={cn("rounded-xl border bg-card overflow-hidden",note&&"hidden xl:block")}>
    <div className="p-3 space-y-3 border-b">
     <label className="flex items-center gap-2 rounded-lg border bg-background px-3"><Search size={16} className="text-muted-foreground"/><input aria-label="Search notes" className="min-w-0 w-full bg-transparent py-2.5 text-sm outline-none" placeholder="Search notes, content, tags…" value={query} onChange={e=>setQuery(e.target.value)}/></label>
     <div className="flex gap-1">{[["all","All notes"],["starred","Starred"],["archived","Archive"]].map(([id,label])=><button key={id} onClick={()=>setFilter(id)} aria-pressed={filter===id} className={cn("flex-1 rounded-md py-2 text-xs font-medium",filter===id?"bg-primary/10 text-primary":"text-muted-foreground hover:bg-muted")}>{label}</button>)}</div>
     <div className="flex gap-2"><select aria-label="Filter by folder" value={folder} onChange={e=>setFolder(e.target.value)} className="min-w-0 flex-1 rounded-md border bg-background p-2 text-sm"><option value="">All folders</option>{folders.map(f=><option key={f.id} value={f.id}>{folderPath(f)}</option>)}</select><button title="New folder" aria-label="New folder" className={button} onClick={()=>setNewFolder(!newFolder)}><FolderPlus size={16}/></button></div>
     {newFolder&&<form className="space-y-2" onSubmit={e=>{e.preventDefault();action(async()=>{await api("/api/note-folders","POST",{name:folderName,parentId:folder||null});setFolderName("");setNewFolder(false);await refresh();});}}><input required maxLength={255} aria-label="Folder name" value={folderName} onChange={e=>setFolderName(e.target.value)} placeholder="Folder name" className="w-full rounded border bg-background p-2 text-sm"/><button className={button} disabled={busy}>Create {folder?"subfolder":"folder"}</button></form>}
     {activeFolder&&<div className="flex gap-3 text-xs text-muted-foreground"><button onClick={()=>{const name=window.prompt("Rename folder",activeFolder.name);if(name)action(async()=>{await api(`/api/note-folders/${activeFolder.id}`,"PATCH",{name});await refresh();});}}>Rename folder</button><button onClick={()=>{if(window.confirm("Remove this empty folder? Notes and subfolders must be moved first."))action(async()=>{await api(`/api/note-folders/${activeFolder.id}`,"DELETE");setFolder("");await refresh();});}}>Remove empty folder</button></div>}
    </div>
    <div className="flex items-center justify-between px-4 py-3 text-xs text-muted-foreground"><span>{visible.length} notes</span><span>Recently edited</span></div>
    <div className="max-h-[65vh] overflow-y-auto px-2 pb-2">{loading?<p className="p-4 text-sm text-muted-foreground">Loading your notes…</p>:visible.length===0?<p className="p-4 text-sm text-muted-foreground">No notes here. Try another filter or create a note.</p>:visible.map(n=><button disabled={busy||saving} onClick={()=>open(n.id)} key={n.id} className={cn("mb-1 w-full rounded-lg p-3 text-left hover:bg-muted transition-colors",note?.id===n.id&&"bg-primary/10 ring-1 ring-inset ring-primary/20")}><div className="flex gap-2"><FileText size={16} className="mt-0.5 shrink-0 text-muted-foreground"/><span className="line-clamp-2 text-sm font-medium break-words">{n.title}</span>{n.isStarred&&<Star size={13} className="ml-auto shrink-0 text-amber-500"/>}{n.isPinned&&<Pin size={13} className="shrink-0 text-primary"/>}</div>{n.preview&&<p className="mt-1 pl-6 line-clamp-2 text-xs text-muted-foreground">{n.preview}</p>}<div className="mt-2 pl-6 text-xs text-muted-foreground">{new Date(n.updatedAt).toLocaleDateString(undefined,{month:"short",day:"numeric"})}{n.reminder && new Date(n.reminder).getTime()<=Date.now() && " · Reminder due"}{n.tags.length>0&&` · ${n.tags.slice(0,2).join(", ")}`}</div></button>)}</div>
   </aside>
   <section aria-label="Note editor" className={cn("min-w-0 rounded-xl border bg-card",!note&&"hidden xl:flex xl:items-center xl:justify-center")}>
    {!note?<div className="max-w-sm p-8 text-center"><BookOpen className="mx-auto mb-5 h-10 w-10 text-primary"/><h2 className="text-xl font-semibold">A place for your next idea</h2><p className="mt-2 text-sm text-muted-foreground">Open a note from your library, or start with a blank page. Your notes stay private to your account.</p><button className={cn(button,"mt-5")} onClick={()=>create()}><Plus size={16}/>Start writing</button></div>:<>
     <div className="flex flex-wrap items-center justify-between gap-2 border-b p-3">
      <button className={cn(button,"xl:hidden")} disabled={busy||saving} onClick={()=>{if(canLeave()){setNote(null);}}}><ArrowLeft size={16}/>Library</button>
      <div className="flex items-center gap-1"><button className={cn(button,note.isStarred&&"text-amber-500")} aria-label={note.isStarred?"Unstar note":"Star note"} aria-pressed={note.isStarred} disabled={busy} onClick={()=>change({isStarred:!note.isStarred})}><Star size={16}/></button><button className={cn(button,note.isPinned&&"text-primary")} aria-label={note.isPinned?"Unpin note":"Pin note"} aria-pressed={note.isPinned} disabled={busy} onClick={()=>change({isPinned:!note.isPinned})}><Pin size={16}/></button><button className={button} disabled={busy} onClick={()=>change({isArchived:!note.isArchived})}><Archive size={16}/>{note.isArchived?"Restore":"Archive"}</button><button className={button} aria-label="Export note" onClick={exportNote}><Download size={16}/></button></div>
      <div className="flex items-center gap-3"><span aria-live="polite" className="text-xs text-muted-foreground">{saving?"Saving…":draft.error?"Not saved":busy?"Working…":dirty?"Waiting to save…":"All changes saved"}</span><button className={cn(button,"bg-primary text-primary-foreground border-primary hover:bg-primary/90")} disabled={busy||saving||!dirty} onClick={save}><Save size={16}/>Save now</button></div>
     </div>
     <fieldset disabled={busy} className="min-w-0 space-y-4 p-4 sm:p-6 disabled:opacity-60">
      <input aria-label="Note title" maxLength={500} value={note.title} onChange={e=>change({title:e.target.value})} className="w-full bg-transparent text-2xl font-semibold tracking-tight outline-none" placeholder="Untitled note"/>
      <div className="grid gap-3 sm:grid-cols-2"><label className="text-xs text-muted-foreground">Folder<select aria-label="Note folder" value={note.folderId||""} onChange={e=>change({folderId:e.target.value||null})} className="mt-1 w-full rounded-lg border bg-background p-2 text-sm text-foreground"><option value="">Unfiled</option>{folders.map(f=><option key={f.id} value={f.id}>{folderPath(f)}</option>)}</select></label><label className="text-xs text-muted-foreground">Personal project<select aria-label="Personal project" value={note.projectId||""} onChange={e=>change({projectId:e.target.value||null})} className="mt-1 w-full rounded-lg border bg-background p-2 text-sm text-foreground"><option value="">No project</option>{projects.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></label></div>
      <div className={busy?"pointer-events-none":""}><Editor disabled={busy} key={note.id+":"+editorEpoch} content={note.content} onChange={content=>change({content})}/></div>
      <label className="block text-xs text-muted-foreground">Tags (separate with commas)<input key={note.id+":"+editorEpoch+":tags"} defaultValue={note.tags.join(", ")} onChange={e=>{const tags=Array.from(new Set(e.target.value.split(",").map(t=>t.trim()).filter(Boolean)));if(JSON.stringify(tags)!==JSON.stringify(note.tags))change({tags});}} className="mt-1 w-full rounded-lg border bg-background p-2 text-sm text-foreground" placeholder="ideas, reference, meeting"/></label>
      <details className="rounded-lg border p-3"><summary className="cursor-pointer text-sm font-medium">Attachments, history & actions</summary><div className="mt-4 space-y-4">
       <div className="flex flex-wrap gap-2"><button type="button" className={button} onClick={()=>fileInput.current?.click()}><Paperclip size={16}/>Attach file</button><button type="button" className={button} disabled={dirty||!note.projectId} title={dirty?"Save changes first":"Create a task in the selected personal project"} onClick={()=>action(async()=>{const t=await api(`/api/notes/${note.id}/task`,"POST",{projectId:note.projectId});setTaskId(t.id);setMessage("Task created with a link to this note");})}><ListTodo size={16}/>Create linked task</button>{note.projectId&&<Link className={button} href={`/lists/${note.projectId}`}>Open project</Link>}</div>
       {files.map(f=><a key={f.id} className="flex items-center gap-2 text-sm text-primary underline" href={`/api/note-files/${f.id}`} download><Paperclip size={14}/>{f.originalName} ({Math.ceil(f.size/1024)} KB)</a>)}
       <label className="block text-xs text-muted-foreground">Reminder (shown in your library when due)<input type="datetime-local" value={note.reminder?new Date(new Date(note.reminder).getTime()-new Date().getTimezoneOffset()*60000).toISOString().slice(0,16):""} onChange={e=>change({reminder:e.target.value?new Date(e.target.value).toISOString():null})} className="mt-1 block rounded-lg border bg-background p-2 text-sm text-foreground"/></label>
       <label className="block text-xs text-muted-foreground">Previous versions<select aria-label="Previous versions" defaultValue="" className="mt-1 w-full rounded-lg border bg-background p-2 text-sm text-foreground" onChange={e=>{if(e.target.value)action(async()=>setRevision(await api(`/api/notes/${note.id}/revisions/${e.target.value}`)));}}><option value="">Choose a saved version to preview</option>{note.revisions?.map(r=><option key={r.id} value={r.id}>{new Date(r.createdAt).toLocaleString()} · {r.title}</option>)}</select></label>
       {revision&&<div className="space-y-2"><p className="text-sm font-medium">{revision.title}</p><textarea readOnly aria-label="Previous version HTML" value={revision.content} className="h-40 w-full rounded border bg-background p-2 font-mono text-xs"/><button type="button" className={button} onClick={()=>{if(!canLeave())return;change({title:revision.title,content:revision.content});setEditorEpoch(v=>v+1);setRevision(null);}}>Use this version as draft</button></div>}
      </div></details>
     </fieldset>
    </>}
   </section>
  </div>
  <p className="text-xs text-muted-foreground">Notes are private. Linking a personal project does not share a note.</p>
  <input ref={fileInput} type="file" className="hidden" onChange={e=>{const file=e.target.files?.[0];if(file&&note)action(async()=>{const form=new FormData();form.append("file",file);form.append("entityType","note");form.append("entityId",note.id);const r=await fetch("/api/note-files",{method:"POST",body:form});const data=await r.json();if(!r.ok)throw new Error(data.error);setFiles(f=>[...f,data]);setMessage("File attached");});e.target.value="";}}/>
  <input ref={importInput} type="file" accept=".json,.txt,.html,.md" multiple className="hidden" onChange={e=>{const selected=Array.from(e.target.files||[]);e.target.value="";if(!canLeave())return;action(async()=>{let count=0;for(const file of selected){const text=await file.text();let items:Partial<Note>[];if(file.name.endsWith(".json")){const data=JSON.parse(text);items=Array.isArray(data)?data:(Array.isArray(data.notes)?data.notes:[data]);}else{const escaped=text.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");items=[{title:file.name,content:file.name.endsWith(".html")?text:`<pre>${escaped}</pre>`}];}for(const n of items){await api("/api/notes","POST",{title:n.title||"Imported note",content:n.content||"",tags:n.tags||[],folderId:folder||null});count++;}}setMessage(`Imported ${count} notes`);await refresh();});}}/>
 </div>;
}
