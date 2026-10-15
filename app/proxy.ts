import {NextRequest,NextResponse} from 'next/server';
export function proxy(req:NextRequest){if(req.nextUrl.pathname.startsWith('/eve')||req.nextUrl.pathname.startsWith('/s')||req.nextUrl.pathname.startsWith('/.well-known'))return NextResponse.json({error:'Private agent runtime is disabled on the public demo'},{status:403});return NextResponse.next();}
export const config={matcher:['/eve/:path*','/s/:path*','/.well-known/:path*']};
