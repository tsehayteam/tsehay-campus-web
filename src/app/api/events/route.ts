import { NextRequest, NextResponse } from 'next/server';

import { DEFAULT_EVENTS, TsehayEvent, formatDriveImageUrl } from '@/lib/eventCache';
import { supabase } from '@/lib/supabase/client';
import { 
  loadPersistedEvents, 
  savePersistedEvents, 
  saveSinglePersistedEvent, 
  deletePersistedEvent 
} from '@/lib/memoryStore';

const AUTHORIZED_ADMIN_EMAILS = [
  'eyobsahle@gmail.com'
];

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const eventId = searchParams.get('id') || searchParams.get('eventId');

    // 1. Check in-memory / persisted events
    const memoryEvents = loadPersistedEvents();

    if (eventId) {
      // 0. Primary Supabase Lookup
      try {
        const { data: sbEvent, error: sbErr } = await supabase
          .from('events')
          .select('*')
          .or(`id.eq.${eventId},slug.eq.${eventId}`)
          .maybeSingle();

        if (sbEvent && !sbErr) {
          const cap = Number(sbEvent.capacity) || 100;
          const reg = Number(sbEvent.registered_count ?? sbEvent.registeredCount) || 0;
          const rem = Math.max(0, cap - reg);
          const evData: any = {
            ...sbEvent,
            id: sbEvent.id,
            isOnline: sbEvent.is_online ?? sbEvent.isOnline,
            meetingLink: sbEvent.meeting_link ?? sbEvent.meetingLink,
            mapsUrl: sbEvent.maps_url ?? sbEvent.mapsUrl,
            registeredCount: reg,
            capacity: cap,
            remainingSeats: rem,
            image: formatDriveImageUrl(sbEvent.image) || sbEvent.image
          };
          saveSinglePersistedEvent(evData);
          return NextResponse.json({ success: true, event: evData });
        }
      } catch (sbE) {}



      const found = memoryEvents.find(e => e.id === eventId || e.slug === eventId) ||
                    DEFAULT_EVENTS.find(e => e.id === eventId || e.slug === eventId);
      if (found) {
        return NextResponse.json({ 
          success: true, 
          event: { ...found, image: formatDriveImageUrl(found.image) || found.image } 
        });
      }

      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    // List all events: build unified map starting with DEFAULT_EVENTS, then memoryEvents
    const eventMap = new Map<string, any>();
    DEFAULT_EVENTS.forEach(e => {
      eventMap.set(e.id, { ...e });
    });
    memoryEvents.forEach(e => {
      if (e && e.id) {
        eventMap.set(e.id, { ...(eventMap.get(e.id) || {}), ...e });
      }
    });

    // Primary: Fetch live from Supabase
    try {
      const { data: sbEvents, error: sbListErr } = await supabase.from('events').select('*');
      if (!sbListErr && Array.isArray(sbEvents)) {
        sbEvents.forEach(item => {
          if (item && item.id) {
            eventMap.set(item.id, {
              ...item,
              isOnline: item.is_online ?? item.isOnline,
              meetingLink: item.meeting_link ?? item.meetingLink,
              mapsUrl: item.maps_url ?? item.mapsUrl,
              registeredCount: item.registered_count ?? item.registeredCount,
              speakerRole: item.speaker_role ?? item.speakerRole,
              tags: Array.isArray(item.tags) ? item.tags : []
            });
          }
        });
      }
    } catch (sbListE) {}



    const events = Array.from(eventMap.values()).map(e => {
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

    savePersistedEvents(events);

    return NextResponse.json({ success: true, events, count: events.length });
  } catch (error: any) {
    console.error('Error fetching events:', error);
    const fallback = loadPersistedEvents();
    return NextResponse.json({ success: true, events: fallback, count: fallback.length, error: error.message });
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

    saveSinglePersistedEvent(payload);

    // Primary: Save directly to Supabase events table
    try {
      await supabase.from('events').upsert({
        id: eventId,
        slug: payload.slug || eventId,
        title: payload.title,
        title_en: payload.titleEn || null,
        description: payload.description || '',
        date: payload.date || '',
        time: payload.time || '',
        location: payload.location || '',
        is_online: !!payload.isOnline,
        meeting_link: payload.meetingLink || null,
        maps_url: payload.mapsUrl || null,
        capacity: cap,
        registered_count: reg,
        price: payload.price || 0,
        is_free: !!payload.isFree || payload.price === 0,
        speaker: payload.speaker || '',
        speaker_role: payload.speakerRole || '',
        image: formattedImage,
        tags: Array.isArray(payload.tags) ? payload.tags : [],
        status: payload.status || 'upcoming',
        updated_at: new Date().toISOString()
      });
    } catch (sbSaveErr) {
      console.warn('Supabase event save warning:', sbSaveErr);
    }

    return NextResponse.json({ success: true, event: payload });
  } catch (error: any) {
    console.error('Error saving event:', error);
    return NextResponse.json({ error: error.message || 'Failed to save event' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const eventId = searchParams.get('id') || searchParams.get('eventId');

    if (!eventId) {
      return NextResponse.json({ error: 'Event ID required' }, { status: 400 });
    }

    deletePersistedEvent(eventId);

    // Primary: Delete from Supabase events table
    try {
      await supabase.from('events').delete().eq('id', eventId);
      await supabase.from('events').delete().eq('slug', eventId);
    } catch (sbDelErr) {
      console.warn('Supabase event delete warning:', sbDelErr);
    }

    return NextResponse.json({ success: true, deletedId: eventId });
  } catch (error: any) {
    console.error('Error deleting event:', error);
    return NextResponse.json({ error: error.message || 'Failed to delete event' }, { status: 500 });
  }
}
