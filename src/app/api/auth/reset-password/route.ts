import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { email, code, newPassword, oobCode, alreadyReset } = body;

    if (!email || (!code && !oobCode && !alreadyReset) || !newPassword) {
      return NextResponse.json({ 
        error: 'ኢሜል፣ የማረጋገጫ ኮድ እና አዲስ የይለፍ ቃል ያስፈልጋል።' 
      }, { status: 400 });
    }

    const cleanEmail = String(email).trim().toLowerCase();
    const cleanCode = String(code || oobCode || '').trim();
    const cleanPass = String(newPassword).trim();

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
    let effectiveOobCode: string | null = (typeof oobCode === 'string' && oobCode.trim().length > 10) ? oobCode.trim() : null;
    if (!effectiveOobCode && cleanCode.length > 10) {
      effectiveOobCode = cleanCode;
    }

    // 3. Verify OTP in Firestore (unless alreadyReset was confirmed client-side)
    let foundOtpData: any = null;

    // Check Firestore via Admin SDK
    try {
      const { getAdminDb } = await import('@/lib/firebase/admin');
      const adb = getAdminDb();
      if (adb) {
        const otpPaths = [
          adb.collection('artifacts').doc('tsehaycampus-e1a6d').collection('public').doc('data').collection('password_reset_otps').doc(docId),
          adb.collection('artifacts').doc('tsehaycampus-e1a6d').collection('public').doc('data').collection('otp_verifications').doc(docId),
          adb.collection('password_reset_otps').doc(docId),
          adb.collection('otp_verifications').doc(docId)
        ];

        for (const ref of otpPaths) {
          const snap = await ref.get();
          if (snap.exists) {
            foundOtpData = snap.data();
            break;
          }
        }
      }
    } catch (adminDbErr) {
      console.warn('[reset-password] adminDb lookup notice:', adminDbErr);
    }

    // Fallback: Check Firestore via Client SDK
    if (!foundOtpData) {
      try {
        const { db } = await import('@/lib/firebase/config');
        const { doc, getDoc } = await import('firebase/firestore');
        if (db) {
          const clientRef1 = doc(db, 'artifacts', 'tsehaycampus-e1a6d', 'public', 'data', 'password_reset_otps', docId);
          const snap1 = await getDoc(clientRef1);
          if (snap1.exists()) {
            foundOtpData = snap1.data();
          } else {
            const clientRef2 = doc(db, 'artifacts', 'tsehaycampus-e1a6d', 'public', 'data', 'otp_verifications', docId);
            const snap2 = await getDoc(clientRef2);
            if (snap2.exists()) {
              foundOtpData = snap2.data();
            }
          }
        }
      } catch (clientDbErr) {
        console.warn('[reset-password] client db lookup notice:', clientDbErr);
      }
    }

    // If OTP data is found, validate expiration, attempts, and code
    if (foundOtpData && !alreadyReset) {
      // Expiration check (15 mins)
      if (foundOtpData.expiresAt && Date.now() > foundOtpData.expiresAt) {
        return NextResponse.json({ 
          error: 'የማረጋገጫ ኮዱ ጊዜው አልፎበታል (Expired)። እባክዎ አዲስ ኮድ ይጠይቁ።' 
        }, { status: 400 });
      }

      // Attempts check
      if ((foundOtpData.attempts || 0) >= 5) {
        return NextResponse.json({ 
          error: 'ኮዱን ደጋግመው ተሳስተዋል! እባክዎ አዲስ ኮድ ይጠይቁ።' 
        }, { status: 429 });
      }

      // Code match verification (matches 6-digit code or oobCode)
      const codeMatches = 
        foundOtpData.code === cleanCode || 
        foundOtpData.oobCode === cleanCode ||
        foundOtpData.oobCode === effectiveOobCode ||
        foundOtpData.verified === true;

      if (!codeMatches && cleanCode.length <= 10) {
        // Increment attempts on mismatch
        try {
          const { getAdminDb } = await import('@/lib/firebase/admin');
          const adb = getAdminDb();
          if (adb) {
            await adb.collection('artifacts').doc('tsehaycampus-e1a6d').collection('public').doc('data').collection('password_reset_otps').doc(docId).set(
              { attempts: (foundOtpData.attempts || 0) + 1 },
              { merge: true }
            );
          }
        } catch (e) {}

        const remaining = 4 - (foundOtpData.attempts || 0);
        return NextResponse.json({ 
          error: `የተሳሳተ ኮድ አስገብተዋል። ${remaining > 0 ? `(የቀሩ ሙከራዎች፡ ${remaining})` : 'እባክዎ አዲስ ኮድ ይጠይቁ።'}` 
        }, { status: 400 });
      }

      if (foundOtpData.oobCode && !effectiveOobCode) {
        effectiveOobCode = foundOtpData.oobCode;
      }
    }

    // 4. Update Password in Firebase Auth
    let passwordUpdated = Boolean(alreadyReset);
    let targetUid = '';
    let customToken: string | null = null;

    // Layer A: Reset password via Google Identity Toolkit REST API if oobCode is available
    if (!passwordUpdated && effectiveOobCode) {
      try {
        const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY || 'AIzaSyDCxlwfYAS_I0D7c-8e-iB-Y-Rh2ZZoHZw';
        const restRes = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:resetPassword?key=${apiKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            oobCode: effectiveOobCode,
            newPassword: cleanPass
          })
        });

        const restData = await restRes.json().catch(() => ({}));
        if (restRes.ok && (restData.email || restData.requestType)) {
          passwordUpdated = true;
          console.log(`[reset-password] Identity Toolkit password reset successful for ${cleanEmail}`);
        }
      } catch (restErr) {
        console.warn('[reset-password] Identity Toolkit attempt notice:', restErr);
      }
    }

    // Layer B: Update or Create user in Firebase Auth via Admin SDK
    try {
      const { getAdminAuth } = await import('@/lib/firebase/admin');
      const authSDK = getAdminAuth();
      if (authSDK) {
        let userRecord = null;
        try {
          userRecord = await authSDK.getUserByEmail(cleanEmail);
        } catch (getUserErr: any) {
          if (getUserErr?.code !== 'auth/user-not-found') {
            console.warn('[reset-password] getUserByEmail warning:', getUserErr?.message);
          }
        }

        if (userRecord && userRecord.uid) {
          targetUid = userRecord.uid;
          if (!passwordUpdated) {
            await authSDK.updateUser(targetUid, {
              password: cleanPass,
              emailVerified: true
            });
            passwordUpdated = true;
            console.log(`[reset-password] Admin Auth updated password for ${cleanEmail} (uid: ${targetUid})`);
          }
        } else if (!passwordUpdated) {
          // If the user does not exist yet in Firebase Auth, create the user!
          // This allows ANY valid Gmail to set a password and have an active account ("የትኛውም ኢሜይል")
          const newUser = await authSDK.createUser({
            email: cleanEmail,
            password: cleanPass,
            emailVerified: true
          });
          targetUid = newUser.uid;
          passwordUpdated = true;
          console.log(`[reset-password] Admin Auth created new user with password for ${cleanEmail} (uid: ${targetUid})`);
        }

        if (targetUid) {
          try {
            customToken = await authSDK.createCustomToken(targetUid);
          } catch (tokenErr) {
            console.warn('[reset-password] customToken generation notice:', tokenErr);
          }
        }
      }
    } catch (adminAuthErr) {
      console.warn('[reset-password] Admin Auth SDK execution notice:', adminAuthErr);
    }

    // 5. Clean up / invalidate OTP in Firestore
    try {
      const { getAdminDb } = await import('@/lib/firebase/admin');
      const adb = getAdminDb();
      if (adb) {
        await Promise.allSettled([
          adb.collection('artifacts').doc('tsehaycampus-e1a6d').collection('public').doc('data').collection('password_reset_otps').doc(docId).delete(),
          adb.collection('artifacts').doc('tsehaycampus-e1a6d').collection('public').doc('data').collection('otp_verifications').doc(docId).delete(),
          adb.collection('password_reset_otps').doc(docId).delete(),
          adb.collection('otp_verifications').doc(docId).delete()
        ]);
      }
    } catch (e) {}

    try {
      const { db } = await import('@/lib/firebase/config');
      const { doc, deleteDoc } = await import('firebase/firestore');
      if (db) {
        await Promise.allSettled([
          deleteDoc(doc(db, 'artifacts', 'tsehaycampus-e1a6d', 'public', 'data', 'password_reset_otps', docId)),
          deleteDoc(doc(db, 'artifacts', 'tsehaycampus-e1a6d', 'public', 'data', 'otp_verifications', docId))
        ]);
      }
    } catch (e) {}

    // 6. Sync User Document in Firestore
    if (targetUid) {
      const userUpdates = {
        email: cleanEmail,
        emailVerified: true,
        passwordUpdatedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      try {
        const { getAdminDb } = await import('@/lib/firebase/admin');
        const adb = getAdminDb();
        if (adb) {
          await Promise.allSettled([
            adb.collection('artifacts').doc('tsehaycampus-e1a6d').collection('users').doc(targetUid).set(userUpdates, { merge: true }),
            adb.collection('users').doc(targetUid).set(userUpdates, { merge: true })
          ]);
        }
      } catch (e) {}

      try {
        const { db } = await import('@/lib/firebase/config');
        const { doc, setDoc } = await import('firebase/firestore');
        if (db) {
          await Promise.allSettled([
            setDoc(doc(db, 'artifacts', 'tsehaycampus-e1a6d', 'users', targetUid), userUpdates, { merge: true }),
            setDoc(doc(db, 'users', targetUid), userUpdates, { merge: true })
          ]);
        }
      } catch (e) {}
    }

    if (passwordUpdated || alreadyReset) {
      return NextResponse.json({
        success: true,
        customToken,
        uid: targetUid || undefined,
        email: cleanEmail,
        message: 'የይለፍ ቃልዎ በተሳካ ሁኔታ ተቀይሯል!'
      });
    }

    // If neither method could update (e.g. invalid action code and no admin SDK)
    return NextResponse.json({
      error: 'የይለፍ ቃል መቀየር አልተቻለም። እባክዎ አዲስ ሊንክ ወይም ኮድ ይጠይቁ።'
    }, { status: 400 });

  } catch (error: any) {
    console.error('Error in reset-password API route:', error);
    return NextResponse.json({ 
      error: error?.message || 'የይለፍ ቃል መቀየር አልተቻለም። እባክዎ በድጋሚ ይሞክሩ።' 
    }, { status: 500 });
  }
}
