'use client';
import {useState} from 'react';
import {ArrowDownToLine,ArrowUpRight,CalendarDays,ChevronRight,Clock3,Flag,MapPin,Radio,Signal,TrendingUp,Trophy,UserRound,Users} from 'lucide-react';
import {useMatch} from './match-provider';
import {Loading} from './shell';
import {DeliveryMoment,MatchTabs,ShareMatch} from './match-ui';
import {derive} from '@/lib/scoring/engine';
import {type Config,type Innings,type Team,overs,rate,playerName} from '@/lib/scoring/model';

export function Crest({team,large=false}:{team:Team;large?:boolean}){
 return <span className={`crest ${large?'large':''}`} style={{'--team-color':team.color} as React.CSSProperties}>{team.logo?<img src={team.logo} alt={`${team.name} logo`}/>:<><span>{team.name.split(' ').map(w=>w[0]).slice(0,2).join('')}</span><small>CRICKET CLUB</small><span className="crest-stars">★ ★ ★</span></>}</span>;
}
export function BallDots({innings}:{innings:Innings}){
 return <div className="ball-dots">{innings.deliveries.slice(-6).map(d=><span title={`${d.label} — ${d.text}`} aria-label={`${d.label}: ${d.text}`} key={d.event.id} className={`ball ${d.symbol==='W'?'wicket':['4','6'].includes(d.symbol)?'boundary':['WD','NB'].includes(d.symbol)?'extra':''}`}>{d.symbol==='0'?'•':d.symbol}</span>)}{!innings.deliveries.length&&<span className="muted">Waiting for the first delivery.</span>}</div>;
}
export function BattingTable({innings:i,config:c,activeOnly=false}:{innings:Innings;config:Config;activeOnly?:boolean}){
 const batters=activeOnly?[i.striker,i.nonStriker].map(id=>i.batters[id]):Object.values(i.batters).filter(b=>b.status!=='Yet to bat');
 return <div className="table-scroll"><table className="crease-table"><thead><tr><th>Batter</th><th>R</th><th>B</th><th>4s</th><th>6s</th><th>SR</th></tr></thead><tbody>{batters.map(b=><tr key={b.id} className={b.id===i.striker&&!i.ended?'striker-row':''}><td><span className={`batter-dot ${b.id===i.striker&&!i.ended?'on-strike':''}`}/><strong>{playerName(c,b.id)}{b.id===i.striker&&!i.ended?' *':''}</strong>{!activeOnly&&<small>{b.status}</small>}</td><td><b>{b.runs}</b></td><td>{b.balls}</td><td>{b.fours}</td><td>{b.sixes}</td><td>{b.balls?(b.runs*100/b.balls).toFixed(1):'—'}</td></tr>)}</tbody>{!activeOnly&&<tfoot><tr><td colSpan={6}><b>Extras</b> <span>{Object.values(i.extras).reduce((a,b)=>a+b,0)} <span className="muted">(b {i.extras.bye}, lb {i.extras.legBye}, w {i.extras.wide}, nb {i.extras.noBall})</span></span></td></tr><tr className="total-row"><td>Total</td><td colSpan={5}><b>{i.runs}/{i.wickets}</b> <span>({overs(i.balls)} overs)</span></td></tr></tfoot>}</table></div>;
}
export function BowlingTable({innings:i,config:c,activeOnly=false}:{innings:Innings;config:Config;activeOnly?:boolean}){
 const bowlers=activeOnly?[i.bowlers[i.bowler]]:Object.values(i.bowlers).filter(b=>b.balls||b.runs||b.wickets||b.id===i.bowler);
 return <div className="table-scroll"><table><thead><tr><th>Bowler</th><th>O</th><th>M</th><th>R</th><th>W</th><th>ECON</th></tr></thead><tbody>{bowlers.map(b=><tr key={b.id}><td><strong>{playerName(c,b.id)}</strong></td><td>{overs(b.balls)}</td><td>{b.maidens}</td><td>{b.runs}</td><td><b>{b.wickets}</b></td><td>{rate(b.runs,b.balls)}</td></tr>)}</tbody></table></div>;
}
export function Scorecards({innings:i,config:c}:{innings:Innings;config:Config}){
 const waiting=Object.values(i.batters).filter(b=>b.status==='Yet to bat');
 return <div className="scorecards"><div className="scorecard-batting"><div className="card"><div className="card-heading"><h3><span className="bat-icon"/>Batting</h3><span className="eyebrow">{c.teams.find(t=>t.id===i.team)?.name}</span></div><BattingTable innings={i} config={c}/></div>{waiting.length>0&&<div className="card waiting-batters"><div className="card-heading"><h3><UserRound size={19}/>Did not bat</h3></div><ul>{waiting.map(b=><li key={b.id}><UserRound size={17}/>{playerName(c,b.id)}</li>)}</ul></div>}</div><div className="card"><div className="card-heading"><h3><span className="cricket-ball"/>Bowling</h3><span className="eyebrow">{c.teams.find(t=>t.id===i.fielding)?.name}</span></div><BowlingTable innings={i} config={c}/></div></div>;
}
export function Squads({config:c}:{config:Config}){
 return <div className="squad-grid">{c.teams.map(t=><div key={t.id}><h3><Crest team={t}/>{t.name}</h3><ol>{t.players.map(p=><li key={p.id}>{p.name}</li>)}</ol></div>)}</div>;
}
export function LiveDashboard(){
 const {record,connected}=useMatch(),[tab,setTab]=useState('Overview'),[selected,setSelected]=useState<number|null>(null);
 if(!record)return <Loading/>;
 const m=record.data,c=m.config,s=derive(m),i=s.current;
 const team=(id:string)=>c.teams.find(t=>t.id===id)!;
 const batting=team(i?.team??s.nextTeam),fielding=c.teams.find(t=>t.id!==batting.id)!;
 const completed=s.status==='COMPLETED',ready=s.status==='READY',live=!!i&&!i.ended&&!completed;
 const chosen=s.innings[selected??(s.innings.length-1)];
 const opponentInnings=s.innings.slice().reverse().find(x=>x.team===fielding.id&&x.superOver===!!i?.superOver);
 const remaining=i?Math.max(0,i.limit-i.balls):c.overs*6;
 const status=completed?'Match completed':ready?'Match day':s.status==='INNINGS_BREAK'?'Innings break':s.status==='TIED'?'Match tied':s.status==='AWAITING_FINISH'?'Result pending':'Live';
 const inningsLabel=i?.superOver?'Super Over':i?`${i.index===0?'1st':'2nd'} Innings`:'The stage is set';
 const exportMatch=()=>{const blob=new Blob([JSON.stringify(m,null,2)],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='cricket-match-archive.json';a.click();URL.revokeObjectURL(a.href);};
 return <div className={`live-page ${tab!=='Overview'?'detail-view':''}`}>
 <section className="stadium-hero" aria-label="Live match summary"><div className="stadium-inner">
 <div className="page-topline"><div className="breadcrumb">MATCH CENTRE <ChevronRight size={12}/> {c.overs}-OVER FRIENDLY</div></div>
 <div className="page-title"><div>{c.logo&&<div className="event-label"><img src={c.logo} alt="Event logo"/>{c.event}</div>}<h1>{c.title}<span className="title-dot">.</span></h1><div className="match-meta"><span><CalendarDays size={15}/>{new Date(c.date+'T12:00:00').toLocaleDateString('en-GB',{day:'numeric',month:'long',year:'numeric'})}</span><span><MapPin size={15}/>{c.venue}</span><span className="desktop-match-status"><Signal size={15}/>{connected?status:'Reconnecting…'}</span></div></div><span className={`status-pill ${live?'live':''}`}>{live&&<span className="pulse"/>}{status}</span></div>
 <div className="hero-score"><div className="innings-label"><span/>{inningsLabel}<span/></div><div className="hero-matchup">
 <div className="hero-team home-team"><Crest team={batting} large/><h2>{batting.name}</h2></div><span className="match-versus">VS</span><div className="hero-team away-team"><Crest team={fielding} large/><h2>{fielding.name}</h2><p>{opponentInnings?`${opponentInnings.runs}/${opponentInnings.wickets}`:ready?'Ready to play':'Yet to bat'}</p></div>
 <div className="hero-total"><div className="score-number" aria-live="polite" aria-atomic="true"><span key={`${i?.index}-${i?.runs}-${i?.wickets}`} className="score-value">{i?.runs??0}/{i?.wickets??0}</span></div><div className="hero-overs">{i?overs(i.balls):'0.0'} <span>/ {i?.superOver?1:c.overs} overs</span></div><div className="overs-progress" role="progressbar" aria-label="Innings overs completed" aria-valuemin={0} aria-valuemax={i?.limit??c.overs*6} aria-valuenow={i?.balls??0}><span style={{width:`${i?Math.min(100,i.balls/i.limit*100):0}%`}}/></div><small className="overs-left">{overs(remaining)} overs remaining</small></div>
 <DeliveryMoment innings={i}/>
 <p className="hero-match-note"><Flag size={17}/>{s.result||(i?.target?`${batting.name} need ${Math.max(0,i.target-i.runs)} runs from ${remaining} balls`:s.status==='INNINGS_BREAK'?`Target for ${team(s.nextTeam).name}: ${i!.runs+1}`:ready?`${team(c.tossWinner).name} won the toss and chose to ${c.tossDecision}`:`${batting.name} are batting ${i?.index===0?'first':'second'}.`)}</p>
 </div></div>
 <div className="stat-grid"><Stat icon={<TrendingUp/>} label="Current run rate" value={i?rate(i.runs,i.balls):'0.00'} detail="runs per over"/><Stat icon={<Clock3/>} label={i?.target?'Target':'Overs remaining'} value={i?.target?String(i.target):overs(remaining)} detail={i?.target?'runs to win':'in this innings'}/><Stat icon={<UserRound/>} label="Partnership" value={`${i?.partnership.runs??0} (${i?.partnership.balls??0})`} detail="runs (balls)"/><Stat icon={<Signal/>} label={i?.target?'Required run rate':'Projected score'} value={i?.target?rate(Math.max(0,i.target-i.runs),remaining):i?.balls?String(Math.round(i.runs/i.balls*i.limit)):'—'} detail={i?.target?'runs per over':'at current run rate'}/></div>
 </div></section>
 <section className="match-content" aria-label="Match details"><MatchTabs items={['Overview','Scorecard','Ball by ball','Match info']} value={tab} onChange={setTab} label="Match views"/>
 <div key={tab} className="tab-panel" role="tabpanel" aria-label={tab}>
 {tab==='Overview'&&<div className="overview-grid"><div className="overview-main">
 <div className="card crease-card"><div className="card-heading"><h3><span className="bat-icon"/>At the crease</h3><span className="eyebrow">{batting.name}</span></div>{i?<BattingTable innings={i} config={c} activeOnly/>:<div className="empty-state"><Users size={26}/><h4>A fresh innings awaits</h4><p>The opening batters will appear here when play begins.</p></div>}</div>
 <div className="card bowler-card"><div className="card-heading"><h3><span className="cricket-ball"/>With the ball</h3><span className="eyebrow">{fielding.name}</span></div>{i?<BowlingTable innings={i} config={c} activeOnly/>:<p className="card-placeholder">Waiting for the opening bowler.</p>}</div>
 <div className="card latest-card"><div className="card-heading"><h3><Clock3 size={20}/>Latest from the middle</h3><button className="text-button green" onClick={()=>setTab('Ball by ball')}>All deliveries <ArrowUpRight size={14}/></button></div><Feed innings={i} limit={5}/></div>
 </div><aside><div className="card last-deliveries"><div className="card-heading"><h3><Clock3 size={20}/>Last 6 deliveries</h3></div>{i?<BallDots innings={i}/>:<div className="empty-balls">{Array.from({length:6},(_,n)=><span key={n}>—</span>)}</div>}</div>
 <div className="card match-info"><div className="card-heading"><h3><Flag size={20}/>Match details</h3></div><Info icon={<Flag size={17}/>} label="The toss" value={`${team(c.tossWinner).name} chose to ${c.tossDecision}`}/><Info icon={<MapPin size={17}/>} label="The ground" value={c.venue}/><Info icon={<Clock3 size={17}/>} label="The format" value={`${c.overs} overs · 11 players a side`}/></div>
 <div className="spirit-card"><div className="spirit-icon" aria-hidden="true">✳</div><span className="eyebrow">SCHOOL CRICKET</span><h3>Big <span>cheers.</span><br/>Little legends.</h3><p>Wherever you’re watching, you’re part of the team.</p><ShareMatch title={c.title}/></div>
 </aside></div>}
 {(tab==='Scorecard'||tab==='Ball by ball')&&<><div className="innings-tabs">{s.innings.map((x,n)=><button aria-pressed={chosen===x} className={chosen===x?'selected':''} onClick={()=>setSelected(n)} key={n}>{team(x.team).name}{x.superOver?' · Super Over':''} <b>{x.runs}/{x.wickets}</b></button>)}</div>{chosen?(tab==='Scorecard'?<Scorecards innings={chosen} config={c}/>:<div className="card"><div className="card-heading"><h3>Every ball, as it happened</h3><span className="eyebrow">NEWEST FIRST</span></div><Feed innings={chosen}/></div>):<div className="card empty-state"><Trophy/><h3>The story starts with the first ball.</h3><p>Check back when the innings begins.</p></div>}</>}
 {tab==='Match info'&&<div className="card full-info"><h2>{c.title}</h2><p>{c.event} · {c.venue} · {c.date}</p><p>{team(c.tossWinner).name} won the toss and elected to {c.tossDecision}.</p><p>{c.overs} overs per innings. Free hits {c.freeHit?'enabled':'disabled'}.</p><Squads config={c}/><button className="button secondary" onClick={exportMatch}><ArrowDownToLine size={16}/> Download match archive</button></div>}
 </div>{completed&&<div className="result-banner"><Trophy size={24}/><div><b>{s.result}</b><p>Thanks for being part of the game. Full scorecards and every delivery stay here.</p></div></div>}
 </section></div>;
}
function Stat({icon,label,value,detail}:{icon:React.ReactNode;label:string;value:string;detail:string}){return <div className="stat"><span className="stat-icon">{icon}</span><div><span className="eyebrow">{label}</span><strong>{value}</strong><small>{detail}</small></div></div>;}
function Info({icon,label,value}:{icon:React.ReactNode;label:string;value:string}){return <div className="info-row"><span>{icon}</span><div><small>{label}</small><p>{value}</p></div></div>;}
function Feed({innings,limit}:{innings?:Innings;limit?:number}){const list=innings?.deliveries.slice().reverse();return <div className="feed">{list?.length?(limit?list.slice(0,limit):list).map(d=><div className="feed-row" key={d.event.id}><span className="feed-over">{d.label}</span><span className={`ball ${d.symbol==='W'?'wicket':['4','6'].includes(d.symbol)?'boundary':''}`}>{d.symbol==='0'?'•':d.symbol}</span><div><strong>{d.text}</strong></div></div>):<div className="empty-state compact"><Radio size={24}/><p>We’re ready when they are. Follow every delivery here.</p></div>}</div>;}
