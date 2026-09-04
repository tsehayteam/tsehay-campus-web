import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';
import { EventTicket, DEFAULT_EVENTS } from '@/lib/eventCache';
import { sendTicketEmail } from '@/lib/ticketEmailService';

export const dynamic = 'force-dynamic';

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
      }, { status: 400 });
    }

    // Lookup event details from fallback cache or body
    const matchedEvent = DEFAULT_EVENTS.find(e => e.id === eventId || e.slug === eventId || e.slug === body.eventSlug);
    const eventSlug = (body.eventSlug || matchedEvent?.slug || '').toString().trim();
    const eventTitle = body.eventTitle || body.title || matchedEvent?.title || 'Tsehay Campus Live Workshop';
    const eventDate = body.eventDate || body.date || matchedEvent?.date || new Date().toLocaleDateString();
    const eventTime = body.eventTime || body.time || matchedEvent?.time || '02:00 PM';
    const isOnline = body.isOnline !== undefined ? Boolean(body.isOnline) : (matchedEvent?.isOnline || false);
    const meetingLink = body.meetingLink || matchedEvent?.meetingLink || '';
    const mapsUrl = body.mapsUrl || matchedEvent?.mapsUrl || '';
    const eventLocation = body.eventLocation || body.location || (isOnline ? 'Online Google Meet' : (matchedEvent?.location || 'Addis Ababa, Ethiopia'));

    // Check if already registered
    try {
      const { data: existingRegDoc } = await supabase
        .from('event_registrations')
        .select('*')
        .or(`event_id.eq.${eventId},event_slug.eq.${eventSlug}`)
        .eq('attendee_email', attendeeEmail)
        .maybeSingle();

      if (existingRegDoc) {
        const existingTicketData = existingRegDoc.raw_data || existingRegDoc;
        return NextResponse.json({
          success: true,
          isAlreadyRegistered: true,
          message: 'እርስዎ ቀደም ሲል ለዚህ ዝግጅት ቲኬት ወስደዋል! (You already have a valid ticket for this event)',
          ticket: existingTicketData
        });
      }
    } catch (checkErr) {
      console.warn("Supabase duplicate check notice:", checkErr);
    }

    // Generate unique Ticket ID
    const randomHex = Math.random().toString(36).substring(2, 6).toUpperCase();
    const timeHex = Date.now().toString(36).substring(4).toUpperCase();
    const ticketId = `TC-EVT-${timeHex}-${randomHex}`;

    const qrPayload = JSON.stringify({
      ticketId,
      tId: ticketId,
      eventId,
      eId: eventId,
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

    // Save to Supabase event_registrations
    try {
      await supabase.from('event_registrations').insert({
        id: ticketId,
        ticket_id: ticketId,
        event_id: eventId,
        event_slug: eventSlug,
        event_title: eventTitle,
        user_id: userId,
        attendee_name: attendeeName,
        attendee_email: attendeeEmail,
        attendee_phone: attendeePhone,
        ticket_type: isOnline ? 'online' : 'in_person',
        status: 'registered',
        attended: false,
        qr_code_data: qrPayload,
        raw_data: ticket,
        created_at: new Date().toISOString()
      });

      // Increment registered_count on events
      const { data: ev } = await supabase
        .from('events')
        .select('registered_count')
        .or(`id.eq.${eventId},slug.eq.${eventId}`)
        .maybeSingle();

      if (ev) {
        await supabase
          .from('events')
          .update({
            registered_count: (Number(ev.registered_count) || 0) + 1,
            updated_at: new Date().toISOString()
          })
          .or(`id.eq.${eventId},slug.eq.${eventId}`);
      }
    } catch (saveErr) {
      console.warn('Supabase event registration save warning:', saveErr);
    }

    // Send confirmation email with QR Ticket
    try {
      await sendTicketEmail(ticket);
    } catch (emailErr) {
      console.warn("Ticket email dispatch error:", emailErr);
    }

    return NextResponse.json({
      success: true,
      ticketId,
      ticket,
      message: 'የኢቨንት ትኬትዎ በተሳካ ሁኔታ ተዘጋጅቷል! (Event ticket generated successfully)'
    });

  } catch (error: any) {
    console.error('Error registering for event:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'ትኬት ማዘጋጀት አልተቻለም፤ እባክዎ እንደገና ይሞክሩ።'
    }, { status: 500 });
  }
}
