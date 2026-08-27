/**
 * Tsehay Campus - Ultra-Premium 3D HTML Email Templates
 * Inspired by Terafab / x.ai modern cybernetic aesthetics
 * Features dark obsidian canvas (#0b0f19), golden yellow accents (#f9b03c), 
 * sapphire glow (#3268ba), glassmorphism-styled containers, and high-contrast typography.
 */

export interface MentorshipBooking {
  id?: string;
  name: string;
  phone: string;
  email: string;
  date: string;
  time: string;
  topic: string;
  userId?: string;
  createdAt?: string;
}

const BRAND_LOGO_URL = 'https://tsehaycampus.com/tc-logo.jpg';
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://tsehaycampus.com';

// 🌟 1. Mentorship Confirmation Email (For Student / User)
export function getMentorshipUserEmailHtml(booking: MentorshipBooking): string {
  return `
  <!DOCTYPE html>
  <html lang="am">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>የማማከር ቀጠሮዎ ተረጋግጧል! - Tsehay Campus</title>
  </head>
  <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #050811; margin: 0; padding: 35px 15px; color: #ffffff;">
    <table align="center" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 580px; margin: 0 auto; background-color: #0b0f19; border: 2px solid #f9b03c; border-radius: 28px; overflow: hidden; box-shadow: 0 30px 80px rgba(0,0,0,0.9), 0 0 50px rgba(249,176,60,0.2);">
      
      <!-- Top Brand Header with Ambient Glow -->
      <tr>
        <td align="center" style="padding: 35px 25px 20px; background: linear-gradient(180deg, #131a2c 0%, #0b0f19 100%); border-bottom: 1px dashed rgba(249, 176, 60, 0.35);">
          <div style="display: inline-block; background: #ffffff; padding: 8px 18px; border-radius: 16px; margin-bottom: 16px; box-shadow: 0 10px 25px rgba(0,0,0,0.5);">
            <img src="${BRAND_LOGO_URL}" alt="Tsehay Campus Logo" width="150" style="display: block; max-width: 150px; height: auto;" />
          </div>
          <br>
          <div style="display: inline-block; background: rgba(249, 176, 60, 0.15); border: 1px solid #f9b03c; color: #f9b03c; font-size: 11px; font-weight: 900; padding: 5px 16px; border-radius: 100px; text-transform: uppercase; letter-spacing: 1.5px; margin-bottom: 12px;">
            🌟 1-ON-1 VIP MENTORSHIP
          </div>
          <h1 style="color: #ffffff; font-size: 24px; font-weight: 900; margin: 8px 0 6px; line-height: 1.3;">
            የማማከር ቀጠሮዎ <span style="color: #f9b03c;">ተረጋግጧል!</span>
          </h1>
          <p style="color: #94a3b8; font-size: 14px; margin: 0;">ከኢዮብ ሳህሌ (Eyoub Sahle) ጋር የተያዘ የቀጥታ ማማከር</p>
        </td>
      </tr>

      <!-- Greeting & Overview -->
      <tr>
        <td style="padding: 28px 32px 15px;">
          <p style="font-size: 15px; color: #e2e8f0; line-height: 1.7; margin: 0 0 15px 0;">
            ሰላም <strong>${booking.name}</strong>፣
          </p>
          <p style="font-size: 14px; color: #94a3b8; line-height: 1.7; margin: 0 0 20px 0;">
            የ 1-ለ-1 ማማከር ቀጠሮ ጥያቄዎ በተሳካ ሁኔታ ተመዝግቧል። አሰልጣኝ ኢዮብ ሳህሌ መረጃዎን ተመልክቶ በስልክዎ (<strong>${booking.phone}</strong>) ወይም በቴሌግራም በቅርቡ የሚያገኝዎት ይሆናል።
          </p>

          <!-- Booking Summary Card -->
          <div style="background: rgba(255, 255, 255, 0.03); border: 1px solid rgba(249, 176, 60, 0.3); border-radius: 20px; padding: 22px; margin-bottom: 20px; box-shadow: inset 0 0 20px rgba(249,176,60,0.05);">
            <table width="100%" border="0" cellpadding="0" cellspacing="0">
              <tr>
                <td style="padding: 6px 0; color: #94a3b8; font-size: 12px; font-weight: 700; text-transform: uppercase;">ቀን (Selected Date):</td>
                <td align="right" style="padding: 6px 0; color: #ffffff; font-size: 13px; font-weight: 900;">${booking.date}</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; color: #94a3b8; font-size: 12px; font-weight: 700; text-transform: uppercase;">ሰዓት (Time):</td>
                <td align="right" style="padding: 6px 0; color: #f9b03c; font-size: 13px; font-weight: 900;">${booking.time}</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; color: #94a3b8; font-size: 12px; font-weight: 700; text-transform: uppercase;">የመገናኛ ዘዴ (Format):</td>
                <td align="right" style="padding: 6px 0; color: #38bdf8; font-size: 13px; font-weight: 900;">Google Meet / Phone Call</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; color: #94a3b8; font-size: 12px; font-weight: 700; text-transform: uppercase;">የማማከሪያ ርዕስ (Topic):</td>
                <td align="right" style="padding: 6px 0; color: #ffffff; font-size: 13px; font-weight: 700; max-width: 250px;">${booking.topic}</td>
              </tr>
            </table>
          </div>
        </td>
      </tr>

      <!-- CTA Button -->
      <tr>
        <td align="center" style="padding: 0 32px 25px;">
          <a href="${SITE_URL}/dashboard" target="_blank" style="display: block; background: linear-gradient(135deg, #f9b03c 0%, #e59b2b 100%); color: #0b0f19; font-weight: 900; font-size: 15px; padding: 16px 30px; text-decoration: none; border-radius: 16px; text-align: center; box-shadow: 0 12px 30px rgba(249, 176, 60, 0.4); text-transform: uppercase; letter-spacing: 0.5px;">
            🎓 ወደ ተማሪ ዳሽቦርድ ይግቡ (Open Dashboard)
          </a>
        </td>
      </tr>

      <!-- Footer Note -->
      <tr>
        <td style="padding: 20px 32px; background-color: #070a12; border-top: 1px solid rgba(255,255,255,0.06); text-align: center;">
          <p style="margin: 0 0 6px 0; font-size: 12px; color: #94a3b8;">
            ጥያቄ ወይም እርዳታ ካስፈለገዎት፡ <a href="https://t.me/EyoubSahle" style="color: #f9b03c; text-decoration: none; font-weight: 700;">@EyoubSahle</a>
          </p>
          <p style="margin: 0; font-size: 11px; color: #64748b;">
            © ${new Date().getFullYear()} Tsehay Campus. All rights reserved.
          </p>
        </td>
      </tr>

    </table>
  </body>
  </html>
  `;
}

