'use client';
import { createContext,useCallback,useContext,useEffect,useRef,useState } from 'react';
import { browserDatabase, loadMatch, persistMatch } from '@/lib/database/browser';
import { derive } from '@/lib/scoring/engine';
import { type Match,type RecordData } from '@/lib/scoring/model';
type Pending={data:Match;revision:number;operationId:string};
type Context={record:RecordData|null;error:string;busy:boolean;pending:boolean;connected:boolean;local:boolean;message:string;save:(data:Match,message?:string)=>Promise<boolean>;retry:()=>Promise<void>;discard:()=>void;reload:()=>Promise<void>};
const C=createContext<Context|null>(null);
export function MatchProvider({children}:{children:React.ReactNode}){
  const [record,setRecord]=useState<RecordData|null>(null),[error,setError]=useState(''),[busy,setBusy]=useState(false),[pending,setPending]=useState<Pending|null>(null),[connected,setConnected]=useState(false),[local,setLocal]=useState(false),[message,setMessage]=useState('');
  const lock=useRef(false),latest=useRef<RecordData|null>(null),mounted=useRef(true);
  const accept=useCallback((r:RecordData)=>{if(!latest.current||r.revision>=latest.current.revision){derive(r.data);latest.current=r;setRecord(r);}},[]);
  const reload=useCallback(async()=>{try{const data=await loadMatch();if(!mounted.current)return;accept(data);setLocal(!!data.local);setConnected(true);setError(prev=>latest.current?prev:'');}catch(e){if(mounted.current){setConnected(false);if(!latest.current)setError(e instanceof Error?e.message:'Connection failed');}}},[accept]);
  useEffect(()=>{
    mounted.current=true;void reload();try{const p=localStorage.getItem('cricket-pending');if(p)setPending(JSON.parse(p));}catch{}
    let realtime=false;
    const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const client=url&&key?browserDatabase():null;
    const channel=client?.channel('school-score').on('postgres_changes',{event:'*',schema:'public',table:'matches',filter:'id=eq.school-match'},payload=>{if(payload.new&&'data' in payload.new){accept(payload.new as RecordData);setConnected(true);}}).subscribe(status=>{realtime=status==='SUBSCRIBED';if(realtime){setConnected(true);void reload();}else if(status==='CHANNEL_ERROR'||status==='TIMED_OUT')setConnected(false);});
    const timer=setInterval(()=>{if(!realtime)void reload();},client?10000:2000);
    const visibility=()=>{if(document.visibilityState==='visible')void reload();};const offline=()=>setConnected(false);
    window.addEventListener('online',reload);window.addEventListener('offline',offline);document.addEventListener('visibilitychange',visibility);
    return()=>{mounted.current=false;clearInterval(timer);if(channel)void client?.removeChannel(channel);window.removeEventListener('online',reload);window.removeEventListener('offline',offline);document.removeEventListener('visibilitychange',visibility);};
  },[accept,reload]);
  const transmit=async(p:Pending,msg:string)=>{
    if(lock.current)return false;lock.current=true;setBusy(true);setError('');
    try{const data=await persistMatch(p);accept(data);localStorage.removeItem('cricket-pending');setPending(null);setConnected(true);setMessage(msg);return true;}
    catch(e){setError(e instanceof Error?e.message:'Save failed. Retry before continuing.');return false;}
    finally{lock.current=false;setBusy(false);}
  };
  const save=async(data:Match,msg='Saved ✓')=>{
    if(lock.current||pending||!latest.current)return false;
    try{derive(data);}catch(e){setError(e instanceof Error?e.message:'Invalid score');return false;}
    const p={data,revision:latest.current.revision,operationId:crypto.randomUUID()};
    try{localStorage.setItem('cricket-pending',JSON.stringify(p));}catch{setError('Device storage is unavailable. Enable browser storage before scoring.');return false;}
    setPending(p);return transmit(p,msg);
  };
  return <C.Provider value={{record,error,busy,pending:!!pending,connected,local,message,save,reload,retry:async()=>{if(pending)await transmit(pending,'Saved ✓');},discard:()=>{localStorage.removeItem('cricket-pending');setPending(null);setError('');void reload();}}}>{children}</C.Provider>;
}
export function useMatch(){const c=useContext(C);if(!c)throw new Error('Match provider missing');return c;}
