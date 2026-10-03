'use client';
import Link from 'next/link';
import {useState} from 'react';
import {usePathname} from 'next/navigation';
import {Activity,ArrowUpRight,Menu,Settings2,ShieldCheck,Trophy,Wifi,WifiOff,X} from 'lucide-react';
import {useMatch} from './match-provider';
import {ShareMatch} from './match-ui';
import {sitePath} from '../lib/database/browser';
import {derive} from '../lib/scoring/engine';
export function Shell({children}:{children:React.ReactNode}){
 const pathname=usePathname().replace(/\/$/,'')||'/',{connected,local,record,busy,pending}=useMatch();
 const [menu,setMenu]=useState(false);
 const matchStatus=record?derive(record.data).status:null;
 const publicStatus=matchStatus==='READY'?'Match day':matchStatus==='COMPLETED'?'Final':matchStatus==='INNINGS_BREAK'?'Break':matchStatus==='TIED'?'Tied':matchStatus==='AWAITING_FINISH'?'Result':matchStatus?'Live':'Loading';
 // Parent-facing pages never advertise editing routes, even on a signed-in device.
 const adminArea=pathname==='/admin'||pathname==='/setup';
 return <div className={`app-shell ${adminArea?'organizer-shell':'public-shell'}`} style={{'--stadium-image':`url("${sitePath('/images/stadium.webp')}")`} as React.CSSProperties}>
 <header className="site-header"><div className="header-inner"><Link href="/live" className="brand"><span className="brand-icon"><Trophy size={23}/></span><span>Boundary<span className="brand-dot">.</span><small>SCHOOL CRICKET, TOGETHER.</small></span></Link>
 <nav className="desktop-nav" aria-label="Main navigation"><Link href="/live" className={!adminArea?'active':''}><Activity size={16}/> Live match</Link>{adminArea&&<><Link href="/admin" className={pathname==='/admin'?'active':''}><ShieldCheck size={16}/> Scorer</Link><Link href="/setup" className={pathname==='/setup'?'active':''}><Settings2 size={16}/> Setup</Link></>}</nav>
 <div className="header-actions"><span className={`connection ${connected?'':'offline'}`}>{connected?<Wifi size={14}/>:<WifiOff size={14}/>}<span>{local?'Local practice':connected?'Connected':'Reconnecting'}</span></span><span className={`mobile-status ${!connected||pending?'offline':''}`}><span className="tiny-dot"/>{!connected?'Offline':busy?'Saving':pending?'Unsaved':adminArea?'Saved':publicStatus}</span><ShareMatch title={record?.data.config.title}/><button className="menu-toggle" aria-label={menu?'Close navigation':'Open navigation'} aria-expanded={menu} aria-controls="mobile-navigation" onClick={()=>setMenu(!menu)}>{menu?<X size={21}/>:<Menu size={21}/>}</button></div></div>
 {menu&&<nav id="mobile-navigation" className="mobile-navigation" aria-label="Mobile navigation"><Link href="/live" onClick={()=>setMenu(false)}><Activity size={17}/> Live match</Link>{adminArea&&<><Link href="/admin" onClick={()=>setMenu(false)}><ShieldCheck size={17}/> Scorer</Link><Link href="/setup" onClick={()=>setMenu(false)}><Settings2 size={17}/> Match setup</Link></>}<ShareMatch title={record?.data.config.title}/></nav>}</header>
 <main>{children}</main><footer className="site-footer"><span className="footer-brand">Boundary<span>.</span></span><span>A little competition. A lot of school spirit.</span>{adminArea&&<Link href="/admin">Scorer access <ArrowUpRight size={13}/></Link>}</footer>{record&&local&&<div className="demo-note">LOCAL PRACTICE · Saved on this computer · Connect Supabase before match day</div>}</div>;
}
export function Loading(){const {error,reload}=useMatch();return <div className="loading card"><Trophy size={34}/><h2>{error?'Unable to load the match':'Getting the ground ready…'}</h2><p>{error||'Loading the latest score'}</p>{error&&<button className="button primary" onClick={()=>void reload()}>Try again</button>}</div>;}
