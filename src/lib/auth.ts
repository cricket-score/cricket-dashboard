import { createHmac,timingSafeEqual,scryptSync } from 'node:crypto';
import { cookies } from 'next/headers';
export const COOKIE='cricket_scorer';
function secret(){const s=process.env.SESSION_SECRET;if(!s||s.length<32)throw new Error('Set SESSION_SECRET to at least 32 characters');return s;}
export function verifyPassword(value:string){const expected=process.env.ADMIN_PASSWORD;if(!expected||expected.length<8)throw new Error('Set ADMIN_PASSWORD to at least 8 characters');return timingSafeEqual(scryptSync(value,'cricket-password',32),scryptSync(expected,'cricket-password',32));}
export function token(){const expires=String(Date.now()+12*60*60*1000);return `${expires}.${createHmac('sha256',secret()).update(expires).digest('hex')}`;}
export async function authenticated(){const value=(await cookies()).get(COOKIE)?.value;if(!value)return false;const [expiry,sig]=value.split('.');if(!expiry||!sig||Number(expiry)<Date.now())return false;const expected=createHmac('sha256',secret()).update(expiry).digest('hex');return sig.length===expected.length&&timingSafeEqual(Buffer.from(sig),Buffer.from(expected));}
export function sameOrigin(req:Request){
  const origin=req.headers.get('origin');
  if(!origin)return true;
  const host=req.headers.get('host');
  if(!host)return false;
  const forwarded=req.headers.get('x-forwarded-proto');
  const protocol=forwarded?.split(',')[0]?.trim() || new URL(req.url).protocol.replace(':','');
  return origin===`${protocol}://${host}`;
}
