import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';

function getAppOrigin(req: NextRequest): string {
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, '');
  }
  const forwardedHost = req.headers.get('x-forwarded-host');
  const forwardedProto = req.headers.get('x-forwarded-proto') || 'https';
  if (forwardedHost) {
    return `${forwardedProto}://${forwardedHost}`;
  }
  return req.nextUrl.origin;
}

export async function GET(req: NextRequest) {
  try {
    const appOrigin = getAppOrigin(req);
    const returnUrl = req.nextUrl.searchParams.get('returnUrl') || '/dashboard';
    const clientId = process.env.GOOGLE_CLIENT_ID || process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

    // If custom Google credentials are not configured on the server, gracefully delegate to Supabase Auth
    if (!clientId || !clientSecret) {
      console.info('[Google OAuth] Custom credentials not configured. Gracefully delegating to Supabase OAuth endpoint.');
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://jzxgmikliwilyfpixskm.supabase.co';
      const callbackUrl = `${appOrigin}/auth/callback?returnUrl=${encodeURIComponent(returnUrl)}`;
      const supabaseAuthUrl = new URL(`${supabaseUrl.replace(/\/$/, '')}/auth/v1/authorize`);
      supabaseAuthUrl.searchParams.set('provider', 'google');
      supabaseAuthUrl.searchParams.set('redirect_to', callbackUrl);
      return NextResponse.redirect(supabaseAuthUrl.toString(), 302);
    }

    const redirectUri = `${appOrigin}/api/auth/callback/google`;

    // Generate cryptographic nonce for CSRF protection
    const nonce = crypto.randomBytes(16).toString('hex');
    const statePayload = {
      nonce,
      returnUrl,
      origin: appOrigin,
      ts: Date.now()
    };
    const state = Buffer.from(JSON.stringify(statePayload)).toString('base64url');

    const googleAuthUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    googleAuthUrl.searchParams.set('client_id', clientId.trim());
    googleAuthUrl.searchParams.set('redirect_uri', redirectUri);
    googleAuthUrl.searchParams.set('response_type', 'code');
    googleAuthUrl.searchParams.set('scope', 'openid email profile');
    googleAuthUrl.searchParams.set('access_type', 'offline');
    googleAuthUrl.searchParams.set('prompt', 'select_account');
    googleAuthUrl.searchParams.set('state', state);

    const response = NextResponse.redirect(googleAuthUrl.toString(), 302);

    // Save nonce in a secure HTTP-only cookie for CSRF validation
    response.cookies.set('tc_oauth_state', nonce, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 600, // 10 minutes
    });

    return response;
  } catch (error: any) {
    console.error('[Google OAuth] Error initiating OAuth flow:', error);
    return NextResponse.redirect(
      new URL('/login?error=' + encodeURIComponent('ወደ Google መግቢያ መሄድ አልተቻለም። እባክዎ በድጋሚ ይሞክሩ።'), req.url)
    );
  }
}
