export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase/server';
import { DEFAULT_EVENTS, TsehayEvent, formatDriveImageUrl, formatEventBannerUrl } from '@/lib/eventCache';
import { loadPersistedEvents } from '@/lib/memoryStore';
import { verifyAdminRequest } from '@/lib/adminAuthHelper';

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
  const img = formatEventBannerUrl(rawImg) || formatDriveImageUrl(rawImg) || rawImg || 'https://images.unsplash.com/photo-1515187029135-18ee286d815b?q=80&w=1200';

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
    status: row.status || 'active',
    createdAt: row.created_at || row.createdAt || new Date().toISOString(),
    updatedAt: row.updated_at || row.updatedAt || new Date().toISOString()
  };
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const allowDefault = searchParams.get('allowDefault') === 'true';

    // 1. Primary: Check site_settings table for explicit 'event_banner'
    try {
      const { data: sbRow, error: sbErr } = await supabaseServer
        .from('site_settings')
        .select('*')
        .eq('key', 'event_banner')
        .maybeSingle();

      if (!sbErr && sbRow?.data) {
        const d = sbRow.data;
        // If explicitly set to inactive
        if (d.active === false || d.status === 'inactive') {
          return NextResponse.json({
            success: true,
            active: false,
            banner: null,
            message: 'Event banner is currently inactive'
          }, { headers: NO_CACHE_HEADERS });
        }

        if (d.banner && (d.active !== false && d.status !== 'inactive')) {
          const mapped = mapDbRowToEvent(d.banner);
          return NextResponse.json({
            success: true,
            active: true,
            banner: mapped
          }, { headers: NO_CACHE_HEADERS });
        }
      }
    } catch (e) {
      console.warn('Supabase site_settings event_banner fetch warning:', e);
    }

    // 2. Secondary: Query Supabase `events` table for any event marked 'active' or 'published'
    try {
      const { data: dbEvents, error: dbErr } = await supabaseServer
        .from('events')
        .select('*')
        .in('status', ['active', 'published'])
        .order('updated_at', { ascending: false })
        .limit(1);

      if (!dbErr && dbEvents && dbEvents.length > 0) {
        const activeEvent = mapDbRowToEvent(dbEvents[0]);
        return NextResponse.json({
          success: true,
          active: true,
          banner: activeEvent
        }, { headers: NO_CACHE_HEADERS });
      }
    } catch (e) {
      console.warn('Supabase events active banner query warning:', e);
    }

    // 3. Tertiary: Check general events in site_settings (key: 'events')
    try {
      const { data: evSetting } = await supabaseServer
        .from('site_settings')
        .select('data')
        .eq('key', 'events')
        .maybeSingle();

      if (evSetting?.data && Array.isArray(evSetting.data)) {
        const found = evSetting.data.find((e: any) => e.status === 'active' || e.status === 'published');
        if (found) {
          return NextResponse.json({
            success: true,
            active: true,
            banner: mapDbRowToEvent(found)
          }, { headers: NO_CACHE_HEADERS });
        }
      }
    } catch (e) {}

    // 4. Memory store check
    const inMem = loadPersistedEvents();
    if (inMem && inMem.length > 0) {
      const activeInMem = inMem.find((e: any) => e.status === 'active' || e.status === 'published');
      if (activeInMem) {
        return NextResponse.json({
          success: true,
          active: true,
          banner: mapDbRowToEvent(activeInMem)
        }, { headers: NO_CACHE_HEADERS });
      }
    }

    // 5. Fallback if requested or return inactive
    if (allowDefault && DEFAULT_EVENTS.length > 0) {
      return NextResponse.json({
        success: true,
        active: true,
        banner: mapDbRowToEvent(DEFAULT_EVENTS[0]),
        isDefault: true
      }, { headers: NO_CACHE_HEADERS });
    }

    return NextResponse.json({
      success: true,
      active: false,
      banner: null
    }, { headers: NO_CACHE_HEADERS });

  } catch (error: any) {
    console.error('Error in /api/events/banner GET:', error);
    return NextResponse.json({
      success: false,
      active: false,
      banner: null,
      error: error?.message || 'Server error'
    }, { status: 500, headers: NO_CACHE_HEADERS });
  }
}

export async function POST(req: NextRequest) {
  const auth = await verifyAdminRequest(req);
  if (!auth.authorized) {
    return NextResponse.json({ success: false, error: auth.error || 'Unauthorized' }, { status: 401, headers: NO_CACHE_HEADERS });
  }

  try {
    const body = await req.json();
    const eventId = body.eventId || body.id;
    const isActive = body.active !== undefined ? Boolean(body.active) : (body.status !== 'inactive');
    const status = isActive ? 'active' : 'inactive';

    let bannerData = body.banner || null;

    // If eventId provided, look up full event details
    if (eventId && !bannerData) {
      try {
        const { data: evRow } = await supabaseServer
          .from('events')
          .select('*')
          .eq('id', eventId)
          .maybeSingle();

        if (evRow) {
          bannerData = mapDbRowToEvent({ ...evRow, status });
        }
      } catch (e) {}
    }

    if (bannerData) {
      bannerData.status = status;
      bannerData.updatedAt = new Date().toISOString();
    }

    const payload = {
      active: isActive,
      status: status,
      eventId: eventId || (bannerData?.id) || null,
      banner: bannerData,
      updatedAt: new Date().toISOString()
    };

    // 1. Update Supabase site_settings table
    try {
      await supabaseServer
        .from('site_settings')
        .upsert({
          key: 'event_banner',
          data: payload,
          updated_at: new Date().toISOString()
        });
    } catch (e) {
      console.warn('Failed to upsert site_settings event_banner:', e);
    }

    // 2. If eventId provided, update its status in `events` table
    if (eventId) {
      try {
        await supabaseServer
          .from('events')
          .update({ status: status, updated_at: new Date().toISOString() })
          .eq('id', eventId);
      } catch (e) {
        console.warn('Failed to update event status in events table:', e);
      }
    }

    return NextResponse.json({
      success: true,
      active: isActive,
      banner: bannerData,
      payload
    }, { headers: NO_CACHE_HEADERS });

  } catch (error: any) {
    console.error('Error in /api/events/banner POST:', error);
    return NextResponse.json({
      success: false,
      error: error?.message || 'Failed to save event banner'
    }, { status: 500, headers: NO_CACHE_HEADERS });
  }
}
