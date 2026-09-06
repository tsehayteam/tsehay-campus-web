import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    let body: any = {};
    try {
      body = await req.json();
    } catch (e) {
      body = {};
    }

    const { rating, type, category, message, userId, userName, userEmail, pageUrl, imageUrl, screenshotUrl, audioUrl, voiceNoteUrl } = body;

    const feedbackId = body.id || `fb_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const payload = {
      id: feedbackId,
      rating: Number(rating) || 5,
      type: type || category || 'general',
      category: category || type || 'general',
      message: (message || '').trim() || (audioUrl || voiceNoteUrl ? '🎙️ [የድምፅ መልዕክት]' : ''),
      userId: userId || 'guest_student',
      userName: userName || (userEmail ? userEmail.split('@')[0] : 'ተማሪ'),
      userEmail: userEmail || 'student@tsehaycampus.com',
      pageUrl: pageUrl || '/',
      imageUrl: imageUrl || screenshotUrl || null,
      screenshotUrl: screenshotUrl || imageUrl || null,
      audioUrl: audioUrl || voiceNoteUrl || null,
      voiceNoteUrl: voiceNoteUrl || audioUrl || null,
      status: 'pending',
      createdAt: new Date().toISOString(),
      createdAtClient: new Date().toISOString(),
    };

    if (adminDb) {
      // 1. Root user_feedbacks
      try {
        await adminDb.collection('user_feedbacks').doc(feedbackId).set(payload, { merge: true });
      } catch (e) {}

      // 2. Root student_feedback
      try {
        await adminDb.collection('student_feedback').doc(feedbackId).set(payload, { merge: true });
      } catch (e) {}

      // 3. Artifact collection
      try {
        await adminDb
          .collection('artifacts')
          .doc('tsehaycampus-e1a6d')
          .collection('public')
          .doc('data')
          .collection('student_feedback')
          .doc(feedbackId)
          .set(payload, { merge: true });
      } catch (e) {}
    }

    return NextResponse.json({
      success: true,
      message: 'አስተያየትዎ በተሳካ ሁኔታ ደርሶናል! እናመሰግናለን። (Feedback submitted successfully)',
      feedback: payload
    });
  } catch (error: any) {
    console.error('Error in POST /api/feedback:', error);
    return NextResponse.json({ success: false, error: error.message || 'Internal server error' }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const category = searchParams.get('category') || searchParams.get('type');
    const status = searchParams.get('status');

    let feedbacks: any[] = [];
    if (adminDb) {
      try {
        const snap = await adminDb.collection('user_feedbacks').orderBy('createdAt', 'desc').limit(100).get();
        if (!snap.empty) {
          feedbacks = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        }
      } catch (e) {
        try {
          const snap2 = await adminDb.collection('student_feedback').get();
          if (!snap2.empty) {
            feedbacks = snap2.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          }
        } catch (e2) {}
      }
    }

    if (category && category !== 'all') {
      feedbacks = feedbacks.filter(f => (f.category === category || f.type === category));
    }

    if (status && status !== 'all') {
      feedbacks = feedbacks.filter(f => f.status === status);
    }

    // Calculate rating statistics
    const totalRatings = feedbacks.reduce((acc, f) => acc + (Number(f.rating) || 5), 0);
    const averageRating = feedbacks.length > 0 ? (totalRatings / feedbacks.length).toFixed(1) : '5.0';

    return NextResponse.json({
      success: true,
      count: feedbacks.length,
      averageRating,
      feedbacks
    });
  } catch (error: any) {
    console.error('Error in GET /api/feedback:', error);
    return NextResponse.json({ success: true, count: 0, feedbacks: [] });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    let body: any = {};
    try {
      body = await req.json();
    } catch (e) {
      body = {};
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id') || body.id;
    const status = body.status;

    if (!id) {
      return NextResponse.json({ success: false, error: 'Missing feedback id' }, { status: 400 });
    }

    const updates: any = {
      updatedAt: new Date().toISOString()
    };
    if (status) updates.status = status;
    if (body.adminNotes) updates.adminNotes = body.adminNotes;

    let existingFeedback: any = null;
    if (adminDb) {
      try {
        const snap = await adminDb.collection('user_feedbacks').doc(id).get();
        if (snap.exists) {
          existingFeedback = snap.data();
        } else {
          const snap2 = await adminDb.collection('student_feedback').doc(id).get();
          if (snap2.exists) {
            existingFeedback = snap2.data();
          }
        }
      } catch (e) {}

      try {
        await adminDb.collection('user_feedbacks').doc(id).set(updates, { merge: true });
      } catch (e) {}

      try {
        await adminDb.collection('student_feedback').doc(id).set(updates, { merge: true });
      } catch (e) {}
    }

    // 🌟 Automated Resolution Follow-up Email if Feedback is Resolved
    if (status === 'resolved' && existingFeedback) {
      const recipientEmail = body.userEmail || existingFeedback.userEmail;
      const recipientName = body.userName || existingFeedback.userName || 'ተማሪ';
      const originalMessage = existingFeedback.message || '';
      const adminNotes = body.adminNotes || updates.adminNotes || '';

      const isPlaceholder = recipientEmail === 'student@tsehaycampus.com' || recipientEmail === 'guest@tsehaycampus.com';

      if (recipientEmail && recipientEmail.includes('@') && !isPlaceholder) {
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
              <title>ያነሱት አስተያየት ተስተካክሏል - Tsehay Campus</title>
            </head>
            <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #050811; margin: 0; padding: 30px 15px; color: #ffffff;">
              <table align="center" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 580px; margin: 0 auto; background-color: #0b0f19; border: 1.5px solid #10b981; border-radius: 24px; overflow: hidden; box-shadow: 0 25px 70px rgba(0,0,0,0.95), 0 0 40px rgba(16,185,129,0.25);">
                
                <!-- Brand Header -->
                <tr>
                  <td align="center" style="padding: 28px 20px 18px; background: linear-gradient(180deg, #0e1e18 0%, #0b0f19 100%); border-bottom: 1px dashed rgba(16, 185, 129, 0.35);">
                    <div style="display: inline-block; background: #ffffff; padding: 6px 14px; border-radius: 12px; margin-bottom: 12px;">
                      <img src="${siteUrl}/tc-logo.jpg" alt="Tsehay Campus" width="130" style="display: block; max-width: 130px; height: auto;" />
                    </div>
                    <br>
                    <div style="display: inline-block; background: rgba(16, 185, 129, 0.15); border: 1px solid #10b981; color: #34d399; font-size: 11px; font-weight: 900; padding: 4px 14px; border-radius: 100px; text-transform: uppercase; letter-spacing: 1px;">
                      ✅ አስተያየት ተስተካክሏል • FEEDBACK RESOLVED
                    </div>
                  </td>
                </tr>

                <!-- Content Body -->
                <tr>
                  <td style="padding: 30px 32px 20px;">
                    <p style="font-size: 15px; color: #cbd5e1; margin: 0 0 16px 0;">
                      ሰላም <strong>${recipientName}</strong>፣
                    </p>

                    <div style="background: rgba(16, 185, 129, 0.08); border: 1px solid rgba(16, 185, 129, 0.3); border-radius: 18px; padding: 22px; margin-bottom: 24px; text-align: center;">
                      <div style="font-size: 38px; margin-bottom: 8px;">🎉✨</div>
                      <h3 style="color: #ffffff; font-size: 19px; font-weight: 900; margin: 0 0 8px 0; line-height: 1.4;">
                        ያነሱት ጠቃሚ አስተያየት በተሳካ ሁኔታ ተስተካክሏል!
                      </h3>
                      <p style="color: #94a3b8; font-size: 13px; line-height: 1.6; margin: 0;">
                        በ Tsehay Campus ላይ ያጋሩንን አስተያየት የቴክኒክ ቡድናችን በጥንቃቄ ተመልክቶ አስፈላጊውን ማስተካከያ አድርጓል። ፕላትፎርማችንን የተሻለ ለማድረግ ስለረዱን እጅግ እናመሰግናለን!
                      </p>
                    </div>

                    ${originalMessage ? `
                      <div style="margin-bottom: 20px;">
                        <span style="font-size: 11px; font-weight: bold; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.5px; display: block; margin-bottom: 6px;">
                          ያቀረቡት አስተያየት፡
                        </span>
                        <div style="background: rgba(255, 255, 255, 0.03); border-left: 3px solid #10b981; padding: 12px 16px; border-radius: 10px; color: #cbd5e1; font-size: 13px; font-style: italic;">
                          "${originalMessage}"
                        </div>
                      </div>
                    ` : ''}

                    ${adminNotes ? `
                      <div style="margin-bottom: 22px; background: rgba(249, 176, 60, 0.08); border: 1px solid rgba(249, 176, 60, 0.25); border-radius: 12px; padding: 14px;">
                        <span style="font-size: 11px; font-weight: 900; color: #f9b03c; display: block; margin-bottom: 4px;">
                          💬 ከአድሚን የተሰጠ ማብራሪያ፡
                        </span>
                        <p style="color: #ffffff; font-size: 13px; margin: 0; line-height: 1.5;">
                          ${adminNotes}
                        </p>
                      </div>
                    ` : ''}

                    <!-- CTA Button -->
                    <table align="center" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom: 18px;">
                      <tr>
                        <td align="center">
                          <a href="${siteUrl}" target="_blank" style="display: inline-block; background: linear-gradient(90deg, #10b981 0%, #34d399 100%); color: #020617; font-weight: 900; font-size: 14px; text-decoration: none; padding: 14px 30px; border-radius: 14px; box-shadow: 0 0 25px rgba(16,185,129,0.4); text-transform: uppercase; letter-spacing: 0.5px;">
                            Tsehay Campusን ይጎብኙ (Open App) →
                          </a>
                        </td>
                      </tr>
                    </table>

                    <p style="text-align: center; color: #64748b; font-size: 11px; margin: 16px 0 0; line-height: 1.5;">
                      ይህ ማሳወቂያ የተላከው በ Tsehay Campus የተጠቃሚዎች አስተያየት መቀበያ ሲስተም በኩል ነው።
                    </p>
                  </td>
                </tr>

                <!-- Footer -->
                <tr>
                  <td align="center" style="padding: 16px 20px; background-color: #060913; border-top: 1px solid rgba(255, 255, 255, 0.08); font-size: 11px; color: #64748b;">
                    © ${new Date().getFullYear()} Tsehay Campus. All rights reserved. • <a href="${siteUrl}" style="color: #34d399; text-decoration: none;">tsehaycampus.com</a>
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
                to: [recipientEmail.trim().toLowerCase()],
                subject: `✅ ያነሱት አስተያየት ተስተካክሏል! (Your Feedback Has Been Resolved) - Tsehay Campus`,
                html: emailHtml
              })
            }).catch(e => console.warn('Resend feedback follow-up error:', e));
          }
        } catch (emailErr) {
          console.warn('Feedback follow-up email notice:', emailErr);
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: 'የአስተያየቱ ሁኔታ ተስተካክሏል (Status updated)',
      id,
      updates
    });
  } catch (error: any) {
    console.error('Error in PATCH /api/feedback:', error);
    return NextResponse.json({ success: false, error: error.message || 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    let id = searchParams.get('id');

    if (!id) {
      try {
        const body = await req.json();
        id = body?.id;
      } catch (e) {}
    }

    if (!id) {
      return NextResponse.json({ success: false, error: 'Missing feedback id' }, { status: 400 });
    }

    if (adminDb) {
      try {
        await adminDb.collection('user_feedbacks').doc(id).delete();
      } catch (e) {}

      try {
        await adminDb.collection('student_feedback').doc(id).delete();
      } catch (e) {}
    }

    return NextResponse.json({
      success: true,
      message: 'አስተያየቱ ተሰርዟል! (Feedback deleted successfully)',
      id
    });
  } catch (error: any) {
    console.error('Error in DELETE /api/feedback:', error);
    return NextResponse.json({ success: false, error: error.message || 'Internal server error' }, { status: 500 });
  }
}
