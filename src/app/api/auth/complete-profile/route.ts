import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const {
      uid,
      fullName,
      email,
      phone,
      city,
      source = 'Google',
      avatarUrl,
      referredBy
    } = body;

    const cleanUid = (uid || '').trim();
    const cleanName = (fullName || '').trim();
    const cleanEmail = (email || '').trim().toLowerCase();
    const cleanPhone = (phone || '').trim();
    const cleanCity = (city || '').trim();

    if (!cleanUid) {
      return NextResponse.json({ success: false, error: 'User UID is required' }, { status: 400 });
    }
    if (!cleanName) {
      return NextResponse.json({ success: false, error: 'Full name is required' }, { status: 400 });
    }
    if (!cleanPhone || cleanPhone.replace(/[^0-9]/g, '').length < 7) {
      return NextResponse.json({ success: false, error: 'Valid phone number is required (min 7 digits)' }, { status: 400 });
    }

    const now = new Date().toISOString();

    const profileData = {
      id: cleanUid,
      full_name: cleanName,
      display_name: cleanName,
      email: cleanEmail || null,
      phone: cleanPhone,
      city: cleanCity || null,
      source: source || 'Google',
      avatar_url: avatarUrl || null,
      referred_by: referredBy || null,
      role: 'student',
      updated_at: now
    };

    // 1. Upsert into profiles table
    const { error: profileErr } = await supabaseServer
      .from('profiles')
      .upsert(profileData);

    if (profileErr) {
      console.warn('[complete-profile] profiles upsert notice:', profileErr);
    }

    // 2. Upsert into users table for cross-compatibility
    try {
      await supabaseServer.from('users').upsert({
        id: cleanUid,
        name: cleanName,
        email: cleanEmail || null,
        phone: cleanPhone,
        city: cleanCity || null,
        source: source || 'Google',
        photoURL: avatarUrl || null,
        role: 'student',
        updated_at: now
      });
    } catch (uErr) {
      console.warn('[complete-profile] users table upsert notice:', uErr);
    }

    return NextResponse.json({
      success: true,
      profile: profileData
    });

  } catch (error: any) {
    console.error('[complete-profile] Server error:', error);
    return NextResponse.json({ success: false, error: error?.message || 'Server error' }, { status: 500 });
  }
}
