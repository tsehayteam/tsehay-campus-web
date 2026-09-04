import { EventTicket } from '@/lib/eventCache';

/**
 * 💡 ADMIN NOTICE REGARDING EMAIL SENDER PROFILE AVATAR / BRANDING:
 * In email clients like Gmail, Apple Mail, and Outlook, the profile picture/avatar
 * displayed next to the sender name in the inbox is NOT controlled by email HTML headers.
 * It is tied directly to the profile associated with the sending address:
 * 1. Google Workspace: Configure the profile picture for "support@tsehaycampus.com"
 *    inside the Google Workspace Admin Console (admin.google.com -> Users -> Profile Photo).
 * 2. Gravatar: Register "support@tsehaycampus.com" at https://gravatar.com and upload the
 *    official Tsehay Campus gold/dark brand avatar.
 * 3. BIMI (Brand Indicators for Message Identification): Configure DNS records (VMC certificate)
 *    to display a verified inbox checkmark and brand logo automatically in supported clients.
 */

// In-memory idempotency cache: strictly prevents duplicate dispatches within 5 minutes
const recentlyDispatchedTickets = new Map<string, number>();

function isRecentlyDispatched(key: string): boolean {
  const lastTime = recentlyDispatchedTickets.get(key);
  if (!lastTime) return false;
  const elapsed = Date.now() - lastTime;
  if (elapsed < 5 * 60 * 1000) {
    return true;
  }
  recentlyDispatchedTickets.delete(key);
  return false;
}

function markAsDispatched(key: string): void {
  recentlyDispatchedTickets.set(key, Date.now());
  // Prune entries older than 10 minutes to maintain light memory footprint
  if (recentlyDispatchedTickets.size > 200) {
    const cutoff = Date.now() - 10 * 60 * 1000;
    for (const [k, time] of recentlyDispatchedTickets.entries()) {
      if (time < cutoff) recentlyDispatchedTickets.delete(k);
    }
  }
}

