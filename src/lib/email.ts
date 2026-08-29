import { EventTicket } from './eventCache';

export const BRAND_LOGO_URL = 'https://www.tsehaycampus.com/tc-logo.jpg';
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.tsehaycampus.com';
export const SENDER_EMAIL = process.env.RESEND_FROM_EMAIL || "Tsehay Campus <support@tsehaycampus.com>";

export interface SendEmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  from?: string;
  replyTo?: string;
}

/**
 * Universal Resend Email Dispatcher with automated fail-safes
 */
export async function sendEmail({
  to,
  subject,
  html,
  from,
  replyTo
}: SendEmailOptions): Promise<{ success: boolean; data?: any; error?: string }> {
  const apiKey = (process.env.RESEND_API_KEY || process.env.RESEND_KEY || '').trim();

  if (!apiKey) {
    console.warn('[Resend Warning] RESEND_API_KEY is not configured in environment.');
    return { success: false, error: 'RESEND_API_KEY is not configured' };
  }

  const recipients = Array.isArray(to) ? to : [to];
  const primaryFrom = from || SENDER_EMAIL;
  const fallbackFromList = [
    primaryFrom,
    'Tsehay Campus <onboarding@resend.dev>',
    'Tsehay Campus <tsehayoperation@gmail.com>',
    'Tsehay Campus <support@tsehaycampus.com>',
    'Tsehay Campus <noreply@tsehaycampus.com>'
  ];

  let lastError: any = null;

  for (const sender of Array.from(new Set(fallbackFromList))) {
    try {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          from: sender,
          to: recipients,
          subject,
          html,
          reply_to: replyTo || 'tsehayoperation@gmail.com'
        })
      });

      const data = await response.json().catch(() => ({}));

      if (response.ok && data.id) {
        return { success: true, data };
      }

      lastError = data.message || `Status ${response.status}`;
      console.warn(`[Resend Attempt with ${sender}] failed:`, lastError);
    } catch (err: any) {
      lastError = err.message;
      console.warn(`[Resend Fetch Error with ${sender}]:`, err);
    }
  }

  return { success: false, error: lastError || 'Failed to dispatch email via Resend' };
}

/**
 * 🌟 1. BRANDED PASSWORD RESET & MAGIC LINK OTP TEMPLATE
 */
