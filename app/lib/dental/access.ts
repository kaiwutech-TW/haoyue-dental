import { timingSafeEqual } from 'node:crypto';
export function checkOrigin(req:Request){const origin=req.headers.get('origin');if(origin&&origin!==new URL(req.url).origin&&origin!==process.env.APP_ORIGIN)throw Error('不允許此來源');}
export function admin(req:Request){const expected=process.env.DEMO_ADMIN_TOKEN;const got=req.headers.get('authorization')?.replace(/^Bearer /,'');if(expected&&got&&expected.length===got.length&&timingSafeEqual(Buffer.from(expected),Buffer.from(got)))return;
 const host=new URL(req.url).hostname;if(process.env.NODE_ENV!=='production'&&['localhost','127.0.0.1','[::1]'].includes(host))return;throw Error('需要管理員登入');}
