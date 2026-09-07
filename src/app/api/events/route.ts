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

function mapDbRowToEvent(row: any): TsehayEvent {
  const cap = Number(row.capacity) || 100;
  const reg = Number(row.registered_count !== undefined ? row.registered_count : row.registeredCount) || 0;
  const rem = row.remaining_seats !== undefined && typeof row.remaining_seats === 'number'
    ? row.remaining_seats
    : (row.remainingSeats !== undefined && typeof row.remainingSeats === 'number' 
        ? row.remainingSeats 
        : Math.max(0, cap - reg));
  
  const rawImg = row.image || row.image_url || '';
  const img = formatDriveImageUrl(rawImg) || rawImg || 'https://images.unsplash.com/photo-1515187029135-18ee286d815b?q=80&w=1200';

  return {
    id: row.id,
    slug: row.slug || `evt-${row.id}`,
    title: row.title || '',
    titleEn: row.title_en || row.titleEn || '',
    description: row.description || '',
    date: row.date || '',
    time: row.time || '',
    location: row.location || '',
    isOnline: row.is_online !== undefined ? Boolean(row.is_online) : (row.isOnline !== undefined ? Boolean(row.isOnline) : false),
    meetingLink: row.meeting_link || row.meetingLink || '',
    mapsUrl: row.maps_url || row.mapsUrl || '',
    capacity: cap,
    registeredCount: reg,
    remainingSeats: rem,
    price: Number(row.price) || 0,
    isFree: row.is_free !== undefined ? Boolean(row.is_free) : (row.isFree !== undefined ? Boolean(row.isFree) : (Number(row.price) === 0)),
    speaker: row.speaker || '',
    speakerRole: row.speaker_role || row.speakerRole || '',
    image: img,
    videoUrl: row.video_url || row.videoUrl || '',
    tags: Array.isArray(row.tags) ? row.tags : (typeof row.tags === 'string' ? row.tags.split(',').map((t: string) => t.trim()).filter(Boolean) : []),
    status: row.status || 'upcoming',
    createdAt: row.created_at || row.createdAt || new Date().toISOString(),
    updatedAt: row.updated_at || row.updatedAt || new Date().toISOString()
  };
}

async function getSupabaseEvents(): Promise<any[]> {
  // 1. Primary: Read directly from Supabase `events` table
  try {
    const { data: dbEvents, error: dbErr } = await supabaseServer
      .from('events')
      .select('*')
      .order('created_at', { ascending: false });

    if (!dbErr && dbEvents && Array.isArray(dbEvents) && dbEvents.length > 0) {
      const mapped = dbEvents.map(mapDbRowToEvent);
      savePersistedEvents(mapped);
      return mapped;
    }
  } catch (e) {
    console.warn('Supabase events table fetch warning:', e);
  }

  // 2. Secondary: Read from site_settings (key: 'events')
  try {
    const { data: row, error } = await supabaseServer
      .from('site_settings')
      .select('data')
      .eq('key', 'events')
      .maybeSingle();

    if (!error && row?.data && Array.isArray(row.data) && row.data.length > 0) {
      const mapped = row.data.map(mapDbRowToEvent);
      savePersistedEvents(mapped);
      return mapped;
    }
  } catch (e) {
    console.warn('Supabase site_settings events fetch warning:', e);
  }

  // 3. Tertiary: In-memory/filesystem store
  const inMem = loadPersistedEvents();
  if (inMem && inMem.length > 0) return inMem.map(mapDbRowToEvent);

  // 4. Fallback defaults
  return DEFAULT_EVENTS;
}

async function saveSupabaseEvents(events: any[], singlePayload?: any) {
  savePersistedEvents(events);

  // 1. Primary: Upsert single event to Supabase `events` table if provided
  if (singlePayload && singlePayload.id) {
    try {
      const dbRow: Record<string, any> = {
        id: singlePayload.id,
        slug: singlePayload.slug,
        title: singlePayload.title,
        title_en: singlePayload.titleEn || null,
        description: singlePayload.description || '',
        date: singlePayload.date || '',
        time: singlePayload.time || '',
        location: singlePayload.location || '',
        is_online: Boolean(singlePayload.isOnline),
        meeting_link: singlePayload.meetingLink || null,
        maps_url: singlePayload.mapsUrl || null,
        capacity: Number(singlePayload.capacity) || 100,
        registered_count: Number(singlePayload.registeredCount) || 0,
        price: Number(singlePayload.price) || 0,
        is_free: Boolean(singlePayload.isFree),
        speaker: singlePayload.speaker || '',
        speaker_role: singlePayload.speakerRole || null,
        image: singlePayload.image || '',
        tags: Array.isArray(singlePayload.tags) ? singlePayload.tags : [],
        status: singlePayload.status || 'upcoming',
        updated_at: new Date().toISOString()
      };

      const { error: upsertErr } = await supabaseServer
        .from('events')
        .upsert(dbRow);

      if (upsertErr) {
        console.warn('Supabase events table upsert warning:', upsertErr);
      }
    } catch (e) {
      console.warn('Supabase events table upsert error:', e);
    }
  }

  // 2. Secondary: Mirror to site_settings (key: 'events')
  try {
    await supabaseServer
      .from('site_settings')
      .upsert({
        key: 'events',
        data: events,
        updated_at: new Date().toISOString()
      });
  } catch (e) {
    console.warn('Supabase events site_settings upsert warning:', e);
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
    const rawImage = (eventData.image || '').trim();
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
    await saveSupabaseEvents(updatedEvents, payload);
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

    // 1. Delete from Supabase events table
    try {
      await supabaseServer.from('events').delete().eq('id', eventId);
    } catch (e) {
      console.warn('Supabase events delete warning:', e);
    }

    // 2. Update site_settings and memory store
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
