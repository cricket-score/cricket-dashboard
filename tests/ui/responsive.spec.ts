import {test,expect} from '@playwright/test';
import {append,derive} from '../../src/lib/scoring/engine';
import {defaultMatch,type Match,type RecordData} from '../../src/lib/scoring/model';

function fixture():Match {
 let match=defaultMatch();
 match.config.date='2026-10-04';match.config.venue='School Cricket Ground, Singapore';
 const names=['R. Sharma','M. Chen','T. Iqbal','A. Perera','K. Silva','L. Fernandez','S. Kumar','D. Patel','V. Rao','A. Singh','J. Lee'];
 match.config.teams[0].players.forEach((p,n)=>p.name=names[n]);
 match.config.teams[1].players[0].name='D. Fernando';match.config.teams[1].players[1].name='S. Perera';
 let sequence=0;const stamp=()=>({id:`fixture-${++sequence}`,at:'2026-10-04T04:30:00Z'});
 match=append(match,{kind:'start',...stamp(),striker:'blue-1',nonStriker:'blue-2',bowler:'red-1'});
 let incoming=3,doubles=39;
 for(let n=0;n<92;n++){
  let i=derive(match).current!;
  if(i.needsBowler){match=append(match,{kind:'players',...stamp(),striker:i.striker,nonStriker:i.nonStriker,bowler:i.bowler==='red-1'?'red-2':'red-1'});i=derive(match).current!;}
  const wicket=[20,45,70].includes(n);
  const runs=wicket?0:doubles-->0?2:1;
  match=append(match,{kind:'ball',...stamp(),bat:runs,extra:'none',extraRuns:0,...(wicket?{wicket:{player:i.striker,how:'Bowled' as const,incoming:`blue-${incoming++}`}}:{})});
 }
 return match;
}

test.beforeEach(async({context})=>{
 let row:RecordData={id:'school-match',data:fixture(),revision:1,operation_id:null,updated_at:'2026-10-04T04:30:00Z'};
 await context.route('**/api/session',route=>route.fulfill({json:{authenticated:true}}));
 await context.route('**/api/match',async route=>{
  if(route.request().method()==='PUT'){
   const request=route.request().postDataJSON();derive(request.data);
   row={...row,data:request.data,revision:row.revision+1,operation_id:request.operationId};
  }
  await route.fulfill({json:row});
 });
});

for(const width of [360,390,768,1024,1440]){
 test(`responsive public scoreboard at ${width}px`,async({page})=>{
  await page.setViewportSize({width,height:1000});
  await page.goto('http://localhost:3100/live');
  await expect(page.locator('.score-value')).toHaveText('128/3');
  await expect(page.locator('.last-deliveries .ball')).toHaveCount(6);
  await expect(page.getByRole('link',{name:'Scorer',exact:true})).toHaveCount(0);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
  await page.screenshot({path:`test-results/ui/live-${width}.png`,fullPage:true,animations:'disabled'});
  await page.getByRole('tab',{name:'Scorecard',exact:true}).click();
  await expect(page.locator('.total-row')).toContainText('128/3');
  await expect(page.getByRole('heading',{name:'Did not bat'})).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
  await page.screenshot({path:`test-results/ui/scorecard-${width}.png`,fullPage:true,animations:'disabled'});
  await page.getByRole('tab',{name:'Ball by ball',exact:true}).focus();
  await page.keyboard.press('ArrowRight');
  await expect(page.getByRole('tab',{name:'Match info',exact:true})).toHaveAttribute('aria-selected','true');
 });
}

