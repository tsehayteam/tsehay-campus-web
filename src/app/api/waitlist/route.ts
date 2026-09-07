import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

const NO_CACHE_HEADERS = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
  'CDN-Cache-Control': 'no-store',
  'Vercel-CDN-Cache-Control': 'no-store',
  'Pragma': 'no-cache',
  'Expires': '0',
};

async function getWaitlists(): Promise<any[]> {
  try {
    const { data: row, error } = await supabaseServer
      .from('site_settings')
      .select('data')
      .eq('key', 'course_waitlists')
      .maybeSingle();

    if (!error && row?.data && Array.isArray(row.data)) {
      return row.data;
    }
  } catch (e) {
    console.warn('Supabase waitlist fetch warning:', e);
  }
  return [];
}

async function saveWaitlists(waitlists: any[]) {
  try {
    await supabaseServer
      .from('site_settings')
      .upsert({
        key: 'course_waitlists',
        data: waitlists,
        updated_at: new Date().toISOString()
      });
  } catch (e) {
    console.warn('Supabase waitlist save error:', e);
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { studentName, email, phone, courseId = 'general', courseTitle = 'Tsehay Campus Masterclass' } = body;

    if (!studentName || !phone) {
      return NextResponse.json(
        { success: false, error: 'እባክዎ ሙሉ ስምዎን እና ስልክ ቁጥርዎን ያስገቡ (Full name and phone are required).' },
        { status: 400, headers: NO_CACHE_HEADERS }
      );
    }

    const waitlistId = `wl_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const newEntry = {
      id: waitlistId,
      studentName: studentName.trim(),
      email: (email || '').trim().toLowerCase(),
      phone: phone.trim(),
      courseId,
      courseTitle,
      createdAt: new Date().toISOString(),
      timestamp: Date.now(),
      status: 'pending'
    };

    const waitlists = await getWaitlists();
    const updated = [newEntry, ...waitlists.filter(w => w.id !== waitlistId)];
    await saveWaitlists(updated);

    // 🌟 Automated VIP Pre-registration Confirmation Email via Resend
    if (newEntry.email && newEntry.email.includes('@')) {
      try {
        const resendApiKey = process.env.RESEND_API_KEY;
        const fromEmail = process.env.RESEND_FROM_EMAIL || 'Tsehay Campus <support@tsehaycampus.com>';
        const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.tsehaycampus.com';

        if (resendApiKey) {
          const emailHtml = `
          <!DOCTYPE html>
          <html lang="am">
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>የቅድመ-ምዝገባ ማረጋገጫ - ${courseTitle}</title>
          </head>
          <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #050811; margin: 0; padding: 30px 15px; color: #ffffff;">
            <table align="center" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 580px; margin: 0 auto; background-color: #0b0f19; border: 1.5px solid #f9b03c; border-radius: 24px; overflow: hidden; box-shadow: 0 25px 70px rgba(0,0,0,0.95), 0 0 40px rgba(249,176,60,0.25);">
              
              <!-- Brand Header -->
              <tr>
                <td align="center" style="padding: 28px 20px 18px; background: linear-gradient(180deg, #131a2d 0%, #0b0f19 100%); border-bottom: 1px dashed rgba(249, 176, 60, 0.35);">
                  <div style="display: inline-block; background: #ffffff; padding: 6px 14px; border-radius: 12px; margin-bottom: 12px;">
                    <img src="${siteUrl}/tc-logo.jpg" alt="Tsehay Campus" width="130" style="display: block; max-width: 130px; height: auto;" />
                  </div>
                  <br>
                  <div style="display: inline-block; background: rgba(249, 176, 60, 0.15); border: 1px solid #f9b03c; color: #f9b03c; font-size: 11px; font-weight: 900; padding: 4px 14px; border-radius: 100px; text-transform: uppercase; letter-spacing: 1px;">
                    🎉 የቅድመ-ምዝገባ ማረጋገጫ • WAITLIST CONFIRMED
                  </div>
                </td>
              </tr>

              <!-- Email Body -->
              <tr>
                <td style="padding: 30px 32px 20px;">
                  <p style="font-size: 15px; color: #cbd5e1; margin: 0 0 16px 0;">
                    ሰላም <strong>${studentName}</strong>፣
                  </p>

                  <div style="background: rgba(249, 176, 60, 0.08); border: 1px solid rgba(249, 176, 60, 0.3); border-radius: 18px; padding: 22px; margin-bottom: 24px; text-align: center;">
                    <div style="font-size: 36px; margin-bottom: 8px;">🚀</div>
                    <h3 style="color: #ffffff; font-size: 19px; font-weight: 900; margin: 0 0 8px 0; line-height: 1.4;">
                      ለ "${courseTitle}" ኮርስ በተሳካ ሁኔታ ተመዝግበዋል!
                    </h3>
                    <p style="color: #94a3b8; font-size: 13px; line-height: 1.6; margin: 0;">
                      የእርስዎ ቦታ በቪአይፒ የተጠባባቂዎች ዝርዝር ውስጥ ተይዟል። ኮርሱ ተጠናቆ በይፋ በሚለቀቅበት ቅጽበት የመጀመሪያው ተጠቃሚ የሚሆኑበት ቀጥታ ማሳወቂያ እና ልዩ የቅድሚያ ቅናሽ ይላክልዎታል።
                    </p>
                  </div>

                  <!-- Details Table -->
                  <table width="100%" cellpadding="0" cellspacing="0" style="background: rgba(255, 255, 255, 0.03); border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 14px; margin-bottom: 24px;">
                    <tr>
                      <td style="padding: 12px 16px; border-bottom: 1px solid rgba(255, 255, 255, 0.07); color: #94a3b8; font-size: 12px; width: 40%;">የኮርሱ ስም</td>
                      <td style="padding: 12px 16px; border-bottom: 1px solid rgba(255, 255, 255, 0.07); color: #f9b03c; font-weight: bold; font-size: 13px;">${courseTitle}</td>
                    </tr>
                    <tr>
                      <td style="padding: 12px 16px; border-bottom: 1px solid rgba(255, 255, 255, 0.07); color: #94a3b8; font-size: 12px;">የተማሪ ስም</td>
                      <td style="padding: 12px 16px; border-bottom: 1px solid rgba(255, 255, 255, 0.07); color: #ffffff; font-size: 13px;">${studentName}</td>
                    </tr>
                    <tr>
                      <td style="padding: 12px 16px; border-bottom: 1px solid rgba(255, 255, 255, 0.07); color: #94a3b8; font-size: 12px;">ስልክ ቁጥር</td>
                      <td style="padding: 12px 16px; border-bottom: 1px solid rgba(255, 255, 255, 0.07); color: #ffffff; font-size: 13px;">${phone}</td>
                    </tr>
                    <tr>
                      <td style="padding: 12px 16px; color: #94a3b8; font-size: 12px;">የምዝገባ ሁኔታ</td>
                      <td style="padding: 12px 16px; color: #34d399; font-weight: bold; font-size: 12px;">✓ ጸድቋል (VIP Priority)</td>
                    </tr>
                  </table>

                  <!-- CTA Button -->
                  <table align="center" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom: 18px;">
                    <tr>
                      <td align="center">
                        <a href="${siteUrl}/courses" target="_blank" style="display: inline-block; background: linear-gradient(90deg, #f9b03c 0%, #ffc66b 100%); color: #020617; font-weight: 900; font-size: 14px; text-decoration: none; padding: 14px 30px; border-radius: 14px; box-shadow: 0 0 25px rgba(249,176,60,0.4); text-transform: uppercase; letter-spacing: 0.5px;">
                          ሌሎች ኮርሶችን ያስሱ (Explore Courses) →
                        </a>
                      </td>
                    </tr>
                  </table>

                  <p style="text-align: center; color: #64748b; font-size: 11px; margin: 16px 0 0; line-height: 1.5;">
                    ይህ ኢሜይል የተላከው በ Tsehay Campus የቅድመ-ምዝገባ ሲስተም በኩል ፍላጎት ስላሳዩ ነው።
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

          fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${resendApiKey}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              from: fromEmail,
              to: [newEntry.email],
              subject: `🎉 ለ"${courseTitle}" ኮርስ ቅድመ-ምዝገባዎ በተሳካ ሁኔታ ተጠናቋል! - Tsehay Campus`,
              html: emailHtml
            })
          }).catch(e => console.warn('Resend waitlist confirmation error:', e));
        }
      } catch (emailErr) {
        console.warn('Waitlist email attempt notice:', emailErr);
      }
    }

    return NextResponse.json({
      success: true,
      message: 'የተጠባባቂዎች ዝርዝር ውስጥ በተሳካ ሁኔታ ተመዝግበዋል!',
      waitlist: newEntry
    }, { headers: NO_CACHE_HEADERS });
  } catch (error: any) {
    console.error('Waitlist submission error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Server error occurred' },
      { status: 500, headers: NO_CACHE_HEADERS }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const courseId = searchParams.get('courseId');

    let waitlists = await getWaitlists();

    if (courseId && courseId !== 'all') {
      waitlists = waitlists.filter(w => w.courseId === courseId);
    }

    return NextResponse.json({
      success: true,
      count: waitlists.length,
      waitlists
    }, { headers: NO_CACHE_HEADERS });
  } catch (error: any) {
    console.warn('Waitlist GET error:', error);
    return NextResponse.json({ success: true, count: 0, waitlists: [] }, { headers: NO_CACHE_HEADERS });
  }
}
