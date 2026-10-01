import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { verifyAdminRequest } from '@/lib/adminAuthHelper';
import { invalidateEventsCache } from '@/app/api/events/route';
import { sendPostponedEventEmail } from '@/lib/ticketEmailService';
import { TsehayEvent, EventTicket } from '@/lib/eventCache';

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

export async function POST(req: NextRequest) {
  try {
    // 1. Strict Admin Authorization Check
    const auth = await verifyAdminRequest(req);
    if (!auth.authorized) {
      return NextResponse.json(
        { success: false, error: auth.error || 'Unauthorized - Admin access required' },
        { status: 401, headers: NO_CACHE_HEADERS }
      );
    }

    const body = await req.json().catch(() => ({}));
    const { 
      eventId, 
      newDate, 
      newTime, 
      reason, 
      notifyAttendees = true,
      cancelPostpone = false 
    } = body;

    if (!eventId || typeof eventId !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Event ID is required' },
        { status: 400, headers: NO_CACHE_HEADERS }
      );
    }

    const cleanId = eventId.trim().toLowerCase();

    // 2. Fetch existing events from site_settings (key: 'events')
    const { data: eventsRow, error: eventsErr } = await supabaseAdmin
      .from('site_settings')
      .select('data')
      .eq('key', 'events')
      .maybeSingle();

    if (eventsErr) {
      return NextResponse.json(
        { success: false, error: 'Failed to query events table' },
        { status: 500, headers: NO_CACHE_HEADERS }
      );
    }

    const eventsList: TsehayEvent[] = Array.isArray(eventsRow?.data) ? eventsRow.data : [];
    const eventIndex = eventsList.findIndex(e => 
      (e.id && e.id.toLowerCase() === cleanId) || 
      (e.slug && e.slug.toLowerCase() === cleanId)
    );

    if (eventIndex === -1) {
      return NextResponse.json(
        { success: false, error: 'Event not found' },
        { status: 404, headers: NO_CACHE_HEADERS }
      );
    }

    const currentEvent = eventsList[eventIndex];
    const oldDate = currentEvent.originalDate || currentEvent.date;
    const finalNewDate = newDate ? newDate.trim() : '';

    let updatedEvent: TsehayEvent;

    if (cancelPostpone) {
      // 🔄 Cancel Postponement: Revert back to original date
      updatedEvent = {
        ...currentEvent,
        date: currentEvent.originalDate || currentEvent.date,
        isPostponed: false,
        postponedTo: undefined,
        postponedNote: undefined,
        status: 'upcoming',
        updatedAt: new Date().toISOString()
      };
    } else {
      if (!finalNewDate) {
        return NextResponse.json(
          { success: false, error: 'አዲሱ የተላለፈበት ቀን (New Date) ማስገባት ግዴታ ነው' },
          { status: 400, headers: NO_CACHE_HEADERS }
        );
      }

      // 📅 Postpone Event: Apply new date & note
      updatedEvent = {
        ...currentEvent,
        originalDate: currentEvent.originalDate || currentEvent.date,
        date: finalNewDate,
        time: newTime ? newTime.trim() : currentEvent.time,
        isPostponed: true,
        postponedTo: finalNewDate,
        postponedNote: reason ? reason.trim() : (currentEvent.postponedNote || ''),
        status: 'upcoming', // Ensure not marked as passed!
        updatedAt: new Date().toISOString()
      };
    }

    eventsList[eventIndex] = updatedEvent;

    // 3. Persist Updated Events to site_settings (key: 'events')
    await supabaseAdmin
      .from('site_settings')
      .upsert({
        key: 'events',
        data: eventsList,
        updated_at: new Date().toISOString()
      });

    // 4. Mirror to PostgreSQL events table (fallback & safe update)
    try {
      if (cancelPostpone) {
        await supabaseAdmin
          .from('events')
          .update({
            date: updatedEvent.date,
            status: 'upcoming',
            updated_at: new Date().toISOString()
          })
          .eq('id', currentEvent.id);
      } else {
        await supabaseAdmin
          .from('events')
          .update({
            date: finalNewDate,
            time: updatedEvent.time,
            status: 'upcoming',
            updated_at: new Date().toISOString()
          })
          .eq('id', currentEvent.id);
      }
    } catch (dbErr) {
      console.warn('[Postpone API] PostgreSQL events table direct update warning:', dbErr);
    }

    // Invalidate local cache
    try {
      invalidateEventsCache();
    } catch (e) {}

    // 5. Automated Email Notification to All Registered Attendees
    let notifiedCount = 0;
    let totalAttendees = 0;

    if (!cancelPostpone && notifyAttendees) {
      try {
        const { data: ticketsRow } = await supabaseAdmin
          .from('site_settings')
          .select('data')
          .eq('key', 'event_tickets')
          .maybeSingle();

        const tickets: EventTicket[] = Array.isArray(ticketsRow?.data) ? ticketsRow.data : [];
        
        // Find tickets matching this event
        const matchingTickets = tickets.filter(t => 
          (t.eventId && t.eventId.toLowerCase() === currentEvent.id.toLowerCase()) ||
          (t.eventId && currentEvent.slug && t.eventId.toLowerCase() === currentEvent.slug.toLowerCase()) ||
          (t.eventSlug && currentEvent.slug && t.eventSlug.toLowerCase() === currentEvent.slug.toLowerCase())
        );

        totalAttendees = matchingTickets.length;

        // Deduplicate by attendeeEmail to avoid spamming multiple emails to same person
        const uniqueEmailMap = new Map<string, EventTicket>();
        matchingTickets.forEach(t => {
          if (t.attendeeEmail && t.attendeeEmail.trim()) {
            const emailKey = t.attendeeEmail.trim().toLowerCase();
            if (!uniqueEmailMap.has(emailKey)) {
              uniqueEmailMap.set(emailKey, t);
            }
          }
        });

        const attendeesToNotify = Array.from(uniqueEmailMap.values());

        // Dispatch emails in parallel with allSettled
        const dispatchPromises = attendeesToNotify.map(async (t) => {
          try {
            const res = await sendPostponedEventEmail({
              ticket: t,
              eventTitle: currentEvent.title,
              oldDate: oldDate || currentEvent.date,
              newDate: finalNewDate,
              eventTime: updatedEvent.time,
              eventLocation: updatedEvent.location,
              isOnline: updatedEvent.isOnline,
              meetingLink: updatedEvent.meetingLink,
              mapsUrl: updatedEvent.mapsUrl,
              reason: updatedEvent.postponedNote
            });
            if (res.success) notifiedCount++;
          } catch (mailErr) {
            console.warn(`[Postpone Email Warning] Failed sending to ${t.attendeeEmail}:`, mailErr);
          }
        });

        await Promise.allSettled(dispatchPromises);
      } catch (err) {
        console.warn('[Postpone Notification Error]:', err);
      }
    }

    return NextResponse.json({
      success: true,
      event: updatedEvent,
      oldDate,
      newDate: finalNewDate,
      notifiedCount,
      totalAttendees,
      message: cancelPostpone 
        ? 'የኢቨንቱ ማስተላለፊያ ተሰርዞ ወደ ቀድሞው ቀን ተመልሷል (Postponement cancelled)'
        : `ኢቨንቱ በተሳካ ሁኔታ ወደ "${finalNewDate}" ተላልፏል! ለ ${notifiedCount} ተሳታፊዎች የኢሜይል ማሳወቂያ ተልኳል።`
    }, { headers: NO_CACHE_HEADERS });

  } catch (error: any) {
    console.error('Postpone event API error:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Internal Server Error' },
      { status: 500, headers: NO_CACHE_HEADERS }
    );
  }
}
