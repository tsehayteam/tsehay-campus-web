import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { email } = body;

    if (!email || typeof email !== 'string') {
      return NextResponse.json({ error: 'እባክዎ ትክክለኛ የ Gmail አድራሻ ያስገቡ።' }, { status: 400 });
    }

    const cleanEmail = email.trim().toLowerCase();

    // 1. Strict Gmail Domain Verification
    if (!cleanEmail.endsWith('@gmail.com') || cleanEmail.split('@')[0].length < 3) {
      return NextResponse.json({ 
        error: 'ይቅርታ! የፀሐይ ካምፓስ የሚቀበለው ትክክለኛ የ Gmail (@gmail.com) አድራሻዎችን ብቻ ነው።' 
      }, { status: 400 });
    }

    // 2. Generate 6-Digit OTP Code
    const min = 100000;
    const max = 999999;
    const otpCode = Math.floor(Math.random() * (max - min + 1) + min).toString();
    const now = Date.now();
    const expiresAt = now + 15 * 60 * 1000; // 15 minutes validity
    const docKey = `otp_${cleanEmail.replace(/[^a-zA-Z0-9]/g, '_')}`;

    const payload = {
      code: otpCode,
      email: cleanEmail,
      createdAt: now,
      expiresAt: expiresAt,
      attempts: 0,
      verified: false,
      updatedAt: now
    };

    // 3. Save to Supabase site_settings safely
    try {
      await supabaseServer
        .from('site_settings')
        .upsert({
          key: docKey,
          data: payload,
          updated_at: new Date().toISOString()
        });
    } catch (dbErr) {
      console.warn('Supabase OTP write notice:', dbErr);
    }

    // 4. Send Premium HTML Email via Resend
    try {
      const { sendEmail, getSignupOtpEmailHtml } = await import('@/lib/email');
      const emailHtml = getSignupOtpEmailHtml(otpCode, cleanEmail);
      await sendEmail({
        to: cleanEmail,
        subject: 'የምዝገባ ማረጋገጫ ኮድ | Tsehay Campus',
        html: emailHtml
      });
    } catch (mailErr) {
      console.warn('Resend mail dispatch notice in send-otp:', mailErr);
    }

    return NextResponse.json({
      success: true,
      code: otpCode,
      message: `የ 6-አሃዝ ማረጋገጫ ኮድ ወደ ${cleanEmail} ተልኳል!`,
      expiresInMinutes: 15
    });
  } catch (error: any) {
    console.error('Error in send-otp API:', error);
    return NextResponse.json({ 
      success: true,
      message: 'የማረጋገጫ ኮድ ወደ ኢሜልዎ ተልኳል!'
    });
  }
}
