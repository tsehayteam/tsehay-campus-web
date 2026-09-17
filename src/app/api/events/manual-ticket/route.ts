import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase/server';
import { EventTicket, DEFAULT_EVENTS } from '@/lib/eventCache';
import { verifyAdminRequest } from '@/lib/adminAuthHelper';
import { sendTicketEmail } from '@/lib/ticketEmailService';

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
    const { data: row, error } = await supabaseServer
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
    await supabaseServer
      .from('site_settings')
      .upsert({
        key: 'event_tickets',
        data: tickets,
        updated_at: new Date().toISOString()
      });
  } catch (e) {
    console.warn('saveTickets site_settings notice:', e);
  }
}

async function getAllEvents(): Promise<any[]> {
  try {
    const { data: dbEvents, error } = await supabaseServer
      .from('events')
      .select('*')
      .order('created_at', { ascending: false });
    if (!error && Array.isArray(dbEvents) && dbEvents.length > 0) {
      return dbEvents.map(e => ({
        ...e,
        capacity: Number(e.capacity) || 100,
        registeredCount: Number(e.registered_count ?? e.registeredCount) || 0
      }));
    }
  } catch (e) {}

  try {
    const { data: row, error } = await supabaseServer
      .from('site_settings')
      .select('data')
      .eq('key', 'events')
      .maybeSingle();
    if (!error && Array.isArray(row?.data) && row.data.length > 0) {
      return row.data.map((e: any) => ({
        ...e,
        capacity: Number(e.capacity) || 100,
        registeredCount: Number(e.registered_count ?? e.registeredCount) || 0
      }));
    }
  } catch (e) {}

  return DEFAULT_EVENTS.map(e => ({
    ...e,
    capacity: Number(e.capacity) || 100,
    registeredCount: Number(e.registeredCount) || 0
  }));
}

