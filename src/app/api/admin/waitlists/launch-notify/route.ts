import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase/server';
import { verifyAdminRequest } from '@/lib/adminAuthHelper';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const auth = await verifyAdminRequest(req);
  if (!auth.authorized) {
    return NextResponse.json({ success: false, error: auth.error || 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const { courseId, waitlistId, customMessage, launchDiscountCode } = body;

    if (!courseId && !waitlistId) {
      return NextResponse.json(
        { success: false, error: 'courseId ወይም waitlistId ማስገባት አስፈላጊ ነው።' },
        { status: 400 }
      );
    }

    const resendApiKey = process.env.RESEND_API_KEY;
    const fromEmail = process.env.RESEND_FROM_EMAIL || 'Tsehay Campus <support@tsehaycampus.com>';
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.tsehaycampus.com';

    let waitlistDocs: any[] = [];

    if (waitlistId) {
      const { data } = await supabaseServer
        .from('course_waitlists')
        .select('*')
        .eq('id', waitlistId)
        .maybeSingle();
      if (data) {
        waitlistDocs.push(data);
      }
    } else {
      let query = supabaseServer.from('course_waitlists').select('*');
      if (courseId !== 'all') {
        query = query.eq('courseId', courseId);
      }
      const { data } = await query;
      if (data && Array.isArray(data)) {
        waitlistDocs = data;
      }
    }

    // Filter valid emails
    const validRecipients = waitlistDocs.filter(w => w.email && w.email.includes('@'));

    if (validRecipients.length === 0) {
      return NextResponse.json({
        success: true,
        count: 0,
        message: 'ለዚህ ኮርስ ኢሜይል ያለው ተጠባባቂ ተማሪ አልተገኘም።'
      });
    }

    let notifiedCount = 0;
    const nowIso = new Date().toISOString();

    for (const item of validRecipients) {
      const studentName = item.studentName || 'ተማሪ';
      const courseTitle = item.courseTitle || 'Tsehay Campus Masterclass';
      const studentEmail = item.email.trim().toLowerCase();

      if (resendApiKey) {
        const emailHtml = `
        <!DOCTYPE html>
        <html lang="am">
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>ኮርሱ ተለቋል - ${courseTitle}</title>
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #050811; margin: 0; padding: 30px 15px; color: #ffffff;">
          <table align="center" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 580px; margin: 0 auto; background-color: #0b0f19; border: 1.5px solid #f9b03c; border-radius: 24px; overflow: hidden; box-shadow: 0 25px 70px rgba(0,0,0,0.95), 0 0 40px rgba(249,176,60,0.25);">
            <tr>
              <td align="center" style="padding: 28px 20px 18px; background: linear-gradient(180deg, #131a2d 0%, #0b0f19 100%); border-bottom: 1px dashed rgba(249, 176, 60, 0.35);">
                <div style="display: inline-block; background: #ffffff; padding: 6px 14px; border-radius: 12px; margin-bottom: 12px;">
                  <img src="${siteUrl}/tc-logo.jpg" alt="Tsehay Campus" width="130" style="display: block; max-width: 130px; height: auto;" />
                </div>
                <br>
                <div style="display: inline-block; background: rgba(52, 211, 153, 0.15); border: 1px solid #34d399; color: #34d399; font-size: 11px; font-weight: 900; padding: 4px 14px; border-radius: 100px; text-transform: uppercase; letter-spacing: 1px;">
                  🚀 ኮርሱ በይፋ ተለቋል • COURSE OFFICIALLY LAUNCHED
                </div>
              </td>
            </tr>
            <tr>
              <td style="padding: 32px 32px 20px;">
                <p style="font-size: 15px; color: #cbd5e1; margin: 0 0 16px 0;">
                  ሰላም <strong>${studentName}</strong>፣
                </p>
                <div style="background: rgba(249, 176, 60, 0.08); border: 1px solid rgba(249, 176, 60, 0.3); border-radius: 18px; padding: 24px; margin-bottom: 24px; text-align: center;">
                  <div style="font-size: 38px; margin-bottom: 10px;">🎓✨</div>
                  <h2 style="color: #ffffff; font-size: 20px; font-weight: 900; margin: 0 0 10px 0; line-height: 1.4;">
                    "${courseTitle}" ኮርስ አሁን ተለቋል!
                  </h2>
                  <p style="color: #94a3b8; font-size: 13.5px; line-height: 1.6; margin: 0;">
                    ${customMessage || 'በጉጉት ሲጠብቁት የነበረው ኮርስ ሙሉ ለሙሉ ተጠናቆ ዛሬ በይፋ ተለቋል። ቀደም ብለው በተጠባባቂዎች ዝርዝር ውስጥ ስለነበሩ አሁኑኑ መማር መጀመር ይችላሉ!'}
                  </p>
                  ${launchDiscountCode ? `
                    <div style="margin-top: 14px; display: inline-block; background: rgba(249, 176, 60, 0.2); border: 1px dashed #f9b03c; padding: 8px 16px; border-radius: 10px; color: #f9b03c; font-weight: bold; font-size: 13px;">
                      የማስተዋወቂያ ኩፖን ኮድ: <strong>${launchDiscountCode}</strong>
                    </div>
                  ` : ''}
                </div>
                <table align="center" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom: 20px;">
                  <tr>
                    <td align="center">
                      <a href="${siteUrl}/courses" target="_blank" style="display: inline-block; background: linear-gradient(90deg, #f9b03c 0%, #ffc66b 100%); color: #020617; font-weight: 900; font-size: 15px; text-decoration: none; padding: 15px 34px; border-radius: 14px; box-shadow: 0 0 30px rgba(249,176,60,0.5); text-transform: uppercase; letter-spacing: 0.5px;">
                        ኮርሱን አሁኑኑ ይጀምሩ (Start Learning) →
                      </a>
                    </td>
                  </tr>
                </table>
                <p style="text-align: center; color: #64748b; font-size: 11px; margin: 18px 0 0; line-height: 1.5;">
                  ይህ ማሳወቂያ የተላከው በ Tsehay Campus ለተጠባባቂ ተማሪዎች በተዘጋጀው አውቶማቲክ የLaunch ሲስተም በኩል ነው።
                </p>
              </td>
            </tr>
            <tr>
              <td align="center" style="padding: 16px 20px; background-color: #060913; border-top: 1px solid rgba(255, 255, 255, 0.08); font-size: 11px; color: #64748b;">
                © ${new Date().getFullYear()} Tsehay Campus. All rights reserved. • <a href="${siteUrl}" style="color: #f9b03c; text-decoration: none;">tsehaycampus.com</a>
              </td>
            </tr>
          </table>
        </body>
        </html>
        `;

        try {
          await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${resendApiKey}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              from: fromEmail,
              to: [studentEmail],
              subject: `🚀 "${courseTitle}" ኮርስ አሁን ተለቋል! አሁኑኑ መማር ይችላሉ - Tsehay Campus`,
              html: emailHtml
            })
          });
        } catch (dispatchErr) {
          console.warn(`Failed to dispatch launch email to ${studentEmail}:`, dispatchErr);
        }
      }

      // Mark status as notified in Supabase
      try {
        await supabaseServer
          .from('course_waitlists')
          .update({
            status: 'notified',
            notifiedAt: nowIso
          })
          .eq('id', item.id);
      } catch (uErr) {}

      notifiedCount++;
    }

    return NextResponse.json({
      success: true,
      count: notifiedCount,
      message: `${notifiedCount} ለሚሆኑ ተጠባባቂ ተማሪዎች የኮርስ መልቀቂያ (Launch) ኢሜይል በተሳካ ሁኔታ ተልኳል!`
    });

  } catch (error: any) {
    console.error('Launch notification route error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to send launch notifications' },
      { status: 500 }
    );
  }
}