export function getPasswordResetOtpEmailHtml(otp: string, email?: string, resetUrl?: string): string {
  const directLink = resetUrl || `${SITE_URL}/auth/reset?code=${otp}&email=${encodeURIComponent(email || '')}`;

  return `
  <!DOCTYPE html>
  <html lang="am">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>የይለፍ ቃል ማረጋገጫ ኮድ - Tsehay Campus</title>
  </head>
  <body style="margin: 0; padding: 30px 10px; background-color: #030509; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #ffffff; -webkit-font-smoothing: antialiased;">
    <table align="center" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 560px; margin: 0 auto; background-color: #070b14; border: 1.5px solid #3268ba; border-radius: 28px; overflow: hidden; box-shadow: 0 25px 70px rgba(0,0,0,0.9), 0 0 40px rgba(50,104,186,0.25);">
      
      <!-- Brand Header -->
      <tr>
        <td align="center" style="padding: 35px 25px 20px; background: linear-gradient(180deg, #0d1527 0%, #070b14 100%); border-bottom: 1px solid rgba(50, 104, 186, 0.4);">
          <div style="display: inline-block; background: #ffffff; padding: 8px 18px; border-radius: 16px; margin-bottom: 16px; box-shadow: 0 10px 25px rgba(0,0,0,0.5);">
            <img src="${BRAND_LOGO_URL}" alt="Tsehay Campus" width="140" style="display: block; max-width: 140px; height: auto;" />
          </div>
          <br>
          <div style="display: inline-block; background: rgba(249, 176, 60, 0.15); border: 1px solid #f9b03c; color: #f9b03c; font-size: 11px; font-weight: 900; padding: 5px 16px; border-radius: 100px; text-transform: uppercase; letter-spacing: 1.5px; margin-bottom: 12px;">
            🔐 ACCOUNT SECURITY
          </div>
          <h1 style="color: #ffffff; font-size: 22px; font-weight: 900; margin: 8px 0 6px; line-height: 1.3;">
            የይለፍ ቃል መቀየሪያ <span style="color: #f9b03c;">ማረጋገጫ ኮድ</span>
          </h1>
          <p style="color: #94a3b8; font-size: 13px; margin: 0;">Password Reset Verification Code</p>
        </td>
      </tr>

      <!-- Message Content -->
      <tr>
        <td style="padding: 30px 30px 20px;">
          <p style="font-size: 14px; color: #cbd5e1; line-height: 1.7; margin: 0 0 15px 0;">
            ሰላም ${email ? `<strong>${email}</strong>` : 'የተከበሩ ተማሪ'}፣
          </p>
          <p style="font-size: 14px; color: #94a3b8; line-height: 1.7; margin: 0 0 25px 0;">
            ለፀሐይ ካምፓስ አካውንትዎ የይለፍ ቃል መቀየሪያ ጥያቄ ቀርቧል። ከታች ያለውን ባለ 6-አሃዝ የደህንነት ኮድ በመጠቀም የይለፍ ቃልዎን ማስተካከል ይችላሉ፦
          </p>

          <!-- OTP Box -->
          <div style="background: rgba(13, 21, 39, 0.9); border: 2px solid #f9b03c; border-radius: 20px; padding: 25px 15px; text-align: center; margin-bottom: 25px; box-shadow: 0 10px 35px rgba(249, 176, 60, 0.25);">
            <div style="color: #94a3b8; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 1.5px; margin-bottom: 12px;">
              የማረጋገጫ ኮድ (VERIFICATION CODE)
            </div>
            <div style="display: inline-block; letter-spacing: 12px; font-size: 34px; font-weight: 900; color: #f9b03c; font-family: Courier, monospace; padding-left: 12px; text-shadow: 0 0 20px rgba(249, 176, 60, 0.5);">
              ${otp}
            </div>
            <div style="color: #64748b; font-size: 11px; margin-top: 10px;">
              ⏱️ ይህ ኮድ የሚያገለግለው ለ 15 ደቂቃዎች ብቻ ነው።
            </div>
          </div>

          <!-- Direct Action Button -->
          <div style="text-align: center; margin-bottom: 25px;">
            <a href="${directLink}" style="display: inline-block; background: linear-gradient(135deg, #f9b03c 0%, #e09825 100%); color: #030509; font-size: 14px; font-weight: 900; text-decoration: none; padding: 14px 34px; border-radius: 14px; text-transform: uppercase; letter-spacing: 1px; box-shadow: 0 10px 25px rgba(249, 176, 60, 0.4);">
              የይለፍ ቃል ቀይር (Reset Password) →
            </a>
          </div>

          <p style="font-size: 12px; color: #64748b; line-height: 1.6; margin: 0; border-top: 1px solid rgba(255,255,255,0.08); padding-top: 15px;">
            ይህንን ጥያቄ እርስዎ ካልጠየቁ ይህንን ኢሜይል ችላ ይበሉት። አካውንትዎ ሙሉ በሙሉ የተጠበቀ ነው።
          </p>
        </td>
      </tr>

      <!-- Footer -->
      <tr>
        <td align="center" style="padding: 20px 25px; background-color: #050811; border-top: 1px solid rgba(255,255,255,0.06);">
          <p style="color: #64748b; font-size: 11px; margin: 0 0 6px 0;">
            © ${new Date().getFullYear()} Tsehay Campus (ፀሐይ ካምፓስ). All rights reserved.
          </p>
          <p style="color: #475569; font-size: 11px; margin: 0;">
            አዲስ አበባ፣ ኢትዮጵያ • <a href="${SITE_URL}" style="color: #f9b03c; text-decoration: none;">tsehaycampus.com</a>
          </p>
        </td>
      </tr>

    </table>
  </body>
  </html>
  `;
}

