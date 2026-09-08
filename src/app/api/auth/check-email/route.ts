import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase/server';

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

    try {
      const { data: profile } = await supabaseServer
        .from('profiles')
        .select('*')
        .eq('email', cleanEmail)
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

    return NextResponse.json({
      exists: userExists,
      email: cleanEmail,
      displayName,
      photoURL
    });

  } catch (error: any) {
    console.error('Error in check-email route:', error);
    return NextResponse.json({ exists: false });
  }
}