test('mobile scorer records, undoes, and handles extras with the new controls',async({page})=>{
 await page.setViewportSize({width:390,height:1000});
 await page.goto('http://localhost:3100/admin');
 await expect(page.locator('.scorer-score strong')).toHaveText('128/3');
 await page.screenshot({path:'test-results/ui/scorer-390.png',fullPage:true,animations:'disabled'});
 await page.getByRole('button',{name:'4 FOUR',exact:true}).click();
 await expect(page.locator('.scorer-score strong')).toHaveText('132/3');
 page.on('dialog',dialog=>dialog.accept());
 await page.getByRole('button',{name:'Undo last ball',exact:true}).click();
 await expect(page.locator('.scorer-score strong')).toHaveText('128/3');
 await page.getByRole('button',{name:'Wide',exact:true}).click();
 await expect(page.locator('.scorer-score strong')).toHaveText('129/3');
 await page.getByRole('button',{name:'Leg Bye',exact:true}).click();
 await expect(page.getByRole('dialog')).toBeVisible();
 await expect(page.getByRole('button',{name:'Leg byes',exact:true})).toHaveClass('selected');
 await page.getByRole('button',{name:'Record 1 run',exact:true}).click();
 await expect(page.locator('.scorer-score strong')).toHaveText('130/3');
 await page.getByRole('tab',{name:'Scorecard',exact:true}).click();
 await expect(page.locator('.total-row')).toContainText('130/3');
 await page.getByRole('tab',{name:'Players',exact:true}).click();
 await expect(page.locator('.squad-grid li')).toHaveCount(22);
 await page.getByRole('tab',{name:'Settings',exact:true}).click();
 await expect(page.getByRole('link',{name:'Edit match setup',exact:true})).toBeVisible();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
});

test('reduced motion and pre-match state remain usable',async({page})=>{
 await page.emulateMedia({reducedMotion:'reduce'});
 await page.route('**/api/match',route=>route.fulfill({json:{id:'school-match',data:defaultMatch(),revision:0,operation_id:null,updated_at:'2026-10-04T04:30:00Z'}}));
 await page.goto('http://localhost:3100/live');
 await expect(page.locator('.score-value')).toHaveText('0/0');
 await expect(page.getByText('A fresh innings awaits')).toBeVisible();
 expect(await page.locator('.score-value').evaluate(el=>getComputedStyle(el).animationName)).toBe('none');
});

for(const width of [768,1024]){
 test(`scorer controls at ${width}px`,async({page})=>{
  await page.setViewportSize({width,height:1100});
  await page.goto('http://localhost:3100/admin');
  await expect(page.locator('.scorer-score strong')).toHaveText('128/3');
  await expect(page.getByRole('button',{name:'Wicket',exact:true})).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
  await page.screenshot({path:`test-results/ui/scorer-${width}.png`,fullPage:true,animations:'disabled'});
 });
}

test('new boundaries celebrate briefly, historical ones do not replay',async({page})=>{
 await page.goto('http://localhost:3100/live');
 await expect(page.locator('.score-value')).toHaveText('128/3');
 await expect(page.locator('.delivery-moment')).toHaveCount(0);
 const next=append(fixture(),{kind:'ball',id:'live-boundary',at:'2026-10-04T05:00:00Z',bat:4,extra:'none',extraRuns:0});
 await page.evaluate(async data=>{await fetch('/api/match',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({data,revision:1,operationId:'visual-boundary'})});},next);
 await expect(page.locator('.score-value')).toHaveText('132/3');
 await expect(page.locator('.delivery-moment')).toHaveText('Four!');
 await expect(page.locator('.delivery-moment')).toHaveCount(0,{timeout:4000});
 await page.reload();
 await expect(page.locator('.score-value')).toHaveText('132/3');
 await expect(page.locator('.delivery-moment')).toHaveCount(0);
});

test('failed saves keep scoring locked until the pending action is resolved',async({page})=>{
 await page.goto('http://localhost:3100/admin');
 await expect(page.locator('.scorer-score strong')).toHaveText('128/3');
 await page.route('**/api/match',async route=>{
  if(route.request().method()==='PUT')await route.fulfill({status:503,json:{error:'Test connection interrupted'}});
  else await route.fallback();
 });
 await page.getByRole('button',{name:'4 FOUR',exact:true}).click();
 await expect(page.getByText('Test connection interrupted')).toBeVisible();
 await expect(page.getByRole('button',{name:'6 SIX',exact:true})).toBeDisabled();
 await expect(page.getByRole('button',{name:'Retry saved action'})).toBeVisible();
 await expect(page.locator('.scorer-score strong')).toHaveText('128/3');
});
