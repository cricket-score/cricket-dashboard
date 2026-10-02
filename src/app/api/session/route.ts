import { NextResponse } from 'next/server';
import { authenticated,COOKIE,sameOrigin,token,verifyPassword } from '@/lib/auth';
export const runtime='nodejs';
export async function GET(){try{return NextResponse.json({authenticated:await authenticated()},{headers:{'Cache-Control':'no-store'}});}catch{return NextResponse.json({authenticated:false});}}
export async function POST(req:Request){
  if(!sameOrigin(req))return NextResponse.json({error:'Invalid request origin'},{status:403});
  try{const {password}=await req.json();if(typeof password!=='string'||password.length>200)return NextResponse.json({error:'Enter your scorer password'},{status:400});
    if(!verifyPassword(password)){await new Promise(r=>setTimeout(r,1000));return NextResponse.json({error:'Incorrect password. Please try again.'},{status:401});}
    const res=NextResponse.json({authenticated:true});res.cookies.set(COOKIE,token(),{httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'strict',path:'/',maxAge:43200});return res;
  }catch(e){return NextResponse.json({error:e instanceof Error?e.message:'Sign-in failed'},{status:503});}
}
export async function DELETE(req:Request){if(!sameOrigin(req))return NextResponse.json({error:'Invalid origin'},{status:403});const res=NextResponse.json({authenticated:false});res.cookies.delete(COOKIE);return res;}
