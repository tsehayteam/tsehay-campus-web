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

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');
    const eventId = searchParams.get('eventId');
    const ticketId = searchParams.get('ticketId');
    const email = searchParams.get('email');

    let tickets = await getTickets();

    if (ticketId) {
      const match = tickets.find(t => t.ticketId === ticketId);
      if (match) {
        return NextResponse.json({ success: true, ticket: match }, { headers: NO_CACHE_HEADERS });
      }
      return NextResponse.json({ success: false, error: 'Ticket not found' }, { status: 404, headers: NO_CACHE_HEADERS });
    }

    if (userId) {
      tickets = tickets.filter(t => t.userId === userId);
    }
    if (eventId) {
      tickets = tickets.filter(t => t.eventId === eventId);
    }
    if (email) {
      tickets = tickets.filter(t => t.attendeeEmail.toLowerCase() === email.trim().toLowerCase());
    }

    return NextResponse.json({ success: true, count: tickets.length, tickets }, { headers: NO_CACHE_HEADERS });
  } catch (error: any) {
    console.error('Error fetching tickets:', error);
    return NextResponse.json({ success: true, tickets: [], error: error.message }, { headers: NO_CACHE_HEADERS });
  }
}
