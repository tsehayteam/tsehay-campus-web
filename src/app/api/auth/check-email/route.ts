import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer, supabaseAdmin, supabaseServiceRoleKey } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { email } = body;

    if (!email || typeof email !== 'string') {
      return NextResponse.json({ exists: false, error: 'Email required' }, { status: 400 });
    }

    const cleanEmail = email.trim().toLowerCase();

    // Strict validation
    if (!cleanEmail.includes('@')) {
      return NextResponse.json({ exists: false });
    }

    let userExists = false;
    let displayName = '';
    let photoURL = '';
    let uid = '';

    const db = supabaseAdmin || supabaseServer;

    // 1. Check profiles table (case-insensitive)
    try {
      const { data: profile } = await db
        .from('profiles')
        .select('*')
        .ilike('email', cleanEmail)
        .maybeSingle();

      if (profile) {
        userExists = true;
        uid = profile.id;
        displayName = profile.name || profile.displayName || profile.full_name || '';
        photoURL = profile.avatar_url || profile.photoURL || '';
      }
    } catch (err: any) {
      console.warn('[check-email] Supabase profile check warning:', err?.message || err);
    }

    // 2. Check users table if still not detected
    if (!userExists) {
      try {
        const { data: userRow } = await db
          .from('users')
          .select('*')
          .ilike('email', cleanEmail)
          .maybeSingle();

        if (userRow) {
          userExists = true;
          uid = userRow.id;
          displayName = userRow.name || userRow.displayName || userRow.full_name || '';
          photoURL = userRow.photoURL || userRow.avatar_url || '';
        }
      } catch (err: any) {
        console.warn('[check-email] Supabase users table check warning:', err?.message || err);
      }
    }

    // 3. Check Supabase Auth Users directly via Admin API if service role key exists
    if (!userExists && supabaseServiceRoleKey) {
      try {
        const { data: { users }, error: listErr } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 });
        if (!listErr && users && users.length > 0) {
          const matchedUser = users.find(u => u.email?.toLowerCase() === cleanEmail);
          if (matchedUser) {
            userExists = true;
            uid = matchedUser.id;
            displayName = matchedUser.user_metadata?.full_name || matchedUser.user_metadata?.name || '';
            photoURL = matchedUser.user_metadata?.avatar_url || matchedUser.user_metadata?.picture || '';
          }
        }
      } catch (adminAuthErr) {
        console.warn('[check-email] Supabase Auth admin check warning:', adminAuthErr);
      }
    }

    return NextResponse.json({
      exists: userExists,
      email: cleanEmail,
      displayName,
      photoURL,
      uid
    });

  } catch (error: any) {
    console.error('Error in check-email route:', error);
    return NextResponse.json({ exists: false });
  }
}