/**
 * 🌟 2. BRANDED EVENT TICKET CONFIRMATION WITH EMBEDDED QR PASS
 */
export function getEventTicketEmailHtml(ticket: EventTicket | any): string {
  const attendeeName = ticket.attendeeName || 'የተከበሩ ተሳታፊ';
  const eventTitle = ticket.eventTitle || 'Tsehay Campus Live Workshop';
  const eventDate = ticket.eventDate || 'የቀጠሮ ቀን';
  const eventTime = ticket.eventTime || '02:00 PM';
  const eventLocation = ticket.eventLocation || (ticket.isOnline ? 'Online Google Meet' : 'Addis Ababa, Ethiopia');
  const ticketId = ticket.ticketId || `TC-EVT-${Date.now()}`;
  const tier = ticket.tier || 'General Admission';
  const qrPassUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(ticket.qrCodeData || ticketId)}&color=030509&bgcolor=ffffff&qzone=2`;

  return `
  <!DOCTYPE html>
  <html lang="am">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>የክንውን መግቢያ ትኬት - Tsehay Campus</title>
  </head>
  <body style="margin: 0; padding: 30px 10px; background-color: #030509; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #ffffff; -webkit-font-smoothing: antialiased;">
    <table align="center" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 580px; margin: 0 auto; background-color: #070b14; border: 2px solid #f9b03c; border-radius: 28px; overflow: hidden; box-shadow: 0 30px 80px rgba(0,0,0,0.95), 0 0 50px rgba(249,176,60,0.3);">
      
      <!-- Brand Header -->
      <tr>
        <td align="center" style="padding: 35px 25px 20px; background: linear-gradient(180deg, #121c33 0%, #070b14 100%); border-bottom: 1px dashed rgba(249, 176, 60, 0.4);">
          <div style="display: inline-block; background: #ffffff; padding: 8px 18px; border-radius: 16px; margin-bottom: 16px; box-shadow: 0 10px 25px rgba(0,0,0,0.5);">
            <img src="${BRAND_LOGO_URL}" alt="Tsehay Campus" width="140" style="display: block; max-width: 140px; height: auto;" />
          </div>
          <br>
          <div style="display: inline-block; background: rgba(249, 176, 60, 0.15); border: 1px solid #f9b03c; color: #f9b03c; font-size: 11px; font-weight: 900; padding: 5px 18px; border-radius: 100px; text-transform: uppercase; letter-spacing: 1.5px; margin-bottom: 12px;">
            🎟️ OFFICIAL EVENT PASS
          </div>
          <h1 style="color: #ffffff; font-size: 22px; font-weight: 900; margin: 6px 0 4px; line-height: 1.3;">
            የክንውን <span style="color: #f9b03c;">መግቢያ ትኬት</span>
          </h1>
          <p style="color: #94a3b8; font-size: 13px; margin: 0;">Event Admission Pass & QR Ticket</p>
        </td>
      </tr>

      <!-- Ticket Body & QR Pass Card -->
      <tr>
        <td style="padding: 30px 25px 20px;">
          <p style="font-size: 15px; color: #cbd5e1; line-height: 1.6; margin: 0 0 15px 0;">
            ሰላም <strong>${attendeeName}</strong>፣
          </p>
          <p style="font-size: 14px; color: #94a3b8; line-height: 1.7; margin: 0 0 25px 0;">
            ለ <strong>"${eventTitle}"</strong> ዝግጅት ምዝገባዎ በተሳካ ሁኔታ ተጠናቋል! ይህንን ትኬት በስልክዎ ይዘው በመገኘት መግባት ይችላሉ።
          </p>

          <!-- 3D Ticket Pass Badge -->
          <div style="background: #0d1527; border: 2px solid #f9b03c; border-radius: 24px; overflow: hidden; margin-bottom: 25px; box-shadow: 0 15px 40px rgba(0,0,0,0.8);">
            
            <!-- Event Title Banner -->
            <div style="background: linear-gradient(135deg, #1e2d4d 0%, #0d1527 100%); padding: 18px 20px; border-bottom: 1px solid rgba(249,176,60,0.3);">
              <div style="color: #f9b03c; font-size: 11px; font-weight: 900; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 4px;">
                ${tier}
              </div>
              <h2 style="color: #ffffff; font-size: 18px; font-weight: 900; margin: 0; line-height: 1.3;">
                ${eventTitle}
              </h2>
            </div>

            <!-- Details Grid -->
            <div style="padding: 20px;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom: 20px;">
                <tr>
                  <td width="50%" style="padding-bottom: 12px; vertical-align: top;">
                    <div style="color: #64748b; font-size: 11px; font-weight: 800; text-transform: uppercase;">ቀን (Date)</div>
                    <div style="color: #ffffff; font-size: 14px; font-weight: 700; margin-top: 2px;">📅 ${eventDate}</div>
                  </td>
                  <td width="50%" style="padding-bottom: 12px; vertical-align: top;">
                    <div style="color: #64748b; font-size: 11px; font-weight: 800; text-transform: uppercase;">ሰዓት (Time)</div>
                    <div style="color: #ffffff; font-size: 14px; font-weight: 700; margin-top: 2px;">⏰ ${eventTime}</div>
                  </td>
                </tr>
                <tr>
                  <td colspan="2" style="padding-bottom: 12px; vertical-align: top;">
                    <div style="color: #64748b; font-size: 11px; font-weight: 800; text-transform: uppercase;">ቦታ (Location)</div>
                    <div style="color: #38bdf8; font-size: 14px; font-weight: 700; margin-top: 2px;">
                      ${ticket.isOnline ? '🌐 Online Google Meet' : `📍 ${eventLocation}`}
                    </div>
                  </td>
                </tr>
                <tr>
                  <td width="50%" style="vertical-align: top;">
                    <div style="color: #64748b; font-size: 11px; font-weight: 800; text-transform: uppercase;">ተሳታፊ (Attendee)</div>
                    <div style="color: #ffffff; font-size: 13px; font-weight: 700; margin-top: 2px;">${attendeeName}</div>
                  </td>
                  <td width="50%" style="vertical-align: top;">
                    <div style="color: #64748b; font-size: 11px; font-weight: 800; text-transform: uppercase;">ትኬት ቁጥር (ID)</div>
                    <div style="color: #f9b03c; font-size: 12px; font-weight: 900; font-family: monospace; margin-top: 2px;">${ticketId}</div>
                  </td>
                </tr>
              </table>

              <!-- Centered Scannable QR Code Pass -->
              <div style="text-align: center; background: #ffffff; border: 3px solid #f9b03c; border-radius: 20px; padding: 18px; max-width: 220px; margin: 0 auto; box-shadow: 0 10px 25px rgba(0,0,0,0.5);">
                <img src="${qrPassUrl}" alt="Scannable QR Pass" width="200" height="200" style="display: block; margin: 0 auto; max-width: 100%; height: auto;" />
                <div style="color: #030509; font-size: 11px; font-weight: 900; font-family: monospace; margin-top: 8px; letter-spacing: 1px;">
                  SCAN AT GATE
                </div>
              </div>

            </div>
          </div>

          <!-- Action Button -->
          <div style="text-align: center; margin-bottom: 20px;">
            <a href="${SITE_URL}/events" style="display: inline-block; background: linear-gradient(135deg, #f9b03c 0%, #e09825 100%); color: #030509; font-size: 13px; font-weight: 900; text-decoration: none; padding: 14px 32px; border-radius: 14px; text-transform: uppercase; letter-spacing: 1px; box-shadow: 0 10px 25px rgba(249, 176, 60, 0.4);">
              ዝግጅቶችን እይ (View Events) →
            </a>
          </div>
        </td>
      </tr>

      <!-- Footer -->
      <tr>
        <td align="center" style="padding: 20px 25px; background-color: #050811; border-top: 1px solid rgba(255,255,255,0.06);">
          <p style="color: #64748b; font-size: 11px; margin: 0 0 6px 0;">
            © ${new Date().getFullYear()} Tsehay Campus. All rights reserved.
          </p>
          <p style="color: #475569; font-size: 11px; margin: 0;">
            አዲስ አበባ፣ ኢትዮጵያ • <a href="${SITE_URL}" style="color: #f9b03c; text-decoration: none;">tsehaycampus.com</a>
          </p>
        </td>
      </tr>

    </table>
  </body>
  </html>
  `;
}

/**
 * 🌟 3. BRANDED COURSE ENROLLMENT WELCOME & RECEIPT
 */
export function getCourseEnrollmentEmailHtml(data: {
  name: string;
  courseTitle: string;
  price: number | string;
  referenceId?: string;
  accessUrl?: string;
}): string {
  const displayName = data.name || 'የተከበሩ ተማሪ';
  const classroomUrl = data.accessUrl || `${SITE_URL}/dashboard`;
  const priceDisplay = Number(data.price) === 0 || data.price === 'Free' ? '100% ነፃ (Free)' : `${Number(data.price).toLocaleString()} ETB`;

  return `
  <!DOCTYPE html>
  <html lang="am">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>እንኳን ወደ ኮርሱ በደህና መጡ! - Tsehay Campus</title>
  </head>
  <body style="margin: 0; padding: 30px 10px; background-color: #030509; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #ffffff; -webkit-font-smoothing: antialiased;">
    <table align="center" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 580px; margin: 0 auto; background-color: #070b14; border: 2px solid #f9b03c; border-radius: 28px; overflow: hidden; box-shadow: 0 30px 80px rgba(0,0,0,0.95), 0 0 50px rgba(249,176,60,0.3);">
      
      <!-- Brand Header -->
      <tr>
        <td align="center" style="padding: 35px 25px 20px; background: linear-gradient(180deg, #121c33 0%, #070b14 100%); border-bottom: 1px dashed rgba(249, 176, 60, 0.4);">
          <div style="display: inline-block; background: #ffffff; padding: 8px 18px; border-radius: 16px; margin-bottom: 16px; box-shadow: 0 10px 25px rgba(0,0,0,0.5);">
            <img src="${BRAND_LOGO_URL}" alt="Tsehay Campus" width="140" style="display: block; max-width: 140px; height: auto;" />
          </div>
          <br>
          <div style="display: inline-block; background: rgba(249, 176, 60, 0.15); border: 1px solid #f9b03c; color: #f9b03c; font-size: 11px; font-weight: 900; padding: 5px 18px; border-radius: 100px; text-transform: uppercase; letter-spacing: 1.5px; margin-bottom: 12px;">
            🎓 ENROLLMENT CONFIRMED
          </div>
          <h1 style="color: #ffffff; font-size: 22px; font-weight: 900; margin: 6px 0 4px; line-height: 1.3;">
            እንኳን ወደ ኮርሱ <span style="color: #f9b03c;">በደህና መጡ!</span>
          </h1>
          <p style="color: #94a3b8; font-size: 13px; margin: 0;">Course Enrollment & Access Receipt</p>
        </td>
      </tr>

      <!-- Message Content -->
      <tr>
        <td style="padding: 30px 25px 20px;">
          <p style="font-size: 15px; color: #cbd5e1; line-height: 1.6; margin: 0 0 15px 0;">
            ሰላም <strong>${displayName}</strong>፣
          </p>
          <p style="font-size: 14px; color: #94a3b8; line-height: 1.7; margin: 0 0 25px 0;">
            ወደ <strong>"${data.courseTitle}"</strong> ስልጠና በደስታ ተቀብለኖታል! አሁን በቀጥታ ወደ መማሪያ ክፍልዎ በመግባት ቪዲዮዎችን መከታተል፣ ፋይሎችን ማውረድ እና በ AI መማሪያ እርዳታ ማግኘት ይችላሉ።
          </p>

          <!-- Receipt Details Card -->
          <div style="background: #0d1527; border: 1.5px solid #3268ba; border-radius: 20px; padding: 20px; margin-bottom: 25px;">
            <div style="color: #38bdf8; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 12px;">
              የምዝገባ ደረሰኝ (ENROLLMENT RECEIPT)
            </div>
            
            <table width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td style="padding: 6px 0; color: #94a3b8; font-size: 13px;">ኮርስ (Course):</td>
                <td style="padding: 6px 0; color: #ffffff; font-size: 13px; font-weight: 700; text-align: right;">${data.courseTitle}</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; color: #94a3b8; font-size: 13px;">የተከፈለ መጠን (Amount):</td>
                <td style="padding: 6px 0; color: #f9b03c; font-size: 14px; font-weight: 900; text-align: right;">${priceDisplay}</td>
              </tr>
              ${data.referenceId ? `
              <tr>
                <td style="padding: 6px 0; color: #94a3b8; font-size: 13px;">መለያ ቁጥር (Ref ID):</td>
                <td style="padding: 6px 0; color: #cbd5e1; font-size: 12px; font-family: monospace; text-align: right;">${data.referenceId}</td>
              </tr>
              ` : ''}
              <tr>
                <td style="padding: 6px 0; color: #94a3b8; font-size: 13px;">መዳረሻ (Access):</td>
                <td style="padding: 6px 0; color: #34d399; font-size: 13px; font-weight: 700; text-align: right;">የህይወት ዘመን (Lifetime)</td>
              </tr>
            </table>
          </div>

          <!-- Direct Access Button -->
          <div style="text-align: center; margin-bottom: 25px;">
            <a href="${classroomUrl}" style="display: inline-block; background: linear-gradient(135deg, #f9b03c 0%, #e09825 100%); color: #030509; font-size: 14px; font-weight: 900; text-decoration: none; padding: 15px 36px; border-radius: 14px; text-transform: uppercase; letter-spacing: 1px; box-shadow: 0 10px 30px rgba(249, 176, 60, 0.45);">
              ወደ መማሪያ ክፍል ግባ (Enter Classroom) →
            </a>
          </div>

        </td>
      </tr>

      <!-- Footer -->
      <tr>
        <td align="center" style="padding: 20px 25px; background-color: #050811; border-top: 1px solid rgba(255,255,255,0.06);">
          <p style="color: #64748b; font-size: 11px; margin: 0 0 6px 0;">
            © ${new Date().getFullYear()} Tsehay Campus. All rights reserved.
          </p>
          <p style="color: #475569; font-size: 11px; margin: 0;">
            አዲስ አበባ፣ ኢትዮጵያ • <a href="${SITE_URL}" style="color: #f9b03c; text-decoration: none;">tsehaycampus.com</a>
          </p>
        </td>
      </tr>

    </table>
  </body>
  </html>
  `;
}

/**
 * 🌟 4. BRANDED ADMIN 2FA OTP CODE
 */
export function getAdmin2FaOtpEmailHtml(otp: string, adminEmail?: string): string {
  return `
  <!DOCTYPE html>
  <html lang="am">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>አድሚን 2FA ማረጋገጫ ኮድ - Tsehay Campus</title>
  </head>
  <body style="margin: 0; padding: 30px 10px; background-color: #030509; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #ffffff; -webkit-font-smoothing: antialiased;">
    <table align="center" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 540px; margin: 0 auto; background-color: #070b14; border: 2px solid #3268ba; border-radius: 28px; overflow: hidden; box-shadow: 0 30px 80px rgba(0,0,0,0.95), 0 0 45px rgba(50,104,186,0.35);">
      
      <!-- Brand Header -->
      <tr>
        <td align="center" style="padding: 35px 25px 20px; background: linear-gradient(180deg, #10192e 0%, #070b14 100%); border-bottom: 1px solid rgba(50, 104, 186, 0.5);">
          <div style="display: inline-block; background: #ffffff; padding: 8px 18px; border-radius: 16px; margin-bottom: 16px; box-shadow: 0 10px 25px rgba(0,0,0,0.5);">
            <img src="${BRAND_LOGO_URL}" alt="Tsehay Campus" width="140" style="display: block; max-width: 140px; height: auto;" />
          </div>
          <br>
          <div style="display: inline-block; background: rgba(50, 104, 186, 0.2); border: 1px solid #3268ba; color: #60a5fa; font-size: 11px; font-weight: 900; padding: 5px 18px; border-radius: 100px; text-transform: uppercase; letter-spacing: 1.5px; margin-bottom: 12px;">
            🛡️ ADMIN TWO-FACTOR AUTH (2FA)
          </div>
          <h1 style="color: #ffffff; font-size: 22px; font-weight: 900; margin: 6px 0 4px; line-height: 1.3;">
            የአድሚን ዳሽቦርድ <span style="color: #f9b03c;">መግቢያ ኮድ</span>
          </h1>
          <p style="color: #94a3b8; font-size: 13px; margin: 0;">Admin Portal Two-Factor Security</p>
        </td>
      </tr>

      <!-- OTP Box -->
      <tr>
        <td style="padding: 30px 25px 20px;">
          <p style="font-size: 14px; color: #cbd5e1; line-height: 1.6; margin: 0 0 15px 0;">
            ሰላም የአስተዳዳሪ ቡድን አባል (${adminEmail || 'Admin'})፣
          </p>
          <p style="font-size: 14px; color: #94a3b8; line-height: 1.7; margin: 0 0 25px 0;">
            ወደ ፀሐይ ካምፓስ አድሚን ዳሽቦርድ ለመግባት የ 2FA ማረጋገጫ ኮድ ተጠይቋል። ወደ ሲስተሙ ለመግባት የሚከተለውን ሚስጥራዊ ኮድ ይጠቀሙ፦
          </p>

          <div style="background: rgba(13, 21, 39, 0.95); border: 2px solid #f9b03c; border-radius: 20px; padding: 25px 15px; text-align: center; margin-bottom: 25px; box-shadow: 0 10px 35px rgba(249, 176, 60, 0.25);">
            <div style="color: #94a3b8; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 1.5px; margin-bottom: 12px;">
              የ 2FA ማረጋገጫ ኮድ (ADMIN OTP)
            </div>
            <div style="display: inline-block; letter-spacing: 12px; font-size: 36px; font-weight: 900; color: #f9b03c; font-family: Courier, monospace; padding-left: 12px; text-shadow: 0 0 25px rgba(249, 176, 60, 0.5);">
              ${otp}
            </div>
            <div style="color: #64748b; font-size: 11px; margin-top: 10px;">
              ⏱️ ይህ ኮድ የሚያገለግለው ለ 10 ደቂቃዎች ብቻ ነው።
            </div>
          </div>
        </td>
      </tr>

      <!-- Footer -->
      <tr>
        <td align="center" style="padding: 20px 25px; background-color: #050811; border-top: 1px solid rgba(255,255,255,0.06);">
          <p style="color: #64748b; font-size: 11px; margin: 0 0 6px 0;">
            © ${new Date().getFullYear()} Tsehay Campus Security. All rights reserved.
          </p>
        </td>
      </tr>

    </table>
  </body>
  </html>
  `;
}
