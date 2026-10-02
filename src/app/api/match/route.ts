import { NextResponse } from 'next/server';
import { z } from 'zod';
import { authenticated,sameOrigin } from '@/lib/auth';
import { readMatch,saveMatch,localMode } from '@/lib/database/store';
import { matchSchema } from '@/lib/scoring/model';
import { derive } from '@/lib/scoring/engine';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export async function GET(){try{return NextResponse.json({...await readMatch(),local:localMode()},{headers:{'Cache-Control':'no-store'}});}catch(e){console.error(e);return NextResponse.json({error:'Cannot load match. Check database configuration or retry.'},{status:503});}}
const requestSchema=z.object({data:matchSchema,revision:z.number().int().nonnegative(),operationId:z.string().uuid()});
export async function PUT(req:Request){
  if(!sameOrigin(req))return NextResponse.json({error:'Invalid request origin'},{status:403});
  try{
    if(!await authenticated())return NextResponse.json({error:'Your scorer session expired. Sign in again; your pending score is saved on this device.'},{status:401});
    const raw=await req.text();if(raw.length>1500000)return NextResponse.json({error:'Match is too large'},{status:413});
    const {data,revision,operationId}=requestSchema.parse(JSON.parse(raw));derive(data);
    const old=await readMatch();
    if(old.data.events.length&&data.events.length){
      const before=old.data.config,after=data.config;
      if(before.overs!==after.overs||before.tossWinner!==after.tossWinner||before.tossDecision!==after.tossDecision||before.freeHit!==after.freeHit||JSON.stringify(before.teams.map(t=>[t.id,t.players.map(p=>p.id)]))!==JSON.stringify(after.teams.map(t=>[t.id,t.players.map(p=>p.id)])))throw new Error('Overs, toss, playing rules and player IDs are locked once scoring starts. Names and logos can still be edited.');
    }
    return NextResponse.json(await saveMatch(data,revision,operationId));
  }catch(e){if(e instanceof Error&&e.message==='CONFLICT')return NextResponse.json({error:'Another save changed the match. Reload the latest score before trying again.'},{status:409});if(e instanceof z.ZodError)return NextResponse.json({error:e.issues[0]?.message??'Invalid match data'},{status:400});return NextResponse.json({error:e instanceof Error?e.message:'Save failed'},{status:400});}
}
