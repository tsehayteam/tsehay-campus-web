import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { EventTicket, DEFAULT_EVENTS } from '@/lib/eventCache';
import { sendTicketEmail } from '@/lib/ticketEmailService';

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

    // 🛡️ [CRITICAL FIX 2: ONE TICKET PER USER LIMIT]
    // Check if attendee (by Email or authenticated UID) has already registered for this specific event
    if (adminDb) {
      try {
        const checkQuery = adminDb.collection('event_registrations');
        const snap = await checkQuery.get();

        const existingRegDoc = snap.docs.find(d => {
          const data = d.data();
          const matchesEvent = 
            data.eventId === eventId || 
            (eventSlug && (data.eventSlug === eventSlug || data.eventId === eventSlug)) || 
            (data.eventId && data.eventId.toLowerCase() === eventId.toLowerCase()) ||
            (data.eventSlug && eventSlug && data.eventSlug.toLowerCase() === eventSlug.toLowerCase());

          if (!matchesEvent) return false;

          const matchesEmail = data.attendeeEmail && data.attendeeEmail.toString().trim().toLowerCase() === attendeeEmail;
          const matchesUser = userId && !userId.startsWith('guest_') && !userId.startsWith('anon_') && data.userId === userId;

          return matchesEmail || matchesUser;
        });

        if (existingRegDoc) {
          const existingData = existingRegDoc.data() as EventTicket;
          return NextResponse.json({
            success: false,
            alreadyRegistered: true,
            ticketId: existingData.ticketId || existingRegDoc.id,
            ticket: existingData,
            error: `ለዚህ ዝግጅት (${eventTitle}) አስቀድመው ትኬት ቆርጠዋል! (You have already registered for this event. Ticket ID: ${existingData.ticketId || existingRegDoc.id})`
          }, { status: 400 });
        }
      } catch (checkErr) {
        console.warn('Duplicate registration verification notice:', checkErr);
      }
    }

    // 🛡️ [CRITICAL FIX 1: CAPACITY & PERSISTENT REMAINING SEATS CHECK]
    if (adminDb && eventId && !eventId.startsWith('evt_fallback')) {
      try {
        let currentRemainingSeats: number | null = null;
        let currentCapacity = 100;
        let currentRegisteredCount = 0;

        // Check primary event doc
        const eventDocSnap = await adminDb.collection('artifacts').doc('tsehaycampus-e1a6d').collection('public').doc('data').collection('events').doc(eventId).get();
        if (eventDocSnap.exists) {
          const ev = eventDocSnap.data() || {};
          currentCapacity = Number(ev.capacity) || 100;
          currentRegisteredCount = Number(ev.registeredCount) || 0;
          if (ev.remainingSeats !== undefined && typeof ev.remainingSeats === 'number') {
            currentRemainingSeats = ev.remainingSeats;
          } else {
            currentRemainingSeats = Math.max(0, currentCapacity - currentRegisteredCount);
          }
        }

        // If remainingSeats is already 0, reject with Sold Out
        if (currentRemainingSeats !== null && currentRemainingSeats <= 0) {
          return NextResponse.json({
            success: false,
            soldOut: true,
            error: 'ይቅርታ፣ የዚህ ዝግጅት ትኬት ሙሉ በሙሉ አልቋል! (This event is Sold Out)'
          }, { status: 400 });
        }
      } catch (seatCheckErr) {
        console.warn('Seat availability check notice:', seatCheckErr);
      }
    }

    // Generate unique Ticket ID (e.g. TC-EVT-XXXX-YYYY)
    const randomHex = Math.random().toString(36).substring(2, 6).toUpperCase();
    const timeHex = Date.now().toString(36).substring(4).toUpperCase();
    const ticketId = `TC-EVT-${timeHex}-${randomHex}`;

    // Scannable QR Payload (Standardized Verification Schema)
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

    const registrationRecord = {
      ...ticket,
      registeredAt: new Date().toISOString(),
      status: 'confirmed'
    };

    // Save to Firestore if available
    if (adminDb) {
      try {
        // 1. Save to global event_registrations collections
        await Promise.allSettled([
          adminDb.collection('event_registrations').doc(ticketId).set(registrationRecord),
          adminDb.collection('artifacts').doc('tsehaycampus-e1a6d').collection('event_registrations').doc(ticketId).set(registrationRecord),
          adminDb.collection('artifacts').doc('tsehaycampus-e1a6d').collection('event_tickets').doc(ticketId).set(ticket)
        ]);

        // 2. User sub-collection
        if (userId && !userId.startsWith('guest_') && !userId.startsWith('anon_')) {
          await adminDb
            .collection('artifacts')
            .doc('tsehaycampus-e1a6d')
            .collection('users')
            .doc(userId)
            .collection('event_tickets')
            .doc(ticketId)
            .set(ticket)
            .catch(() => {});
        }

        // 3. 🌟 [CRITICAL FIX 1: ATOMIC SEAT DECREMENT & REGISTRATION INCREMENT]
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
          } catch (incErr) {
            console.warn('Event atomic seat decrement notice:', incErr);
          }
        }

        // 4. 🔔 [CRITICAL FIX 3: TRIGGER REAL-TIME ADMIN NOTIFICATION]
        try {
          const notifId = `notif_ticket_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
          const notifData = {
            id: notifId,
            type: 'event_registration',
            title: '🎟️ አዲስ የኢቨንት ትኬት ተመዝግቧል!',
            message: `${attendeeName} (${attendeeEmail}) ለ "${eventTitle}" ትኬት ቆርጠዋል [${tier} - ${pricePaid > 0 ? `${pricePaid.toLocaleString()} ETB` : 'ነፃ'}]።`,
            eventId,
            eventTitle,
            ticketId,
            attendeeName,
            attendeeEmail,
            tier,
            pricePaid,
            createdAt: new Date().toISOString(),
            isRead: false,
          };

          await Promise.allSettled([
            adminDb.collection('admin_notifications').doc(notifId).set(notifData),
            adminDb.collection('artifacts').doc('tsehaycampus-e1a6d').collection('notifications').doc(notifId).set(notifData),
            adminDb.collection('artifacts').doc('tsehaycampus-e1a6d').collection('admin_notifications').doc(notifId).set(notifData)
          ]);
        } catch (notifErr) {
          console.warn('Admin notification notice:', notifErr);
        }
      } catch (dbErr) {
        console.warn('Firestore event registration save notice:', dbErr);
      }
    }

    // 📧 Automatically trigger Ticket Email delivery to the student
    let emailResult = { success: false };
    try {
      emailResult = await sendTicketEmail(ticket);
    } catch (emailErr) {
      console.warn('Automated ticket email delivery notice:', emailErr);
    }

    return NextResponse.json({
      success: true,
      ticketId,
      ticket,
      emailSent: emailResult.success,
      message: 'ምዝገባዎ በተሳካ ሁኔታ ተጠናቋል! ትኬትዎ ተዘጋጅቷል፤ ወደ ኢሜይልዎም ተልኳል። (Registration confirmed)'
    });
  } catch (error: any) {
    console.error('Error in /api/events/register:', error);
    
    return NextResponse.json({
      success: false,
      error: error.message || 'ምዝገባውን ማጠናቀቅ አልተቻለም። እባክዎ እንደገና ይሞክሩ።'
    }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const eventId = searchParams.get('eventId');
    const email = searchParams.get('email');
    const userId = searchParams.get('userId');

    if (!adminDb) {
      return NextResponse.json({ success: true, count: 0, registrations: [] });
    }

    let query: any = adminDb.collection('event_registrations');
    if (eventId) {
      query = query.where('eventId', '==', eventId);
    }
    if (email) {
      query = query.where('attendeeEmail', '==', email.trim().toLowerCase());
    }
    if (userId) {
      query = query.where('userId', '==', userId);
    }

    const snapshot = await query.get();
    const registrations = snapshot.docs.map((doc: any) => ({ id: doc.id, ...doc.data() }));

    return NextResponse.json({ success: true, count: registrations.length, registrations });
  } catch (err: any) {
    return NextResponse.json({ success: true, count: 0, registrations: [], error: err.message });
  }
}