// 🌟 2. Mentorship Alert Email (For Admin: admin@tsehaycampus.com & eyoubsahle@gmail.com)
export function getMentorshipAdminEmailHtml(booking: MentorshipBooking): string {
  return `
  <!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>New Mentorship Booking: ${booking.name}</title>
  </head>
  <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #050811; margin: 0; padding: 35px 15px; color: #ffffff;">
    <table align="center" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 580px; margin: 0 auto; background-color: #0b0f19; border: 2px solid #3268ba; border-radius: 28px; overflow: hidden; box-shadow: 0 30px 80px rgba(0,0,0,0.9), 0 0 50px rgba(50,104,186,0.25);">
      
      <!-- Top Admin Header -->
      <tr>
        <td align="center" style="padding: 30px 25px 20px; background: linear-gradient(180deg, #121e36 0%, #0b0f19 100%); border-bottom: 1px dashed rgba(50, 104, 186, 0.4);">
          <div style="display: inline-block; background: rgba(50, 104, 186, 0.2); border: 1px solid #3268ba; color: #60a5fa; font-size: 11px; font-weight: 900; padding: 5px 16px; border-radius: 100px; text-transform: uppercase; letter-spacing: 1.5px; margin-bottom: 12px;">
            🔔 NEW MENTORSHIP REQUEST
          </div>
          <h1 style="color: #ffffff; font-size: 22px; font-weight: 900; margin: 6px 0; line-height: 1.3;">
            አዲስ የማማከር ቀጠሮ ጥያቄ ቀርቧል
          </h1>
          <p style="color: #94a3b8; font-size: 13px; margin: 0;">ከ ${booking.name}</p>
        </td>
      </tr>

      <!-- Student Details Table -->
      <tr>
        <td style="padding: 25px 30px 15px;">
          <div style="background: rgba(255, 255, 255, 0.03); border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 20px; padding: 22px;">
            <table width="100%" border="0" cellpadding="0" cellspacing="0">
              <tr>
                <td style="padding: 8px 0; color: #94a3b8; font-size: 12px; font-weight: 700;">የተማሪው ሙሉ ስም:</td>
                <td align="right" style="padding: 8px 0; color: #ffffff; font-size: 14px; font-weight: 900;">${booking.name}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #94a3b8; font-size: 12px; font-weight: 700;">ስልክ ቁጥር:</td>
                <td align="right" style="padding: 8px 0; color: #f9b03c; font-size: 14px; font-weight: 900;">
                  <a href="tel:${booking.phone}" style="color: #f9b03c; text-decoration: none;">${booking.phone}</a>
                </td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #94a3b8; font-size: 12px; font-weight: 700;">ኢሜይል:</td>
                <td align="right" style="padding: 8px 0; color: #38bdf8; font-size: 13px; font-weight: 700;">
                  <a href="mailto:${booking.email}" style="color: #38bdf8; text-decoration: none;">${booking.email}</a>
                </td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #94a3b8; font-size: 12px; font-weight: 700;">የተመረጠው ቀን:</td>
                <td align="right" style="padding: 8px 0; color: #ffffff; font-size: 13px; font-weight: 900;">${booking.date}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #94a3b8; font-size: 12px; font-weight: 700;">የተመረጠው ሰዓት:</td>
                <td align="right" style="padding: 8px 0; color: #f9b03c; font-size: 13px; font-weight: 900;">${booking.time}</td>
              </tr>
            </table>

            <!-- Topic Discussion Box -->
            <div style="margin-top: 15px; padding-top: 15px; border-top: 1px solid rgba(255,255,255,0.08);">
              <span style="font-size: 11px; font-weight: 800; color: #94a3b8; text-transform: uppercase; display: block; margin-bottom: 6px;">ማማከር የሚፈልጉት ርዕስ (Topic):</span>
              <p style="background: #06090e; border: 1px solid rgba(255,255,255,0.08); border-radius: 12px; padding: 14px; font-size: 13px; color: #e2e8f0; line-height: 1.6; margin: 0;">
                ${booking.topic}
              </p>
            </div>
          </div>
        </td>
      </tr>

      <!-- Action Button -->
      <tr>
        <td align="center" style="padding: 10px 30px 25px;">
          <a href="${SITE_URL}/admin" target="_blank" style="display: block; background: linear-gradient(135deg, #3268ba 0%, #254f8e 100%); color: #ffffff; font-weight: 900; font-size: 14px; padding: 15px 28px; text-decoration: none; border-radius: 14px; text-align: center; box-shadow: 0 10px 25px rgba(50, 104, 186, 0.4); text-transform: uppercase; letter-spacing: 0.5px;">
            🔒 ወደ አድሚን ዳሽቦርድ ይግቡ (Open Admin Panel)
          </a>
        </td>
      </tr>

      <!-- Footer -->
      <tr>
        <td style="padding: 16px 30px; background-color: #070a12; border-top: 1px solid rgba(255,255,255,0.06); text-align: center; font-size: 11px; color: #64748b;">
          <p style="margin: 0;">Tsehay Campus Automated Booking Engine</p>
        </td>
      </tr>

    </table>
  </body>
  </html>
  `;
}
