import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { sendEventReminderEmail } from '@/lib/ticketEmailService';
import { EventTicket } from '@/lib/eventCache';

export const dynamic = 'force-dynamic';

function parseEventDate(dateStr: string): Date | null {
  if (!dateStr) return null;
  const parsed = new Date(dateStr);
  if (!isNaN(parsed.getTime())) return parsed;

  // Try extracting YYYY-MM-DD
  const match = dateStr.match(/(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
  if (match) {
    const d = new Date(parseInt(match[1]), parseInt(match[2]) - 1, parseInt(match[3]));
    if (!isNaN(d.getTime())) return d;
  }
  return null;
}

export async function GET(req: NextRequest) {
  return handleReminders(req);
}

export async function POST(req: NextRequest) {
  return handleReminders(req);
}

async function handleReminders(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    
    // Optional secret check if CRON_SECRET is configured
    if (cronSecret && authHeader !== `Bearer ${cronSecret}` && req.nextUrl.searchParams.get('secret') !== cronSecret) {
      console.warn('[Event Reminders Cron] Unauthorized trigger attempt.');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!adminDb) {
      return NextResponse.json({ 
        success: false, 
        error: 'Firestore Admin DB is not initialized on this server instance.' 
      }, { status: 500 });
    }

    const now = new Date();
    let scannedCount = 0;
    let sent3dCount = 0;
    let sent1dCount = 0;
    const errors: any[] = [];

    // Query event_registrations
    const registrationsSnap = await adminDb.collection('event_registrations').get();
    const docs = registrationsSnap.docs;
    scannedCount = docs.length;

    for (const doc of docs) {
      const data = doc.data() as EventTicket;
      if (!data || !data.attendeeEmail || data.checkedIn || data.isUsed) {
        continue;
      }

      const eventDate = parseEventDate(data.eventDate);
      if (!eventDate) continue;

      // Calculate time difference in days
      const diffMs = eventDate.getTime() - now.getTime();
      const diffDays = diffMs / (1000 * 60 * 60 * 24);

      // Stage 1: 3 Days Reminder (between 1.8 and 3.8 days left)
      if (diffDays >= 1.8 && diffDays <= 3.8 && !data.reminder3dSent) {
        try {
          const res = await sendEventReminderEmail(data, '3days');
          if (res.success) {
            sent3dCount++;
            await doc.ref.set({
              reminder3dSent: true,
              reminder3dSentAt: new Date().toISOString()
            }, { merge: true });
          } else {
            errors.push({ ticketId: data.ticketId, stage: '3days', error: res.error });
          }
        } catch (e: any) {
          errors.push({ ticketId: data.ticketId, stage: '3days', error: e.message });
        }
      }

      // Stage 2: 1 Day Reminder (between -0.2 and 1.5 days left)
      if (diffDays >= -0.2 && diffDays <= 1.5 && !data.reminder1dSent) {
        try {
          const res = await sendEventReminderEmail(data, '1day');
          if (res.success) {
            sent1dCount++;
            await doc.ref.set({
              reminder1dSent: true,
              reminder1dSentAt: new Date().toISOString()
            }, { merge: true });
          } else {
            errors.push({ ticketId: data.ticketId, stage: '1day', error: res.error });
          }
        } catch (e: any) {
          errors.push({ ticketId: data.ticketId, stage: '1day', error: e.message });
        }
      }
    }

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      scannedCount,
      sent3dCount,
      sent1dCount,
      errorsCount: errors.length,
      errors
    });
  } catch (error: any) {
    console.error('[Event Reminders Cron] Error executing reminders:', error);
    return NextResponse.json({ 
      success: false, 
      error: error.message || 'Internal server error in reminder scheduler' 
    }, { status: 500 });
  }
}
