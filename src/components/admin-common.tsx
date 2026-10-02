'use client';
import {useEffect,useRef,useState} from 'react';
import {LockKeyhole,ShieldCheck,X} from 'lucide-react';
import {useMatch} from './match-provider';
import {isScorer, signInScorer, signOutScorer, sitePath} from '@/lib/database/browser';
export function AdminGate({children}:{children:React.ReactNode}){
 const [auth,setAuth]=useState<boolean|null>(null),[password,setPassword]=useState(''),[error,setError]=useState(''),[busy,setBusy]=useState(false);
 useEffect(()=>{isScorer().then(setAuth).catch(()=>setAuth(false));},[]);
 if(auth===null)return <div className="loading">Checking scorer access…</div>;
 if(!auth)return <div className="login-wrap"><div className="login-card card"><span className="login-icon"><LockKeyhole size={26}/></span><span className="eyebrow">THE SCORER’S CORNER</span><h1>Ready to call<br/>the score?</h1><p>Enter the organizer’s password to set up the match or keep score.</p><form onSubmit={async e=>{e.preventDefault();setBusy(true);setError('');try{await signInScorer(password);setAuth(true);}catch(e){setError(e instanceof Error?e.message:'Unable to sign in');}finally{setBusy(false);}}}><label>Scorer password<input type="password" autoComplete="current-password" required value={password} onChange={e=>setPassword(e.target.value)}/></label>{error&&<p className="error" role="alert">{error}</p>}<button className="button primary full" disabled={busy}>{busy?'Signing in…':'Enter scorer’s corner'} <ShieldCheck size={17}/></button></form><span className="login-foot">Just here to cheer? <a href={sitePath("/live/")}>Watch the live match →</a></span></div></div>;
 return <>{children}<div className="admin-signout"><button className="text-button" onClick={async()=>{await signOutScorer();setPassword('');setAuth(false);}}>Lock scorer access</button></div></>;
}
export function SaveFeedback(){const {error,busy,pending,retry,discard,message}=useMatch();return <div aria-live="polite">{error&&<div className="error-banner"><b>{error}</b>{pending&&<div className="button-row"><button className="button primary" disabled={busy} onClick={()=>void retry()}>Retry saved action</button><button className="button secondary" onClick={()=>{if(confirm('Discard the unsaved action and load the server score? Check the score before recording it again.'))discard();}}>Discard & reload</button><a href={sitePath("/admin/")} className="text-button">Sign in again</a></div>}</div>}{pending&&!error&&!busy&&<div className="error-banner"><b>This device has an unsaved action. Resolve it before scoring.</b><div className="button-row"><button className="button primary" onClick={()=>void retry()}>Retry saved action</button><button className="button secondary" onClick={()=>{if(confirm('Discard this pending action?'))discard();}}>Discard & reload</button></div></div>}<div className="save-feedback">{busy?'Saving score…':message||'All saved. Ready for the next ball.'}</div></div>;}
export function Modal({title,onClose,children}:{title:string;onClose:()=>void;children:React.ReactNode}){
 const ref=useRef<HTMLDialogElement>(null);
 useEffect(()=>{const d=ref.current;d?.showModal();return()=>d?.close();},[]);
 return <dialog ref={ref} className="modal" onCancel={onClose}><div className="modal-heading"><h2>{title}</h2><button aria-label="Close dialog" className="icon-button" onClick={onClose}><X size={21}/></button></div>{children}</dialog>;
}
