import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';
import { EventTicket, DEFAULT_EVENTS } from '@/lib/eventCache';
import { sendTicketEmail } from '@/lib/ticketEmailService';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');
    const eventId = searchParams.get('eventId');
    const ticketId = searchParams.get('ticketId');
    const email = searchParams.get('email');

    if (ticketId) {
      const { data: reg, error } = await supabase
        .from('event_registrations')
        .select('*')
        .or(`id.eq.${ticketId},ticket_id.eq.${ticketId}`)
        .maybeSingle();

      if (error || !reg) {
        return NextResponse.json({ success: false, error: 'Ticket not found' }, { status: 404 });
      }

      return NextResponse.json({ success: true, ticket: reg.raw_data || reg });
    }

    let query = supabase.from('event_registrations').select('*');

    if (userId) {
      query = query.eq('user_id', userId);
    }
    if (eventId) {
      query = query.or(`event_id.eq.${eventId},event_slug.eq.${eventId}`);
    }
    if (email) {
      query = query.eq('attendee_email', email.trim().toLowerCase());
    }

    const { data: list, error } = await query.order('created_at', { ascending: false });
    if (error) {
      return NextResponse.json({ success: true, tickets: [] });
    }

    const tickets = (list || []).map(r => r.raw_data || r);
    return NextResponse.json({ success: true, count: tickets.length, tickets });
  } catch (error: any) {
    console.error('Error fetching tickets:', error);
    return NextResponse.json({ success: true, tickets: [], error: error.message });
  }
}

export async function POST(req: NextRequest) {
  try {
    let body: any = {};
    try {
      body = await req.json();
    } catch (e) {
      body = {};
    }

    const {
      eventId = 'evt_general',
      eventSlug = '',
      eventTitle = 'Tsehay Campus Live Event',
      eventDate = new Date().toLocaleDateString(),
      eventTime = '02:00 PM',
      eventLocation = 'Bole, Addis Ababa',
      isOnline = false,
      meetingLink = '',
      mapsUrl = '',
      attendeeName = 'የተከበሩ ተማሪ',
      attendeeEmail = '',
      attendeePhone = '',
      userId = `anon_${Date.now()}`,
      pricePaid = 0,
      paymentMethod = 'free',
      tier = 'General Admission'
    } = body;

    const normalizedEmail = (attendeeEmail || '').toString().trim().toLowerCase();

    if (!normalizedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      return NextResponse.json({ success: false, error: 'Missing or invalid attendee email' }, { status: 400 });
    }

    // Check duplicate
    const { data: existing } = await supabase
      .from('event_registrations')
      .select('*')
      .or(`event_id.eq.${eventId},event_slug.eq.${eventSlug}`)
      .eq('attendee_email', normalizedEmail)
      .maybeSingle();

    if (existing) {
      const existingData = existing.raw_data || existing;
      return NextResponse.json({
        success: false,
        alreadyRegistered: true,
        ticketId: existing.id || existing.ticket_id,
        ticket: existingData,
        error: 'ለዚህ ዝግጅት አስቀድመው ትኬት ቆርጠዋል! (You have already registered for this event)'
      }, { status: 400 });
    }

    // Generate unique Ticket ID
    const randomHex = Math.random().toString(36).substring(2, 6).toUpperCase();
    const timeHex = Date.now().toString(36).substring(4).toUpperCase();
    const ticketId = `TC-EVT-${timeHex}-${randomHex}`;

    // Secure payload embedded in QR Code
    const qrPayload = JSON.stringify({
      ticketId,
      tId: ticketId,
      eventId,
      eId: eventId,
      slug: eventSlug,
      name: attendeeName,
      email: normalizedEmail,
      tier: tier,
      isOnline,
      v: '2.0',
      timestamp: Date.now()
    });

    const newTicket: EventTicket = {
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
      attendeeEmail: normalizedEmail,
      attendeePhone,
      userId,
      tier: tier as any,
      pricePaid: Number(pricePaid) || 0,
      paymentMethod,
      qrCodeData: qrPayload,
      isUsed: false,
      usedAt: null,
      issuedAt: new Date().toISOString()
    };

    // Save to Supabase event_registrations
    await supabase.from('event_registrations').insert({
      id: ticketId,
      ticket_id: ticketId,
      event_id: eventId,
      event_slug: eventSlug,
      event_title: eventTitle,
      user_id: userId,
      attendee_name: attendeeName,
      attendee_email: normalizedEmail,
      attendee_phone: attendeePhone,
      ticket_type: isOnline ? 'online' : 'in_person',
      status: 'registered',
      attended: false,
      qr_code_data: qrPayload,
      raw_data: newTicket,
      created_at: new Date().toISOString()
    });

    // Update registered_count on events
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

    // Send ticket email
    try {
      await sendTicketEmail(newTicket);
    } catch (emailErr) {}

    return NextResponse.json({
      success: true,
      ticketId,
      ticket: newTicket,
      message: 'Ticket generated successfully'
    });
  } catch (error: any) {
    console.error('Error generating ticket:', error);
    return NextResponse.json({ success: false, error: error.message || 'Failed to generate ticket' }, { status: 500 });
  }
}