export async function sendTicketEmail(ticket: EventTicket): Promise<{ success: boolean; error?: string }> {
  if (!ticket || !ticket.attendeeEmail) {
    console.warn('[Ticket Email Service] Recipient email is missing. Delivery aborted.');
    return { success: false, error: 'Recipient email is missing' };
  }

  const normalizedEmail = ticket.attendeeEmail.trim().toLowerCase();
  const ticketId = ticket.ticketId || `TC-EVT-${Date.now().toString(36).toUpperCase()}`;
  const dedupeKey = `${normalizedEmail}_${ticketId}_${ticket.eventId || 'evt'}`;

  // 🛡️ [CRITICAL FIX 1]: In-memory idempotency check - ensure email is sent ONLY ONCE per registration
  if (isRecentlyDispatched(dedupeKey) || isRecentlyDispatched(ticketId)) {
    console.log(`[Ticket Email Service] 🛡️ Duplicate dispatch prevented for ticket ${ticketId} (${normalizedEmail}). Already sent within last 5 minutes.`);
    return { success: true };
  }

  const resendApiKey = (process.env.RESEND_API_KEY || process.env.RESEND_KEY || '').trim();

  const attendeeName = ticket.attendeeName || 'የተከበሩ ተማሪ';
  const eventTitle = ticket.eventTitle || 'Tsehay Campus Live Event';
  const eventDate = ticket.eventDate || 'Upcoming';
  const eventTime = ticket.eventTime || '02:00 PM';
  const eventLocation = ticket.eventLocation || (ticket.isOnline ? 'Online Google Meet' : 'Bole, Addis Ababa, Ethiopia');
  const tier = ticket.tier || 'General Admission';
  const pricePaid = ticket.pricePaid === 0 ? '100% ነፃ (Free)' : `${ticket.pricePaid?.toLocaleString()} ብር`;
  const websiteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.tsehaycampus.com';
  const isOnline = !!ticket.isOnline || eventLocation.toLowerCase().includes('online') || eventLocation.toLowerCase().includes('meet');
  const meetingLink = ticket.meetingLink || 'https://meet.google.com/tsehay-live';
  const mapsUrl = ticket.mapsUrl || 'https://maps.google.com/?q=Bole+Addis+Ababa';
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&format=png&data=${encodeURIComponent(ticket.qrCodeData || ticketId)}&color=0c1017&bgcolor=ffffff&qzone=2`;

  // Dynamic In-Person vs Online Content Section
  let mainActionSection = '';

  if (isOnline) {
    // 🎥 ONLINE EVENT TEMPLATE: Prominent Google Meet Join Link + Scannable Pass
    mainActionSection = `
      <!-- Online Google Meet Join Section -->
      <tr>
        <td style="padding: 15px 28px;">
          <div style="background: rgba(16, 185, 129, 0.08); border: 2px solid #10b981; border-radius: 20px; padding: 22px; text-align: center;">
            <div style="display: inline-block; background: #10b981; color: #022c22; font-size: 11px; font-weight: 900; padding: 4px 14px; border-radius: 100px; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 12px;">
              🎥 ONLINE GOOGLE MEET LINK
            </div>
            <h3 style="color: #ffffff; font-size: 18px; font-weight: 900; margin: 0 0 8px 0;">የቀጥታ ስብሰባ መግቢያ ሊንክዎ</h3>
            <p style="color: #94a3b8; font-size: 12px; margin: 0 0 18px 0; line-height: 1.5;">በስልጠናው ቀን በቀጥታ ከታች ያለውን አዝራር በመጫን ስብሰባውን ይቀላቀሉ።</p>
            
            <a href="${meetingLink}" target="_blank" style="display: block; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: #ffffff; font-weight: 900; font-size: 15px; padding: 15px 28px; text-decoration: none; border-radius: 14px; text-align: center; box-shadow: 0 10px 25px rgba(16, 185, 129, 0.35); text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 12px;">
              🌐 የቀጥታ ስብሰባውን ይቀላቀሉ (Join Meeting)
            </a>

            <div style="background: #06090e; border: 1px solid rgba(255,255,255,0.1); border-radius: 10px; padding: 10px; word-break: break-all;">
              <span style="font-size: 11px; color: #64748b; display: block; margin-bottom: 2px;">ወይም ይህን ሊንክ ኮፒ ያድርጉ፡</span>
              <a href="${meetingLink}" target="_blank" style="color: #38bdf8; font-size: 12px; text-decoration: underline; font-family: monospace;">${meetingLink}</a>
            </div>
          </div>
        </td>
      </tr>

      <!-- Digital Confirmation Pass & QR -->
      <tr>
        <td align="center" style="padding: 10px 28px 15px;">
          <div style="background: #0d1527; border: 1px solid rgba(249, 176, 60, 0.3); border-radius: 20px; padding: 18px 24px; text-align: center;">
            <p style="margin: 0 0 10px 0; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; color: #f9b03c;">
              የኦንላይን ተሳታፊ ዲጂታል መለያ (Digital ID Pass)
            </p>
            <div style="background: #ffffff; border: 2px solid #f9b03c; border-radius: 16px; padding: 12px; display: inline-block; margin-bottom: 10px; box-shadow: 0 8px 20px rgba(0,0,0,0.5);">
              <img src="${qrCodeUrl}" alt="Digital Pass QR" width="160" height="160" style="display: block; margin: 0 auto; max-width: 100%; height: auto;" />
            </div>
            <div style="font-family: monospace; font-size: 18px; font-weight: 900; letter-spacing: 2px; color: #f9b03c;">
              ${ticketId}
            </div>
          </div>
        </td>
      </tr>
    `;
  } else {
    // 📍 IN-PERSON EVENT TEMPLATE: Luxury Door Pass with High-Resolution QR Code + Google Maps
    mainActionSection = `
      <!-- In-Person Door Pass & Scannable QR -->
      <tr>
        <td align="center" style="padding: 15px 28px;">
          <div style="background: #ffffff; border-radius: 22px; padding: 24px 26px; text-align: center; color: #0c1017; box-shadow: 0 18px 45px rgba(0,0,0,0.6);">
            <div style="display: inline-block; background: rgba(249, 176, 60, 0.15); border: 1px solid #f9b03c; color: #b45309; font-size: 11px; font-weight: 900; padding: 3px 12px; border-radius: 100px; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 12px;">
              🎟️ SCANNABLE DOOR PASS
            </div>
            <p style="margin: 0 0 12px 0; font-size: 12px; font-weight: 900; text-transform: uppercase; letter-spacing: 1.5px; color: #334155;">
              የበር ላይ ማረጋገጫ QR ኮድ (Scan At Entrance)
            </p>
            
            <div style="background: #ffffff; border: 3px solid #f9b03c; border-radius: 18px; padding: 12px; display: inline-block; margin-bottom: 14px; box-shadow: 0 10px 25px rgba(0,0,0,0.15);">
              <img src="${qrCodeUrl}" alt="Scannable Event QR Pass" width="200" height="200" style="display: block; margin: 0 auto; max-width: 100%; height: auto;" />
            </div>

            <div style="font-family: monospace; font-size: 24px; font-weight: 900; letter-spacing: 3px; color: #0f172a; padding: 12px; background: #f8fafc; border: 2px dashed #cbd5e1; border-radius: 14px; margin-bottom: 8px;">
              ${ticketId}
            </div>
            <p style="margin: 0; font-size: 11px; color: #64748b; font-weight: 600;">በመግቢያው በር ላይ ይህንን QR ኮድ ወይም የትኬት ቁጥር ለፍተሻ ያሳዩ።</p>
          </div>
        </td>
      </tr>

      <!-- Google Maps Navigation Button -->
      <tr>
        <td align="center" style="padding: 5px 28px 15px;">
          <a href="${mapsUrl}" target="_blank" style="display: inline-block; background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.2); color: #f9b03c; font-weight: 800; font-size: 13px; padding: 12px 24px; text-decoration: none; border-radius: 12px; box-shadow: 0 4px 15px rgba(0,0,0,0.3);">
            📍 የአዳራሹን አድራሻ በ Google Maps ይመልከቱ (Open in Maps)
          </a>
        </td>
      </tr>
    `;
  }

  const htmlEmail = `
  <!DOCTYPE html>
  <html lang="am">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>የእርስዎ ቲኬት ዝግጁ ነው! - Tsehay Campus</title>
  </head>
  <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #06090e; margin: 0; padding: 30px 15px; color: #ffffff;">
    <table align="center" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 560px; margin: 0 auto; background-color: #0c1017; border: 2px solid #f9b03c; border-radius: 24px; overflow: hidden; box-shadow: 0 25px 60px rgba(0,0,0,0.85);">
      
      <!-- Top Logo Header -->
      <tr>
        <td align="center" style="padding: 30px 20px 15px; background: linear-gradient(180deg, #161c28 0%, #0c1017 100%); border-bottom: 1px dashed rgba(249, 176, 60, 0.4);">
          <div style="display: inline-block; background: #ffffff; padding: 6px 14px; border-radius: 12px; margin-bottom: 15px; box-shadow: 0 4px 15px rgba(0,0,0,0.3);">
            <img src="https://www.tsehaycampus.com/tc-logo.jpg" alt="Tsehay Campus Logo" width="140" style="display: block; max-width: 140px; height: auto;" />
          </div>
          <div style="display: inline-block; background: rgba(249, 176, 60, 0.15); border: 1px solid #f9b03c; color: #f9b03c; font-size: 11px; font-weight: 800; padding: 4px 12px; border-radius: 100px; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 10px;">
            ${isOnline ? '🌐 ONLINE WORKSHOP PASS' : '📍 IN-PERSON EVENT PASS'}
          </div>
          <h1 style="color: #ffffff; font-size: 22px; font-weight: 900; margin: 10px 0 5px; line-height: 1.3;">
            ${isOnline ? 'እንኳን ደስ አለዎት! የኦንላይን ምዝገባዎ ተረጋግጧል።' : 'እንኳን ደስ አለዎት! ቲኬትዎ ተቆርጧል።'}
          </h1>
          <p style="color: #94a3b8; font-size: 13px; margin: 0;">የተከበሩ ${attendeeName}፣ ለዝግጅቱ ያለዎት ምዝገባ በተሳካ ሁኔታ ተረጋግጧል።</p>
        </td>
      </tr>

      <!-- Event Title Banner -->
      <tr>
        <td style="padding: 20px 28px 10px;">
          <div style="background: rgba(249, 176, 60, 0.08); border-left: 4px solid #f9b03c; padding: 14px 18px; border-radius: 0 12px 12px 0;">
            <span style="font-size: 10px; text-transform: uppercase; letter-spacing: 1px; color: #f9b03c; font-weight: 800; display: block; margin-bottom: 4px;">የዝግጅቱ ስም (Event Title)</span>
            <strong style="font-size: 17px; color: #ffffff; line-height: 1.3;">${eventTitle}</strong>
          </div>
        </td>
      </tr>

      <!-- Details Box (Date, Time, Location, Ticket ID) -->
      <tr>
        <td style="padding: 10px 28px;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background: rgba(255, 255, 255, 0.03); border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 16px; padding: 18px;">
            
            <tr>
              <td style="padding: 8px 0; border-bottom: 1px solid rgba(255,255,255,0.06); font-size: 12px; color: #94a3b8; text-transform: uppercase; font-weight: 600;">ተሳታፊ (Attendee)</td>
              <td align="right" style="padding: 8px 0; border-bottom: 1px solid rgba(255,255,255,0.06); font-size: 14px; color: #ffffff; font-weight: 700;">${attendeeName}</td>
            </tr>

            <tr>
              <td style="padding: 8px 0; border-bottom: 1px solid rgba(255,255,255,0.06); font-size: 12px; color: #94a3b8; text-transform: uppercase; font-weight: 600;">ቀን እና ሰዓት (Date & Time)</td>
              <td align="right" style="padding: 8px 0; border-bottom: 1px solid rgba(255,255,255,0.06); font-size: 13px; color: #f9b03c; font-weight: 700;">${eventDate} • ${eventTime}</td>
            </tr>

            <tr>
              <td style="padding: 8px 0; border-bottom: 1px solid rgba(255,255,255,0.06); font-size: 12px; color: #94a3b8; text-transform: uppercase; font-weight: 600;">ቦታ / አድራሻ (Location)</td>
              <td align="right" style="padding: 8px 0; border-bottom: 1px solid rgba(255,255,255,0.06); font-size: 13px; color: #ffffff; font-weight: 700;">${eventLocation}</td>
            </tr>

            <tr>
              <td style="padding: 8px 0; border-bottom: 1px solid rgba(255,255,255,0.06); font-size: 12px; color: #94a3b8; text-transform: uppercase; font-weight: 600;">የትኬት ደረጃ (Ticket Tier)</td>
              <td align="right" style="padding: 8px 0; border-bottom: 1px solid rgba(255,255,255,0.06); font-size: 13px; color: #f9b03c; font-weight: 800;">${tier}</td>
            </tr>

            <tr>
              <td style="padding: 8px 0; border-bottom: 1px solid rgba(255,255,255,0.06); font-size: 12px; color: #94a3b8; text-transform: uppercase; font-weight: 600;">የተከፈለበት ዋጋ (Price Paid)</td>
              <td align="right" style="padding: 8px 0; border-bottom: 1px solid rgba(255,255,255,0.06); font-size: 13px; color: #10b981; font-weight: 800;">${pricePaid}</td>
            </tr>

            <tr>
              <td style="padding: 10px 0 4px; font-size: 12px; color: #94a3b8; text-transform: uppercase; font-weight: 600;">የትኬት መለያ ቁጥር (Ticket ID)</td>
              <td align="right" style="padding: 10px 0 4px; font-family: monospace; font-size: 16px; color: #f9b03c; font-weight: 900; letter-spacing: 1px;">${ticketId}</td>
            </tr>

          </table>
        </td>
      </tr>

      ${mainActionSection}

      <!-- Golden CTA Button -->
      <tr>
        <td align="center" style="padding: 10px 28px 25px;">
          <a href="${websiteUrl}/events" target="_blank" style="display: block; background: linear-gradient(135deg, #f9b03c 0%, #e09624 100%); color: #080b11; font-weight: 900; font-size: 15px; padding: 15px 30px; text-decoration: none; border-radius: 14px; text-align: center; box-shadow: 0 10px 25px rgba(249, 176, 60, 0.4); text-transform: uppercase; letter-spacing: 0.5px;">
            🎫 ቲኬትዎን ለማየት እዚህ ይጫኑ (View Your Ticket)
          </a>
        </td>
      </tr>

      <!-- Footer -->
      <tr>
        <td style="padding: 20px 28px; background-color: #080b11; border-top: 1px solid rgba(255,255,255,0.06); text-align: center; font-size: 11px; color: #64748b; line-height: 1.6;">
          <p style="margin: 0 0 6px 0; color: #94a3b8; font-weight: 700;">Tsehay Campus • ቦሌ፣ አዲስ አበባ፣ ኢትዮጵያ</p>
          <p style="margin: 0 0 6px 0;">ማንኛውም ጥያቄ ወይም እገዛ ካስፈለገዎት በስልክ <strong>0980209090</strong> ወይም በቴሌግራም <strong>@TsehayTeam</strong> ያግኙን።</p>
          <p style="margin: 0; font-size: 10px; color: #475569;">© ${new Date().getFullYear()} Tsehay Campus. All rights reserved.</p>
        </td>
      </tr>

    </table>
  </body>
  </html>
  `;

  if (!resendApiKey) {
    console.warn('[Ticket Email Service] RESEND_API_KEY is not set in environment variables. Email deferred.');
    return { success: false, error: 'RESEND_API_KEY is not configured' };
  }

  // Sender candidates in order of preference (official branded domain address)
  const sendersToTry = Array.from(new Set([
    process.env.RESEND_FROM_EMAIL || 'Tsehay Campus <support@tsehaycampus.com>',
    'Tsehay Campus <support@tsehaycampus.com>',
    'Tsehay Campus <events@tsehaycampus.com>',
    'Tsehay Campus <onboarding@resend.dev>',
    'Tsehay Campus <noreply@tsehaycampus.com>'
  ]));

  let lastError = '';

  for (const fromSender of sendersToTry) {
    try {
      console.log(`[Ticket Email Service] Dispatching ticket ${ticketId} to ${normalizedEmail} via "${fromSender}"...`);
      
      // 🚀 [CRITICAL FIX 1]: Trigger Resend API EXACTLY ONCE per registration
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${resendApiKey}`
        },
        body: JSON.stringify({
          from: fromSender,
          to: [normalizedEmail],
          subject: `🎟️ የእርስዎ ቲኬት ዝግጁ ነው! (${ticket.eventTitle}) - Tsehay Campus Pass: ${ticket.ticketId}`,
          html: htmlEmail,
          reply_to: 'support@tsehaycampus.com'
        })
      });

      const responseJson = await res.json().catch(() => ({}));

      if (res.ok && responseJson.id) {
        console.log(`[Ticket Email Service] ✅ Ticket email successfully dispatched to ${normalizedEmail}! (Resend ID: ${responseJson.id})`);
        
        // Record into in-memory idempotency cache to strictly prevent duplicate sends
        markAsDispatched(dedupeKey);
        markAsDispatched(ticketId);

        return { success: true };
      }

      lastError = responseJson.message || `HTTP ${res.status}`;
      console.warn(`[Ticket Email Service] Attempt with "${fromSender}" failed:`, lastError);
    } catch (err: any) {
      lastError = err.message;
      console.warn(`[Ticket Email Service] Fetch error with "${fromSender}":`, err.message);
    }
  }

  console.error('[Ticket Email Service] ❌ All sender attempts exhausted for ticket email:', lastError);
  return { success: false, error: lastError || 'Email delivery failed across all sender profiles' };
}
