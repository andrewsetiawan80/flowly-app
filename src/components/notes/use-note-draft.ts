"use client";
import {useCallback,useEffect,useRef,useState,useSyncExternalStore} from "react";
import {AutosaveBuffer,VersionedDraft} from "@/lib/autosave-buffer";
export function useNoteDraft<T extends VersionedDraft>(ownerId:string,write:(draft:T)=>Promise<T>,paused=false){
 const writer=useRef(write);writer.current=write;
 const [buffer]=useState(()=>new AutosaveBuffer<T>(n=>writer.current(n)));
 const state=useSyncExternalStore(buffer.subscribe,buffer.snapshot,buffer.snapshot);
 const [recovered,setRecovered]=useState(false),[storageError,setStorageError]=useState(false);
 const key=useCallback((id:string)=>`flowly-draft:${ownerId}:${id}`,[ownerId]);
 // Subscribe synchronously: a navigation immediately after typing still retains its draft.
 useEffect(()=>buffer.subscribe(()=>{
  const {draft,dirty}=buffer.state;if(!draft)return;
  try{if(dirty)sessionStorage.setItem(key(draft.id),JSON.stringify(draft));else sessionStorage.removeItem(key(draft.id));setStorageError(false);}catch{setStorageError(true);}
 }),[buffer,key]);
 const load=useCallback((note:T|null)=>{
  setRecovered(false);
  if(note){try{const text=sessionStorage.getItem(key(note.id));if(text){const draft=JSON.parse(text) as T;if(draft.id===note.id && Number.isInteger(draft.version)){
   buffer.load(draft,true,draft.version!==note.version?"A recovered draft conflicts with a newer saved version. Export your draft before loading the latest note.":null);setRecovered(true);return;
  }}}catch{setStorageError(true);}}
  buffer.load(note);
 },[buffer,key]);
 const discard=useCallback((note:T)=>{try{sessionStorage.removeItem(key(note.id));}catch{}setRecovered(false);buffer.load(note);},[buffer,key]);
 useEffect(()=>{if(paused||!state.dirty||state.saving||state.error)return;const timer=setTimeout(()=>void buffer.save(),900);return()=>clearTimeout(timer);},[buffer,state,paused]);
 return {...state,load,discard,edit:(patch:Partial<T>)=>buffer.edit(patch),save:()=>buffer.save(),recovered,storageError};
}
