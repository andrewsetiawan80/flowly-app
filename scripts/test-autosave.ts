import assert from 'node:assert/strict';
import {AutosaveBuffer} from '../src/lib/autosave-buffer';
type Draft={id:string;version:number;content:string};
async function main(){
 let finish!:(n:Draft)=>void;let calls=0;
 const buffer=new AutosaveBuffer<Draft>(async()=>{calls++;return new Promise(r=>finish=r);});
 buffer.load({id:'a',version:1,content:'Original'});buffer.edit({content:'First edit'});
 const first=buffer.save();assert.equal(buffer.state.saving,true);
 buffer.edit({content:'Typed while saving'});await buffer.save();assert.equal(calls,1,'No overlapping writes');
 assert.throws(()=>buffer.load({id:'b',version:1,content:''}),/Wait/);
 finish({id:'a',version:2,content:'First edit'});await first;
 assert.equal(buffer.state.draft?.content,'Typed while saving');assert.equal(buffer.state.draft?.version,2);assert.equal(buffer.state.dirty,true);
 const second=buffer.save();finish({id:'a',version:3,content:'Typed while saving'});await second;
 assert.equal(buffer.state.dirty,false);assert.equal(buffer.state.saving,false);
 let fail=true;const retry=new AutosaveBuffer<Draft>(async n=>{if(fail)throw new Error('Offline');return {...n,version:n.version+1};});
 retry.load({id:'a',version:1,content:'original'});retry.edit({content:'Keep this draft'});await retry.save();
 assert.equal(retry.state.draft?.content,'Keep this draft');assert.equal(retry.state.dirty,true);assert.equal(retry.state.error,'Offline');
 fail=false;await retry.save();assert.equal(retry.state.error,null);assert.equal(retry.state.dirty,false);
 retry.load({id:'a',version:1,content:'Recovered draft'},true,'Conflict');assert.equal(retry.state.error,'Conflict');assert.equal(retry.state.dirty,true);
 console.log('PASS: serialized saves, edits during in-flight saves, version advancement, failed-save draft retention, retry and recovered conflict state.');
}
main();
