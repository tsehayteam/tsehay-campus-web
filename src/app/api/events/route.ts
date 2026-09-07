import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase/server';
import { DEFAULT_EVENTS, TsehayEvent, formatDriveImageUrl } from '@/lib/eventCache';
import { 
  loadPersistedEvents, 
  savePersistedEvents, 
  saveSinglePersistedEvent, 
  deletePersistedEvent 
} from '@/lib/memoryStore';

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

async function getSupabaseEvents(): Promise<any[]> {
  try {
    const { data: row, error } = await supabaseServer
      .from('site_settings')
      .select('data')
      .eq('key', 'events')
      .maybeSingle();

    if (!error && row?.data && Array.isArray(row.data) && row.data.length > 0) {
      savePersistedEvents(row.data);
      return row.data;
    }
  } catch (e) {
    console.warn('Supabase events fetch warning:', e);
  }
  const inMem = loadPersistedEvents();
  if (inMem && inMem.length > 0) return inMem;
  return DEFAULT_EVENTS;
}

async function saveSupabaseEvents(events: any[]) {
  savePersistedEvents(events);
  try {
    await supabaseServer
      .from('site_settings')
      .upsert({
        key: 'events',
        data: events,
        updated_at: new Date().toISOString()
      });
  } catch (e) {
    console.warn('Supabase events upsert warning:', e);
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const eventId = searchParams.get('id') || searchParams.get('eventId');

    let eventsList = await getSupabaseEvents();

    if (eventId) {
      const found = eventsList.find(e => e.id === eventId || e.slug === eventId) ||
                    DEFAULT_EVENTS.find(e => e.id === eventId || e.slug === eventId);
      if (found) {
        return NextResponse.json({ 
          success: true, 
          event: { ...found, image: formatDriveImageUrl(found.image) || found.image } 
        }, { headers: NO_CACHE_HEADERS });
      }
      return NextResponse.json({ error: 'Event not found' }, { status: 404, headers: NO_CACHE_HEADERS });
    }

    const formattedEvents = eventsList.map(e => {
      const cap = Number(e.capacity) || 100;
      const reg = Number(e.registeredCount) || 0;
      const rem = e.remainingSeats !== undefined && typeof e.remainingSeats === 'number'
        ? Math.max(0, e.remainingSeats)
        : Math.max(0, cap - reg);

      return {
        ...e,
        capacity: cap,
        registeredCount: reg,
        remainingSeats: rem,
        image: formatDriveImageUrl(e.image) || e.image
      };
    });

    return NextResponse.json({ success: true, events: formattedEvents, count: formattedEvents.length }, { headers: NO_CACHE_HEADERS });
  } catch (error: any) {
    console.error('Error fetching events:', error);
    const fallback = loadPersistedEvents();
    return NextResponse.json({ success: true, events: fallback, count: fallback.length, error: error.message }, { headers: NO_CACHE_HEADERS });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const eventData = body.event || body;
    const eventId = eventData.id || `evt_${Date.now()}`;
    const rawImage = eventData.image || '';
    const formattedImage = formatDriveImageUrl(rawImage) || rawImage || 'https://images.unsplash.com/photo-1515187029135-18ee286d815b?q=80&w=1200';

    const cap = Number(eventData.capacity) || 100;
    const reg = Number(eventData.registeredCount) || 0;
    const rem = eventData.remainingSeats !== undefined && typeof eventData.remainingSeats === 'number'
      ? eventData.remainingSeats
      : Math.max(0, cap - reg);

    const payload = {
      ...eventData,
      id: eventId,
      image: formattedImage,
      updatedAt: new Date().toISOString(),
      capacity: cap,
      price: Number(eventData.price) || 0,
      registeredCount: reg,
      remainingSeats: rem
    };

    const currentEvents = await getSupabaseEvents();
    const updatedEvents = [payload, ...currentEvents.filter(e => e.id !== eventId)];
    await saveSupabaseEvents(updatedEvents);
    saveSinglePersistedEvent(payload);

    return NextResponse.json({ success: true, event: payload }, { headers: NO_CACHE_HEADERS });
  } catch (error: any) {
    console.error('Error saving event:', error);
    return NextResponse.json({ error: error.message || 'Failed to save event' }, { status: 500, headers: NO_CACHE_HEADERS });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const eventId = searchParams.get('id') || searchParams.get('eventId');

    if (!eventId) {
      return NextResponse.json({ error: 'Event ID required' }, { status: 400 });
    }

    const currentEvents = await getSupabaseEvents();
    const updatedEvents = currentEvents.filter(e => e.id !== eventId);
    await saveSupabaseEvents(updatedEvents);
    deletePersistedEvent(eventId);

    return NextResponse.json({ success: true, deletedId: eventId }, { headers: NO_CACHE_HEADERS });
  } catch (error: any) {
    console.error('Error deleting event:', error);
    return NextResponse.json({ error: error.message || 'Failed to delete event' }, { status: 500, headers: NO_CACHE_HEADERS });
  }
}
