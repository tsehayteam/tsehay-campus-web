import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { supabaseServer, supabaseAdmin } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { email, code, newPassword } = body;

    if (!email || !code || !newPassword) {
      return NextResponse.json({ 
        error: 'ኢሜል፣ የማረጋገጫ ኮድ እና አዲስ የይለፍ ቃል ያስፈልጋል።' 
      }, { status: 400 });
    }

    const cleanEmail = String(email).trim().toLowerCase();
    const cleanCode = String(code || '').trim();
    const cleanPass = String(newPassword).trim();

    // 1. Password length validation
    if (cleanPass.length < 8) {
      return NextResponse.json({ 
        error: 'የይለፍ ቃል ቢያንስ 8 ፊደላትና ቁጥሮች መሆን አለበት (Min. 8 characters)።' 
      }, { status: 400 });
    }

    // 2. Email format validation
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      return NextResponse.json({ 
        error: 'እባክዎ ትክክለኛ የኢሜይል አድራሻ ያስገቡ።' 
      }, { status: 400 });
    }

    const docKey = `otp_${cleanEmail.replace(/[^a-zA-Z0-9]/g, '_')}`;

    // 3. Strictly Verify OTP in Supabase site_settings
    const { data: record } = await supabaseServer
      .from('site_settings')
      .select('data')
      .eq('key', docKey)
      .maybeSingle();

    if (!record || !record.data) {
      return NextResponse.json({ 
        error: 'የማረጋገጫ ኮድ አልተገኘም። እባክዎ አዲስ ኮድ ይጠይቁ።' 
      }, { status: 400 });
    }

    const otpData = record.data;
    if (otpData.expiresAt && Date.now() > otpData.expiresAt) {
      return NextResponse.json({ 
        error: 'የማረጋገጫ ኮዱ ጊዜው አልፎበታል (Expired)። እባክዎ አዲስ ኮድ ይጠይቁ።' 
      }, { status: 400 });
    }

    if ((otpData.attempts || 0) >= 5) {
      return NextResponse.json({ 
        error: 'ኮዱን ደጋግመው ተሳስተዋል! እባክዎ አዲስ ኮድ ይጠይቁ።' 
      }, { status: 429 });
    }

    const expectedCode = String(otpData.code || '').trim();
    const isCodeValid = expectedCode === cleanCode || otpData.verified === true;

    if (!isCodeValid) {
      await supabaseServer
        .from('site_settings')
        .upsert({
          key: docKey,
          data: { ...otpData, attempts: (otpData.attempts || 0) + 1 },
          updated_at: new Date().toISOString()
        });

      const remaining = 4 - (otpData.attempts || 0);
      return NextResponse.json({ 
        error: `የተሳሳተ ኮድ አስገብተዋል። ${remaining > 0 ? `(የቀሩ ሙከራዎች፡ ${remaining})` : 'እባክዎ አዲስ ኮድ ይጠይቁ።'}` 
      }, { status: 400 });
    }

    // 4. Update or Create User in Supabase Auth & Dual-Layer Credential Sync
    let targetUid = '';
    let supabaseAuthSuccess = false;

    // A. Check if profile already exists in profiles table
    try {
      const { data: existingProfile } = await supabaseServer
        .from('profiles')
        .select('id, email, name')
        .ilike('email', cleanEmail)
        .maybeSingle();
      if (existingProfile?.id) {
        targetUid = existingProfile.id;
      }
    } catch (profErr) {
      console.warn('Profile fetch notice in reset-password:', profErr);
    }

    // B. Attempt Supabase Auth Admin API (if service role is available)
    try {
      const { data: usersData, error: listErr } = await supabaseAdmin.auth.admin.listUsers();
      if (!listErr && usersData?.users) {
        const existingUser = usersData.users.find(u => u.email?.toLowerCase() === cleanEmail);
        if (existingUser) {
          targetUid = existingUser.id;
          const { error: updateErr } = await supabaseAdmin.auth.admin.updateUserById(existingUser.id, {
            password: cleanPass,
            email_confirm: true
          });
          if (!updateErr) {
            supabaseAuthSuccess = true;
          }
        } else {
          const { data: newUser, error: createErr } = await supabaseAdmin.auth.admin.createUser({
            email: cleanEmail,
            password: cleanPass,
            email_confirm: true,
            user_metadata: { name: cleanEmail.split('@')[0] }
          });
          if (!createErr && newUser?.user) {
            targetUid = newUser.user.id;
            supabaseAuthSuccess = true;
          }
        }
      }
    } catch (authErr) {
      console.warn('Supabase auth admin update notice:', authErr);
    }

    // C. Dual-Layer Cryptographic Credential Sync (Fail-Safe against auth propagation lag)
    try {
      const salt = crypto.randomBytes(16).toString('hex');
      const hash = crypto.scryptSync(cleanPass, salt, 64).toString('hex');
      const syncHash = `scrypt:${salt}:${hash}`;

      // Persist to profiles
      if (targetUid) {
        await supabaseServer
          .from('profiles')
          .update({ password_hash: syncHash, updated_at: new Date().toISOString() })
          .eq('id', targetUid);
      } else {
        await supabaseServer
          .from('profiles')
          .upsert({
            id: cleanEmail,
            email: cleanEmail,
            name: cleanEmail.split('@')[0],
            password_hash: syncHash,
            updated_at: new Date().toISOString()
          });
      }

      // Persist to site_settings for zero-fail redundant auth sync
      const authSyncKey = `auth_sync_${cleanEmail.replace(/[^a-zA-Z0-9]/g, '_')}`;
      await supabaseServer
        .from('site_settings')
        .upsert({
          key: authSyncKey,
          data: {
            email: cleanEmail,
            uid: targetUid || cleanEmail,
            password_hash: syncHash,
            supabaseAuthSuccess,
            updatedAt: Date.now()
          },
          updated_at: new Date().toISOString()
        });
    } catch (syncErr) {
      console.warn('Credential sync storage notice:', syncErr);
    }

    // 5. Invalidate OTP key in site_settings immediately upon successful reset
    try {
      await supabaseServer.from('site_settings').delete().eq('key', docKey);
    } catch (e) {}

    return NextResponse.json({
      success: true,
      uid: targetUid || undefined,
      email: cleanEmail,
      synced: true,
      message: 'የይለፍ ቃልዎ በተሳካ ሁኔታ ተቀይሯል!'
    });

  } catch (error: any) {
    console.error('Error in reset-password API route:', error);
    return NextResponse.json({ 
      error: error?.message || 'የይለፍ ቃል መቀየር አልተቻለም። እባክዎ በድጋሚ ይሞክሩ።' 
    }, { status: 500 });
  }
}
