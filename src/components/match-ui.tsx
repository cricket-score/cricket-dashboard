'use client';
import {useEffect,useRef,useState} from 'react';
import {Check,Share2} from 'lucide-react';
import {sitePath} from '../lib/database/browser';
import type {Innings} from '../lib/scoring/model';

export function ShareMatch({title='Boundary · Live cricket'}:{title?:string}) {
  const [copied,setCopied]=useState(false);
  const timer=useRef<ReturnType<typeof setTimeout>|null>(null);
  useEffect(()=>()=>{if(timer.current)clearTimeout(timer.current);},[]);
  async function share(){
    const url=new URL(sitePath('/live/'),window.location.href).href;
    try{
      if(navigator.share)await navigator.share({title,url});
      else {await navigator.clipboard.writeText(url);setCopied(true);if(timer.current)clearTimeout(timer.current);timer.current=setTimeout(()=>setCopied(false),2500);}
    }catch{/* Canceling the native share sheet requires no feedback. */}
  }
  return <button className="share-match" onClick={()=>void share()} aria-label={copied?'Match link copied':'Share match'}>{copied?<Check size={17}/>:<Share2 size={17}/>}<span>{copied?'Link copied':'Share match'}</span></button>;
}

export function MatchTabs({items,value,onChange,label}:{items:string[];value:string;onChange:(value:string)=>void;label:string}){
  return <div className="content-tabs" role="tablist" aria-label={label}>{items.map((item,index)=><button key={item} role="tab" aria-selected={value===item} tabIndex={value===item?0:-1} className={value===item?'selected':''} onClick={()=>onChange(item)} onKeyDown={event=>{
    let next=index;
    if(event.key==='ArrowRight')next=(index+1)%items.length;
    else if(event.key==='ArrowLeft')next=(index+items.length-1)%items.length;
    else if(event.key==='Home')next=0;
    else if(event.key==='End')next=items.length-1;
    else return;
    event.preventDefault();onChange(items[next]);(event.currentTarget.parentElement?.children[next] as HTMLButtonElement)?.focus();
  }}>{item}{value===item&&<span className="green-dot"/>}</button>)}</div>;
}

// Celebrate newly received deliveries, never an old boundary on initial load.
export function DeliveryMoment({innings}:{innings?:Innings}){
  const last=innings?.deliveries.at(-1);
  const id=last?.event.id,symbol=last?.symbol,count=innings?.deliveries.length;
  const previous=useRef({id,count:count??0});
  const [moment,setMoment]=useState<{id:string;text:string;wicket:boolean}|null>(null);
  useEffect(()=>{
    const added=previous.current.id!==id&&(count??0)>previous.current.count;
    previous.current={id,count:count??0};
    setMoment(null);
    if(!added||!id||!symbol||!['4','6','W'].includes(symbol))return;
    setMoment({id,text:symbol==='W'?'Wicket!':symbol==='6'?'Six!':'Four!',wicket:symbol==='W'});
    const timer=setTimeout(()=>setMoment(null),2200);
    return()=>clearTimeout(timer);
  },[id,symbol,count]);
  return <div className="moment-region" aria-live="polite">{moment&&<span key={moment.id} className={`delivery-moment ${moment.wicket?'is-wicket':''}`}>{moment.text}</span>}</div>;
}
