import { z } from 'zod';
const id = z.string().min(1).max(80);
const name = z.string().trim().min(1).max(80);
const logo = z.string().max(100000).refine(v => !v || /^https:\/\//.test(v) || /^\/images\//.test(v) || /^data:image\/(png|jpeg|webp);base64,/.test(v), 'Use an HTTPS image URL, local image, or PNG/JPEG/WebP upload');
export const configSchema = z.object({
  event: name, title: name, venue: name, date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), overs: z.number().int().min(1).max(20), logo,
  teams: z.tuple([z.object({id, name, color: z.string().regex(/^#[0-9a-f]{6}$/i), logo, players: z.array(z.object({id,name})).length(11)}), z.object({id,name,color:z.string().regex(/^#[0-9a-f]{6}$/i),logo,players:z.array(z.object({id,name})).length(11)})]),
  tossWinner: id, tossDecision: z.enum(['bat','bowl']), freeHit: z.boolean(),
}).superRefine((c,ctx) => {
  const ids = c.teams.flatMap(t => [t.id,...t.players.map(p=>p.id)]);
  if (new Set(ids).size !== ids.length) ctx.addIssue({code:'custom',message:'Team and player IDs must be unique'});
  if (!c.teams.some(t=>t.id===c.tossWinner)) ctx.addIssue({code:'custom',message:'Select a toss winner'});
});
export const dismissalSchema = z.enum(['Bowled','Caught','Run out','LBW','Stumped','Hit wicket','Other']);
export const ballSchema = z.object({kind:z.literal('ball'),id,at:z.string(),bat:z.number().int().min(0).max(6),extra:z.enum(['none','wide','no-ball','bye','leg-bye']),extraRuns:z.number().int().min(0).max(6), noBallAdditional:z.enum(['bat','bye','leg-bye']).optional(), boundary:z.boolean().optional(),wicket:z.object({player:id,how:dismissalSchema,incoming:id.optional(),fielder:id.optional(),nextStriker:id.optional()}).optional()});
export const eventSchema = z.discriminatedUnion('kind',[
  ballSchema,
  z.object({kind:z.literal('start'),id,at:z.string(),striker:id,nonStriker:id,bowler:id}),
  z.object({kind:z.literal('players'),id,at:z.string(),striker:id,nonStriker:id,bowler:id}),
  z.object({kind:z.literal('retire'),id,at:z.string(),player:id,incoming:id.optional(),out:z.boolean()}),
  z.object({kind:z.literal('end'),id,at:z.string()}),
  z.object({kind:z.literal('super'),id,at:z.string()}),
  z.object({kind:z.literal('finish'),id,at:z.string()}),
]);
export const matchSchema = z.object({config:configSchema,events:z.array(eventSchema).max(2000)});
export type Config = z.infer<typeof configSchema>;
export type Team = Config['teams'][number];
export type Ball = z.infer<typeof ballSchema>;
export type MatchEvent = z.infer<typeof eventSchema>;
export type Match = z.infer<typeof matchSchema>;
export type RecordData = {id:string;revision:number;data:Match;updated_at:string;operation_id:string|null};
export type Batter = {id:string;runs:number;balls:number;fours:number;sixes:number;status:string};
export type Bowler = {id:string;balls:number;runs:number;wickets:number;maidens:number};
export type Delivery = {event:Ball;label:string;symbol:string;text:string;striker:string;nonStriker:string;bowler:string;total:number};
export type Innings = {index:number;team:string;fielding:string;superOver:boolean;limit:number;wicketLimit:number;runs:number;wickets:number;balls:number;striker:string;nonStriker:string;bowler:string;previousBowler:string;needsBowler:boolean;batters:Record<string,Batter>;bowlers:Record<string,Bowler>;extras:{wide:number;noBall:number;bye:number;legBye:number};partnership:{runs:number;balls:number};deliveries:Delivery[];ended:boolean;freeHit:boolean;overCharged:number;overBowlers:string[];target?:number};
export type State = {innings:Innings[];current?:Innings;status:'READY'|'FIRST_INNINGS'|'INNINGS_BREAK'|'SECOND_INNINGS'|'TIED'|'SUPER_OVER'|'AWAITING_FINISH'|'COMPLETED';result:string;nextTeam:string;superPending:boolean};
export const overs = (balls:number) => `${Math.floor(balls/6)}.${balls%6}`;
export const rate = (runs:number,balls:number) => balls ? (runs*6/balls).toFixed(2) : '0.00';
export const playerName = (c:Config,id:string) => c.teams.flatMap(t=>t.players).find(p=>p.id===id)?.name ?? '—';
export function defaultMatch():Match {
  const worldXI=['Senitha','Senithu','Ometh','Yewin','Vinuja','Kaveesha','Naveesha','Manthusha','Rusiru','Hirusha','Kumidu'];
  const asianXI=['Wethum','Netharu','Kemitha','Sayul','Ranuja','Kumidu','Gayuka','Sanuth','Sithuja','Dinuja','Raheel'];
  return {config:{event:'The School Cricket Festival',title:'The Friendship Trophy',venue:'School Cricket Ground',date:'2026-10-02',overs:20,logo:'',teams:[{id:'blue',name:'World XI',color:'#2463eb',logo:'/images/world-xi.jpeg',players:worldXI.map((name,i)=>({id:`blue-${i+1}`,name}))},{id:'red',name:'Asian XI',color:'#dc554b',logo:'/images/asian-xi.jpeg',players:asianXI.map((name,i)=>({id:`red-${i+1}`,name}))}],tossWinner:'blue',tossDecision:'bat',freeHit:true},events:[]};
}
