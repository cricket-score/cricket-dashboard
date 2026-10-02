'use client';
import Link from 'next/link';
import {usePathname} from 'next/navigation';
import {Activity,ArrowUpRight,Settings2,ShieldCheck,Trophy,Wifi,WifiOff} from 'lucide-react';
import {useMatch} from './match-provider';
export function Shell({children}:{children:React.ReactNode}){
 const pathname=usePathname(),{connected,local,record}=useMatch();
 return <><header className="site-header"><div className="header-inner"><Link href="/live" className="brand"><span className="brand-icon"><Trophy size={23}/></span><span>Boundary<span className="brand-dot">.</span><small>SCHOOL CRICKET, TOGETHER.</small></span></Link><nav aria-label="Main navigation"><Link href="/live" className={pathname==='/'||pathname==='/live'?'active':''}><Activity size={16}/> Live match</Link><Link href="/admin" className={pathname==='/admin'?'active':''}><ShieldCheck size={16}/> Scorer</Link><Link href="/setup" className={pathname==='/setup'?'active':''}><Settings2 size={16}/> Setup</Link></nav><span className={`connection ${connected?'':'offline'}`}>{connected?<Wifi size={14}/>:<WifiOff size={14}/>}<span>{local?'Local practice':connected?'Connected':'Reconnecting'}</span></span></div></header><main>{children}</main><footer className="site-footer"><span className="footer-brand">Boundary<span>.</span></span><span>A little competition. A lot of school spirit.</span><Link href="/admin">Scorer access <ArrowUpRight size={13}/></Link></footer>{record&&local&&<div className="demo-note">LOCAL PRACTICE · Saved on this computer · Connect Supabase before match day</div>}</>;
}
export function Loading(){const {error,reload}=useMatch();return <div className="loading card"><Trophy size={34}/><h2>{error?'Unable to load the match':'Getting the ground ready…'}</h2><p>{error||'Loading the latest score'}</p>{error&&<button className="button primary" onClick={()=>void reload()}>Try again</button>}</div>;}
