import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';

export async function POST(req: NextRequest) {
  try {
    let body: any = {};
    try {
      body = await req.json();
    } catch (e) {
      body = {};
    }

    const { qrData, ticketId: rawTicketId, adminEmail = 'Admin Scanner' } = body;

    let targetTicketId = (rawTicketId || '').trim();

    // 1. Extract Ticket ID from JSON QR payload if present
    if (qrData && typeof qrData === 'string') {
      const trimmed = qrData.trim();
      try {
        const parsed = JSON.parse(trimmed);
        if (parsed.tId) targetTicketId = parsed.tId;
        else if (parsed.ticketId) targetTicketId = parsed.ticketId;
      } catch (e) {
        // Not JSON - check if string contains ticket pattern
        const match = trimmed.match(/TC-EVT-[A-Z0-9]+-[A-Z0-9]+/i) || trimmed.match(/TKT-[A-Z0-9-]+/i);
        if (match) {
          targetTicketId = match[0].toUpperCase();
        } else if (!targetTicketId) {
          targetTicketId = trimmed;
        }
      }
    }

    targetTicketId = (targetTicketId || '').trim().toUpperCase();

    if (!targetTicketId) {
      return NextResponse.json({
        success: false,
        status: 'not_found',
        message: 'ይቅርታ፣ ይህ ቲኬት አልተገኘም (Invalid Ticket).'
      });
    }

    if (!adminDb) {
      return NextResponse.json({
        success: false,
        status: 'network_error',
        error: 'Database connection offline'
      }, { status: 500 });
    }

    // 2. Multi-Collection Deep Query Search
    let matchedDocRef: any = null;
    let ticketData: any = null;

    const candidateDocRefs = [
      adminDb.collection('event_registrations').doc(targetTicketId),
      adminDb.collection('artifacts').doc('tsehaycampus-e1a6d').collection('event_tickets').doc(targetTicketId),
      adminDb.collection('artifacts').doc('tsehaycampus-e1a6d').collection('event_registrations').doc(targetTicketId),
      adminDb.collection('event_tickets').doc(targetTicketId),
      adminDb.collection('tickets').doc(targetTicketId)
    ];

    // Try direct document ID lookup
    for (const docRef of candidateDocRefs) {
      try {
        const snap = await docRef.get();
        if (snap.exists) {
          matchedDocRef = docRef;
          ticketData = { id: snap.id, ...snap.data() };
          break;
        }
      } catch (e) {}
    }

    // If not found by doc id, query by ticketId field
    if (!ticketData) {
      const candidateCollections = [
        adminDb.collection('event_registrations'),
        adminDb.collection('artifacts').doc('tsehaycampus-e1a6d').collection('event_tickets'),
        adminDb.collection('artifacts').doc('tsehaycampus-e1a6d').collection('event_registrations'),
        adminDb.collection('event_tickets'),
        adminDb.collection('tickets')
      ];

      for (const col of candidateCollections) {
        try {
          const qSnap = await col.where('ticketId', '==', targetTicketId).limit(1).get();
          if (!qSnap.empty) {
            const docSnap = qSnap.docs[0];
            matchedDocRef = docSnap.ref;
            ticketData = { id: docSnap.id, ...docSnap.data() };
            break;
          }
        } catch (e) {}
      }
    }

    // State 1: NOT FOUND
    if (!ticketData) {
      return NextResponse.json({
        success: false,
        status: 'not_found',
        ticketId: targetTicketId,
        message: 'ይቅርታ፣ ይህ ቲኬት አልተገኘም (Invalid Ticket).'
      });
    }

    const action = body.action || 'check_in';
    const isReset = action === 'reset';

    // State 2: ALREADY USED (Only if scanning to check-in and not explicit reset)
    if (ticketData.isUsed && !isReset && !body.action) {
      const usedTimeStr = ticketData.usedAt ? new Date(ticketData.usedAt).toLocaleTimeString() : 'ቀደም ብሎ';
      return NextResponse.json({
        success: false,
        status: 'already_used',
        ticket: ticketData,
        message: `ይህ ቲኬት ከዚህ በፊት ጥቅም ላይ ውሏል (Ticket already used at ${usedTimeStr}).`
      });
    }

    // State 3: SUCCESS (VALID / CHECKED IN or RESET)
    const usedTimestamp = isReset ? null : new Date().toISOString();
    const updatePayload = {
      isUsed: !isReset,
      checkedIn: !isReset,
      usedAt: usedTimestamp,
      verifiedBy: isReset ? null : adminEmail,
      status: isReset ? 'confirmed' : 'checked_in'
    };

    if (matchedDocRef) {
      try {
        await matchedDocRef.update(updatePayload);
      } catch (updErr) {
        try {
          await matchedDocRef.set(updatePayload, { merge: true });
        } catch (e) {}
      }
    }

    // Also update mirroring collections to keep state fully in sync
    try {
      await adminDb.collection('event_registrations').doc(targetTicketId).set(updatePayload, { merge: true });
      await adminDb.collection('artifacts').doc('tsehaycampus-e1a6d').collection('event_tickets').doc(targetTicketId).set(updatePayload, { merge: true });
    } catch (e) {}

    const updatedTicket = {
      ...ticketData,
      ...updatePayload
    };

    return NextResponse.json({
      success: true,
      status: isReset ? 'reset_success' : 'verified_success',
      ticket: updatedTicket,
      message: isReset 
        ? 'የቲኬት ሁኔታው ወደ ያልተጠቀመ ተመልሷል (Ticket reset to active).' 
        : 'ተሳታፊው መገኘታቸው ተረጋግጧል (Attendee checked in / Access Granted).'
    });

  } catch (error: any) {
    console.error('Error verifying ticket:', error);
    return NextResponse.json({
      success: false,
      status: 'network_error',
      message: 'የኔትወርክ ወይም የዳታቤዝ ግንኙነት ችግር አጋጥሟል (Network error).'
    }, { status: 500 });
  }
}
