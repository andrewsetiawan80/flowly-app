export type VersionedDraft = {id:string;version:number};
export type DraftState<T> = {draft:T|null;dirty:boolean;saving:boolean;error:string|null};
/** Serializes writes, preserves typing during requests, and stops on conflicts. */
export class AutosaveBuffer<T extends VersionedDraft> {
  state:DraftState<T>={draft:null,dirty:false,saving:false,error:null};
  private listeners=new Set<()=>void>();
  private revision=0;
  constructor(private write:(draft:T)=>Promise<T>){}
  subscribe=(fn:()=>void)=>{this.listeners.add(fn);return()=>{this.listeners.delete(fn);};};
  snapshot=()=>this.state;
  private emit(next:DraftState<T>){this.state=next;this.listeners.forEach(fn=>fn());}
  load(draft:T|null,dirty=false,error:string|null=null){
    if(this.state.saving)throw new Error("Wait for the current save to finish");
    this.revision++;this.emit({draft,dirty,saving:false,error});
  }
  edit(patch:Partial<T>){if(!this.state.draft)return;this.revision++;this.emit({...this.state,draft:{...this.state.draft,...patch},dirty:true});}
  async save(){
    if(!this.state.draft||!this.state.dirty||this.state.saving)return;
    const sent=this.state.draft,revision=this.revision;
    this.emit({...this.state,saving:true,error:null});
    try{
      const saved=await this.write(sent);
      const changed=this.revision!==revision;
      this.emit({draft:changed?{...this.state.draft!,version:saved.version}:saved,dirty:changed,saving:false,error:null});
    }catch(e){this.emit({...this.state,saving:false,error:e instanceof Error?e.message:"Could not save. Your draft is still here."});}
  }
}
