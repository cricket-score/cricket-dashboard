import { type Match,type MatchEvent,type Innings,type State,type Ball,overs,playerName,matchSchema } from './model';
function check(condition:unknown,message:string):asserts condition { if(!condition) throw new Error(message); }
const swap=(i:Innings)=>{[i.striker,i.nonStriker]=[i.nonStriker,i.striker];};
function eligible(i:Innings,id:string) {return !!i.batters[id] && ['Yet to bat','Retired hurt'].includes(i.batters[id].status);}
function active(i:Innings,id:string){return !!i.batters[id] && ['Yet to bat','Retired hurt','Not out'].includes(i.batters[id].status);}
function resultFor(m:Match,first:Innings,second:Innings) {
  const team=(id:string)=>m.config.teams.find(t=>t.id===id)!.name;
  const suffix=second.superOver?' in the Super Over':'';
  if(second.runs>first.runs) return `${team(second.team)} won by ${second.wicketLimit-second.wickets} wicket${second.wicketLimit-second.wickets===1?'':'s'}${suffix}`;
  if(second.runs===first.runs) return 'Match tied';
  return `${team(first.team)} won by ${first.runs-second.runs} run${first.runs-second.runs===1?'':'s'}${suffix}`;
}
export function derive(input:Match):State {
  const m=matchSchema.parse(input); const c=m.config;
  const other=(id:string)=>c.teams.find(t=>t.id!==id)!.id;
  const firstTeam=c.tossDecision==='bat'?c.tossWinner:other(c.tossWinner);
  const state:State={innings:[],status:'READY',result:'',nextTeam:firstTeam,superPending:false};
  const ids=new Set<string>();
  for(const e of m.events) {
    check(!ids.has(e.id),'Duplicate event'); ids.add(e.id);
    check(state.status!=='COMPLETED','Completed matches cannot be changed. Undo completion first.');
    let i=state.current;
    if(e.kind==='start') {
      check(!i || i.ended,'End the current innings first');
      check(state.status==='READY'||state.status==='INNINGS_BREAK'||state.superPending,'An innings cannot start now');
      const team=state.nextTeam, fielding=other(team),superOver=state.innings.length>=2;
      i={index:state.innings.length,team,fielding,superOver,limit:superOver?6:c.overs*6,wicketLimit:superOver?2:10,runs:0,wickets:0,balls:0,striker:e.striker,nonStriker:e.nonStriker,bowler:e.bowler,previousBowler:'',needsBowler:false,batters:Object.fromEntries(c.teams.find(t=>t.id===team)!.players.map(p=>[p.id,{id:p.id,runs:0,balls:0,fours:0,sixes:0,status:'Yet to bat'}])),bowlers:Object.fromEntries(c.teams.find(t=>t.id===fielding)!.players.map(p=>[p.id,{id:p.id,balls:0,runs:0,wickets:0,maidens:0}])),extras:{wide:0,noBall:0,bye:0,legBye:0},partnership:{runs:0,balls:0},deliveries:[],ended:false,freeHit:false,overCharged:0,overBowlers:[]};
      check(e.striker!==e.nonStriker && i.batters[e.striker]&&i.batters[e.nonStriker]&&i.bowlers[e.bowler],'Select two different batters and a bowler from the opposing team');
      i.batters[e.striker].status=i.batters[e.nonStriker].status='Not out';
      if(i.index%2===1) i.target=state.innings[i.index-1].runs+1;
      state.innings.push(i);state.current=i;state.superPending=false;
    } else if(e.kind==='super') {
      check(state.status==='TIED','Super Over is available only after a tie');
      state.superPending=true;state.nextTeam=i!.team;state.status='SUPER_OVER';state.result='';continue;
    } else if(e.kind==='finish') {
      check(state.status==='TIED'||state.status==='AWAITING_FINISH','Both innings must be finished first');state.status='COMPLETED';continue;
    } else {
      check(i,'Start an innings first');check(!i.ended,'This innings has ended. Undo or correct an earlier delivery first.');
      if(e.kind==='players') {
        check(e.striker!==e.nonStriker&&active(i,e.striker)&&active(i,e.nonStriker)&&i.bowlers[e.bowler],'Invalid player correction: select available batters and an opposing bowler');
        check(!i.needsBowler||e.bowler!==i.previousBowler,'Choose a different bowler for the next over');
        const pair=[e.striker,e.nonStriker];
        check([i.striker,i.nonStriker].every(id=>pair.includes(id)),'Use Retire to replace an active batter');
        i.striker=e.striker;i.nonStriker=e.nonStriker;i.bowler=e.bowler;i.needsBowler=false;
      } else if(e.kind==='retire') {
        check([i.striker,i.nonStriker].includes(e.player),'Only an active batter can retire');
        i.batters[e.player].status=e.out?'Retired out':'Retired hurt';if(e.out)i.wickets++;
        const available=Object.keys(i.batters).filter(id=>eligible(i!,id)&&id!==e.player);
        if(i.wickets<i.wicketLimit&&available.length) {check(e.incoming&&e.incoming!==e.player&&eligible(i,e.incoming),'Select an available replacement batter');i.batters[e.incoming].status='Not out';if(i.striker===e.player)i.striker=e.incoming;else i.nonStriker=e.incoming;}else i.ended=true;
        i.partnership={runs:0,balls:0};
      } else if(e.kind==='end') {i.ended=true;}
      else if(e.kind==='ball') {scoreBall(m,i,e);}
    }
    i=state.current!;
    if(i.balls>=i.limit||i.wickets>=i.wicketLimit||(i.target!==undefined&&i.runs>=i.target))i.ended=true;
    if(i.ended) {
      if(i.index%2===0){state.status='INNINGS_BREAK';state.nextTeam=other(i.team);}
      else {state.result=resultFor(m,state.innings[i.index-1],i);state.status=state.result==='Match tied'?'TIED':'AWAITING_FINISH';}
    }else state.status=i.superOver?'SUPER_OVER':i.index===0?'FIRST_INNINGS':'SECOND_INNINGS';
  }
  return state;
}
function scoreBall(m:Match,i:Innings,e:Ball) {
  check(!i.needsBowler,'Select the next bowler before recording a ball');
  const wd=e.extra==='wide',nb=e.extra==='no-ball',bye=e.extra==='bye',lb=e.extra==='leg-bye';
  check(!wd||e.bat===0,'Wides cannot include bat runs');
  check(!(bye||lb)||e.bat===0,'Byes cannot include bat runs');
  check(e.extra!=='none'||e.extraRuns===0,'A normal delivery cannot include extras');
  check(e.extra==='none'||e.extraRuns>=1,'Extras must include at least one run');
  check(!nb||e.noBallAdditional!=='bat'||e.extraRuns===1,'No-ball bat runs require exactly one penalty run');
  check(!nb||!e.noBallAdditional||e.noBallAdditional==='bat'||e.bat===0,'No-ball byes cannot include bat runs');
  check(!nb||e.extraRuns===1||e.noBallAdditional==='bye'||e.noBallAdditional==='leg-bye','Choose byes or leg byes for additional no-ball extras');
  if(e.wicket){
    const w=e.wicket;check([i.striker,i.nonStriker].includes(w.player),'The dismissed batter is not on the field after this correction');
    check(['Run out','Other'].includes(w.how)||w.player===i.striker,'This dismissal must apply to the striker');
    check(!nb||['Run out','Other'].includes(w.how),'Only a run-out or applicable Other dismissal is allowed on a no-ball');
    check(!wd||['Run out','Stumped','Hit wicket','Other'].includes(w.how),'This dismissal is not allowed on a wide');
    check(!i.freeHit||['Run out','Other'].includes(w.how),'On a free hit only a run-out or applicable Other dismissal is allowed');
    check(['Run out','Other'].includes(w.how)||e.bat===0 && (e.extraRuns===0||wd&&e.extraRuns===1),'Completed runs apply only to a run-out or Other dismissal');
    check(!w.fielder||!!i.bowlers[w.fielder],'Fielder must belong to the fielding team');
  }
  const legal=!wd&&!nb, total=e.bat+e.extraRuns;
  const striker=i.striker,nonStriker=i.nonStriker,bowler=i.bowler;
  const batter=i.batters[striker],b=i.bowlers[bowler];
  check(batter.status==='Not out'&&i.batters[nonStriker].status==='Not out','Select available batters');
  const label=`${Math.floor(i.balls/6)}.${i.balls%6+1}`;
  i.runs+=total;i.partnership.runs+=total;
  if(!wd)batter.balls++;
  batter.runs+=e.bat;
  if(e.boundary!==false){if(e.bat===4)batter.fours++;if(e.bat===6)batter.sixes++;}
  if(legal){i.balls++;b.balls++;i.partnership.balls++;}
  let charged=e.bat;
  if(wd){i.extras.wide+=e.extraRuns;charged+=e.extraRuns;}
  if(nb){i.extras.noBall++;charged++;if(e.noBallAdditional==='bye')i.extras.bye+=e.extraRuns-1;if(e.noBallAdditional==='leg-bye')i.extras.legBye+=e.extraRuns-1;}
  if(bye)i.extras.bye+=e.extraRuns;if(lb)i.extras.legBye+=e.extraRuns;
  b.runs+=charged;i.overCharged+=charged;if(!i.overBowlers.includes(bowler))i.overBowlers.push(bowler);
  const running=e.bat+e.extraRuns-(wd||nb?1:0);
  if(running%2)swap(i);
  if(e.wicket){
    const w=e.wicket;
    // A winning extra ends the chase before a later wicket can occur.
    check(!(i.target&&i.runs>=i.target),'The target has been reached; record the winning runs without a wicket');
    i.wickets++;i.batters[w.player].status=`${w.how}${w.fielder?` (${playerName(m.config,w.fielder)})`:''}`;
    if(!['Run out','Other'].includes(w.how))b.wickets++;
    if(i.wickets<i.wicketLimit&&i.balls<i.limit){check(w.incoming&&eligible(i,w.incoming),'Select an available incoming batter');i.batters[w.incoming].status='Not out';if(i.striker===w.player)i.striker=w.incoming;else i.nonStriker=w.incoming;}
    if(w.nextStriker){check([i.striker,i.nonStriker].includes(w.nextStriker),'Next striker must be one of the remaining batters');if(i.striker!==w.nextStriker)swap(i);}
    i.partnership={runs:0,balls:0};
  }
  if(legal&&i.balls%6===0){
    if(i.overCharged===0&&i.overBowlers.length===1)b.maidens++;
    i.overCharged=0;i.overBowlers=[];i.previousBowler=i.bowler;i.needsBowler=true;swap(i);
  }
  if(m.config.freeHit){if(nb)i.freeHit=true;else if(legal)i.freeHit=false;}
  let symbol=e.bat===0?'•':String(e.bat),text=e.bat===0?'No run':e.bat===4?'FOUR!':e.bat===6?'SIX!':`${e.bat} run${e.bat===1?'':'s'}`;
  if(wd){symbol='WD';text=`${e.extraRuns} wide${e.extraRuns===1?'':'s'}`;}
  if(nb){symbol='NB';text=`No ball${total>1?` + ${total-1} ${e.noBallAdditional==='bye'?'byes':e.noBallAdditional==='leg-bye'?'leg byes':'bat runs'}`:''}`;}
  if(bye||lb){symbol=`${e.extraRuns}${bye?'B':'LB'}`;text=`${e.extraRuns} ${bye?'bye':'leg bye'}${e.extraRuns===1?'':'s'}`;}
  if(e.wicket){symbol='W';text=`WICKET! ${playerName(m.config,e.wicket.player)} — ${e.wicket.how}${total?` (${total} run${total===1?'':'s'})`:''}`;}
  i.deliveries.push({event:e,label,symbol,text,striker,nonStriker,bowler,total});
}
export function append(m:Match,e:MatchEvent):Match {const next={...m,events:[...m.events,e]};derive(next);return next;}
export function undoLastBall(m:Match):Match {
  const index=m.events.findLastIndex(e=>e.kind==='ball');check(index>=0,'There are no deliveries to undo');
  const next={...m,events:m.events.slice(0,index)};derive(next);return next;
}
export function correctBall(m:Match,id:string,ball:Ball):Match {
  check(m.events.some(e=>e.id===id&&e.kind==='ball'),'Delivery not found');
  const next={...m,events:m.events.map(e=>e.id===id?{...ball,id,at:e.at}:e)};derive(next);return next;
}
export function summary(i:Innings){return `${i.runs}/${i.wickets} (${overs(i.balls)})`;}