export async function POST(req: NextRequest) {
  // 1. Strict Admin Authorization Check
  const auth = await verifyAdminRequest(req);
  if (!auth.authorized) {
    return NextResponse.json(
      { success: false, error: auth.error || 'Unauthorized - Admin privileges required' },
      { status: 401, headers: NO_CACHE_HEADERS }
    );
  }

  try {
    const body = await req.json().catch(() => ({}));
    const eventId = (body.eventId || body.eventSlug || '').toString().trim();
    const primaryName = (body.attendeeName || body.name || 'እንግዳ ተሳታፊ (VIP Guest)').toString().trim();
    const attendeeEmail = (body.attendeeEmail || body.email || '').toString().trim().toLowerCase();
    const attendeePhone = (body.attendeePhone || body.phone || '').toString().trim();
    const rawQuantity = Number(body.quantity || 1);
    const quantity = Math.max(1, Math.min(500, Math.floor(rawQuantity)));
    const tier = (body.tier || 'VIP Pass (Admin Override)').toString().trim();
    const note = (body.note || 'Admin Manual Override / Complimentary Pass').toString().trim();
    const sendEmail = Boolean(body.sendEmail && attendeeEmail);

    if (!eventId) {
      return NextResponse.json(
        { success: false, error: 'እባክዎ ክስተቱን ይምረጡ (Event selection is required)' },
        { status: 400, headers: NO_CACHE_HEADERS }
      );
    }

    // 2. Fetch Live Event & Validate
    const allEvents = await getAllEvents();
    const matchedEvent = allEvents.find(e => 
      (e.id && e.id.toLowerCase() === eventId.toLowerCase()) || 
      (e.slug && e.slug.toLowerCase() === eventId.toLowerCase())
    ) || DEFAULT_EVENTS.find(e => 
      e.id.toLowerCase() === eventId.toLowerCase() || 
      (e.slug && e.slug.toLowerCase() === eventId.toLowerCase())
    );

    if (!matchedEvent) {
      return NextResponse.json(
        { success: false, error: 'የተመረጠው ክስተት አልተገኘም (Event not found)' },
        { status: 404, headers: NO_CACHE_HEADERS }
      );
    }

    const eventTitle = matchedEvent.title || 'Tsehay Campus Event';
    const eventDate = matchedEvent.date || new Date().toLocaleDateString();
    const eventTime = matchedEvent.time || '02:00 PM';
    const isOnline = Boolean(matchedEvent.isOnline);
    const eventLocation = matchedEvent.location || (isOnline ? 'Online Google Meet' : 'Addis Ababa, Ethiopia');
    const meetingLink = matchedEvent.meetingLink || '';
    const mapsUrl = matchedEvent.mapsUrl || '';
    const eventImage = matchedEvent.image || matchedEvent.eventImage || '';
    const eventSlug = matchedEvent.slug || matchedEvent.id;

    const capacity = Number(matchedEvent.capacity) || 100;
    const currentRegistered = Number(matchedEvent.registered_count ?? matchedEvent.registeredCount) || 0;
    const remainingSeatsBefore = Math.max(0, capacity - currentRegistered);

    // 3. Generate N Confirmed Tickets
    const existingTickets = await getTickets();
    const generatedTickets: EventTicket[] = [];

    for (let i = 1; i <= quantity; i++) {
      const timePart = Date.now().toString(36).substring(3).toUpperCase();
      const randPart = Math.random().toString(36).substring(2, 6).toUpperCase();
      const ticketId = `TC-EVT-MAN-${timePart}-${randPart}${quantity > 1 ? `-${i}` : ''}`;
      
      const displayName = quantity > 1 
        ? `${primaryName} #${i}`
        : primaryName;

      const qrPayload = JSON.stringify({
        ticketId,
        eventId: matchedEvent.id,
        slug: eventSlug,
        name: displayName,
        email: attendeeEmail || 'admin_override@tsehaycampus.com',
        phone: attendeePhone,
        tier,
        status: 'confirmed',
        paymentStatus: 'admin_override',
        isOnline,
        v: '2.0',
        issuedBy: auth.email || 'Admin',
        timestamp: Date.now()
      });

      const ticket: EventTicket = {
        ticketId,
        id: ticketId,
        eventId: matchedEvent.id,
        eventSlug,
        eventTitle,
        eventImage,
        image: eventImage,
        eventDate,
        eventTime,
        eventLocation,
        isOnline,
        meetingLink,
        mapsUrl,
        attendeeName: displayName,
        attendeeEmail: attendeeEmail || `manual_${Date.now()}_${i}@tsehaycampus.com`,
        attendeePhone,
        userId: 'admin_manual_override',
        tier,
        pricePaid: 0,
        price: 0,
        paymentMethod: 'admin_manual',
        paymentStatus: 'admin_override',
        status: 'confirmed',
        qrCodeData: qrPayload,
        isUsed: false,
        checkedIn: false,
        usedAt: null,
        issuedAt: new Date().toISOString(),
        note,
        adminIssuedBy: auth.email || 'Admin'
      };

      generatedTickets.push(ticket);
    }

    // 4. Save New Tickets to site_settings (event_tickets)
    const updatedTickets = [...generatedTickets, ...existingTickets];
    await saveTickets(updatedTickets);

    // 5. Atomic Capacity Sync on Database (Increment registered_count by quantity)
    const newRegisteredCount = currentRegistered + quantity;
    const newRemainingSeats = Math.max(0, capacity - newRegisteredCount);

    try {
      if (matchedEvent.id) {
        await supabaseServer
          .from('events')
          .update({
            registered_count: newRegisteredCount,
            updated_at: new Date().toISOString()
          })
          .eq('id', matchedEvent.id);
      }
    } catch (dbErr) {
      console.warn('Supabase events table manual capacity update warning:', dbErr);
    }

    try {
      const updatedEventsList = allEvents.map((ev: any) => {
        if (ev.id === matchedEvent.id || (eventSlug && ev.slug === eventSlug)) {
          return {
            ...ev,
            registeredCount: newRegisteredCount,
            registered_count: newRegisteredCount,
            remainingSeats: newRemainingSeats
          };
        }
        return ev;
      });

      await supabaseServer
        .from('site_settings')
        .upsert({
          key: 'events',
          data: updatedEventsList,
          updated_at: new Date().toISOString()
        });
    } catch (setErr) {
      console.warn('site_settings events mirror update notice:', setErr);
    }

    // 6. Optional Email Dispatch
    let emailsDispatched = 0;
    if (sendEmail && attendeeEmail) {
      for (const t of generatedTickets) {
        try {
          const sent = await sendTicketEmail(t);
          if (sent?.success) emailsDispatched++;
        } catch (emErr) {
          console.warn('Manual ticket email send error:', emErr);
        }
      }
    }

    return NextResponse.json({
      success: true,
      count: generatedTickets.length,
      tickets: generatedTickets,
      event: {
        id: matchedEvent.id,
        slug: eventSlug,
        title: eventTitle,
        capacity,
        registeredCount: newRegisteredCount,
        remainingSeats: newRemainingSeats,
        seatsLeft: newRemainingSeats
      },
      emailsDispatched,
      message: `${generatedTickets.length} ማንዋል ቲኬት(ቶች) በተሳካ ሁኔታ ተመዝግበዋል! የመያዝ አቅሙም በራስ-ሰር ተስተካክሏል።`
    }, { headers: NO_CACHE_HEADERS });
  } catch (error: any) {
    console.error('Error in /api/events/manual-ticket:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'ማንዋል ቲኬት መመዝገብ አልተቻለም። እባክዎ እንደገና ይሞክሩ።' },
      { status: 500, headers: NO_CACHE_HEADERS }
    );
  }
}
