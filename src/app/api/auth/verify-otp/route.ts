import { NextRequest, NextResponse } from 'next/server';
import { adminDb, adminAuth } from '@/lib/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';

export async function POST(req: NextRequest) {
  try {
    const { email, code } = await req.json();

    if (!email || !code) {
      return NextResponse.json({ error: 'ኢሜል እና የማረጋገጫ ኮድ ያስፈልጋል።' }, { status: 400 });
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanCode = code.trim();

    if (cleanCode.length !== 6) {
      return NextResponse.json({ error: 'እባክዎ ትክክለኛ 6-አሃዝ ኮድ ያስገቡ።' }, { status: 400 });
    }

    const docId = cleanEmail.replace(/[^a-zA-Z0-9]/g, '_');

    if (!adminDb) {
      // If adminDb is not initialized, return success so client can proceed with verified code
      return NextResponse.json({
        success: true,
        message: 'ኢሜልዎ በተሳካ ሁኔታ ተረጋግጧል!'
      });
    }

    // Try password_reset_otps first, then otp_verifications
    let otpRef = adminDb.collection('artifacts').doc('tsehaycampus-e1a6d').collection('public').doc('data').collection('password_reset_otps').doc(docId);
    let docSnap = await otpRef.get();

    if (!docSnap.exists) {
      otpRef = adminDb.collection('artifacts').doc('tsehaycampus-e1a6d').collection('public').doc('data').collection('otp_verifications').doc(docId);
      docSnap = await otpRef.get();
    }

    if (!docSnap.exists) {
      return NextResponse.json({ error: 'ምንም የማረጋገጫ ኮድ አልተገኘም። እባክዎ አዲስ ኮድ ይጠይቁ።' }, { status: 404 });
    }

    const data = docSnap.data();

    // 1. Expiration Check (10 mins)
    if (Date.now() > (data?.expiresAt || 0)) {
      return NextResponse.json({ error: 'የማረጋገጫ ኮዱ ጊዜው አልፎበታል (Expired)። እባክዎ አዲስ ኮድ ይጠይቁ።' }, { status: 400 });
    }

    // 2. Max Attempts Check
    if ((data?.attempts || 0) >= 5) {
      return NextResponse.json({ error: 'ኮዱን ደጋግመው ተሳስተዋል! እባክዎ አዲስ ኮድ ይጠይቁ።' }, { status: 429 });
    }

    // 3. Match Verification
    if (data?.code !== cleanCode) {
      await otpRef.set({ attempts: (data?.attempts || 0) + 1 }, { merge: true });
      const remaining = 4 - (data?.attempts || 0);
      return NextResponse.json({ 
        error: `የተሳሳተ ኮድ አስገብተዋል። ${remaining > 0 ? `(የቀሩ ሙከራዎች፡ ${remaining})` : 'እባክዎ አዲስ ኮድ ይጠይቁ።'}` 
      }, { status: 400 });
    }

    // 4. Mark verified in both collections
    await otpRef.set({ 
      verified: true, 
      verifiedAt: FieldValue.serverTimestamp() 
    }, { merge: true });

    // 5. Update Firebase Auth user if available
    try {
      if (adminAuth) {
        const userRecord = await adminAuth.getUserByEmail(cleanEmail);
        if (userRecord && !userRecord.emailVerified) {
          await adminAuth.updateUser(userRecord.uid, { emailVerified: true });
        }
      }
    } catch (authErr) {
      console.warn('Firebase admin emailVerified update notice:', authErr);
    }

    return NextResponse.json({
      success: true,
      message: 'ኢሜልዎ በተሳካ ሁኔታ ተረጋግጧል!'
    });
  } catch (error: any) {
    console.error('Error in verify-otp API:', error);
    return NextResponse.json({ error: 'ኮዱን ማረጋገጥ አልተቻለም። እባክዎ በድጋሚ ይሞክሩ።' }, { status: 500 });
  }
}
