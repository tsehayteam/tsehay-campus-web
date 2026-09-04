import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

interface CommunityNotificationPayload {
  type: 'like' | 'comment' | 'message';
  recipientEmail: string;
  recipientName: string;
  senderName: string;
  senderPhoto?: string;
  postTitleOrSnippet?: string;
  commentSnippet?: string;
  messageSnippet?: string;
  postId?: string;
  conversationId?: string;
}

function generateEmailTemplate(data: CommunityNotificationPayload): { subject: string; html: string } {
  const { type, recipientName, senderName, postTitleOrSnippet, commentSnippet, messageSnippet, postId } = data;
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.tsehaycampus.com';
  const postUrl = postId ? `${siteUrl}/community?post=${encodeURIComponent(postId)}` : `${siteUrl}/community`;
  const logoUrl = `${siteUrl}/tc-logo.jpg`;

  let subject = '';
  let icon = '🔔';
  let heading = '';
  let description = '';
  let ctaText = 'ወደ ማህበረሰቡ ሂድ (Open Community)';

  if (type === 'like') {
    subject = `❤️ ${senderName} ፖስትዎን ወድደውታል! (Liked your post) - Tsehay Campus`;
    icon = '❤️';
    heading = `<strong>${senderName}</strong> ፖስትዎን ወድደውታል!`;
    description = postTitleOrSnippet 
      ? `"${postTitleOrSnippet.length > 100 ? postTitleOrSnippet.slice(0, 100) + '...' : postTitleOrSnippet}"`
      : 'የለጠፉትን ፖስት ወድደውታል';
    ctaText = 'ፖስቱን ይመልከቱ (View Post)';
  } else if (type === 'comment') {
    subject = `💬 ${senderName} በፖስትዎ ላይ አስተያየት ሰጥተዋል! (New Comment) - Tsehay Campus`;
    icon = '💬';
    heading = `<strong>${senderName}</strong> በፖስትዎ ላይ አስተያየት ፅፈዋል`;
    description = commentSnippet 
      ? `"${commentSnippet.length > 120 ? commentSnippet.slice(0, 120) + '...' : commentSnippet}"`
      : 'በፖስትዎ ላይ አዲስ አስተያየት ተሰጥቷል።';
    ctaText = 'አስተያየቱን ይመልሱ (Reply Comment)';
  } else if (type === 'message') {
    subject = `✉️ አዲስ መልዕክት ከ ${senderName} (New Direct Message) - Tsehay Campus`;
    icon = '✉️';
    heading = `<strong>${senderName}</strong> የግል መልዕክት ልከውልዎታል`;
    description = messageSnippet 
      ? `"${messageSnippet.length > 120 ? messageSnippet.slice(0, 120) + '...' : messageSnippet}"`
      : 'አዲስ የውይይት መልዕክት ደርሶዎታል።';
    ctaText = 'መልዕክቱን ይመልከቱ (Open Chat)';
  }

  const html = `
  <!DOCTYPE html>
  <html lang="am">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${subject}</title>
  </head>
  <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #050811; margin: 0; padding: 30px 15px; color: #ffffff;">
    <table align="center" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 560px; margin: 0 auto; background-color: #0b0f19; border: 1.5px solid #f9b03c; border-radius: 24px; overflow: hidden; box-shadow: 0 25px 70px rgba(0,0,0,0.9), 0 0 40px rgba(249,176,60,0.2);">
      
      <!-- Top Brand Header -->
      <tr>
        <td align="center" style="padding: 28px 20px 18px; background: linear-gradient(180deg, #131a2d 0%, #0b0f19 100%); border-bottom: 1px dashed rgba(249, 176, 60, 0.35);">
          <div style="display: inline-block; background: #ffffff; padding: 6px 14px; border-radius: 12px; margin-bottom: 12px;">
            <img src="${logoUrl}" alt="Tsehay Campus" width="130" style="display: block; max-width: 130px; height: auto;" />
          </div>
          <br>
          <div style="display: inline-block; background: rgba(249, 176, 60, 0.15); border: 1px solid #f9b03c; color: #f9b03c; font-size: 11px; font-weight: 900; padding: 4px 14px; border-radius: 100px; text-transform: uppercase; letter-spacing: 1px;">
            🌟 ማህበረሰብ ማሳወቂያ • COMMUNITY NOTIFICATION
          </div>
        </td>
      </tr>

      <!-- Notification Content -->
      <tr>
        <td style="padding: 28px 30px 20px;">
          <p style="font-size: 14px; color: #94a3b8; margin: 0 0 12px 0;">
            ሰላም <strong>${recipientName || 'ተማሪ'}</strong>፣
          </p>

          <div style="background: rgba(255, 255, 255, 0.03); border: 1px solid rgba(249, 176, 60, 0.25); border-radius: 18px; padding: 20px; margin-bottom: 22px; text-align: center;">
            <div style="font-size: 32px; margin-bottom: 8px;">${icon}</div>
            <h3 style="color: #ffffff; font-size: 17px; font-weight: 800; margin: 0 0 10px 0; line-height: 1.4;">
              ${heading}
            </h3>
            <p style="color: #cbd5e1; font-size: 13.5px; line-height: 1.6; margin: 0; font-style: italic; background: rgba(0,0,0,0.4); padding: 12px 14px; border-radius: 12px; border-left: 3px solid #f9b03c;">
              ${description}
            </p>
          </div>

          <!-- CTA Button -->
          <table align="center" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom: 16px;">
            <tr>
              <td align="center">
                <a href="${postUrl}" target="_blank" style="display: inline-block; background: linear-gradient(90deg, #f9b03c 0%, #ffc66b 100%); color: #020617; font-weight: 900; font-size: 14px; text-decoration: none; padding: 14px 28px; border-radius: 14px; box-shadow: 0 0 25px rgba(249,176,60,0.5); text-transform: uppercase; letter-spacing: 0.5px;">
                  ${ctaText} →
                </a>
              </td>
            </tr>
          </table>

          <p style="text-align: center; color: #64748b; font-size: 11px; margin: 15px 0 0;">
            ይህ ማሳወቂያ የተላከው በ Tsehay Campus የማህበረሰብ ፕላትፎርም በኩል ነው።
          </p>
        </td>
      </tr>

      <!-- Footer -->
      <tr>
        <td align="center" style="padding: 16px 20px; background-color: #060913; border-top: 1px solid rgba(255, 255, 255, 0.08); font-size: 11px; color: #64748b;">
          © ${new Date().getFullYear()} Tsehay Campus. All rights reserved. • <a href="${siteUrl}" style="color: #f9b03c; text-decoration: none;">tsehaycampus.com</a>
        </td>
      </tr>

    </table>
  </body>
  </html>
  `;

  return { subject, html };
}

