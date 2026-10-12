export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, supabaseServer } from '@/lib/supabase/server';
import { DEFAULT_EVENTS, TsehayEvent, formatDriveImageUrl, formatEventBannerUrl, isEventPassed, getUpcomingEvents, getNextUpcomingEvent } from '@/lib/eventCache';
import { loadPersistedEvents, savePersistedEvents } from '@/lib/memoryStore';
import { verifyAdminRequest } from '@/lib/adminAuthHelper';
import { invalidateEventsCache } from '@/app/api/events/route';

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
    speakerBio: row.speaker_bio || row.speakerBio || '',
    speakerImage: formatDriveImageUrl(row.speaker_image || row.speakerImage || row.speaker_photo || row.speakerPhoto || '') || row.speaker_image || row.speakerImage || '',
    image: img,
    videoUrl: row.video_url || row.videoUrl || '',
    tags: Array.isArray(row.tags) ? row.tags : (typeof row.tags === 'string' ? row.tags.split(',').map((t: string) => t.trim()).filter(Boolean) : []),
    status: row.status || 'active',
    isFeatured: row.isFeatured !== undefined ? Boolean(row.isFeatured) : (row.status === 'active'),
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
          // Check if explicit banner has passed its end date/time
          if (!isEventPassed(d.banner)) {
            const mapped = mapDbRowToEvent({ ...d.banner, status: 'active', isFeatured: true });
            return NextResponse.json({
              success: true,
              active: true,
              banner: mapped
            }, { headers: NO_CACHE_HEADERS });
          } else {
            // Banner is expired! Automatically deactivate site_settings in background without blocking
            try {
              supabaseAdmin
                .from('site_settings')
                .update({
                  data: { ...d, active: false, status: 'expired', updatedAt: new Date().toISOString() },
                  updated_at: new Date().toISOString()
                })
                .eq('key', 'event_banner')
                .then(() => {});
            } catch (_) {}
            // Fall through to finding the next upcoming event
          }
        }
      }
    } catch (e) {
      console.warn('Supabase site_settings event_banner fetch warning:', e);
    }

    // 2. Gather candidate events from Supabase `events` table
    const candidateEvents: TsehayEvent[] = [];

    try {
      const { data: dbEvents, error: dbErr } = await supabaseServer
        .from('events')
        .select('*')
        .in('status', ['active', 'published', 'upcoming'])
        .order('updated_at', { ascending: false });

      if (!dbErr && dbEvents && dbEvents.length > 0) {
        dbEvents.forEach(row => {
          candidateEvents.push(mapDbRowToEvent(row));
        });
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
        evSetting.data.forEach((e: any) => {
          if (e && !candidateEvents.some(c => c.id === e.id || c.slug === e.slug)) {
            candidateEvents.push(mapDbRowToEvent(e));
          }
        });
      }
    } catch (e) {}

    // 4. Quaternary: Memory store check
    const inMem = loadPersistedEvents();
    if (inMem && inMem.length > 0) {
      inMem.forEach((e: any) => {
        if (e && !candidateEvents.some(c => c.id === e.id || c.slug === e.slug)) {
          candidateEvents.push(mapDbRowToEvent(e));
        }
      });
    }

    // 5. Automatically filter out all expired events and sort upcoming chronologically
    const nonExpiredUpcoming = getUpcomingEvents(candidateEvents);

    if (nonExpiredUpcoming.length > 0) {
      // First preference: any upcoming event marked active or featured
      const activeFeatured = nonExpiredUpcoming.find(e => e.status === 'active' || e.isFeatured === true);
      if (activeFeatured) {
        return NextResponse.json({
          success: true,
          active: true,
          banner: { ...activeFeatured, isFeatured: true }
        }, { headers: NO_CACHE_HEADERS });
      }

      // Next preference: the earliest upcoming event in sequence
      const nextUpcoming = nonExpiredUpcoming[0];
      return NextResponse.json({
        success: true,
        active: true,
        banner: { ...nextUpcoming, isFeatured: true },
        isFallbackUpcoming: true
      }, { headers: NO_CACHE_HEADERS });
    }

    // 6. Fallback if requested and default events are upcoming
    if (allowDefault && DEFAULT_EVENTS.length > 0) {
      const upcomingDefaults = getUpcomingEvents(DEFAULT_EVENTS);
      if (upcomingDefaults.length > 0) {
        return NextResponse.json({
          success: true,
          active: true,
          banner: mapDbRowToEvent(upcomingDefaults[0]),
          isDefault: true
        }, { headers: NO_CACHE_HEADERS });
      }
    }

    // 7. If all active and upcoming event banners are expired: Gracefully dismiss and return null
    return NextResponse.json({
      success: true,
      active: false,
      banner: null,
      message: 'All event banners expired. Fallen back to default hero layout.'
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
    const isActive = body.active !== undefined ? Boolean(body.active) : (body.status === 'active' || body.isFeatured === true);
    // Note: When deactivating a banner, the event status should be 'upcoming' (NOT 'inactive', to prevent isDeleted filtering)
    const status = isActive ? 'active' : 'upcoming';
    const isFeatured = isActive;
    const nowIso = new Date().toISOString();

    let bannerData = body.banner || null;

    // If eventId provided, look up full event details
    if (eventId && !bannerData) {
      try {
        const { data: evRow } = await supabaseAdmin
          .from('events')
          .select('*')
          .or(`id.eq.${eventId},slug.eq.${eventId}`)
          .maybeSingle();

        if (evRow) {
          bannerData = mapDbRowToEvent({ ...evRow, status, isFeatured });
        }
      } catch (e) {}

      if (!bannerData) {
        // Also check site_settings 'events'
        try {
          const { data: setRow } = await supabaseAdmin
            .from('site_settings')
            .select('data')
            .eq('key', 'events')
            .maybeSingle();
          if (Array.isArray(setRow?.data)) {
            const m = setRow.data.find((e: any) => e && (e.id === eventId || e.slug === eventId));
            if (m) bannerData = mapDbRowToEvent({ ...m, status, isFeatured });
          }
        } catch (_) {}
      }
    }

    if (bannerData) {
      bannerData = {
        ...bannerData,
        status,
        isFeatured,
        updatedAt: nowIso
      };
    }

    const bannerPayload = {
      active: isActive,
      status: isActive ? 'active' : 'inactive',
      eventId: isActive ? (eventId || bannerData?.id || null) : null,
      banner: isActive ? bannerData : null,
      updatedAt: nowIso
    };

    // 1. Update Supabase site_settings table (key: 'event_banner')
    try {
      await supabaseAdmin
        .from('site_settings')
        .upsert({
          key: 'event_banner',
          data: bannerPayload,
          updated_at: nowIso
        });
    } catch (e) {
      console.warn('Failed to upsert site_settings event_banner:', e);
    }

    // 2. Synchronize site_settings (key: 'events') array so GET /api/events never reverts the star!
    try {
      const { data: existingRow } = await supabaseAdmin
        .from('site_settings')
        .select('data')
        .eq('key', 'events')
        .maybeSingle();

      if (Array.isArray(existingRow?.data)) {
        const updatedList = existingRow.data.map((ev: any) => {
          if (!ev) return ev;
          const isTarget = ev.id === eventId || (ev.slug && ev.slug === eventId) || (bannerData && (ev.id === bannerData.id || ev.slug === bannerData.slug));
          if (isTarget) {
            return {
              ...ev,
              status,
              isFeatured,
              updatedAt: nowIso
            };
          }
          if (isActive) {
            // When setting an active banner, reset any previously active event to 'upcoming'
            if (ev.status === 'active' || ev.isFeatured === true) {
              return {
                ...ev,
                status: 'upcoming',
                isFeatured: false,
                updatedAt: nowIso
              };
            }
          }
          return ev;
        });

        await supabaseAdmin
          .from('site_settings')
          .upsert({
            key: 'events',
            data: updatedList,
            updated_at: nowIso
          });
      }
    } catch (e) {
      console.warn('Failed to sync events array in site_settings:', e);
    }

    // 3. Update PostgreSQL `events` table
    if (eventId) {
      try {
        if (isActive) {
          // Reset other active events in Postgres table
          await supabaseAdmin
            .from('events')
            .update({ status: 'upcoming', updated_at: nowIso })
            .eq('status', 'active');

          await supabaseAdmin
            .from('events')
            .update({ status: 'active', updated_at: nowIso })
            .or(`id.eq.${eventId},slug.eq.${eventId}`);
        } else {
          await supabaseAdmin
            .from('events')
            .update({ status: 'upcoming', updated_at: nowIso })
            .or(`id.eq.${eventId},slug.eq.${eventId}`);
        }
      } catch (e) {
        console.warn('Failed to update event status in events table:', e);
      }
    }

    // 4. Update memory store
    try {
      const inMem = loadPersistedEvents();
      if (Array.isArray(inMem) && inMem.length > 0) {
        const updatedMem = inMem.map(ev => {
          if (!ev) return ev;
          const isTarget = ev.id === eventId || (ev.slug && ev.slug === eventId);
          if (isTarget) {
            return { ...ev, status, isFeatured, updatedAt: nowIso };
          }
          if (isActive && (ev.status === 'active' || ev.isFeatured)) {
            return { ...ev, status: 'upcoming', isFeatured: false, updatedAt: nowIso };
          }
          return ev;
        });
        savePersistedEvents(updatedMem);
      }
    } catch (_) {}

    // 5. Invalidate Events Cache
    invalidateEventsCache();

    return NextResponse.json({
      success: true,
      active: isActive,
      status,
      isFeatured,
      banner: bannerData,
      payload: bannerPayload
    }, { headers: NO_CACHE_HEADERS });

  } catch (error: any) {
    console.error('Error in /api/events/banner POST:', error);
    return NextResponse.json({
      success: false,
      error: error?.message || 'Failed to save event banner'
    }, { status: 500, headers: NO_CACHE_HEADERS });
  }
}

