import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase/server';
import { EventTicket } from '@/lib/eventCache';

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
      }, { headers: NO_CACHE_HEADERS });
    }

    const tickets = await getTickets();
    const ticketIndex = tickets.findIndex(t => t.ticketId.toUpperCase() === targetTicketId);

    if (ticketIndex === -1) {
      return NextResponse.json({
        success: false,
        status: 'not_found',
        ticketId: targetTicketId,
        message: 'ይቅርታ፣ ይህ ቲኬት አልተገኘም (Invalid Ticket).'
      }, { headers: NO_CACHE_HEADERS });
    }

    const ticketData = tickets[ticketIndex];
    const action = body.action || 'check_in';
    const isReset = action === 'reset';

    if (ticketData.isUsed && !isReset && !body.action) {
      const usedTimeStr = ticketData.usedAt ? new Date(ticketData.usedAt).toLocaleTimeString() : 'ቀደም ብሎ';
      return NextResponse.json({
        success: false,
        status: 'already_used',
        ticket: ticketData,
        message: `ይህ ቲኬት ከዚህ በፊት ጥቅም ላይ ውሏል (Ticket already used at ${usedTimeStr}).`
      }, { headers: NO_CACHE_HEADERS });
    }

    const usedTimestamp = isReset ? null : new Date().toISOString();
    const updatedTicket: EventTicket = {
      ...ticketData,
      isUsed: !isReset,
      usedAt: usedTimestamp
    };

    tickets[ticketIndex] = updatedTicket;
    await saveTickets(tickets);

    return NextResponse.json({
      success: true,
      status: isReset ? 'reset_success' : 'verified_success',
      ticket: updatedTicket,
      message: isReset 
        ? 'የቲኬት ሁኔታው ወደ ያልተጠቀመ ተመልሷል (Ticket reset to active).' 
        : 'ተሳታፊው መገኘታቸው ተረጋግጧል (Attendee checked in / Access Granted).'
    }, { headers: NO_CACHE_HEADERS });

  } catch (error: any) {
    console.error('Error verifying ticket:', error);
    return NextResponse.json({
      success: false,
      status: 'network_error',
      message: 'የኔትወርክ ወይም የዳታቤዝ ግንኙነት ችግር አጋጥሟል (Network error).'
    }, { status: 500, headers: NO_CACHE_HEADERS });
  }
}
