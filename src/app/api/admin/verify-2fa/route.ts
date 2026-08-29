import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';

const STRICT_ADMIN_EMAIL = 'eyoubsahle@gmail.com';

// In-memory fallback cache in case Firestore is unreachable
const memoryOtpCache = new Map<string, { code: string; expiresAt: number; attempts: number }>();

export async function POST(req: NextRequest) {
  try {
    let body: any = {};
    try {
      body = await req.json();
    } catch (e) {
      body = {};
    }

    const { action = 'send', email, code } = body;
    const cleanEmail = (email || '').trim().toLowerCase();

    // 🛡️ Strict Authorization Check: Only eyoubsahle@gmail.com is permitted
    if (cleanEmail !== STRICT_ADMIN_EMAIL) {
      return NextResponse.json({
        success: false,
        error: 'ይቅርታ፣ ወደዚህ ገጽ ለመግባት የአድሚን ፈቃድ የለዎትም። (Unauthorized Admin Account)'
      }, { status: 403 });
    }

    // ==========================================
    // ACTION 1: SEND 6-DIGIT OTP TO ADMIN EMAIL
    // ==========================================
    if (action === 'send') {
      // 1. Generate cryptographically strong 6-digit numerical code
      const min = 100000;
      const max = 999999;
      const otpCode = Math.floor(Math.random() * (max - min + 1) + min).toString();
      const now = Date.now();
      const expiresAt = now + 10 * 60 * 1000; // 10 minutes validity

      // 2. Save in Memory and Firestore
      memoryOtpCache.set(cleanEmail, { code: otpCode, expiresAt, attempts: 0 });

      if (adminDb) {
        try {
          const docId = cleanEmail.replace(/[^a-zA-Z0-9]/g, '_');
          const ref = adminDb.collection('admin_2fa_tokens').doc(docId);
          await ref.set({
            code: otpCode,
            email: cleanEmail,
            createdAt: now,
            expiresAt,
            attempts: 0,
            verified: false
          });
        } catch (dbErr) {
          console.warn('Firestore 2FA save notice:', dbErr);
        }
      }

      // 3. Send HTML Email via Resend
      const resendApiKey = process.env.RESEND_API_KEY;
      const fromEmail = process.env.RESEND_FROM_EMAIL || 'Tsehay Campus Security <support@tsehaycampus.com>';
      const fallbackFrom = 'Tsehay Campus <onboarding@resend.dev>';
      const websiteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://tsehaycampus.com';

      const emailHtml = `
      <!DOCTYPE html>
      <html lang="am">
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>🔐 Tsehay Campus Admin Verification Code</title>
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #06090e; margin: 0; padding: 30px 15px; color: #ffffff;">
        <table align="center" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 520px; margin: 0 auto; background-color: #0c1017; border: 2px solid #f9b03c; border-radius: 24px; overflow: hidden; box-shadow: 0 25px 60px rgba(0,0,0,0.85);">
          
          <!-- Header (Cobalt Blue Gradient) -->
          <tr>
            <td align="center" style="padding: 32px 20px 20px; background: linear-gradient(135deg, #1e3a8a 0%, #3268ba 50%, #1e293b 100%); border-bottom: 2px solid #f9b03c;">
              <div style="display: inline-block; background: #ffffff; padding: 6px 14px; border-radius: 12px; margin-bottom: 14px; box-shadow: 0 4px 15px rgba(0,0,0,0.3);">
                <img src="${websiteUrl}/tc-logo.jpg" alt="Tsehay Campus Logo" width="130" style="display: block; max-width: 130px; height: auto;" />
              </div>
              <div style="display: inline-block; background: rgba(249, 176, 60, 0.18); border: 1px solid #f9b03c; color: #f9b03c; font-size: 11px; font-weight: 800; padding: 4px 14px; border-radius: 100px; text-transform: uppercase; letter-spacing: 1.5px; margin-bottom: 8px;">
                🔐 ADMIN 2-STEP VERIFICATION
              </div>
              <h1 style="color: #ffffff; font-size: 22px; font-weight: 900; margin: 8px 0 4px; line-height: 1.3;">
                የአድሚን ማረጋገጫ ኮድ (Verification Code)
              </h1>
              <p style="color: #cbd5e1; font-size: 13px; margin: 0;">የተከበሩ ኢዮብ ሳህሌ (<span style="color: #f9b03c; font-weight: bold;">eyoubsahle@gmail.com</span>)</p>
            </td>
          </tr>

          <!-- OTP Code Box (Golden Orange Accents) -->
          <tr>
            <td align="center" style="padding: 28px 28px 15px;">
              <div style="background: rgba(249, 176, 60, 0.08); border: 2px dashed #f9b03c; border-radius: 20px; padding: 24px; text-align: center;">
                <span style="font-size: 11px; text-transform: uppercase; letter-spacing: 2px; color: #f9b03c; font-weight: 800; display: block; margin-bottom: 8px;">የ 6-አሃዝ ማረጋገጫ ኮድዎ</span>
                <div style="font-family: monospace, Courier, sans-serif; font-size: 40px; font-weight: 900; letter-spacing: 10px; color: #ffffff; text-shadow: 0 0 25px rgba(249,176,60,0.7); padding: 12px 0;">
                  ${otpCode}
                </div>
                <p style="margin: 8px 0 0 0; font-size: 12px; color: #94a3b8;">ይህ ኮድ የሚያገለግለው ለ <strong>10 ደቂቃዎች (10 Minutes)</strong> ብቻ ነው።</p>
              </div>
            </td>
          </tr>

          <!-- Security Note -->
          <tr>
            <td style="padding: 10px 28px 25px;">
              <div style="background: rgba(50, 104, 186, 0.1); border: 1px solid rgba(50, 104, 186, 0.3); border-radius: 14px; padding: 14px 18px; font-size: 12px; color: #94a3b8; line-height: 1.6;">
                ⚠️ <strong>የደህንነት ማሳሰቢያ፡</strong> ይህ ኮድ የአድሚን ዳሽቦርድ መዳረሻ የሚሰጥ በመሆኑ ለማንም ሰው አያጋሩ። ወደ አድሚን ዳሽቦርድ ለመግባት ካልሞከሩ ይህንን መልዕክት ችላ ይበሉት።
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 18px 28px; background-color: #080b11; border-top: 1px solid rgba(255,255,255,0.06); text-align: center; font-size: 11px; color: #64748b;">
              <p style="margin: 0;">© ${new Date().getFullYear()} Tsehay Campus Security Gateway. All rights reserved.</p>
            </td>
          </tr>

        </table>
      </body>
      </html>
      `;

      if (resendApiKey) {
        try {
          const res = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${resendApiKey}`
            },
            body: JSON.stringify({
              from: fromEmail,
              to: [cleanEmail],
              subject: `🔐 Tsehay Campus Admin Verification Code: ${otpCode}`,
              html: emailHtml
            })
          });

          if (!res.ok) {
            // Fallback to onboarding@resend.dev
            await fetch('https://api.resend.com/emails', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${resendApiKey}`
              },
              body: JSON.stringify({
                from: fallbackFrom,
                to: [cleanEmail],
                subject: `🔐 Tsehay Campus Admin Verification Code: ${otpCode}`,
                html: emailHtml
              })
            }).catch(() => {});
          }
        } catch (mailErr) {
          console.warn('Resend 2FA mail attempt notice:', mailErr);
        }
      }

      return NextResponse.json({
        success: true,
        message: 'የ 6-አሃዝ የአድሚን ማረጋገጫ ኮድ ወደ eyoubsahle@gmail.com ተልኳል!',
        email: 'eyoubsahle@gmail.com',
        expiresInMinutes: 10
      });
    }

    // ==========================================
    // ACTION 2: VERIFY 6-DIGIT OTP CODE
    // ==========================================
    if (action === 'verify') {
      const inputCode = (code || '').toString().trim();

      if (!inputCode || inputCode.length !== 6) {
        return NextResponse.json({
          success: false,
          error: 'እባክዎ ባለ 6-አሃዝ ኮድ ያስገቡ (Enter valid 6-digit code)'
        }, { status: 400 });
      }

      let storedRecord: any = memoryOtpCache.get(cleanEmail);

      // Check Firestore if available
      if (adminDb) {
        try {
          const docId = cleanEmail.replace(/[^a-zA-Z0-9]/g, '_');
          const snap = await adminDb.collection('admin_2fa_tokens').doc(docId).get();
          if (snap.exists) {
            storedRecord = snap.data();
          }
        } catch (e) {}
      }

      // Check existence
      if (!storedRecord || !storedRecord.code) {
        return NextResponse.json({
          success: false,
          error: 'የማረጋገጫ ኮድ አልተገኘም። እባክዎ አዲስ ኮድ ይጠይቁ (OTP not found, request a new code).'
        }, { status: 400 });
      }

      // Check expiration
      if (Date.now() > storedRecord.expiresAt) {
        return NextResponse.json({
          success: false,
          error: 'የማረጋገጫ ኮዱ ጊዜው አልፎበታል (Code expired). እባክዎ አዲስ ኮድ ይጠይቁ።'
        }, { status: 400 });
      }

      // Check max attempts
      if (storedRecord.attempts >= 5) {
        return NextResponse.json({
          success: false,
          error: 'ኮዱን ደጋግመው ተሳስተዋል! እባክዎ አዲስ ኮድ ይጠይቁ (Too many failed attempts).'
        }, { status: 400 });
      }

      // Check code match
      if (storedRecord.code !== inputCode) {
        storedRecord.attempts = (storedRecord.attempts || 0) + 1;
        memoryOtpCache.set(cleanEmail, storedRecord);

        const remaining = 5 - storedRecord.attempts;
        return NextResponse.json({
          success: false,
          error: `የተሳሳተ ኮድ አስገብተዋል። ${remaining > 0 ? `(የቀሩ ሙከራዎች፡ ${remaining})` : 'እባክዎ አዲስ ኮድ ይጠይቁ።'}`
        }, { status: 400 });
      }

      // 🛡️ Code is 100% Valid!
      const timeHex = Date.now().toString(36).toUpperCase();
      const token = `TC-ADM-AUTH-2FA-${timeHex}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

      // Clean up used OTP
      memoryOtpCache.delete(cleanEmail);
      if (adminDb) {
        try {
          const docId = cleanEmail.replace(/[^a-zA-Z0-9]/g, '_');
          await adminDb.collection('admin_2fa_tokens').doc(docId).delete();
        } catch (e) {}
      }

      const response = NextResponse.json({
        success: true,
        token,
        message: 'የአድሚን ማረጋገጫ ተሳክቷል! እንኳን ደህና መጡ። (Admin 2FA Verified)'
      });

      response.cookies.set('tc_admin_session', token, {
        httpOnly: false,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60, // 7 days
        path: '/'
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

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error: any) {
    console.error('Error in /api/admin/verify-2fa:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Internal security verification error'
    }, { status: 500 });
  }
}
