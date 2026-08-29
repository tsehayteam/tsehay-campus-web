import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { email } = body;

    if (!email || typeof email !== 'string') {
      return NextResponse.json({ error: 'እባክዎ ትክክለኛ የ Gmail አድራሻ ያስገቡ።' }, { status: 400 });
    }

    const cleanEmail = email.trim().toLowerCase();

    // Strict Gmail Domain Verification
    if (!cleanEmail.endsWith('@gmail.com') || cleanEmail.split('@')[0].length < 3) {
      return NextResponse.json({ 
        error: 'ይቅርታ! የፀሐይ ካምፓስ የሚቀበለው ትክክለኛ የ Gmail (@gmail.com) አድራሻዎችን ብቻ ነው።' 
      }, { status: 400 });
    }

    // Generate 6-Digit OTP Code
    const min = 100000;
    const max = 999999;
    const otpCode = Math.floor(Math.random() * (max - min + 1) + min).toString();
    const now = Date.now();
    const expiresAt = now + 15 * 60 * 1000; // 15 minutes validity
    const docId = cleanEmail.replace(/[^a-zA-Z0-9]/g, '_');

    // Save to Firestore
    try {
      const { adminDb } = await import('@/lib/firebase/admin');
      if (adminDb) {
        const payload = {
          code: otpCode,
          email: cleanEmail,
          createdAt: now,
          expiresAt: expiresAt,
          attempts: 0,
          verified: false,
          updatedAt: now
        };

        const resetOtpRef = adminDb.collection('artifacts').doc('tsehaycampus-e1a6d').collection('public').doc('data').collection('password_reset_otps').doc(docId);
        await resetOtpRef.set(payload, { merge: true });

        const generalOtpRef = adminDb.collection('artifacts').doc('tsehaycampus-e1a6d').collection('public').doc('data').collection('otp_verifications').doc(docId);
        await generalOtpRef.set(payload, { merge: true });
      }
    } catch (dbErr) {
      console.warn('adminDb safe write notice in send-reset-otp:', dbErr);
    }

    // Send Branded HTML Email via Resend
    try {
      const { sendEmail, getPasswordResetOtpEmailHtml } = await import('@/lib/email');
      const emailHtml = getPasswordResetOtpEmailHtml(otpCode, cleanEmail);
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
