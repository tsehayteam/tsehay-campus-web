import { NextRequest, NextResponse } from 'next/server';
import { adminDb, adminAuth } from '@/lib/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';

export async function POST(req: NextRequest) {
  try {
    const { email, code, newPassword } = await req.json();

    if (!email || !code || !newPassword) {
      return NextResponse.json({ 
        error: 'ኢሜል፣ የማረጋገጫ ኮድ እና አዲስ የይለፍ ቃል ያስፈልጋል።' 
      }, { status: 400 });
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanCode = code.trim();
    const cleanPass = newPassword.trim();

    // 1. Password length validation
    if (cleanPass.length < 6) {
      return NextResponse.json({ 
        error: 'የይለፍ ቃል ቢያንስ 6 ፊደላት ወይም ቁጥሮች መሆን አለበት።' 
      }, { status: 400 });
    }

    // 2. Strict Gmail validation
    if (!cleanEmail.endsWith('@gmail.com')) {
      return NextResponse.json({ 
        error: 'ይቅርታ! የፀሐይ ካምፓስ የሚቀበለው ትክክለኛ የ Gmail (@gmail.com) አድራሻዎችን ብቻ ነው።' 
      }, { status: 400 });
    }

    const docId = cleanEmail.replace(/[^a-zA-Z0-9]/g, '_');

    // 3. Verify OTP in Firestore if adminDb is active
    if (adminDb) {
      let otpRef = adminDb.collection('artifacts').doc('tsehaycampus-e1a6d').collection('public').doc('data').collection('password_reset_otps').doc(docId);
      let docSnap = await otpRef.get();

      if (!docSnap.exists) {
        otpRef = adminDb.collection('artifacts').doc('tsehaycampus-e1a6d').collection('public').doc('data').collection('otp_verifications').doc(docId);
        docSnap = await otpRef.get();
      }

      if (docSnap.exists) {
        const data = docSnap.data();

        // Expiration check (10 mins)
        if (Date.now() > (data?.expiresAt || 0)) {
          return NextResponse.json({ 
            error: 'የማረጋገጫ ኮዱ ጊዜው አልፎበታል (Expired)። እባክዎ አዲስ ኮድ ይጠይቁ።' 
          }, { status: 400 });
        }

        // Max attempts check
        if ((data?.attempts || 0) >= 5) {
          return NextResponse.json({ 
            error: 'ኮዱን ደጋግመው ተሳስተዋል! እባክዎ አዲስ ኮድ ይጠይቁ።' 
          }, { status: 429 });
        }

        // Verify code match
        if (data?.code !== cleanCode && !data?.verified) {
          await otpRef.set({ attempts: (data?.attempts || 0) + 1 }, { merge: true });
          const remaining = 4 - (data?.attempts || 0);
          return NextResponse.json({ 
            error: `የተሳሳተ ኮድ አስገብተዋል። ${remaining > 0 ? `(የቀሩ ሙከራዎች፡ ${remaining})` : 'እባክዎ አዲስ ኮድ ይጠይቁ።'}` 
          }, { status: 400 });
        }

        // Mark OTP as used
        await otpRef.set({
          verified: true,
          passwordResetAt: FieldValue.serverTimestamp(),
          code: 'USED_' + Date.now()
        }, { merge: true });
      }
    }

    // 4. Update Password in Firebase Auth using adminAuth
    if (adminAuth) {
      try {
        const userRecord = await adminAuth.getUserByEmail(cleanEmail);
        if (userRecord) {
          await adminAuth.updateUser(userRecord.uid, {
            password: cleanPass,
            emailVerified: true
          });
        } else {
          return NextResponse.json({
            error: 'በዚህ Gmail አድራሻ የተመዘገበ ተጠቃሚ አልተገኘም። እባክዎ መጀመሪያ ይመዝገቡ።'
          }, { status: 404 });
        }
      } catch (authErr: any) {
        console.error('Firebase Admin password update error:', authErr);
        if (authErr?.code === 'auth/user-not-found') {
          return NextResponse.json({
            error: 'በዚህ Gmail አድራሻ የተመዘገበ ተጠቃሚ አልተገኘም። እባክዎ መጀመሪያ ይመዝገቡ።'
          }, { status: 404 });
        }
        return NextResponse.json({
          error: 'የይለፍ ቃል መቀየር አልተቻለም። እባክዎ በድጋሚ ይሞክሩ።'
        }, { status: 500 });
      }
    }

    return NextResponse.json({
      success: true,
      message: 'የይለፍ ቃልዎ በተሳካ ሁኔታ ተቀይሯል! አሁን መግባት ይችላሉ።'
    });
  } catch (error: any) {
    console.error('Error in reset-password API route:', error);
    return NextResponse.json({ 
      error: 'የይለፍ ቃል መቀየር አልተቻለም። እባክዎ በድጋሚ ይሞክሩ።' 
    }, { status: 500 });
  }
}
