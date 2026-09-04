import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';

export const dynamic = 'force-dynamic';

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

    // 2. Query Supabase event_registrations
    const { data: reg, error } = await supabase
      .from('event_registrations')
      .select('*')
      .or(`id.eq.${targetTicketId},ticket_id.eq.${targetTicketId}`)
      .maybeSingle();

    if (error || !reg) {
      return NextResponse.json({
        success: false,
        status: 'not_found',
        message: 'ይቅርታ፣ ይህ ቲኬት በሲስተሙ ውስጥ አልተገኘም (Ticket Not Found).'
      });
    }

    const ticketData = reg.raw_data || reg;

    // Check if already checked in
    if (reg.attended === true || ticketData.isUsed === true) {
      return NextResponse.json({
        success: false,
        status: 'already_used',
        message: '⚠️ ማስጠንቀቂያ፡ ይህ ቲኬት አስቀድሞ አገልግሎት ላይ ውሏል! (Already Used)',
        ticket: { ...ticketData, isUsed: true }
      });
    }

    // Mark as checked in
    await supabase
      .from('event_registrations')
      .update({
        attended: true,
        status: 'checked_in',
        raw_data: {
          ...ticketData,
          isUsed: true,
          usedAt: new Date().toISOString(),
          verifiedBy: adminEmail
        }
      })
      .or(`id.eq.${targetTicketId},ticket_id.eq.${targetTicketId}`);

    return NextResponse.json({
      success: true,
      status: 'valid',
      message: '✅ ትክክለኛ ቲኬት! ተማሪው መግባት ይችላል (Valid Ticket - Access Granted)',
      ticket: {
        ...ticketData,
        isUsed: true,
        attendeeName: reg.attendee_name,
        attendeeEmail: reg.attendee_email,
        eventTitle: reg.event_title
      }
    });

  } catch (error: any) {
    console.error('Ticket verification error:', error);
    return NextResponse.json({ success: false, status: 'error', error: error.message }, { status: 500 });
  }
}
