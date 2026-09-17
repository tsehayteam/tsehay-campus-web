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
      return NextResponse.json({ success: false, error: auth.error || 'Unauthorized: Admin privileges required.' }, { status: 401, headers: NO_CACHE_HEADERS });
    }

    const { searchParams } = new URL(req.url);
    const ticketId = searchParams.get('ticketId') || searchParams.get('id');

    if (!ticketId) {
      return NextResponse.json({ success: false, error: 'Ticket ID required' }, { status: 400, headers: NO_CACHE_HEADERS });
    }

    const tickets = await getTickets();
    const targetTicket = tickets.find(t => t.ticketId === ticketId || t.id === ticketId);

    if (!targetTicket) {
      return NextResponse.json({ success: false, error: 'Ticket not found' }, { status: 404, headers: NO_CACHE_HEADERS });
    }

    const remainingTickets = tickets.filter(t => t.ticketId !== ticketId && t.id !== ticketId);
    await saveTickets(remainingTickets);

    // Restore capacity on target event
    const eventId = targetTicket.eventId;
    if (eventId) {
      try {
        const { data: dbEvent } = await supabaseAdmin
          .from('events')
          .select('registered_count, capacity')
          .eq('id', eventId)
          .maybeSingle();

        if (dbEvent) {
          const newReg = Math.max(0, (Number(dbEvent.registered_count) || 1) - 1);
          await supabaseAdmin
            .from('events')
            .update({
              registered_count: newReg,
              updated_at: new Date().toISOString()
            })
            .eq('id', eventId);
        }
      } catch (e) {}

      try {
        const { data: settingsRow } = await supabaseAdmin
          .from('site_settings')
          .select('data')
          .eq('key', 'events')
          .maybeSingle();

        if (settingsRow?.data && Array.isArray(settingsRow.data)) {
          const updatedEvents = settingsRow.data.map((ev: any) => {
            if (ev.id === eventId || (targetTicket.eventSlug && ev.slug === targetTicket.eventSlug)) {
              const cap = Number(ev.capacity) || 100;
              const newReg = Math.max(0, (Number(ev.registered_count ?? ev.registeredCount) || 1) - 1);
              return {
                ...ev,
                registeredCount: newReg,
                registered_count: newReg,
                remainingSeats: Math.max(0, cap - newReg)
              };
            }
            return ev;
          });

          await supabaseAdmin
            .from('site_settings')
            .upsert({
              key: 'events',
              data: updatedEvents,
              updated_at: new Date().toISOString()
            });
        }
        invalidateEventsCache();
      } catch (e) {}
    }

    return NextResponse.json({
      success: true,
      message: 'ትኬቱ በተሳካ ሁኔታ ተሰርዟል! የመያዝ አቅሙም ተመልሷል። (Ticket revoked and seat restored)',
      deletedTicketId: ticketId
    }, { headers: NO_CACHE_HEADERS });
  } catch (err: any) {
    console.error('Error deleting ticket:', err);
    return NextResponse.json({ success: false, error: err.message || 'Failed to delete ticket' }, { status: 500, headers: NO_CACHE_HEADERS });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const auth = await verifyAdminRequest(req);
    if (!auth.authorized) {
      return NextResponse.json(
        { success: false, error: auth.error || 'Unauthorized: Admin privileges required.' },
        { status: 401, headers: NO_CACHE_HEADERS }
      );
    }

    const body = await req.json();
    const { ticketId, action } = body;

    if (!ticketId) {
      return NextResponse.json(
        { success: false, error: 'የቲኬት መለያ (Ticket ID) ያስፈልጋል' },
        { status: 400, headers: NO_CACHE_HEADERS }
      );
    }

    const tickets = await getTickets();
    const targetTicket = tickets.find(t => t && (t.ticketId === ticketId || t.id === ticketId));

    if (!targetTicket) {
      return NextResponse.json(
        { success: false, error: 'ትኬቱ አልተገኘም (Ticket not found)' },
        { status: 404, headers: NO_CACHE_HEADERS }
      );
    }

    if (action === 'cancel') {
      // Guard against double decrement
      if (targetTicket.status === 'cancelled') {
        return NextResponse.json(
          { success: false, error: 'ይህ ትኬት አስቀድሞ ተሰርዟል (Already cancelled)' },
          { status: 400, headers: NO_CACHE_HEADERS }
        );
      }

      const nowIso = new Date().toISOString();
      let updatedTicket: any = null;

      const updatedTickets = tickets.map(t => {
        if (t && (t.ticketId === ticketId || t.id === ticketId)) {
          updatedTicket = {
            ...t,
            status: 'cancelled',
            cancelledAt: nowIso,
            cancelledBy: auth.email || 'Admin',
            isUsed: false
          };
          return updatedTicket;
        }
        return t;
      });

      await saveTickets(updatedTickets);

      // Atomic seat release with Floor Guard on target event
      const eventId = targetTicket.eventId;
      let updatedEventData: any = null;

      if (eventId) {
        // 1. Update PostgreSQL events table
        try {
          const { data: dbEvent } = await supabaseAdmin
            .from('events')
            .select('id, slug, registered_count, capacity')
            .or(`id.eq.${eventId},slug.eq.${eventId}`)
            .maybeSingle();

          if (dbEvent) {
            const newReg = Math.max(0, (Number(dbEvent.registered_count) || 1) - 1);
            await supabaseAdmin
              .from('events')
              .update({
                registered_count: newReg,
                updated_at: nowIso
              })
              .eq('id', dbEvent.id);
          }
        } catch (sbErr) {
          console.warn('Postgres events seat release warning:', sbErr);
        }

        // 2. Update site_settings 'events' array
        try {
          const { data: settingsRow } = await supabaseAdmin
            .from('site_settings')
            .select('data')
            .eq('key', 'events')
            .maybeSingle();

          if (settingsRow?.data && Array.isArray(settingsRow.data)) {
            const updatedEvents = settingsRow.data.map((ev: any) => {
              if (ev && (ev.id === eventId || (targetTicket.eventSlug && ev.slug === targetTicket.eventSlug) || ev.slug === eventId)) {
                const cap = Number(ev.capacity) || 100;
                const newReg = Math.max(0, (Number(ev.registered_count ?? ev.registeredCount) || 1) - 1);
                const rem = Math.max(0, cap - newReg);
                updatedEventData = {
                  ...ev,
                  registeredCount: newReg,
                  registered_count: newReg,
                  remainingSeats: rem,
                  seatsLeft: rem,
                  availableTickets: rem,
                  updatedAt: nowIso
                };
                return updatedEventData;
              }
              return ev;
            });

            await supabaseAdmin
              .from('site_settings')
              .upsert({
                key: 'events',
                data: updatedEvents,
                updated_at: nowIso
              });
          }
        } catch (setErr) {
          console.warn('site_settings events update warning:', setErr);
        }

        invalidateEventsCache();
      }

      return NextResponse.json(
        {
          success: true,
          message: 'የተሳታፊው ምዝገባ በተሳካ ሁኔታ ተሰርዟል፤ 1 መቀመጫ ክፍት ሆኗል! (Registration cancelled and seat released)',
          ticket: updatedTicket,
          event: updatedEventData
        },
        { headers: NO_CACHE_HEADERS }
      );
    }

    return NextResponse.json(
      { success: false, error: 'ትክክለኛ ያልሆነ ትዕዛዝ (Invalid action)' },
      { status: 400, headers: NO_CACHE_HEADERS }
    );
  } catch (err: any) {
    console.error('Error in PATCH /api/events/tickets:', err);
    return NextResponse.json(
      { success: false, error: err.message || 'Failed to update ticket' },
      { status: 500, headers: NO_CACHE_HEADERS }
    );
  }
}

