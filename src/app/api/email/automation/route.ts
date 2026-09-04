import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import {
  getWelcomeEmailHtml,
  getCourseReminderEmailHtml,
  getAiReminderEmailHtml,
  getNewCourseAlertEmailHtml
} from '@/lib/premiumEmailTemplates';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { type, userEmail, recipients, userName, payload } = body;

    if (!type) {
      return NextResponse.json(
        { success: false, error: 'Campaign type is required (welcome | course_reminder | ai_reminder | new_course)' },
        { status: 400 }
      );
    }

    // Determine recipient list
    const targetEmails: string[] = Array.isArray(recipients) && recipients.length > 0 
      ? recipients 
      : userEmail ? [userEmail.trim()] : [];

    if (targetEmails.length === 0) {
      return NextResponse.json(
        { success: false, error: 'At least one recipient email is required.' },
        { status: 400 }
      );
    }

    const resendApiKey = process.env.RESEND_API_KEY;
    /**
     * 💡 ADMIN NOTICE REGARDING EMAIL SENDER PROFILE AVATAR / BRANDING:
     * Inbox avatars (Gmail, Apple Mail) are controlled via the Google Workspace account or Gravatar profile
     * associated with support@tsehaycampus.com. To display the official brand logo, configure the profile picture
     * in Google Admin Console (admin.google.com) and on Gravatar (gravatar.com).
     */
    const fromEmail = process.env.RESEND_FROM_EMAIL || 'Tsehay Campus <support@tsehaycampus.com>';

    let subject = '';
    let htmlContent = '';
    const name = userName || 'የተከበሩ ተማሪ';

    switch (type) {
      case 'welcome':
        subject = 'እንኳን ወደ ፀሐይ ካምፓስ በደህና መጡ! (Welcome to Tsehay Campus)';
        htmlContent = getWelcomeEmailHtml({ name, email: targetEmails[0] });
        break;

      case 'course_reminder':
        subject = 'ኮርስዎን አልጨረሱም! ዛሬ ገብተው ይቀጥሉ... - Tsehay Campus';
        htmlContent = getCourseReminderEmailHtml({
          name,
          email: targetEmails[0],
          courseTitle: payload?.courseTitle || 'የጀመሩት ስልጠና',
          progressPercent: payload?.progressPercent || 30,
          lastLessonTitle: payload?.lastLessonTitle
        });
        break;

      case 'ai_reminder':
        subject = 'የ Tsehay AI ረዳትዎን ሞክረውታል? ለቢዝነስዎ አዳዲስ ሀሳቦችን ይጠይቁት!';
        htmlContent = getAiReminderEmailHtml({ name, email: targetEmails[0] });
        break;

      case 'new_course':
        const cTitle = payload?.courseTitle || 'አዲስ የክህሎት ስልጠና';
        subject = `አዲስ ኮርስ ተለቋል፡ ${cTitle}! ዛሬውኑ ይመዝገቡ - Tsehay Campus`;
        htmlContent = getNewCourseAlertEmailHtml({
          name,
          email: targetEmails[0],
          courseTitle: cTitle,
          courseDescription: payload?.courseDescription,
          instructor: payload?.instructor,
          coursePrice: payload?.coursePrice,
          courseSlug: payload?.courseSlug
        });
        break;

      default:
        return NextResponse.json(
          { success: false, error: `Unknown automation campaign type: ${type}` },
          { status: 400 }
        );
    }

    let dispatchedCount = 0;

    if (resendApiKey) {
      // Dispatch individually or in batch
      for (const recipient of targetEmails) {
        try {
          const res = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${resendApiKey}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              from: fromEmail,
              to: [recipient],
              subject,
              html: htmlContent
            })
          });

          if (res.ok) dispatchedCount++;
        } catch (mailErr) {
          console.warn(`Automation dispatch error for ${recipient}:`, mailErr);
        }
      }
    } else {
      console.log(`[Mock Dispatch] RESEND_API_KEY not set. Mocking "${type}" email to:`, targetEmails);
      dispatchedCount = targetEmails.length;
    }

    // Log automation to Firestore
    try {
      if (adminDb && typeof adminDb.collection === 'function') {
        await adminDb.collection('email_campaign_logs').add({
          type,
          recipientsCount: targetEmails.length,
          dispatchedCount,
          subject,
          timestamp: new Date().toISOString()
        });
      }
    } catch (dbErr) {
      console.warn('Firestore campaign log error:', dbErr);
    }

    return NextResponse.json({
      success: true,
      type,
      dispatchedCount,
      totalRequested: targetEmails.length,
      message: `የኢሜይል አውቶሜሽን (${type}) በተሳካ ሁኔታ ተልኳል!`
    });

  } catch (error: any) {
    console.error('Email Automation Error:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'የኢሜይል መልዕክቱን መላክ አልተቻለም።' },
      { status: 500 }
    );
  }
}
