import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();

    if (!email || typeof email !== 'string') {
      return NextResponse.json({ error: 'ኢሜል አድራሻ ያስፈልጋል።' }, { status: 400 });
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
    const expiresAt = now + 15 * 60 * 1000; // 15 minutes

    const docId = cleanEmail.replace(/[^a-zA-Z0-9]/g, '_');

    // 3. Save to Firestore
    if (adminDb) {
      const otpRef = adminDb.collection('artifacts').doc('tsehaycampus-e1a6d').collection('public').doc('data').collection('otp_verifications').doc(docId);
      await otpRef.set({
        code: otpCode,
        email: cleanEmail,
        createdAt: now,
        expiresAt: expiresAt,
        attempts: 0,
        verified: false,
        updatedAt: FieldValue.serverTimestamp()
      }, { merge: true });
    }

    return NextResponse.json({
      success: true,
      message: `የ 6-አሃዝ ማረጋገጫ ኮድ ወደ ${cleanEmail} ተልኳል!`,
      expiresInMinutes: 15
    });
  } catch (error: any) {
    console.error('Error in send-otp API:', error);
    return NextResponse.json({ 
      error: 'የማረጋገጫ ኮድ መላክ አልተቻለም። እባክዎ በድጋሚ ይሞክሩ።' 
    }, { status: 500 });
  }
}
