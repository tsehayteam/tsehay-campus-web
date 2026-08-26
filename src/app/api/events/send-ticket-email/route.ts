import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { ticket, email } = body;

    if (!ticket || !email) {
      return NextResponse.json({ error: 'Ticket and email required' }, { status: 400 });
    }

    const attendeeName = ticket.attendeeName || 'የተከበሩ ተማሪ';
    const eventTitle = ticket.eventTitle || 'Tsehay Campus Event';
    const eventDate = ticket.eventDate || 'Upcoming';
    const eventTime = ticket.eventTime || 'TBA';
    const eventLocation = ticket.eventLocation || 'Addis Ababa, Ethiopia';
    const ticketId = ticket.ticketId || 'TC-EVT-0000';

    // Luxury HTML Email Template with Apple Wallet aesthetics
    const htmlEmail = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #06090e; margin: 0; padding: 20px; color: #ffffff; }
        .ticket-card { max-width: 520px; margin: 0 auto; background: #0c1017; border: 2px solid #f9b03c; border-radius: 24px; overflow: hidden; box-shadow: 0 25px 60px rgba(0,0,0,0.8); }
        .header { background: linear-gradient(135deg, #111726, #0c1017); padding: 24px; text-align: center; border-bottom: 1px dashed rgba(249, 176, 60, 0.4); }
        .badge { display: inline-block; background: rgba(249, 176, 60, 0.15); border: 1px solid #f9b03c; color: #f9b03c; font-size: 11px; font-weight: 800; padding: 4px 12px; border-radius: 100px; text-transform: uppercase; margin-bottom: 10px; }
        .title { font-size: 20px; font-weight: 900; color: #ffffff; margin: 0 0 8px 0; line-height: 1.3; }
        .body-section { padding: 24px; }
        .detail-row { display: flex; justify-content: space-between; margin-bottom: 14px; border-bottom: 1px solid rgba(255,255,255,0.06); padding-bottom: 10px; }
        .label { font-size: 12px; color: #8b949e; text-transform: uppercase; font-weight: 600; }
        .value { font-size: 14px; color: #f0f6fc; font-weight: 700; text-align: right; }
        .qr-section { background: #ffffff; margin: 20px 24px; padding: 20px; border-radius: 16px; text-align: center; color: #000000; }
        .ticket-id { font-family: monospace; font-size: 16px; font-weight: 900; letter-spacing: 2px; color: #0c1017; margin-top: 10px; }
        .footer { text-align: center; padding: 20px; font-size: 12px; color: #8b949e; background: #080c14; }
      </style>
    </head>
    <body>
      <div class="ticket-card">
        <div class="header">
          <div class="badge">Official Event Pass • ይፋዊ የመግቢያ ትኬት</div>
          <h1 class="title">${eventTitle}</h1>
          <p style="color: #f9b03c; font-size: 13px; margin: 0; font-weight: bold;">Tsehay Campus Live Event Pass</p>
        </div>
        <div class="body-section">
          <div class="detail-row">
            <span class="label">ተሳታፊ (Attendee)</span>
            <span class="value">${attendeeName}</span>
          </div>
          <div class="detail-row">
            <span class="label">ቀን (Date)</span>
            <span class="value">${eventDate}</span>
          </div>
          <div class="detail-row">
            <span class="label">ሰዓት (Time)</span>
            <span class="value">${eventTime}</span>
          </div>
          <div class="detail-row">
            <span class="label">ቦታ (Venue)</span>
            <span class="value">${eventLocation}</span>
          </div>
          <div class="detail-row">
            <span class="label">የትኬት ደረጃ (Tier)</span>
            <span class="value" style="color: #f9b03c;">${ticket.tier || 'VIP Pass'}</span>
          </div>
        </div>
        <div class="qr-section">
          <p style="font-size: 12px; margin: 0 0 10px 0; font-weight: bold; color: #555;">በመግቢያው ላይ ለበር ጠባቂው ይህን QR Code ያሳዩ</p>
          <div style="font-size: 28px; font-weight: bold; padding: 15px; border: 2px dashed #333; border-radius: 8px;">
            [ QR PASS: ${ticketId} ]
          </div>
          <div class="ticket-id">${ticketId}</div>
        </div>
        <div class="footer">
          <p style="margin: 0 0 5px 0;">Tsehay Campus • ቦሌ፣ አዲስ አበባ፣ ኢትዮጵያ</p>
          <p style="margin: 0; font-size: 11px;">እገዛ ከፈለጉ በስልክ 0980209090 ወይም በቴሌግራም @TsehayTeam ያግኙን።</p>
        </div>
      </div>
    </body>
    </html>
    `;

    // If Resend or SMTP is configured, trigger send:
    let emailSent = false;
    if (process.env.RESEND_API_KEY) {
      try {
        const res = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.RESEND_API_KEY}`
          },
          body: JSON.stringify({
            from: 'Tsehay Campus <tickets@tsehaycampus.com>',
            to: [email],
            subject: `🎫 የእርስዎ ይፋዊ የመግቢያ ትኬት - ${eventTitle}`,
            html: htmlEmail
          })
        });
        emailSent = res.ok;
      } catch (e) {
        console.warn("Resend email attempt:", e);
      }
    }

    return NextResponse.json({
      success: true,
      emailSent,
      message: emailSent ? 'ትኬቱ ወደ ኢሜይልዎ በተሳካ ሁኔታ ተልኳል!' : 'ትኬቱ ተዘጋጅቷል፤ በዲጂታል ፓስ መልክ ማውረድ ይችላሉ።'
    });
  } catch (error: any) {
    console.error('Error sending ticket email:', error);
    return NextResponse.json({ error: error.message || 'Failed to send email' }, { status: 500 });
  }
}
