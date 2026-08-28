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
    const expiresAt = now + 10 * 60 * 1000; // 10 minutes validity

    const docId = cleanEmail.replace(/[^a-zA-Z0-9]/g, '_');

    // 3. Save to Firestore (password_reset_otps & otp_verifications)
    if (adminDb) {
      try {
        const resetOtpRef = adminDb.collection('artifacts').doc('tsehaycampus-e1a6d').collection('public').doc('data').collection('password_reset_otps').doc(docId);
        await resetOtpRef.set({
          code: otpCode,
          email: cleanEmail,
          createdAt: now,
          expiresAt: expiresAt,
          attempts: 0,
          verified: false,
          updatedAt: FieldValue.serverTimestamp()
        }, { merge: true });

        const generalOtpRef = adminDb.collection('artifacts').doc('tsehaycampus-e1a6d').collection('public').doc('data').collection('otp_verifications').doc(docId);
        await generalOtpRef.set({
          code: otpCode,
          email: cleanEmail,
          createdAt: now,
          expiresAt: expiresAt,
          attempts: 0,
          verified: false,
          updatedAt: FieldValue.serverTimestamp()
        }, { merge: true });
      } catch (dbErr) {
        console.warn('adminDb write notice in send-otp:', dbErr);
      }
    }

    // 4. Send Silicon Valley Premium HTML Email via Resend
    const resendApiKey = process.env.RESEND_API_KEY;
    const fromEmail = process.env.RESEND_FROM_EMAIL || 'Tsehay Campus <support@tsehaycampus.com>';
    const fallbackFrom = 'Tsehay Campus <onboarding@resend.dev>';

    const emailHtml = `
      <!DOCTYPE html>
      <html lang="am">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>የይለፍ ቃል መቀየሪያ ማረጋገጫ ኮድ - Tsehay Campus</title>
        <style>
          body {
            margin: 0;
            padding: 0;
            background-color: #0b0f19;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
            color: #ffffff;
            -webkit-font-smoothing: antialiased;
          }
          .wrapper {
            width: 100%;
            table-layout: fixed;
            background-color: #0b0f19;
            padding: 40px 15px;
          }
          .main-card {
            max-width: 540px;
            margin: 0 auto;
            background-color: #111827;
            border-radius: 24px;
            border: 1px solid rgba(249, 176, 60, 0.35);
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.8), 0 0 40px rgba(249, 176, 60, 0.15);
            overflow: hidden;
          }
          .header-bar {
            padding: 35px 25px 20px;
            text-align: center;
            background: linear-gradient(180deg, rgba(249, 176, 60, 0.08) 0%, transparent 100%);
          }
          .logo-img {
            width: 72px;
            height: 72px;
            border-radius: 18px;
            border: 2px solid #f9b03c;
            box-shadow: 0 0 25px rgba(249, 176, 60, 0.4);
            display: inline-block;
          }
          .brand-title {
            margin-top: 15px;
            font-size: 24px;
            font-weight: 900;
            letter-spacing: 0.5px;
            color: #ffffff;
          }
          .brand-gold {
            color: #f9b03c;
          }
          .brand-blue {
            color: #3268ba;
          }
          .content-body {
            padding: 25px 35px 35px;
            text-align: center;
          }
          .headline {
            font-size: 19px;
            font-weight: 800;
            color: #f3f4f6;
            margin-bottom: 12px;
            line-height: 1.4;
          }
          .subtext {
            font-size: 14px;
            color: #9ca3af;
            line-height: 1.6;
            margin-bottom: 28px;
          }
          .otp-box {
            background: linear-gradient(135deg, #f9b03c 0%, #ffc857 100%);
            border-radius: 18px;
            padding: 22px 15px;
            margin: 20px 0 28px;
            box-shadow: 0 10px 30px rgba(249, 176, 60, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.6);
            text-align: center;
          }
          .otp-code {
            font-family: 'Courier New', Courier, monospace;
            font-size: 40px;
            font-weight: 900;
            letter-spacing: 10px;
            color: #0b0f19;
            margin: 0;
            line-height: 1;
            padding-left: 10px;
          }
          .timer-badge {
            display: inline-block;
            background-color: rgba(249, 176, 60, 0.15);
            border: 1px solid rgba(249, 176, 60, 0.4);
            color: #f9b03c;
            padding: 6px 14px;
            border-radius: 20px;
            font-size: 12px;
            font-weight: 700;
            margin-bottom: 24px;
          }
          .security-note {
            background-color: rgba(255, 255, 255, 0.03);
            border-left: 3px solid #f9b03c;
            border-radius: 8px;
            padding: 14px 16px;
            font-size: 12.5px;
            color: #d1d5db;
            text-align: left;
            line-height: 1.5;
            margin-top: 20px;
          }
          .footer {
            padding: 25px 20px;
            text-align: center;
            border-top: 1px solid rgba(255, 255, 255, 0.08);
            font-size: 11px;
            color: #6b7280;
            background-color: #090d16;
          }
          .footer-link {
            color: #f9b03c;
            text-decoration: none;
            font-weight: 600;
          }
        </style>
      </head>
      <body>
        <div class="wrapper">
          <table width="100%" border="0" cellspacing="0" cellpadding="0">
            <tr>
              <td align="center">
                <div class="main-card">
                  
                  <!-- Header -->
                  <div class="header-bar">
                    <img src="https://tsehaycampus.com/tc-logo.jpg" alt="Tsehay Campus" class="logo-img" onerror="this.src='https://ui-avatars.com/api/?name=TC&background=3268BA&color=fff';" />
                    <div class="brand-title">
                      <span class="brand-gold">Tsehay</span> <span class="brand-blue">Campus</span>
                    </div>
                  </div>

                  <!-- Content Body -->
                  <div class="content-body">
                    <div class="headline">የይለፍ ቃል መቀየሪያ ማረጋገጫ ኮድ</div>
                    <div class="subtext">
                      የይለፍ ቃልዎን ለመቀየር የተጠየቀ የማረጋገጫ ኮድ። እባክዎ ይህንን ኮድ በ <strong>10 ደቂቃ</strong> ውስጥ ይጠቀሙ።
                    </div>

                    <!-- Massive Golden Yellow OTP Box -->
                    <div class="otp-box">
                      <div class="otp-code">${otpCode}</div>
                    </div>

                    <div class="timer-badge">
                      ⏱️ የኮዱ ቆይታ ጊዜ፡ 10 ደቂቃ (Expires in 10 mins)
                    </div>

                    <!-- Security Alert -->
                    <div class="security-note">
                      🔒 <strong>የደህንነት ማሳሰቢያ፡</strong> ማንም ሰው ይህንን ኮድ ቢጠይቅዎ አሳልፈው አይስጡ። እርስዎ የይለፍ ቃል መቀየር ካልጠየቁ ይህንን መልዕክት ችላ ይበሉ።
                    </div>
                  </div>

                  <!-- Footer -->
                  <div class="footer">
                    <div>© ${new Date().getFullYear()} Tsehay Campus (የኢትዮጵያ #1 የመማሪያ ፕላትፎርም). መብቱ በህግ የተጠበቀ ነው።</div>
                    <div style="margin-top: 6px;">
                      ድጋፍ ካስፈለገዎ፡ <a href="mailto:support@tsehaycampus.com" class="footer-link">support@tsehaycampus.com</a>
                    </div>
                  </div>

                </div>
              </td>
            </tr>
          </table>
        </div>
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
            subject: `🔑 የይለፍ ቃል መቀየሪያ ማረጋገጫ ኮድ፡ ${otpCode} - Tsehay Campus`,
            html: emailHtml
          })
        });

        if (!res.ok) {
          // Fallback to onboarding@resend.dev if custom domain is unverified
          await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${resendApiKey}`
            },
            body: JSON.stringify({
              from: fallbackFrom,
              to: [cleanEmail],
              subject: `🔑 የይለፍ ቃል መቀየሪያ ማረጋገጫ ኮድ፡ ${otpCode} - Tsehay Campus`,
              html: emailHtml
            })
          }).catch(e => console.warn('Resend fallback notice:', e));
        }
      } catch (mailErr) {
        console.warn('Resend mail dispatch notice:', mailErr);
      }
    } else {
      console.log(`[Resend Notice] RESEND_API_KEY not set. Mocking OTP email dispatch to: ${cleanEmail}, code: ${otpCode}`);
    }

    return NextResponse.json({
      success: true,
      code: otpCode,
      message: `የ 6-አሃዝ ማረጋገጫ ኮድ ወደ ${cleanEmail} ተልኳል!`,
      expiresInMinutes: 10
    });
  } catch (error: any) {
    console.error('Error in send-otp API:', error);
    return NextResponse.json({ 
      error: 'የማረጋገጫ ኮድ መላክ አልተቻለም። እባክዎ በድጋሚ ይሞክሩ።' 
    }, { status: 500 });
  }
}
