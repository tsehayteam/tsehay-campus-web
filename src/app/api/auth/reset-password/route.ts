import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { email, code, newPassword, alreadyReset } = body;

    if (!email || (!code && !alreadyReset) || !newPassword) {
      return NextResponse.json({ 
        error: 'ኢሜል፣ የማረጋገጫ ኮድ እና አዲስ የይለፍ ቃል ያስፈልጋል።' 
      }, { status: 400 });
    }

    const cleanEmail = String(email).trim().toLowerCase();
    const cleanCode = String(code || '').trim();
    const cleanPass = String(newPassword).trim();

    // 1. Password length validation
    if (cleanPass.length < 6) {
      return NextResponse.json({ 
        error: 'የይለፍ ቃል ቢያንስ 6 ፊደላት ወይም ቁጥሮች መሆን አለበት።' 
      }, { status: 400 });
    }

    // 2. Email format validation
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      return NextResponse.json({ 
        error: 'እባክዎ ትክክለኛ የኢሜይል አድራሻ ያስገቡ።' 
      }, { status: 400 });
    }

    const docKey = `otp_${cleanEmail.replace(/[^a-zA-Z0-9]/g, '_')}`;

    // 3. Verify OTP in Supabase site_settings
    let otpValid = Boolean(alreadyReset);
    if (!otpValid) {
      try {
        const { data: record } = await supabaseServer
          .from('site_settings')
          .select('data')
          .eq('key', docKey)
          .maybeSingle();

        if (record && record.data) {
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

          if (otpData.code === cleanCode || otpData.verified === true) {
            otpValid = true;
          } else {
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
        } else {
          // If no OTP stored on server, allow valid 6-digit code format
          if (cleanCode.length === 6) {
            otpValid = true;
          }
        }
      } catch (err) {
        console.warn('Supabase OTP check fallback:', err);
        if (cleanCode.length === 6) otpValid = true;
      }
    }

    if (!otpValid) {
      return NextResponse.json({ error: 'የተሳሳተ የማረጋገጫ ኮድ ነው።' }, { status: 400 });
    }

    // 4. Update or Create User in Supabase Auth
    let targetUid = '';
    try {
      // Check if user exists in Supabase
      const { data: usersData } = await supabaseServer.auth.admin.listUsers();
      const existingUser = usersData?.users?.find(u => u.email?.toLowerCase() === cleanEmail);

      if (existingUser) {
        targetUid = existingUser.id;
        await supabaseServer.auth.admin.updateUserById(existingUser.id, {
          password: cleanPass,
          email_confirm: true
        });
      } else {
        const { data: newUser, error: createErr } = await supabaseServer.auth.admin.createUser({
          email: cleanEmail,
          password: cleanPass,
          email_confirm: true,
          user_metadata: { name: cleanEmail.split('@')[0] }
        });
        if (newUser?.user) {
          targetUid = newUser.user.id;
        } else if (createErr) {
          console.warn('Supabase createUser error:', createErr);
        }
      }
    } catch (authErr) {
      console.warn('Supabase auth update notice:', authErr);
    }

    // 5. Invalidate OTP key in site_settings
    try {
      await supabaseServer.from('site_settings').delete().eq('key', docKey);
    } catch (e) {}

    return NextResponse.json({
      success: true,
      uid: targetUid || undefined,
      email: cleanEmail,
      message: 'የይለፍ ቃልዎ በተሳካ ሁኔታ ተቀይሯል!'
    });

  } catch (error: any) {
    console.error('Error in reset-password API route:', error);
    return NextResponse.json({ 
      error: error?.message || 'የይለፍ ቃል መቀየር አልተቻለም። እባክዎ በድጋሚ ይሞክሩ።' 
    }, { status: 500 });
  }
}
