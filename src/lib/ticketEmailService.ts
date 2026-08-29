import { EventTicket } from '@/lib/eventCache';

export async function sendTicketEmail(ticket: EventTicket): Promise<{ success: boolean; error?: string }> {
  if (!ticket || !ticket.attendeeEmail) {
    return { success: false, error: 'Recipient email is missing' };
  }

  const resendApiKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.RESEND_FROM_EMAIL || '"Tsehay Campus" <tsehayoperation@gmail.com>';
  const fallbackFrom = '"Tsehay Campus" <tsehayoperation@gmail.com>';

  const attendeeName = ticket.attendeeName || 'የተከበሩ ተማሪ';
  const eventTitle = ticket.eventTitle || 'Tsehay Campus Live Event';
  const eventDate = ticket.eventDate || 'Upcoming';
  const eventTime = ticket.eventTime || '02:00 PM';
  const eventLocation = ticket.eventLocation || (ticket.isOnline ? 'Online Google Meet' : 'Bole, Addis Ababa, Ethiopia');
  const ticketId = ticket.ticketId || `TC-EVT-${Date.now().toString(36).toUpperCase()}`;
  const tier = ticket.tier || 'General Admission';
  const pricePaid = ticket.pricePaid === 0 ? 'ነፃ (Free)' : `${ticket.pricePaid?.toLocaleString()} ብር`;
  const websiteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://tsehaycampus.com';
  const isOnline = !!ticket.isOnline || eventLocation.toLowerCase().includes('online') || eventLocation.toLowerCase().includes('meet');
  const meetingLink = ticket.meetingLink || 'https://meet.google.com/tsehay-live';
  const mapsUrl = ticket.mapsUrl || 'https://maps.google.com/?q=Bole+Addis+Ababa';

  // Dynamic In-Person vs Online Content Section
  let mainActionSection = '';

  if (isOnline) {
    // 🎥 ONLINE EVENT TEMPLATE: Prominent Google Meet Join Link (No Door QR)
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
    `;
  } else {
    // 📍 IN-PERSON EVENT TEMPLATE: Scannable Door Pass + Google Maps Navigation Link
    mainActionSection = `
      <!-- In-Person Door QR Pass -->
      <tr>
        <td align="center" style="padding: 15px 28px;">
          <div style="background: #ffffff; border-radius: 20px; padding: 22px 24px; text-align: center; color: #0c1017; box-shadow: 0 15px 35px rgba(0,0,0,0.5);">
            <p style="margin: 0 0 8px 0; font-size: 11px; font-weight: 900; text-transform: uppercase; letter-spacing: 1.5px; color: #475569;">
              የበር ላይ ማረጋገጫ ኮድ (Door Verification Pass)
            </p>
            <div style="font-family: monospace; font-size: 26px; font-weight: 900; letter-spacing: 3px; color: #0f172a; padding: 12px; background: #f8fafc; border: 2px dashed #cbd5e1; border-radius: 12px; margin-bottom: 8px;">
              ${ticketId}
            </div>
            <p style="margin: 0; font-size: 11px; color: #64748b;">በመግቢያው በር ላይ ይህንን የትኬት ቁጥር ወይም ዲጂታል ፓስዎን ያሳዩ።</p>
          </div>
        </td>
      </tr>

      <!-- Google Maps Navigation Button -->
      <tr>
        <td align="center" style="padding: 5px 28px 15px;">
          <a href="${mapsUrl}" target="_blank" style="display: inline-block; background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.15); color: #f9b03c; font-weight: 700; font-size: 12px; padding: 10px 20px; text-decoration: none; border-radius: 10px;">
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
          <div style="display: inline-block; background: #ffffff; padding: 6px 14px; border-radius: 12px; margin-bottom: 15px;">
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

      <!-- Details Box -->
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
              <td style="padding: 8px 0; border-bottom: 1px solid rgba(255,255,255,0.06); font-size: 12px; color: #94a3b8; text-transform: uppercase; font-weight: 600;">ፎርማት / ቦታ (Format)</td>
              <td align="right" style="padding: 8px 0; border-bottom: 1px solid rgba(255,255,255,0.06); font-size: 13px; color: #ffffff; font-weight: 700;">${eventLocation}</td>
            </tr>

            <tr>
              <td style="padding: 8px 0; border-bottom: 1px solid rgba(255,255,255,0.06); font-size: 12px; color: #94a3b8; text-transform: uppercase; font-weight: 600;">የትኬት ደረጃ (Ticket Tier)</td>
              <td align="right" style="padding: 8px 0; border-bottom: 1px solid rgba(255,255,255,0.06); font-size: 13px; color: #f9b03c; font-weight: 800;">${tier}</td>
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
          <a href="${websiteUrl}/#events" target="_blank" style="display: block; background: linear-gradient(135deg, #f9b03c 0%, #e09624 100%); color: #080b11; font-weight: 900; font-size: 15px; padding: 15px 30px; text-decoration: none; border-radius: 14px; text-align: center; box-shadow: 0 10px 25px rgba(249, 176, 60, 0.4); text-transform: uppercase; letter-spacing: 0.5px;">
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
    console.warn('RESEND_API_KEY environment variable is not set. Email delivery deferred.');
    return { success: false, error: 'RESEND_API_KEY is not configured in environment variables' };
  }

  // 1. Try sending via primary configured domain
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${resendApiKey}`
      },
      body: JSON.stringify({
        from: fromEmail,
        to: [ticket.attendeeEmail],
        subject: `የእርስዎ ቲኬት ዝግጁ ነው! (Your Ticket is Ready) - Tsehay Campus`,
        html: htmlEmail
      })
    });

    if (res.ok) {
      return { success: true };
    }

    const errorJson = await res.json().catch(() => ({}));

    // 2. Fallback to onboarding@resend.dev if custom domain is unverified
    if (res.status === 403 || (errorJson.message && errorJson.message.includes('domain'))) {
      const fallbackRes = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${resendApiKey}`
        },
        body: JSON.stringify({
          from: fallbackFrom,
          to: [ticket.attendeeEmail],
          subject: `የእርስዎ ቲኬት ዝግጁ ነው! (Your Ticket is Ready) - Tsehay Campus`,
          html: htmlEmail
        })
      });

      if (fallbackRes.ok) {
        return { success: true };
      }
    }

    return { success: false, error: errorJson.message || `HTTP ${res.status}` };
  } catch (err: any) {
    console.error('Failed to send ticket email via Resend:', err);
    return { success: false, error: err.message || 'Email delivery failed' };
  }
}
