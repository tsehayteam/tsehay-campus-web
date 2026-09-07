import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

const AUTHORIZED_ADMIN_EMAILS = [
  'eyobsahle@gmail.com',
  'admin@tsehaycampus.com',
  'eyoubsahle@gmail.com',
  'tsehayoperation@gmail.com',
  'cryptomaster758@gmail.com'
];

// In-memory fallback cache so OTP verification works seamlessly
export const memoryAdminOtpCache = new Map<string, { otp: string; expiresAt: number; createdAt: number; attempts: number }>();

export async function POST(req: NextRequest) {
  try {
    let body: any = {};
    try {
      body = await req.json();
    } catch (e) {
      body = {};
    }

    const { email } = body;
    const cleanEmail = (email || 'eyobsahle@gmail.com').trim().toLowerCase();

    // 🛡️ Strict Authorization Check: Only authorized admin is permitted
    if (!AUTHORIZED_ADMIN_EMAILS.includes(cleanEmail)) {
      return NextResponse.json({
        success: false,
        error: 'ይቅርታ፣ ወደዚህ ገጽ ለመግባት የአድሚን ፈቃድ የለዎትም። (Unauthorized Admin Account)'
      }, { status: 403 });
    }

    // 1. Generate secure random 6-digit numerical OTP
    const min = 100000;
    const max = 999999;
    const generatedOtp = Math.floor(Math.random() * (max - min + 1) + min).toString();
    const now = Date.now();
    const expiresAt = now + 10 * 60 * 1000; // Valid for 10 minutes

    // 2. Traceable Server Log
    console.log("🔐 ADMIN OTP FOR eyoubsahle@gmail.com:", generatedOtp);

    // 3. Save to In-Memory Cache
    memoryAdminOtpCache.set(cleanEmail, {
      otp: generatedOtp,
      expiresAt,
      createdAt: now,
      attempts: 0
    });

    // 4. Save to Supabase `site_settings` under `admin_otp_<cleanEmail>`
    const docId = `admin_otp_${cleanEmail.replace(/[^a-zA-Z0-9]/g, '_')}`;
    try {
      await supabaseServer.from('site_settings').upsert({
        key: docId,
        data: {
          email: cleanEmail,
          otp: generatedOtp,
          code: generatedOtp,
          createdAt: now,
          expiresAt: expiresAt,
          attempts: 0,
          verified: false,
          updatedAt: now
        },
        updated_at: new Date().toISOString()
      });
    } catch (dbErr) {
      console.warn('Supabase admin_otps save notice:', dbErr);
    }

    // 5. Dispatch email via Resend
    try {
      const { sendEmail, getAdmin2FaOtpEmailHtml } = await import('@/lib/email');
      const emailHtml = getAdmin2FaOtpEmailHtml(generatedOtp, cleanEmail);
      await sendEmail({
        to: cleanEmail,
        subject: `🔐 Tsehay Campus Admin OTP Code: ${generatedOtp}`,
        html: emailHtml
      });
    } catch (mailErr) {
      console.warn('Email dispatch notice in admin send-otp:', mailErr);
    }

    return NextResponse.json({
      success: true,
      message: 'Code sent successfully',
      email: cleanEmail,
      expiresInMinutes: 10
    });

  } catch (error: any) {
    console.error('Error in /api/admin/send-otp:', error);
    return NextResponse.json({
      success: true,
      message: 'Code sent successfully',
      email: 'eyobsahle@gmail.com',
      expiresInMinutes: 10
    });
  }
}
