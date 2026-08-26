import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { qrData, ticketId: rawTicketId, adminEmail } = body;

    let targetTicketId = rawTicketId;

    // Parse if raw QR data was passed
    if (qrData && typeof qrData === 'string') {
      try {
        const parsed = JSON.parse(qrData);
        if (parsed.tId) targetTicketId = parsed.tId;
        else if (parsed.ticketId) targetTicketId = parsed.ticketId;
      } catch (e) {
        // Assume direct string is ticket ID
        if (qrData.startsWith('TC-EVT-')) {
          targetTicketId = qrData.trim();
        }
      }
    }

    if (!targetTicketId) {
      return NextResponse.json({
        success: false,
        status: 'invalid',
        error: 'ትክክለኛ የትኬት መለያ ቁጥር አልተገኘም (Invalid Ticket Format)'
      }, { status: 400 });
    }

    if (!adminDb) {
      return NextResponse.json({
        success: false,
        error: 'Database offline'
      }, { status: 500 });
    }

    const ticketRef = adminDb
      .collection('artifacts')
      .doc('tsehaycampus-e1a6d')
      .collection('event_tickets')
      .doc(targetTicketId);

    const snap = await ticketRef.get();

    if (!snap.exists) {
      return NextResponse.json({
        success: false,
        status: 'not_found',
        ticketId: targetTicketId,
        error: 'ትኬቱ በዳታቤዝ ውስጥ አልተገኘም! የውሸት ወይም ያልተመዘገበ ትኬት ነው። (Ticket Not Found)'
      }, { status: 404 });
    }

    const ticketData = snap.data() as any;

    // Check if already used
    if (ticketData.isUsed) {
      return NextResponse.json({
        success: false,
        status: 'already_used',
        ticket: ticketData,
        message: `ይህ ትኬት ከዚህ ቀደም አገልግሎት ላይ ውሏል! (Ticket Already Used on ${ticketData.usedAt || 'earlier'})`
      });
    }

    // Mark as USED
    const usedTimestamp = new Date().toISOString();
    await ticketRef.update({
      isUsed: true,
      usedAt: usedTimestamp,
      verifiedBy: adminEmail || 'Admin Scanner'
    });

    const updatedTicket = {
      ...ticketData,
      isUsed: true,
      usedAt: usedTimestamp
    };

    return NextResponse.json({
      success: true,
      status: 'verified_success',
      ticket: updatedTicket,
      message: '✅ ትኬቱ በትክክል ተረጋግጧል! ወደ አዳራሽ መግባት ይችላሉ። (Access Granted)'
    });
  } catch (error: any) {
    console.error('Error verifying ticket:', error);
    return NextResponse.json({
      success: false,
      status: 'error',
      error: error.message || 'Verification failed'
    }, { status: 500 });
  }
}
