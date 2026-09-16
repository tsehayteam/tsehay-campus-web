import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { supabaseServer, supabaseAdmin } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

function verifyScryptPassword(password: string, storedHash: string): boolean {
  try {
    const parts = storedHash.split(':');
    if (parts.length === 3 && parts[0] === 'scrypt') {
      const salt = parts[1];
      const expectedHash = parts[2];
      const actualHashBuf = crypto.scryptSync(password, salt, 64);
      const expectedHashBuf = Buffer.from(expectedHash, 'hex');
      if (actualHashBuf.length === expectedHashBuf.length) {
        return crypto.timingSafeEqual(actualHashBuf, expectedHashBuf);
      }
    }
    return false;
  } catch (e) {
    return false;
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json({ 
        success: false, 
        error: 'እባክዎ የ Gmail አድራሻዎን እና የይለፍ ቃልዎን ያስገቡ።' 
      }, { status: 400 });
    }

    const cleanEmail = String(email).trim().toLowerCase();
    const cleanPass = String(password).trim();

    let resolvedProfile: any = null;
    let storedPasswordHash = '';
    let targetUid = '';

    // 1. Check profiles table first
    try {
      const { data: profile } = await supabaseServer
        .from('profiles')
        .select('*')
        .ilike('email', cleanEmail)
        .maybeSingle();

      if (profile) {
        resolvedProfile = profile;
        targetUid = profile.id;
        if (profile.password_hash) {
          storedPasswordHash = profile.password_hash;
        }
      }
    } catch (profErr) {
      console.warn('Profile fetch warning in sync-login:', profErr);
    }

    // 2. Fallback check in site_settings auth_sync
    if (!storedPasswordHash) {
      try {
        const authSyncKey = `auth_sync_${cleanEmail.replace(/[^a-zA-Z0-9]/g, '_')}`;
        const { data: syncRecord } = await supabaseServer
          .from('site_settings')
          .select('data')
          .eq('key', authSyncKey)
          .maybeSingle();

        if (syncRecord?.data?.password_hash) {
          storedPasswordHash = syncRecord.data.password_hash;
          if (!targetUid && syncRecord.data.uid) {
            targetUid = syncRecord.data.uid;
          }
        }
      } catch (syncErr) {
        console.warn('Site settings auth sync fetch warning:', syncErr);
      }
    }

    if (!storedPasswordHash) {
      return NextResponse.json({ 
        success: false, 
        error: 'የይለፍ ቃል ወይም የ Gmail አድራሻ ልክ አይደለም።' 
      }, { status: 401 });
    }

    // 3. Verify Password Hash
    const isPasswordValid = verifyScryptPassword(cleanPass, storedPasswordHash);
    if (!isPasswordValid) {
      return NextResponse.json({ 
        success: false, 
        error: 'የይለፍ ቃል ወይም የ Gmail አድራሻ ልክ አይደለም።' 
      }, { status: 401 });
    }

    // 4. Password verified! Attempt to heal Supabase Auth GoTrue in background
    try {
      if (targetUid) {
        await supabaseAdmin.auth.admin.updateUserById(targetUid, {
          password: cleanPass,
          email_confirm: true
        });
      } else {
        const { data: usersData } = await supabaseAdmin.auth.admin.listUsers();
        const existing = usersData?.users?.find(u => u.email?.toLowerCase() === cleanEmail);
        if (existing) {
          targetUid = existing.id;
          await supabaseAdmin.auth.admin.updateUserById(existing.id, {
            password: cleanPass,
            email_confirm: true
          });
        }
      }
    } catch (healErr) {
      console.warn('Supabase Auth heal attempt notice in sync-login:', healErr);
    }

    const displayName = resolvedProfile?.name || 
                        resolvedProfile?.full_name || 
                        resolvedProfile?.displayName || 
                        cleanEmail.split('@')[0] || 
                        'ተማሪ';

    const photoURL = resolvedProfile?.avatar_url || 
                     resolvedProfile?.photoURL || 
                     `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=f9b03c&color=111827&bold=true`;

    const userPayload = {
      uid: targetUid || cleanEmail,
      id: targetUid || cleanEmail,
      email: cleanEmail,
      displayName,
      photoURL,
      phone: resolvedProfile?.phone || null,
      city: resolvedProfile?.city || null,
      role: resolvedProfile?.role || 'student',
      isAdmin: Boolean(resolvedProfile?.is_admin || resolvedProfile?.isAdmin)
    };

    return NextResponse.json({
      success: true,
      user: userPayload,
      message: 'በተሳካ ሁኔታ ገብተዋል!'
    });

  } catch (error: any) {
    console.error('Error in sync-login route:', error);
    return NextResponse.json({ 
      success: false, 
      error: error?.message || 'ስርዓቱ ላይ ስህተት ተፈጥሯል፤ እባክዎ በድጋሚ ይሞክሩ።' 
    }, { status: 500 });
  }
}
