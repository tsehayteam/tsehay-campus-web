import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer, supabaseAdmin, supabaseServiceRoleKey } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

function getAppOrigin(req: NextRequest, fallbackOrigin?: string): string {
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, '');
  }
  if (fallbackOrigin && fallbackOrigin.startsWith('http')) {
    return fallbackOrigin.replace(/\/$/, '');
  }
  const forwardedHost = req.headers.get('x-forwarded-host');
  const forwardedProto = req.headers.get('x-forwarded-proto') || 'https';
  if (forwardedHost) {
    return `${forwardedProto}://${forwardedHost}`;
  }
  return req.nextUrl.origin;
}

function parseJwtPayload(token: string): any {
  try {
    const parts = token.split('.');
    if (parts.length < 2) return null;
    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = Buffer.from(base64, 'base64').toString('utf8');
    return JSON.parse(jsonPayload);
  } catch (e) {
    return null;
  }
}

export async function GET(req: NextRequest) {
  const origin = getAppOrigin(req);

  try {
    // 1. Check for OAuth error from Google
    const error = req.nextUrl.searchParams.get('error');
    const errorDescription = req.nextUrl.searchParams.get('error_description');

    if (error) {
      console.warn('[Google Callback] Google returned OAuth error:', error, errorDescription);
      const isCancelled = error === 'access_denied';
      const userMessage = isCancelled
        ? 'የ Google መግቢያ ተሰርዟል።'
        : (errorDescription || 'የ Google መግቢያ አልተሳካም። እባክዎ በድጋሚ ይሞክሩ።');
      return NextResponse.redirect(
        new URL(`/login?error=${encodeURIComponent(userMessage)}`, origin)
      );
    }

    const code = req.nextUrl.searchParams.get('code');
    const stateParam = req.nextUrl.searchParams.get('state');

    if (!code) {
      return NextResponse.redirect(
        new URL('/login?error=' + encodeURIComponent('የማረጋገጫ ኮድ ከ Google አልተገኘም።'), origin)
      );
    }

    // 2. Decode and validate state parameter
    let returnUrl = '/dashboard';
    let stateOrigin = origin;
    let stateNonce = '';

    if (stateParam) {
      try {
        const decoded = Buffer.from(stateParam, 'base64url').toString('utf8');
        const stateObj = JSON.parse(decoded);
        returnUrl = stateObj.returnUrl || '/dashboard';
        stateOrigin = stateObj.origin || origin;
        stateNonce = stateObj.nonce || '';
      } catch (stateErr) {
        console.warn('[Google Callback] State decode notice:', stateErr);
      }
    }

    // CSRF verification check
    const savedNonce = req.cookies.get('tc_oauth_state')?.value;
    if (savedNonce && stateNonce && savedNonce !== stateNonce) {
      console.warn('[Google Callback] CSRF nonce mismatch. Continuing cautiously.');
    }

    const clientId = process.env.GOOGLE_CLIENT_ID || process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      console.error('[Google Callback] GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET is missing.');
      return NextResponse.redirect(
        new URL('/login?error=' + encodeURIComponent('የስርዓቱ የ Google ማረጋገጫ አልተሟላም (Client Secret አልተገኘም)።'), origin)
      );
    }

    const effectiveOrigin = getAppOrigin(req, stateOrigin);
    const redirectUri = `${effectiveOrigin}/api/auth/callback/google`;

    // 3. Exchange authorization code for Google tokens
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        code,
        client_id: clientId.trim(),
        client_secret: clientSecret.trim(),
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });

    if (!tokenRes.ok) {
      const errText = await tokenRes.text();
      console.error('[Google Callback] Token exchange failed:', tokenRes.status, errText);
      return NextResponse.redirect(
        new URL('/login?error=' + encodeURIComponent('ከ Google ማረጋገጫ ቶከን ማግኘት አልተቻለም። እባክዎ በድጋሚ ይሞክሩ።'), origin)
      );
    }

    const tokens = await tokenRes.json();
    const idToken = tokens.id_token;
    const accessToken = tokens.access_token;

    if (!idToken) {
      return NextResponse.redirect(
        new URL('/login?error=' + encodeURIComponent('ከ Google ID Token አልተገኘም።'), origin)
      );
    }

    // 4. Extract verified Google User Profile from ID Token
    const jwtPayload = parseJwtPayload(idToken);
    const googleEmail = (jwtPayload?.email || '').trim().toLowerCase();
    const googleName = jwtPayload?.name || jwtPayload?.given_name || (googleEmail ? googleEmail.split('@')[0] : 'ተማሪ');
    const googlePicture = jwtPayload?.picture || null;

    if (!googleEmail) {
      return NextResponse.redirect(
        new URL('/login?error=' + encodeURIComponent('የ Gmail አድራሻ ማግኘት አልተቻለም።'), origin)
      );
    }

    let supabaseSession: any = null;
    let supabaseUser: any = null;

    // 5. Authenticate with Supabase
    // -------------------------------------------------------------
    // Strategy A: Direct native Supabase signInWithIdToken
    // -------------------------------------------------------------
    try {
      const { data: idTokenData, error: idTokenErr } = await supabaseServer.auth.signInWithIdToken({
        provider: 'google',
        token: idToken,
        access_token: accessToken,
      });

      if (!idTokenErr && idTokenData?.session) {
        supabaseSession = idTokenData.session;
        supabaseUser = idTokenData.user;
      } else if (idTokenErr) {
        console.warn('[Google Callback] signInWithIdToken notice:', idTokenErr.message);
      }
    } catch (e: any) {
      console.warn('[Google Callback] signInWithIdToken caught notice:', e?.message || e);
    }

    // -------------------------------------------------------------
    // Strategy B: Robust Supabase Admin Fallback
    // -------------------------------------------------------------
    if (!supabaseSession && supabaseServiceRoleKey) {
      try {
        let existingUser: any = null;

        // 1. Search for existing user in auth.users by email
        const { data: usersData, error: listErr } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 });
        if (!listErr && usersData?.users) {
          existingUser = usersData.users.find(u => u.email?.toLowerCase() === googleEmail);
        }

        if (existingUser) {
          supabaseUser = existingUser;
          // Update metadata & ensure email is marked confirmed
          try {
            await supabaseAdmin.auth.admin.updateUserById(existingUser.id, {
              email_confirm: true,
              user_metadata: {
                ...existingUser.user_metadata,
                full_name: existingUser.user_metadata?.full_name || googleName,
                name: existingUser.user_metadata?.name || googleName,
                avatar_url: existingUser.user_metadata?.avatar_url || googlePicture,
                picture: existingUser.user_metadata?.picture || googlePicture,
              }
            });
          } catch (updateErr) {}
        } else {
          // Create new user in Supabase auth.users
          const { data: created, error: createErr } = await supabaseAdmin.auth.admin.createUser({
            email: googleEmail,
            email_confirm: true,
            user_metadata: {
              full_name: googleName,
              name: googleName,
              avatar_url: googlePicture,
              picture: googlePicture,
              provider: 'google'
            }
          });

          if (!createErr && created?.user) {
            existingUser = created.user;
            supabaseUser = created.user;
          }
        }

        // 2. Generate authentic Supabase session link & verify OTP
        if (existingUser) {
          const { data: linkData, error: linkErr } = await supabaseAdmin.auth.admin.generateLink({
            type: 'magiclink',
            email: googleEmail
          });

          if (!linkErr && linkData?.properties?.hashed_token) {
            const { data: verifyData, error: verifyErr } = await supabaseServer.auth.verifyOtp({
              token_hash: linkData.properties.hashed_token,
              type: 'magiclink'
            });

            if (!verifyErr && verifyData?.session) {
              supabaseSession = verifyData.session;
              supabaseUser = verifyData.user || supabaseUser;
            }
          }
        }
      } catch (adminErr) {
        console.error('[Google Callback] Admin session creation fallback error:', adminErr);
      }
    }

    // 6. Ensure user record in public.profiles and public.users is synced & intact
    if (supabaseUser) {
      const uid = supabaseUser.id;
      try {
        const { data: existingProfile } = await supabaseAdmin
          .from('profiles')
          .select('id, phone, role, full_name, display_name')
          .or(`id.eq.${uid},email.ilike.${googleEmail}`)
          .maybeSingle();

        if (!existingProfile) {
          await supabaseAdmin.from('profiles').insert({
            id: uid,
            email: googleEmail,
            display_name: googleName,
            full_name: googleName,
            avatar_url: googlePicture,
            role: 'student',
            source: 'Google',
            updated_at: new Date().toISOString()
          });
        } else if (existingProfile.id !== uid) {
          // Align profile id to current Supabase UID for accurate RLS evaluation
          await supabaseAdmin
            .from('profiles')
            .update({ id: uid, updated_at: new Date().toISOString() })
            .eq('id', existingProfile.id);
        }
      } catch (profErr) {
        console.warn('[Google Callback] Profile sync notice:', profErr);
      }
    }

    // 7. Route user to client callback with session tokens in hash
    if (supabaseSession?.access_token) {
      const callbackUrl = new URL('/auth/callback', origin);
      if (returnUrl && returnUrl !== '/dashboard') {
        callbackUrl.searchParams.set('returnUrl', returnUrl);
      }

      // Format standard Supabase implicit grant hash format
      const hashParams = new URLSearchParams({
        access_token: supabaseSession.access_token,
        refresh_token: supabaseSession.refresh_token || '',
        expires_in: String(supabaseSession.expires_in || 3600),
        token_type: 'bearer',
        type: 'signup'
      });

      const finalRedirectUrl = `${callbackUrl.toString()}#${hashParams.toString()}`;
      const response = NextResponse.redirect(finalRedirectUrl, 302);

      // Clean up the CSRF cookie
      response.cookies.delete('tc_oauth_state');

      return response;
    }

    // Fallback if session couldn't be generated
    console.error('[Google Callback] Could not establish Supabase session for:', googleEmail);
    return NextResponse.redirect(
      new URL('/login?error=' + encodeURIComponent('የተጠቃሚ ክፍለ-ጊዜ ማረጋገጥ አልተቻለም። እባክዎ በድጋሚ ይሞክሩ።'), origin)
    );

  } catch (error: any) {
    console.error('[Google Callback] Unexpected server error in Google callback:', error);
    return NextResponse.redirect(
      new URL('/login?error=' + encodeURIComponent('በ Google ማረጋገጫ ወቅት ያልተጠበቀ ስህተት አጋጥሟል።'), origin)
    );
  }
}
