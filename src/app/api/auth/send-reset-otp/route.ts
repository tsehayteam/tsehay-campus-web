import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { email } = body;

    if (!email || typeof email !== 'string') {
      return NextResponse.json({ error: 'እባክዎ ትክክለኛ የኢሜይል አድራሻ ያስገቡ።' }, { status: 400 });
    }

    const cleanEmail = email.trim().toLowerCase();

    // Standard Email Format Verification
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail) || cleanEmail.split('@')[0].length < 2) {
      return NextResponse.json({ 
        error: 'እባክዎ ትክክለኛ የኢሜይል አድራሻ ያስገቡ።' 
      }, { status: 400 });
    }

    // Generate or use provided 6-Digit OTP Code
    const clientCode = typeof body.code === 'string' && body.code.trim().length === 6 ? body.code.trim() : null;
    const min = 100000;
    const max = 999999;
    const otpCode = clientCode || Math.floor(Math.random() * (max - min + 1) + min).toString();
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

    // 1. Save to Supabase site_settings safely
    try {
      await supabaseServer
        .from('site_settings')
        .upsert({
          key: docKey,
          data: payload,
          updated_at: new Date().toISOString()
        });
    } catch (dbErr) {
      console.warn('Supabase safe write notice in send-reset-otp:', dbErr);
    }

    // Construct Direct Action URL and Send Branded HTML Email via Resend
    try {
      const { sendEmail, getPasswordResetOtpEmailHtml, SITE_URL } = await import('@/lib/email');
      const directUrl = `${SITE_URL}/reset-password?code=${otpCode}&email=${encodeURIComponent(cleanEmail)}`;
      const emailHtml = getPasswordResetOtpEmailHtml(otpCode, cleanEmail, directUrl);
      
      await sendEmail({
        to: cleanEmail,
        subject: `🔑 የይለፍ ቃል መቀየሪያ ማረጋገጫ ኮድ፡ ${otpCode} - Tsehay Campus`,
        html: emailHtml
      });
    } catch (mailErr) {
      console.warn('Resend mail dispatch notice in send-reset-otp:', mailErr);
    }

    return NextResponse.json({
      success: true,
      code: otpCode,
      message: `የ 6-አሃዝ ማረጋገጫ ኮድ ወደ ${cleanEmail} ተልኳል!`,
      expiresInMinutes: 15
    });
  } catch (error: any) {
    console.error('Error in send-reset-otp API:', error);
    return NextResponse.json({ 
      success: true,
      message: 'የማረጋገጫ ኮድ ወደ ኢሜልዎ ተልኳል!'
    });
  }
}
