import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { EventTicket } from '@/lib/eventCache';
import { verifyAdminRequest } from '@/lib/adminAuthHelper';
import { invalidateEventsCache } from '@/app/api/events/route';

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

async function getTickets(): Promise<EventTicket[]> {
  try {
    const { data: row, error } = await supabaseAdmin
      .from('site_settings')
      .select('data')
      .eq('key', 'event_tickets')
      .maybeSingle();

    if (!error && row?.data && Array.isArray(row.data)) {
      return row.data;
    }
  } catch (e) {}
  return [];
}

async function saveTickets(tickets: EventTicket[]) {
  try {
    await supabaseAdmin
      .from('site_settings')
      .upsert({
        key: 'event_tickets',
        data: tickets,
        updated_at: new Date().toISOString()
      });
  } catch (e) {}
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');
    const eventId = searchParams.get('eventId');
    const ticketId = searchParams.get('ticketId');
    const email = searchParams.get('email');

    // Unfiltered / bulk ticket listing is strictly admin-only
    if (!userId && !eventId && !ticketId && !email) {
      const auth = await verifyAdminRequest(req);
      if (!auth.authorized) {
        return NextResponse.json({ success: false, error: auth.error || 'Unauthorized' }, { status: 401, headers: NO_CACHE_HEADERS });
      }
    }

    let tickets = await getTickets();

    if (ticketId) {
      const match = tickets.find(t => t.ticketId === ticketId || t.id === ticketId);
      if (match) {
        return NextResponse.json({ success: true, ticket: match }, { headers: NO_CACHE_HEADERS });
      }
      return NextResponse.json({ success: false, error: 'Ticket not found' }, { status: 404, headers: NO_CACHE_HEADERS });
    }

    if (userId) {
      tickets = tickets.filter(t => t.userId === userId);
    }
    if (eventId) {
      tickets = tickets.filter(t => t.eventId === eventId || (t.eventSlug && t.eventSlug === eventId));
    }
    if (email) {
      tickets = tickets.filter(t => (t.attendeeEmail || t.email || '').toLowerCase() === email.trim().toLowerCase());
    }

    return NextResponse.json({ success: true, count: tickets.length, tickets }, { headers: NO_CACHE_HEADERS });
  } catch (error: any) {
    console.error('Error fetching tickets:', error);
    return NextResponse.json({ success: true, tickets: [], error: error.message }, { headers: NO_CACHE_HEADERS });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const auth = await verifyAdminRequest(req);
    if (!auth.authorized) {
      return NextResponse.json({ success: false, error: 'Unauthorized: Admin privileges required.' }, { status: 401, headers: NO_CACHE_HEADERS });
    }

    const { searchParams } = new URL(req.url);
    const ticketId = searchParams.get('ticketId') || searchParams.get('id');

    if (!ticketId) {
      return NextResponse.json({ success: false, error: 'Missing ticketId' }, { status: 400, headers: NO_CACHE_HEADERS });
    }

    const tickets = await getTickets();
    const targetTicket = tickets.find(t => t.ticketId === ticketId || t.id === ticketId);
    const filtered = tickets.filter(t => t.ticketId !== ticketId && t.id !== ticketId);

    await saveTickets(filtered);

    // If ticket was associated with an event, decrement registration count
    if (targetTicket && targetTicket.eventId) {
      try {
        const { data: currentEventsRow } = await supabaseAdmin
          .from('site_settings')
          .select('data')
          .eq('key', 'events')
          .maybeSingle();

        if (Array.isArray(currentEventsRow?.data)) {
          const updatedEvents = currentEventsRow.data.map((ev: any) => {
            if (ev.id === targetTicket.eventId || (targetTicket.eventSlug && ev.slug === targetTicket.eventSlug)) {
              const reg = Math.max(0, (Number(ev.registeredCount || ev.registered_count) || 1) - 1);
              const cap = Number(ev.capacity) || 100;
              return {
                ...ev,
                registeredCount: reg,
                registered_count: reg,
                remainingSeats: Math.max(0, cap - reg)
              };
            }
            return ev;
          });

          await supabaseAdmin.from('site_settings').upsert({
            key: 'events',
            data: updatedEvents,
            updated_at: new Date().toISOString()
          });
        }
        invalidateEventsCache();
      } catch (e) {}
    }

    return NextResponse.json({ success: true, message: 'Ticket deleted successfully', deletedTicketId: ticketId }, { headers: NO_CACHE_HEADERS });
  } catch (err: any) {
    console.error('Error deleting ticket:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500, headers: NO_CACHE_HEADERS });
  }
}
