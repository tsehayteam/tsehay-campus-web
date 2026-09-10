import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { uid, email } = body;

    const cleanUid = (uid || '').trim();
    const cleanEmail = (email || '').trim().toLowerCase();

    if (!cleanUid && !cleanEmail) {
      return NextResponse.json({ isRegistered: false, error: 'UID or email required' }, { status: 400 });
    }

    let isRegistered = false;
    let resolvedProfile: any = null;

    // 1. Check profiles table by UID or Email
    try {
      let query = supabaseServer.from('profiles').select('*');
      if (cleanUid && cleanEmail) {
        query = query.or(`id.eq.${cleanUid},email.ilike.${cleanEmail}`);
      } else if (cleanUid) {
        query = query.eq('id', cleanUid);
      } else {
        query = query.ilike('email', cleanEmail);
      }

      const { data: profiles, error: profileErr } = await query.limit(1);

      if (!profileErr && profiles && profiles.length > 0) {
        const found = profiles[0];
        isRegistered = true;
        resolvedProfile = found;

        // If the profile was found by email but has a different ID or empty ID, sync the UID
        if (cleanUid && found.id !== cleanUid) {
          try {
            await supabaseServer
              .from('profiles')
              .update({ id: cleanUid, updated_at: new Date().toISOString() })
              .eq('id', found.id);
          } catch (syncErr) {}
        }
      }
    } catch (err) {
      console.warn('[check-registration] Profile query warning:', err);
    }

    // 2. Check enrollments table if not already confirmed
    if (!isRegistered) {
      try {
        let enrQuery = supabaseServer.from('enrollments').select('id, user_id, user_email, course_id, course_title');
        if (cleanUid && cleanEmail) {
          enrQuery = enrQuery.or(`user_id.eq.${cleanUid},user_email.ilike.${cleanEmail}`);
        } else if (cleanUid) {
          enrQuery = enrQuery.eq('user_id', cleanUid);
        } else {
          enrQuery = enrQuery.ilike('user_email', cleanEmail);
        }

        const { data: enrollments, error: enrErr } = await enrQuery.limit(1);

        if (!enrErr && enrollments && enrollments.length > 0) {
          isRegistered = true;
        }
      } catch (err) {
        console.warn('[check-registration] Enrollments query warning:', err);
      }
    }

    // 3. Check users table if still not confirmed
    if (!isRegistered) {
      try {
        let usersQuery = supabaseServer.from('users').select('*');
        if (cleanUid && cleanEmail) {
          usersQuery = usersQuery.or(`id.eq.${cleanUid},email.ilike.${cleanEmail}`);
        } else if (cleanUid) {
          usersQuery = usersQuery.eq('id', cleanUid);
        } else {
          usersQuery = usersQuery.ilike('email', cleanEmail);
        }

        const { data: userRows, error: userErr } = await usersQuery.limit(1);

        if (!userErr && userRows && userRows.length > 0) {
          isRegistered = true;
          if (!resolvedProfile) {
            resolvedProfile = userRows[0];
          }
        }
      } catch (err) {
        console.warn('[check-registration] Users table query warning:', err);
      }
    }

    // Format safe profile response
    const profileResponse = resolvedProfile ? {
      id: resolvedProfile.id || cleanUid,
      name: resolvedProfile.full_name || resolvedProfile.name || resolvedProfile.displayName || '',
      displayName: resolvedProfile.display_name || resolvedProfile.full_name || resolvedProfile.name || '',
      email: resolvedProfile.email || cleanEmail,
      phone: resolvedProfile.phone || resolvedProfile.phone_number || '',
      city: resolvedProfile.city || '',
      photoURL: resolvedProfile.avatar_url || resolvedProfile.photoURL || '',
      role: resolvedProfile.role || 'student'
    } : null;

    return NextResponse.json({
      isRegistered,
      profile: profileResponse,
      email: cleanEmail,
      uid: cleanUid
    });

  } catch (error: any) {
    console.error('[check-registration] Error:', error);
    return NextResponse.json({ isRegistered: false, error: error?.message || 'Server error' });
  }
}
