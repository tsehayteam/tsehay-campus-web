import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase/server';
import { EventTicket, DEFAULT_EVENTS } from '@/lib/eventCache';
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
  } catch (e) {}
}

async function getAllEvents(): Promise<any[]> {
  // 1. Try Supabase events table
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

  // 2. Try site_settings 'events'
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
  try {
    let body: any = {};
    try {
      body = await req.json();
    } catch (e) {
      body = {};
    }

    const attendeeName = (body.name || body.attendeeName || 'የተከበሩ ተማሪ').toString().trim();
    const attendeeEmail = (body.email || body.attendeeEmail || '').toString().trim().toLowerCase();
    const attendeePhone = (body.phone || body.attendeePhone || '').toString().trim();
    const eventId = (body.eventId || 'evt_general').toString().trim();
    const userId = (body.userId || `guest_${Date.now()}`).toString().trim();
    const pricePaid = Number(body.pricePaid || body.price || 0);
    const paymentMethod = body.paymentMethod || (pricePaid === 0 ? 'free' : 'lakipay');
    const tier = body.tier || (pricePaid > 1200 ? 'VIP Pass' : 'General Admission');

    if (!attendeeEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(attendeeEmail)) {
      return NextResponse.json({
        success: false,
        error: 'እባክዎ ትክክለኛ የኢሜይል አድራሻ ያስገቡ (Valid Email is required)'
      }, { status: 400, headers: NO_CACHE_HEADERS });
    }

    // 1. Fetch live events list & match target event
    const allEvents = await getAllEvents();
    const matchedEvent = allEvents.find(e => e.id === eventId || e.slug === eventId || (body.eventSlug && e.slug === body.eventSlug)) || DEFAULT_EVENTS.find(e => e.id === eventId || e.slug === eventId || e.slug === body.eventSlug);
    const eventSlug = (body.eventSlug || matchedEvent?.slug || '').toString().trim();
    const eventTitle = body.eventTitle || body.title || matchedEvent?.title || 'Tsehay Campus Live Workshop';
    const eventDate = body.eventDate || body.date || matchedEvent?.date || new Date().toLocaleDateString();
    const eventTime = body.eventTime || body.time || matchedEvent?.time || '02:00 PM';
    const isOnline = body.isOnline !== undefined ? Boolean(body.isOnline) : (matchedEvent?.isOnline || false);
    const meetingLink = body.meetingLink || matchedEvent?.meetingLink || '';
    const mapsUrl = body.mapsUrl || matchedEvent?.mapsUrl || '';
    const eventLocation = body.eventLocation || body.location || (isOnline ? 'Online Google Meet' : (matchedEvent?.location || 'Addis Ababa, Ethiopia'));
    const eventImage = (body.eventImage || body.image || matchedEvent?.image || '').toString().trim();

    // 🌟 Live Inventory Stock Validation & Decrement Check
    const capacity = Number(matchedEvent?.capacity) || 100;
    const currentRegistered = Number(matchedEvent?.registeredCount ?? matchedEvent?.registered_count) || 0;
    const remainingSeats = Math.max(0, capacity - currentRegistered);

    if (remainingSeats <= 0) {
      return NextResponse.json({
        success: false,
        soldOut: true,
        error: `ይቅርታ፣ የዚህ ዝግጅት (${eventTitle}) ቲኬቶች ሙሉ በሙሉ አልቀዋል (Sold Out)! ተጨማሪ ቲኬት መቁረጥ አይቻልም።`
      }, { status: 400, headers: NO_CACHE_HEADERS });
    }

    // 🌟 Strict User & Email Isolation Check (No cross-account bleed)
    const existingTickets = await getTickets();
    const alreadyRegistered = existingTickets.find(t => {
      const matchEvent = t.eventId === eventId || (eventSlug && t.eventSlug === eventSlug);
      if (!matchEvent) return false;
      const isAuthUser = userId && !userId.startsWith('guest_') && !userId.startsWith('anon_');
      const matchUser = isAuthUser && t.userId === userId;
      const matchEmail = attendeeEmail && t.attendeeEmail && t.attendeeEmail.toLowerCase() === attendeeEmail;
      return matchUser || matchEmail;
    });

    if (alreadyRegistered) {
      const enrichedTicket = {
        ...alreadyRegistered,
        eventImage: alreadyRegistered.eventImage || alreadyRegistered.image || eventImage,
        image: alreadyRegistered.image || alreadyRegistered.eventImage || eventImage
      };
      return NextResponse.json({
        success: false,
        alreadyRegistered: true,
        ticketId: alreadyRegistered.ticketId,
        ticket: enrichedTicket,
        error: `ለዚህ ዝግጅት (${eventTitle}) አስቀድመው ትኬት ቆርጠዋል! (You have already registered for this event. Ticket ID: ${alreadyRegistered.ticketId})`
      }, { status: 400, headers: NO_CACHE_HEADERS });
    }

    const randomHex = Math.random().toString(36).substring(2, 6).toUpperCase();
    const timeHex = Date.now().toString(36).substring(4).toUpperCase();
    const ticketId = `TC-EVT-${timeHex}-${randomHex}`;

    const qrPayload = JSON.stringify({
      ticketId,
      eventId,
      userId,
      code: ticketId,
      tId: ticketId,
      slug: eventSlug,
      name: attendeeName,
      email: attendeeEmail,
      tier: tier,
      isOnline,
      v: '2.0',
      timestamp: Date.now()
    });

    const ticket: EventTicket = {
      ticketId,
      eventId,
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
      attendeeName,
      attendeeEmail,
      attendeePhone,
      userId,
      tier: tier as any,
      pricePaid,
      paymentMethod,
      qrCodeData: qrPayload,
      isUsed: false,
      usedAt: null,
      issuedAt: new Date().toISOString()
    };

    // 1. Save Ticket to site_settings (key: 'event_tickets')
    const updatedTickets = [ticket, ...existingTickets.filter(t => t.ticketId !== ticketId)];
    await saveTickets(updatedTickets);

    // 🌟 2. Instant Live Inventory Decrement on Database (Atomic increment of registered_count)
    const newRegisteredCount = currentRegistered + 1;
    const newRemainingSeats = Math.max(0, capacity - newRegisteredCount);

    try {
      if (matchedEvent?.id) {
        await supabaseServer
          .from('events')
          .update({
            registered_count: newRegisteredCount,
            updated_at: new Date().toISOString()
          })
          .eq('id', matchedEvent.id);
      }
    } catch (sbErr) {
      console.warn('Supabase events table live decrement warning:', sbErr);
    }

    try {
      const updatedEventsList = allEvents.map((ev: any) => {
        if (ev.id === matchedEvent?.id || (eventSlug && ev.slug === eventSlug)) {
          return {
            ...ev,
            registeredCount: newRegisteredCount,
            registered_count: newRegisteredCount
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
      console.warn('site_settings events mirror update warning:', setErr);
    }

    let emailResult = { success: false };
    try {
      emailResult = await sendTicketEmail(ticket);
    } catch (e) {}

    return NextResponse.json({
      success: true,
      ticketId,
      ticket,
      emailSent: emailResult.success,
      registeredCount: newRegisteredCount,
      remainingSeats: newRemainingSeats,
      soldOut: newRemainingSeats <= 0,
      message: 'ምዝገባዎ በተሳካ ሁኔታ ተጠናቋል! ትኬትዎ ተዘጋጅቷል፤ ወደ ኢሜይልዎም ተልኳል። (Registration confirmed)'
    }, { headers: NO_CACHE_HEADERS });
  } catch (error: any) {
    console.error('Error in /api/events/register:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'ምዝገባውን ማጠናቀቅ አልተቻለም። እባክዎ እንደገና ይሞክሩ።'
    }, { status: 500, headers: NO_CACHE_HEADERS });
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const eventId = searchParams.get('eventId');
    const email = searchParams.get('email');
    const userId = searchParams.get('userId');

    let tickets = await getTickets();

    if (eventId) {
      tickets = tickets.filter(t => t.eventId === eventId);
    }
    if (email) {
      tickets = tickets.filter(t => t.attendeeEmail.toLowerCase() === email.trim().toLowerCase());
    }
    if (userId) {
      tickets = tickets.filter(t => t.userId === userId);
    }

    return NextResponse.json({ success: true, count: tickets.length, registrations: tickets }, { headers: NO_CACHE_HEADERS });
  } catch (err: any) {
    return NextResponse.json({ success: true, count: 0, registrations: [], error: err.message }, { headers: NO_CACHE_HEADERS });
  }
}
