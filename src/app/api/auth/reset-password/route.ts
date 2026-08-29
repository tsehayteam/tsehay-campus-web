import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase/admin';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { email, code, newPassword } = body;

    if (!email || !code || !newPassword) {
      return NextResponse.json({ 
        error: 'ኢሜል፣ የማረጋገጫ ኮድ እና አዲስ የይለፍ ቃል ያስፈልጋል። (Email, OTP code and new password required)' 
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

    // 3. Verify and Invalidate OTP in Firestore
    if (adminDb) {
      try {
        const otpPaths = [
          adminDb.collection('artifacts').doc('tsehaycampus-e1a6d').collection('public').doc('data').collection('password_reset_otps').doc(docId),
          adminDb.collection('artifacts').doc('tsehaycampus-e1a6d').collection('public').doc('data').collection('otp_verifications').doc(docId),
          adminDb.collection('password_reset_otps').doc(docId),
          adminDb.collection('otp_verifications').doc(docId)
        ];

        let foundOtpData: any = null;
        let matchedRef: any = null;

        for (const ref of otpPaths) {
          const snap = await ref.get();
          if (snap.exists) {
            foundOtpData = snap.data();
            matchedRef = ref;
            break;
          }
        }

        if (foundOtpData) {
          // Check expiration (15 mins)
          if (Date.now() > (foundOtpData.expiresAt || 0)) {
            return NextResponse.json({ 
              error: 'የማረጋገጫ ኮዱ ጊዜው አልፎበታል (Expired)። እባክዎ አዲስ ኮድ ይጠይቁ።' 
            }, { status: 400 });
          }

          // Check attempts
          if ((foundOtpData.attempts || 0) >= 5) {
            return NextResponse.json({ 
              error: 'ኮዱን ደጋግመው ተሳስተዋል! እባክዎ አዲስ ኮድ ይጠይቁ።' 
            }, { status: 429 });
          }

          // Code match verification
          if (foundOtpData.code !== cleanCode && !foundOtpData.verified) {
            if (matchedRef) {
              await matchedRef.set({ attempts: (foundOtpData.attempts || 0) + 1 }, { merge: true });
            }
            const remaining = 4 - (foundOtpData.attempts || 0);
            return NextResponse.json({ 
              error: `የተሳሳተ ኮድ አስገብተዋል። ${remaining > 0 ? `(የቀሩ ሙከራዎች፡ ${remaining})` : 'እባክዎ አዲስ ኮድ ይጠይቁ።'}` 
            }, { status: 400 });
          }

          // Delete / invalidate OTP across all paths
          for (const ref of otpPaths) {
            try {
              await ref.delete();
            } catch (delErr) {}
          }
        }
      } catch (dbErr) {
        console.warn('Firestore OTP verification notice:', dbErr);
      }
    }

    // 4. Update Password in Firebase Auth using Firebase Admin SDK
    try {
      let authSDK: any = adminAuth;
      if (!authSDK) {
        const { getAuth } = await import('firebase-admin/auth');
        authSDK = getAuth();
      }

      if (authSDK) {
        const userRecord = await authSDK.getUserByEmail(cleanEmail);
        if (userRecord && userRecord.uid) {
          await authSDK.updateUser(userRecord.uid, {
            password: cleanPass,
            emailVerified: true
          });
          console.log(`[Password Reset Success] Password updated in Firebase Auth for ${cleanEmail} (uid: ${userRecord.uid})`);
        }
      }
    } catch (authErr: any) {
      console.error('Firebase Admin Auth password update error:', authErr);
      if (authErr.code === 'auth/user-not-found') {
        return NextResponse.json({ 
          error: 'በዚህ የኢሜይል አድራሻ የተመዘገበ አካውንት አልተገኘም። (User not found)' 
        }, { status: 404 });
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Password updated successfully'
    });

  } catch (error: any) {
    console.error('Error in reset-password API route:', error);
    return NextResponse.json({ 
      error: 'የይለፍ ቃል መቀየር አልተቻለም። እባክዎ በድጋሚ ይሞክሩ።' 
    }, { status: 500 });
  }
}
