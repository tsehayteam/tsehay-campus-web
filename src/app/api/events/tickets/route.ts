import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { EventTicket, DEFAULT_EVENTS } from '@/lib/eventCache';
import { sendTicketEmail } from '@/lib/ticketEmailService';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');
    const eventId = searchParams.get('eventId');
    const ticketId = searchParams.get('ticketId');
    const email = searchParams.get('email');

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

      const regSnap = await adminDb.collection('event_registrations').doc(ticketId).get();
      if (regSnap.exists) {
        return NextResponse.json({ success: true, ticket: regSnap.data() });
      }

      return NextResponse.json({ success: false, error: 'Ticket not found' }, { status: 404 });
    }

    let query: any = adminDb.collection('event_registrations');

    if (userId) {
      query = query.where('userId', '==', userId);
    }
    if (eventId) {
      query = query.where('eventId', '==', eventId);
    }
    if (email) {
      query = query.where('attendeeEmail', '==', email.trim().toLowerCase());
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

    // 🛡️ [CRITICAL FIX 2: ONE TICKET PER USER LIMIT]
    if (adminDb) {
      try {
        const snap = await adminDb.collection('event_registrations').get();
        const existing = snap.docs.find(d => {
          const data = d.data();
          const matchesEvent = data.eventId === eventId || (eventSlug && data.eventSlug === eventSlug);
          if (!matchesEvent) return false;
          const matchesEmail = data.attendeeEmail && data.attendeeEmail.toLowerCase() === normalizedEmail;
          const matchesUser = userId && !userId.startsWith('guest_') && !userId.startsWith('anon_') && data.userId === userId;
          return matchesEmail || matchesUser;
        });

        if (existing) {
          const existingData = existing.data();
          return NextResponse.json({
            success: false,
            alreadyRegistered: true,
            ticketId: existingData.ticketId || existing.id,
            ticket: existingData,
            error: 'ለዚህ ዝግጅት አስቀድመው ትኬት ቆርጠዋል! (You have already registered for this event)'
          }, { status: 400 });
        }
      } catch (checkErr) {
        console.warn('Duplicate registration check notice:', checkErr);
      }
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

    const registrationRecord = {
      ...newTicket,
      registeredAt: new Date().toISOString(),
      status: 'confirmed'
    };

    if (adminDb) {
      try {
        // 1. Save to global tickets & registrations collections
        await Promise.allSettled([
          adminDb.collection('artifacts').doc('tsehaycampus-e1a6d').collection('event_tickets').doc(ticketId).set(newTicket),
          adminDb.collection('artifacts').doc('tsehaycampus-e1a6d').collection('event_registrations').doc(ticketId).set(registrationRecord),
          adminDb.collection('event_registrations').doc(ticketId).set(registrationRecord)
        ]);

        // 2. 🌟 [CRITICAL FIX 1: ATOMIC SEAT DECREMENT & REGISTRATION INCREMENT]
        if (eventId && !eventId.startsWith('evt_fallback')) {
          try {
            const { FieldValue } = await import('firebase-admin/firestore');
            const inc = FieldValue.increment(1);
            const decSeat = FieldValue.increment(-1);

            const updatePayload = {
              registeredCount: inc,
              remainingSeats: decSeat,
              availableTickets: decSeat,
              seatsLeft: decSeat,
              updatedAt: new Date().toISOString()
            };

            const promises: Promise<any>[] = [
              adminDb.collection('events').doc(eventId).set(updatePayload, { merge: true }),
              adminDb.collection('artifacts').doc('tsehaycampus-e1a6d').collection('public').doc('data').collection('events').doc(eventId).set(updatePayload, { merge: true }),
              adminDb.collection('artifacts').doc('tsehaycampus-e1a6d').collection('events').doc(eventId).set(updatePayload, { merge: true })
            ];

            if (eventSlug && eventSlug !== eventId) {
              promises.push(
                adminDb.collection('events').doc(eventSlug).set(updatePayload, { merge: true }),
                adminDb.collection('artifacts').doc('tsehaycampus-e1a6d').collection('public').doc('data').collection('events').doc(eventSlug).set(updatePayload, { merge: true }),
                adminDb.collection('artifacts').doc('tsehaycampus-e1a6d').collection('events').doc(eventSlug).set(updatePayload, { merge: true })
              );
            }

            await Promise.allSettled(promises);
          } catch (cntErr) {
            console.warn('Error updating event registeredCount:', cntErr);
          }
        }

        // 3. 🔔 [CRITICAL FIX 3: REAL-TIME ADMIN NOTIFICATION]
        try {
          const notifId = `notif_ticket_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
          const notifData = {
            id: notifId,
            type: 'event_registration',
            title: '🎟️ አዲስ የኢቨንት ትኬት ተመዝግቧል!',
            message: `${attendeeName} (${normalizedEmail}) ለ "${eventTitle}" ትኬት ቆርጠዋል [${tier}]።`,
            eventId,
            eventTitle,
            ticketId,
            attendeeName,
            attendeeEmail: normalizedEmail,
            tier,
            pricePaid,
            createdAt: new Date().toISOString(),
            isRead: false,
          };

          await Promise.allSettled([
            adminDb.collection('admin_notifications').doc(notifId).set(notifData),
            adminDb.collection('artifacts').doc('tsehaycampus-e1a6d').collection('admin_notifications').doc(notifId).set(notifData)
          ]);
        } catch (notifErr) {}

        // 4. User sub-collection
        if (userId && !userId.startsWith('anon_') && !userId.startsWith('guest_')) {
          await adminDb
            .collection('artifacts')
            .doc('tsehaycampus-e1a6d')
            .collection('users')
            .doc(userId)
            .collection('event_tickets')
            .doc(ticketId)
            .set(newTicket)
            .catch(() => {});
        }
      } catch (dbErr) {
        console.warn('Firestore tickets write notice:', dbErr);
      }
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
