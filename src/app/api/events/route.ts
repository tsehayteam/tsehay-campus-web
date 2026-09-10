import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase/server';
import { DEFAULT_EVENTS, TsehayEvent, formatDriveImageUrl } from '@/lib/eventCache';
import { 
  loadPersistedEvents, 
  savePersistedEvents, 
  saveSinglePersistedEvent, 
  deletePersistedEvent 
} from '@/lib/memoryStore';
import { verifyAdminRequest } from '@/lib/adminAuthHelper';

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

async function getDeletedEventIdsFromServer(): Promise<string[]> {
  try {
    const { data: row } = await supabaseServer
      .from('site_settings')
      .select('data')
      .eq('key', 'events_deleted_ids')
      .maybeSingle();

    if (row?.data && Array.isArray(row.data)) {
      return row.data.map((s: any) => String(s).trim().toLowerCase()).filter(Boolean);
    }
  } catch (e) {}
  return [];
}

async function getSupabaseEvents(): Promise<any[]> {
  const deletedIds = await getDeletedEventIdsFromServer();
  const isDeleted = (e: any) => {
    if (!e) return true;
    if (e.is_deleted === true || e.isDeleted === true || e.is_active === false || e.isActive === false || e.status === 'deleted' || e.status === 'inactive') {
      return true;
    }
    if (deletedIds.length === 0) return false;
    const cId = (e.id || '').trim().toLowerCase();
    const cSlug = (e.slug || '').trim().toLowerCase();
    return (cId && deletedIds.includes(cId)) || (cSlug && deletedIds.includes(cSlug));
  };

  // 1. Primary: Read directly from Supabase `events` table
  try {
    const { data: dbEvents, error: dbErr } = await supabaseServer
      .from('events')
      .select('*')
      .order('created_at', { ascending: false });

    if (!dbErr && dbEvents && Array.isArray(dbEvents) && dbEvents.length > 0) {
      const mapped = dbEvents.map(mapDbRowToEvent).filter(e => !isDeleted(e));
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
      const mapped = row.data.map(mapDbRowToEvent).filter((e: any) => !isDeleted(e));
      savePersistedEvents(mapped);
      return mapped;
    }
  } catch (e) {
    console.warn('Supabase site_settings events fetch warning:', e);
  }

  // 3. Tertiary: In-memory/filesystem store
  const inMem = loadPersistedEvents();
  if (inMem && inMem.length > 0) {
    return inMem.map(mapDbRowToEvent).filter(e => !isDeleted(e));
  }

  // 4. Fallback defaults (only non-deleted)
  return DEFAULT_EVENTS.filter(e => !isDeleted(e));
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
      const cleanKey = eventId.trim().toLowerCase();
      const deletedIds = await getDeletedEventIdsFromServer();
      if (deletedIds.includes(cleanKey)) {
        return NextResponse.json({ error: 'Event has been permanently deleted' }, { status: 404, headers: NO_CACHE_HEADERS });
      }

      const found = eventsList.find(e => 
        (e.id && e.id.toLowerCase() === cleanKey) || 
        (e.slug && e.slug.toLowerCase() === cleanKey)
      ) || DEFAULT_EVENTS.find(e => 
        !deletedIds.includes(e.id.toLowerCase()) && 
        !(e.slug && deletedIds.includes(e.slug.toLowerCase())) && 
        (e.id.toLowerCase() === cleanKey || (e.slug && e.slug.toLowerCase() === cleanKey))
      );

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

    const deletedIds = await getDeletedEventIdsFromServer();
    return NextResponse.json({ 
      success: true, 
      events: formattedEvents, 
      count: formattedEvents.length,
      deletedIds 
    }, { headers: NO_CACHE_HEADERS });
  } catch (error: any) {
    console.error('Error fetching events:', error);
    const fallback = loadPersistedEvents();
    return NextResponse.json({ success: true, events: fallback, count: fallback.length, error: error.message }, { headers: NO_CACHE_HEADERS });
  }
}

export async function POST(req: NextRequest) {
  const auth = await verifyAdminRequest(req);
  if (!auth.authorized) {
    return NextResponse.json({ success: false, error: auth.error || 'Unauthorized' }, { status: 401, headers: NO_CACHE_HEADERS });
  }

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
  const auth = await verifyAdminRequest(req);
  if (!auth.authorized) {
    return NextResponse.json({ success: false, error: auth.error || 'Unauthorized' }, { status: 401, headers: NO_CACHE_HEADERS });
  }

  try {
    const { searchParams } = new URL(req.url);
    const eventId = searchParams.get('id') || searchParams.get('eventId') || '';
    const eventSlug = searchParams.get('slug') || '';

    if (!eventId && !eventSlug) {
      return NextResponse.json({ error: 'Event ID or slug required' }, { status: 400 });
    }

    const cleanId = eventId.trim();
    const cleanSlug = eventSlug.trim();

    // 1. Delete and soft-delete from Supabase events table by ID and slug
    try {
      if (cleanId) {
        // Try soft-delete first in case of foreign keys, then hard delete
        try {
          await supabaseServer.from('events').update({ status: 'deleted', is_active: false, is_deleted: true }).eq('id', cleanId);
        } catch (_) {}
        await supabaseServer.from('events').delete().eq('id', cleanId);
      }
      if (cleanSlug) {
        try {
          await supabaseServer.from('events').update({ status: 'deleted', is_active: false, is_deleted: true }).eq('slug', cleanSlug);
        } catch (_) {}
        await supabaseServer.from('events').delete().eq('slug', cleanSlug);
      }
    } catch (e) {
      console.warn('Supabase events delete warning:', e);
    }

    // 2. Add to permanent server tombstone in site_settings (key: 'events_deleted_ids')
    try {
      const existingDeleted = await getDeletedEventIdsFromServer();
      const updatedDeleted = Array.from(new Set([
        ...existingDeleted,
        ...(cleanId ? [cleanId.toLowerCase()] : []),
        ...(cleanSlug ? [cleanSlug.toLowerCase()] : [])
      ]));

      await supabaseServer.from('site_settings').upsert({
        key: 'events_deleted_ids',
        data: updatedDeleted,
        updated_at: new Date().toISOString()
      });
    } catch (tombErr) {
      console.warn('Error recording tombstone in site_settings:', tombErr);
    }

    // 3. Update site_settings 'events' array to remove this event
    try {
      const { data: row } = await supabaseServer
        .from('site_settings')
        .select('data')
        .eq('key', 'events')
        .maybeSingle();

      if (row?.data && Array.isArray(row.data)) {
        const filtered = row.data.filter((e: any) => {
          const eId = (e.id || '').trim().toLowerCase();
          const eSlug = (e.slug || '').trim().toLowerCase();
          const matchId = cleanId && (eId === cleanId.toLowerCase() || eSlug === cleanId.toLowerCase());
          const matchSlug = cleanSlug && (eId === cleanSlug.toLowerCase() || eSlug === cleanSlug.toLowerCase());
          return !matchId && !matchSlug;
        });
        await supabaseServer.from('site_settings').upsert({
          key: 'events',
          data: filtered,
          updated_at: new Date().toISOString()
        });
      }
    } catch (e) {}

    // 4. Update memory store
    deletePersistedEvent(cleanId, cleanSlug);

    return NextResponse.json({ success: true, deletedId: cleanId, deletedSlug: cleanSlug }, { headers: NO_CACHE_HEADERS });
  } catch (error: any) {
    console.error('Error deleting event:', error);
    return NextResponse.json({ error: error.message || 'Failed to delete event' }, { status: 500, headers: NO_CACHE_HEADERS });
  }
}
