import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { EventTicket, DEFAULT_EVENTS } from '@/lib/eventCache';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');
    const eventId = searchParams.get('eventId');
    const ticketId = searchParams.get('ticketId');

    if (!adminDb) {
      return NextResponse.json({ success: true, tickets: [] });
    }

    if (ticketId) {
      const snap = await adminDb
        .collection('artifacts')
        .doc('tsehaycampus-e1a6d')
        .collection('event_tickets')
        .doc(ticketId)
        .get();

      if (snap.exists) {
        return NextResponse.json({ success: true, ticket: snap.data() });
      }
      return NextResponse.json({ success: false, error: 'Ticket not found' }, { status: 404 });
    }

    let query: any = adminDb.collection('artifacts').doc('tsehaycampus-e1a6d').collection('event_tickets');

    if (userId) {
      query = query.where('userId', '==', userId);
    }
    if (eventId) {
      query = query.where('eventId', '==', eventId);
    }

    const snapshot = await query.get();
    const tickets = snapshot.docs.map((doc: any) => ({ ...doc.data() }));

    return NextResponse.json({ success: true, count: tickets.length, tickets });
  } catch (error: any) {
    console.error('Error fetching tickets:', error);
    return NextResponse.json({ success: true, tickets: [], error: error.message });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      eventId,
      eventTitle,
      eventDate,
      eventTime,
      eventLocation,
      attendeeName,
      attendeeEmail,
      attendeePhone,
      userId,
      pricePaid,
      paymentMethod,
      tier = 'General Admission'
    } = body;

    if (!eventId || !attendeeName || !attendeeEmail) {
      return NextResponse.json({ error: 'Missing required ticket details' }, { status: 400 });
    }

    // Generate unique Apple Wallet style Ticket ID
    const randomHex = Math.random().toString(36).substring(2, 6).toUpperCase();
    const timeHex = Date.now().toString(36).substring(4).toUpperCase();
    const ticketId = `TC-EVT-${timeHex}-${randomHex}`;

    // Secure payload embedded in QR Code
    const qrPayload = JSON.stringify({
      tId: ticketId,
      eId: eventId,
      name: attendeeName,
      email: attendeeEmail,
      tier: tier,
      v: '1.0'
    });

    const newTicket: EventTicket = {
      ticketId,
      eventId,
      eventTitle: eventTitle || 'Tsehay Campus Live Event',
      eventDate: eventDate || new Date().toLocaleDateString(),
      eventTime: eventTime || '02:00 PM',
      eventLocation: eventLocation || 'Bole, Addis Ababa',
      attendeeName,
      attendeeEmail,
      attendeePhone: attendeePhone || '',
      userId: userId || `anon_${Date.now()}`,
      tier: tier as any,
      pricePaid: Number(pricePaid) || 0,
      paymentMethod: paymentMethod || 'free',
      qrCodeData: qrPayload,
      isUsed: false,
      usedAt: null,
      issuedAt: new Date().toISOString()
    };

    if (adminDb) {
      // 1. Save to global tickets collection
      await adminDb
        .collection('artifacts')
        .doc('tsehaycampus-e1a6d')
        .collection('event_tickets')
        .doc(ticketId)
        .set(newTicket);

      // 2. Save to user's ticket sub-collection
      if (userId) {
        try {
          await adminDb
            .collection('artifacts')
            .doc('tsehaycampus-e1a6d')
            .collection('users')
            .doc(userId)
            .collection('event_tickets')
            .doc(ticketId)
            .set(newTicket);
        } catch (e) {}
      }

      // 3. Increment registeredCount on the event
      try {
        const { FieldValue } = await import('firebase-admin/firestore');
        const eventRef = adminDb
          .collection('artifacts')
          .doc('tsehaycampus-e1a6d')
          .collection('public')
          .doc('data')
          .collection('events')
          .doc(eventId);
        await eventRef.update({ registeredCount: FieldValue.increment(1) });
      } catch (e) {}
    }

    return NextResponse.json({
      success: true,
      ticket: newTicket,
      message: 'ትኬቱ በተሳካ ሁኔታ ተዘጋጅቷል (Ticket generated successfully)'
    });
  } catch (error: any) {
    console.error('Error generating ticket:', error);
    return NextResponse.json({ error: error.message || 'Ticket creation failed' }, { status: 500 });
  }
}
