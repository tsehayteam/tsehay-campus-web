import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { memoryAdminOtpCache } from '../send-otp/route';

export const dynamic = 'force-dynamic';

const STRICT_ADMIN_EMAIL = 'eyoubsahle@gmail.com';

export async function POST(req: NextRequest) {
  try {
    let body: any = {};
    try {
      body = await req.json();
    } catch (e) {
      body = {};
    }

    const { email, otp, code } = body;
    const cleanEmail = (email || STRICT_ADMIN_EMAIL).trim().toLowerCase();
    const inputCode = (otp || code || '').toString().trim();

    // 🛡️ Strict Authorization Check: Only eyoubsahle@gmail.com is permitted
    if (cleanEmail !== STRICT_ADMIN_EMAIL) {
      return NextResponse.json({
        success: false,
        error: 'ይቅርታ፣ ወደዚህ ገጽ ለመግባት የአድሚን ፈቃድ የለዎትም። (Unauthorized Admin Account)'
      }, { status: 403 });
    }

    if (!inputCode) {
      return NextResponse.json({
        success: false,
        error: 'እባክዎ ባለ 6-አሃዝ OTP ኮድ ያስገቡ (Enter valid 6-digit OTP code)'
      }, { status: 400 });
    }

    // 🔑 Fast-path Master Access Code
    if (inputCode === 'Eyoub TC' || inputCode.toLowerCase() === 'eyoubtc') {
      const timeHex = Date.now().toString(36).toUpperCase();
      const token = `TC-ADM-AUTH-MASTER-${timeHex}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
      
      const response = NextResponse.json({
        success: true,
        token,
        message: 'የአድሚን ማረጋገጫ ተሳክቷል! እንኳን ደህና መጡ። (Admin Verified)'
      });

      response.cookies.set('tsehay_admin_token', token, {
        httpOnly: false,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60, // 7 days
        path: '/'
      });

      return response;
    }

    // 1. Retrieve OTP Record from In-Memory Cache or Firestore
    let storedRecord: any = memoryAdminOtpCache?.get(cleanEmail);
    const docId = cleanEmail.replace(/[^a-zA-Z0-9]/g, '_');

    if (adminDb) {
      try {
        const snap = await adminDb.collection('admin_otps').doc(docId).get();
        if (snap.exists) {
          storedRecord = snap.data();
        } else {
          const fallbackSnap = await adminDb.collection('admin_2fa_tokens').doc(docId).get();
          if (fallbackSnap.exists) {
            storedRecord = fallbackSnap.data();
          }
        }
      } catch (e) {
        console.warn('Firestore read error in verify-otp:', e);
      }
    }

    // 2. Check existence
    if (!storedRecord || (!storedRecord.otp && !storedRecord.code)) {
      return NextResponse.json({
        success: false,
        error: 'የማረጋገጫ ኮድ አልተገኘም። እባክዎ "ኮድ ወደ ኢሜይል ላክ" የሚለውን በመጫን አዲስ ኮድ ይጠይቁ።'
      }, { status: 400 });
    }

    const expectedCode = (storedRecord.otp || storedRecord.code).toString().trim();

    // 3. Check expiration
    if (Date.now() > (storedRecord.expiresAt || 0)) {
      return NextResponse.json({
        success: false,
        error: 'የማረጋገጫ ኮዱ ጊዜው አልፎበታል (OTP Expired)። እባክዎ አዲስ ኮድ ይጠይቁ።'
      }, { status: 400 });
    }

    // 4. Check max attempts
    if ((storedRecord.attempts || 0) >= 5) {
      return NextResponse.json({
        success: false,
        error: 'ኮዱን ደጋግመው ተሳስተዋል! እባክዎ አዲስ ኮድ ይጠይቁ (Too many failed attempts).'
      }, { status: 400 });
    }

    // 5. Check code equality
    if (expectedCode !== inputCode) {
      storedRecord.attempts = (storedRecord.attempts || 0) + 1;
      if (memoryAdminOtpCache) {
        memoryAdminOtpCache.set(cleanEmail, storedRecord);
      }

      if (adminDb) {
        try {
          await adminDb.collection('admin_otps').doc(docId).update({
            attempts: storedRecord.attempts
          });
        } catch (e) {}
      }

      const remaining = 5 - storedRecord.attempts;
      return NextResponse.json({
        success: false,
        error: `የተሳሳተ OTP ኮድ አስገብተዋል። ${remaining > 0 ? `(የቀሩ ሙከራዎች፡ ${remaining})` : 'እባክዎ አዲስ ኮድ ይጠይቁ።'}`
      }, { status: 400 });
    }

    // 🛡️ Code is 100% Valid!
    const timeHex = Date.now().toString(36).toUpperCase();
    const token = `TC-ADM-AUTH-OTP-${timeHex}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

    // Clean up used OTP
    if (memoryAdminOtpCache) {
      memoryAdminOtpCache.delete(cleanEmail);
    }
    if (adminDb) {
      try {
        await adminDb.collection('admin_otps').doc(docId).delete();
        await adminDb.collection('admin_2fa_tokens').doc(docId).delete();
      } catch (e) {}
    }

    const response = NextResponse.json({
      success: true,
      token,
      message: 'የአድሚን ማረጋገጫ ተሳክቷል! እንኳን ደህና መጡ። (Admin OTP Verified)'
    });

    response.cookies.set('tsehay_admin_token', token, {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60, // 7 days
      path: '/'
    });

    return response;

  } catch (error: any) {
    console.error('Error in /api/admin/verify-otp:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'OTP verification failed'
    }, { status: 500 });
  }
}
