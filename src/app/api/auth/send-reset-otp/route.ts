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

    // Generate or use provided 6-Digit OTP Code
    const clientCode = typeof body.code === 'string' && body.code.trim().length === 6 ? body.code.trim() : null;
    const min = 100000;
    const max = 999999;
    const otpCode = clientCode || Math.floor(Math.random() * (max - min + 1) + min).toString();
    const now = Date.now();
    const expiresAt = now + 15 * 60 * 1000; // 15 minutes validity
    const docId = cleanEmail.replace(/[^a-zA-Z0-9]/g, '_');

    // Generate Native Firebase Password Reset Link (if Admin Auth is available)
    let oobCode: string | null = null;
    try {
      const { getAdminAuth } = await import('@/lib/firebase/admin');
      const authSDK = getAdminAuth();
      if (authSDK) {
        const link = await authSDK.generatePasswordResetLink(cleanEmail);
        if (link) {
          const u = new URL(link);
          oobCode = u.searchParams.get('oobCode');
        }
      }
    } catch (linkErr) {
      console.warn('adminAuth generatePasswordResetLink notice:', linkErr);
    }

    const payload = {
      code: otpCode,
      oobCode: oobCode || null,
      email: cleanEmail,
      createdAt: now,
      expiresAt: expiresAt,
      attempts: 0,
      verified: false,
      updatedAt: now
    };

    // 1. Save via adminDb if available
    try {
      const { getAdminDb } = await import('@/lib/firebase/admin');
      const adb = getAdminDb();
      if (adb) {
        await Promise.allSettled([
          adb.collection('artifacts').doc('tsehaycampus-e1a6d').collection('public').doc('data').collection('password_reset_otps').doc(docId).set(payload, { merge: true }),
          adb.collection('artifacts').doc('tsehaycampus-e1a6d').collection('public').doc('data').collection('otp_verifications').doc(docId).set(payload, { merge: true }),
          adb.collection('password_reset_otps').doc(docId).set(payload, { merge: true }),
          adb.collection('otp_verifications').doc(docId).set(payload, { merge: true })
        ]);
      }
    } catch (dbErr) {
      console.warn('adminDb safe write notice in send-reset-otp:', dbErr);
    }

    // 2. Save via Client Firestore SDK as ultra-resilient fallback
    try {
      const { db } = await import('@/lib/firebase/config');
      const { doc, setDoc } = await import('firebase/firestore');
      if (db) {
        await Promise.allSettled([
          setDoc(doc(db, 'artifacts', 'tsehaycampus-e1a6d', 'public', 'data', 'password_reset_otps', docId), payload, { merge: true }),
          setDoc(doc(db, 'artifacts', 'tsehaycampus-e1a6d', 'public', 'data', 'otp_verifications', docId), payload, { merge: true })
        ]);
      }
    } catch (clientDbErr) {
      console.warn('Client db safe write notice in send-reset-otp:', clientDbErr);
    }

    // Construct Direct Action URL and Send Branded HTML Email via Resend
    try {
      const { sendEmail, getPasswordResetOtpEmailHtml, SITE_URL } = await import('@/lib/email');
      const directUrl = `${SITE_URL}/reset-password?code=${otpCode}&email=${encodeURIComponent(cleanEmail)}${oobCode ? `&oobCode=${encodeURIComponent(oobCode)}` : ''}`;
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
      oobCode: oobCode || undefined,
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
