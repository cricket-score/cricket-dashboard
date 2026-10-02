import { createClient, type WebSocketLikeConstructor } from '@supabase/supabase-js';
import WebSocket from 'ws';
import { mkdir,readFile,writeFile,rename } from 'node:fs/promises';
import path from 'node:path';
import { defaultMatch,type RecordData,type Match } from '../scoring/model';
export const localMode=()=>process.env.LOCAL_DEMO==='true'&&process.env.NODE_ENV!=='production';
const file=path.join(process.cwd(),'.data','match.json');
function db(){const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.SUPABASE_SERVICE_ROLE_KEY;if(!url||!key)throw new Error('Database is not configured. Follow README setup instructions.');return createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false},realtime:{transport:WebSocket as unknown as WebSocketLikeConstructor}});}
const initial=():RecordData=>({id:'school-match',revision:0,data:defaultMatch(),updated_at:new Date().toISOString(),operation_id:null});
let queue:Promise<unknown>=Promise.resolve();
export async function readMatch():Promise<RecordData>{
  if(localMode()){try{return JSON.parse(await readFile(file,'utf8'));}catch(e){if((e as NodeJS.ErrnoException).code==='ENOENT')return initial();throw e;}}
  const {data,error}=await db().from('matches').select('*').eq('id','school-match').maybeSingle();if(error)throw new Error(error.message);return data??initial();
}
export async function saveMatch(data:Match,revision:number,operationId:string):Promise<RecordData>{
  if(localMode()){
    const task=queue.then(async()=>{const old=await readMatch();if(old.operation_id===operationId)return old;if(old.revision!==revision)throw new Error('CONFLICT');const row={id:'school-match',data,revision:revision+1,updated_at:new Date().toISOString(),operation_id:operationId};await mkdir(path.dirname(file),{recursive:true});await writeFile(file+'.tmp',JSON.stringify(row));await rename(file+'.tmp',file);return row;});queue=task.catch(()=>{});return task;
  }
  const {data:row,error}=await db().rpc('save_match',{p_data:data,p_revision:revision,p_operation:operationId});if(error){if(error.message.includes('CONFLICT'))throw new Error('CONFLICT');throw new Error(error.message);}return row;
}
