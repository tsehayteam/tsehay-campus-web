import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, supabaseServer } from '@/lib/supabase/server';
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

const PUBLIC_CACHE_HEADERS = {
  'Cache-Control': 'public, max-age=10, s-maxage=10, stale-while-revalidate=60',
  'CDN-Cache-Control': 'public, s-maxage=10, stale-while-revalidate=60',
  'Vercel-CDN-Cache-Control': 'public, s-maxage=10, stale-while-revalidate=60',
};

// In-Memory Events Cache (10-second fast TTL for rapid live updates)
let cachedEventsList: { data: any[]; timestamp: number } | null = null;
const EVENTS_CACHE_TTL_MS = 10 * 1000;

export function invalidateEventsCache() {
  cachedEventsList = null;
}

function mapDbRowToEvent(row: any): TsehayEvent {
  const cap = Number(row.capacity) || 100;
  const reg = Number(row.registered_count !== undefined ? row.registered_count : row.registeredCount) || 0;
  const rem = row.remaining_seats !== undefined && typeof row.remaining_seats === 'number'
    ? row.remaining_seats
    : (row.remainingSeats !== undefined && typeof row.remainingSeats === 'number' 
        ? row.remainingSeats 
        : Math.max(0, cap - reg));
  
  const rawImg = row.image || row.image_url || row.banner || '';
  const img = formatDriveImageUrl(rawImg) || rawImg || 'https://images.unsplash.com/photo-1515187029135-18ee286d815b?q=80&w=1200';

  const isOnline = row.is_online !== undefined 
    ? Boolean(row.is_online) 
    : (row.isOnline !== undefined 
        ? Boolean(row.isOnline) 
        : (row.category === 'Online' || (row.location || '').toLowerCase().includes('online') || (row.location || '').toLowerCase().includes('meet')));

  const isFree = row.is_free !== undefined 
    ? Boolean(row.is_free) 
    : (row.isFree !== undefined 
        ? Boolean(row.isFree) 
        : (Number(row.price) === 0));

  const speaker = row.speaker || (Array.isArray(row.speakers) && row.speakers[0] ? row.speakers[0] : '') || '';

  return {
    id: row.id,
    slug: row.slug || (row.id ? (String(row.id).startsWith('evt-') ? String(row.id) : `evt-${row.id}`) : ''),
    title: row.title || '',
    titleEn: row.title_en || row.titleEn || '',
    description: row.description || '',
    date: row.date || '',
    time: row.time || '',
    location: row.location || (isOnline ? 'Online Google Meet' : 'Bole, Addis Ababa'),
    isOnline,
    meetingLink: row.meeting_link || row.meetingLink || '',
    mapsUrl: row.maps_url || row.mapsUrl || '',
    capacity: cap,
    registeredCount: reg,
    availableSeats: rem,
    remainingSeats: rem,
    seatsLeft: rem,
    availableTickets: rem,
    price: Number(row.price) || 0,
    isFree,
    speaker,
    speakerRole: row.speaker_role || row.speakerRole || '',
    speakerBio: row.speaker_bio || row.speakerBio || '',
    speakerImage: formatDriveImageUrl(row.speaker_image || row.speakerImage || row.speaker_photo || row.speakerPhoto || '') || row.speaker_image || row.speakerImage || '',
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
    const { data: row } = await supabaseAdmin
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

async function getSupabaseEvents(forceFresh = false): Promise<any[]> {
  if (!forceFresh && cachedEventsList && (Date.now() - cachedEventsList.timestamp < EVENTS_CACHE_TTL_MS)) {
    return cachedEventsList.data;
  }

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

  const eventMap = new Map<string, any>();

  // 1. Read from site_settings (key: 'events') using supabaseAdmin
  try {
    const { data: row, error } = await supabaseAdmin
      .from('site_settings')
      .select('data')
      .eq('key', 'events')
      .maybeSingle();

    if (!error && row?.data && Array.isArray(row.data) && row.data.length > 0) {
      row.data.forEach((e: any) => {
        if (e && (e.id || e.slug) && !isDeleted(e)) {
          const mapped = mapDbRowToEvent(e);
          eventMap.set(mapped.id, mapped);
        }
      });
    }
  } catch (e) {
    console.warn('Supabase site_settings events fetch warning:', e);
  }

  // 2. Read directly from Supabase `events` table and overlay using supabaseAdmin
  try {
    const { data: dbEvents, error: dbErr } = await supabaseAdmin
      .from('events')
      .select('*')
      .order('created_at', { ascending: false });

    if (!dbErr && dbEvents && Array.isArray(dbEvents) && dbEvents.length > 0) {
      dbEvents.forEach((dbEv: any) => {
        if (dbEv && dbEv.id && !isDeleted(dbEv)) {
          const existing = eventMap.get(dbEv.id) || {};
          const mapped = mapDbRowToEvent({ ...existing, ...dbEv });
          eventMap.set(mapped.id, mapped);
        }
      });
    }
  } catch (e) {
    console.warn('Supabase events table fetch warning:', e);
  }

  let mergedList = Array.from(eventMap.values());

  // 3. If neither table nor site_settings had events, fallback to in-memory store or defaults
  if (mergedList.length === 0) {
    const inMem = loadPersistedEvents();
    if (inMem && inMem.length > 0) {
      mergedList = inMem.map(mapDbRowToEvent).filter(e => !isDeleted(e));
    } else {
      mergedList = DEFAULT_EVENTS.filter(e => !isDeleted(e));
    }
  }

  // 🌟 4. Dynamic Live Ticket Count Synchronization:
  // Cross-reference with confirmed issued tickets in site_settings ('event_tickets')
  try {
    const { data: ticketRow } = await supabaseAdmin
      .from('site_settings')
      .select('data')
      .eq('key', 'event_tickets')
      .maybeSingle();

    if (Array.isArray(ticketRow?.data)) {
      const tickets: any[] = ticketRow.data;
      mergedList = mergedList.map(ev => {
        const matchingTickets = tickets.filter((t: any) => 
          t && t.status !== 'cancelled' && (t.eventId === ev.id || t.eventId === ev.slug || (t.eventSlug && (t.eventSlug === ev.slug || t.eventSlug === ev.id)))
        );
        const rawReg = ev.registeredCount !== undefined ? ev.registeredCount : ev.registered_count;
        const storedCount = Number(rawReg);
        const liveCount = !isNaN(storedCount) ? Math.max(0, storedCount) : matchingTickets.length;
        const liveRemaining = Math.max(0, (Number(ev.capacity) || 100) - liveCount);
        return {
          ...ev,
          registeredCount: liveCount,
          registered_count: liveCount,
          availableSeats: liveRemaining,
          remainingSeats: liveRemaining,
          seatsLeft: liveRemaining,
          availableTickets: liveRemaining
        };
      });
    }
  } catch (syncErr) {
    console.warn('Dynamic live ticket count sync notice:', syncErr);
  }

  savePersistedEvents(mergedList);
  cachedEventsList = { data: mergedList, timestamp: Date.now() };
  return mergedList;
}

async function saveSupabaseEvents(events: any[], singlePayload?: any) {
  savePersistedEvents(events);
  invalidateEventsCache();

  // 1. Primary: Upsert single event to Supabase `events` table using supabaseAdmin
  if (singlePayload && singlePayload.id) {
    try {
      const fullRow: Record<string, any> = {
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
        speaker_bio: singlePayload.speakerBio || null,
        speaker_image: singlePayload.speakerImage || null,
        image: singlePayload.image || '',
        tags: Array.isArray(singlePayload.tags) ? singlePayload.tags : [],
        status: singlePayload.status || 'upcoming',
        updated_at: new Date().toISOString()
      };

      const { error: upsertErr } = await supabaseAdmin
        .from('events')
        .upsert(fullRow);

      if (upsertErr) {
        console.warn('Supabase events table full upsert warning, attempting base schema fallback:', upsertErr.message);
        // Fallback to base columns that exist in the PostgreSQL events table
        const baseRow: Record<string, any> = {
          id: singlePayload.id,
          title: singlePayload.title,
          title_en: singlePayload.titleEn || null,
          description: singlePayload.description || '',
          category: singlePayload.isOnline ? 'Online' : 'In-Person',
          date: singlePayload.date || '',
          time: singlePayload.time || '',
          location: singlePayload.location || '',
          image: singlePayload.image || null,
          banner: singlePayload.image || null,
          capacity: Number(singlePayload.capacity) || 100,
          registered_count: Number(singlePayload.registeredCount) || 0,
          price: Number(singlePayload.price) || 0,
          status: singlePayload.status || 'upcoming',
          tags: Array.isArray(singlePayload.tags) ? singlePayload.tags : [],
          speakers: singlePayload.speaker ? [singlePayload.speaker] : [],
          updated_at: new Date().toISOString()
        };
        await supabaseAdmin.from('events').upsert(baseRow);
      }
    } catch (e) {
      console.warn('Supabase events table upsert error:', e);
    }
  }

  // 2. Secondary: Mirror complete rich objects to site_settings (key: 'events') using supabaseAdmin
  try {
    await supabaseAdmin
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
    const forceFresh = searchParams.get('noCache') === 'true' || Boolean(req.headers.get('x-admin-token')) || req.headers.get('cache-control')?.includes('no-cache');

    let eventsList = await getSupabaseEvents(forceFresh);

    if (eventId) {
      const cleanKey = eventId.trim().toLowerCase();
      const deletedIds = await getDeletedEventIdsFromServer();
      if (deletedIds.includes(cleanKey)) {
        return NextResponse.json({ error: 'Event has been permanently deleted' }, { status: 404, headers: NO_CACHE_HEADERS });
      }

      const found = eventsList.find(e => 
        (e.id && e.id.toLowerCase() === cleanKey) || 
        (e.slug && e.slug.toLowerCase() === cleanKey)
      );

      if (found) {
        return NextResponse.json({ success: true, event: found }, { headers: forceFresh ? NO_CACHE_HEADERS : PUBLIC_CACHE_HEADERS });
      }

      return NextResponse.json({ error: 'Event not found' }, { status: 404, headers: NO_CACHE_HEADERS });
    }

    return NextResponse.json({ 
      success: true, 
      count: eventsList.length, 
      events: eventsList 
    }, { headers: forceFresh ? NO_CACHE_HEADERS : PUBLIC_CACHE_HEADERS });
  } catch (error: any) {
    console.error('Error in /api/events GET:', error);
    return NextResponse.json({ 
      success: false, 
      error: error.message || 'Failed to fetch events', 
      events: DEFAULT_EVENTS 
    }, { status: 500, headers: NO_CACHE_HEADERS });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await verifyAdminRequest(req);
    if (!auth.authorized) {
      return NextResponse.json({ success: false, error: auth.error || 'Unauthorized' }, { status: 401, headers: NO_CACHE_HEADERS });
    }

    const body = await req.json();
    const eventData = body.eventData || body;

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

    const currentEvents = await getSupabaseEvents(true);
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

    // 1. Delete and soft-delete from Supabase events table using supabaseAdmin
    try {
      if (cleanId) {
        try {
          await supabaseAdmin.from('events').update({ status: 'deleted', is_active: false, is_deleted: true }).eq('id', cleanId);
        } catch (_) {}
        await supabaseAdmin.from('events').delete().eq('id', cleanId);
      }
      if (cleanSlug) {
        try {
          await supabaseAdmin.from('events').update({ status: 'deleted', is_active: false, is_deleted: true }).eq('slug', cleanSlug);
        } catch (_) {}
        await supabaseAdmin.from('events').delete().eq('slug', cleanSlug);
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

      await supabaseAdmin.from('site_settings').upsert({
        key: 'events_deleted_ids',
        data: updatedDeleted,
        updated_at: new Date().toISOString()
      });
    } catch (tombErr) {
      console.warn('Error recording tombstone in site_settings:', tombErr);
    }

    // 3. Update site_settings 'events' array to remove this event
    try {
      const { data: row } = await supabaseAdmin
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
        await supabaseAdmin.from('site_settings').upsert({
          key: 'events',
          data: filtered,
          updated_at: new Date().toISOString()
        });
      }
    } catch (e) {}

    // 4. Update memory store & invalidate cache
    deletePersistedEvent(cleanId, cleanSlug);
    invalidateEventsCache();

    return NextResponse.json({ success: true, deletedId: cleanId, deletedSlug: cleanSlug }, { headers: NO_CACHE_HEADERS });
  } catch (error: any) {
    console.error('Error deleting event:', error);
    return NextResponse.json({ error: error.message || 'Failed to delete event' }, { status: 500, headers: NO_CACHE_HEADERS });
  }
}