export async function POST(req: Request) {
  try {
    const body: CommunityNotificationPayload = await req.json();
    const { type, recipientEmail, recipientName, senderName } = body;

    if (!recipientEmail || !recipientEmail.includes('@') || !type || !senderName) {
      return NextResponse.json({ success: false, error: 'Missing required notification fields' }, { status: 400 });
    }

    const resendApiKey = process.env.RESEND_API_KEY;
    /**
     * 💡 ADMIN NOTICE REGARDING EMAIL SENDER PROFILE AVATAR / BRANDING:
     * Inbox avatars (Gmail, Apple Mail) are controlled via the Google Workspace account or Gravatar profile
     * associated with support@tsehaycampus.com. To show the official logo, ensure support@tsehaycampus.com
     * has a profile picture configured in Google Admin Console and at https://gravatar.com.
     */
    const fromEmail = process.env.RESEND_FROM_EMAIL || 'Tsehay Campus <support@tsehaycampus.com>';

    if (!resendApiKey) {
      return NextResponse.json({ success: true, warning: 'RESEND_API_KEY not configured, skipped email dispatch' });
    }

    const { subject, html } = generateEmailTemplate(body);

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: fromEmail,
        to: [recipientEmail.trim().toLowerCase()],
        subject,
        html
      })
    });

    const resData = await res.json().catch(() => null);

    return NextResponse.json({
      success: true,
      messageId: resData?.id || null,
      recipient: recipientEmail
    });

  } catch (error: any) {
    console.error('Community Email Notification Error:', error);
    return NextResponse.json({ success: false, error: error?.message || 'Failed to dispatch email notification' }, { status: 500 });
  }
}
