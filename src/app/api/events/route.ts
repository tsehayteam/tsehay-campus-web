import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { DEFAULT_EVENTS, TsehayEvent, formatDriveImageUrl } from '@/lib/eventCache';

const AUTHORIZED_ADMIN_EMAILS = [
  'eyobsahle@gmail.com',
  'eyoubsahle@gmail.com',
  'admin@tsehaycampus.com',
  'tsehayoperation@gmail.com',
  'habte@gmail.com',
  'cryptomaster758@gmail.com'
];

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const eventId = searchParams.get('id') || searchParams.get('eventId');

    if (!adminDb) {
      if (eventId) {
        const found = DEFAULT_EVENTS.find(e => e.id === eventId || e.slug === eventId);
        return NextResponse.json({ 
          success: true, 
          event: found ? { ...found, image: formatDriveImageUrl(found.image) || found.image } : null 
        });
      }
      return NextResponse.json({ 
        success: true, 
        events: DEFAULT_EVENTS.map(e => ({ ...e, image: formatDriveImageUrl(e.image) || e.image })), 
        count: DEFAULT_EVENTS.length 
      });
    }

    if (eventId) {
      // 1. Try nested collection
      const docRef = adminDb
        .collection('artifacts')
        .doc('tsehaycampus-e1a6d')
        .collection('public')
        .doc('data')
        .collection('events')
        .doc(eventId);

      let snap = await docRef.get();
      if (!snap.exists) {
        snap = await adminDb.collection('events').doc(eventId).get();
      }

      if (snap.exists) {
        const evData: any = { id: snap.id, ...snap.data() };
        evData.image = formatDriveImageUrl(evData.image) || evData.image;
        const cap = Number(evData.capacity) || 100;
        const reg = Number(evData.registeredCount) || 0;
        evData.remainingSeats = evData.remainingSeats !== undefined && typeof evData.remainingSeats === 'number'
          ? Math.max(0, evData.remainingSeats)
          : Math.max(0, cap - reg);
        return NextResponse.json({ success: true, event: evData });
      }

      const defaultMatch = DEFAULT_EVENTS.find(e => e.id === eventId || e.slug === eventId);
      if (defaultMatch) {
        const cap = Number(defaultMatch.capacity) || 100;
        const reg = Number(defaultMatch.registeredCount) || 0;
        const remaining = defaultMatch.remainingSeats ?? Math.max(0, cap - reg);
        return NextResponse.json({ 
          success: true, 
          event: { 
            ...defaultMatch, 
            remainingSeats: remaining,
            image: formatDriveImageUrl(defaultMatch.image) || defaultMatch.image 
          } 
        });
      }

      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    // List all events
    const snapshot = await adminDb
      .collection('artifacts')
      .doc('tsehaycampus-e1a6d')
      .collection('public')
      .doc('data')
      .collection('events')
      .get();

    let events: any[] = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    if (events.length === 0) {
      try {
        const rootSnap = await adminDb.collection('events').get();
        if (!rootSnap.empty) {
          events = rootSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        }
      } catch (e) {}
    }

    // Auto-seed default events with persistent remainingSeats if collection was empty
    if (events.length === 0) {
      events = DEFAULT_EVENTS;
      try {
        for (const ev of DEFAULT_EVENTS) {
          const cap = Number(ev.capacity) || 100;
          const reg = Number(ev.registeredCount) || 0;
          const rem = ev.remainingSeats ?? Math.max(0, cap - reg);
          const seeded = {
            ...ev,
            remainingSeats: rem,
            registeredCount: reg,
            capacity: cap,
            updatedAt: new Date().toISOString()
          };
          await adminDb.collection('events').doc(ev.id).set(seeded, { merge: true });
          await adminDb.collection('artifacts').doc('tsehaycampus-e1a6d').collection('public').doc('data').collection('events').doc(ev.id).set(seeded, { merge: true });
        }
      } catch (seedErr) {
        console.warn('Auto-seed default events note:', seedErr);
      }
    }

    events = events.map(e => {
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

    return NextResponse.json({ success: true, events, count: events.length });
  } catch (error: any) {
    console.error('Error fetching events:', error);
    const fallbackEvents = DEFAULT_EVENTS.map(e => ({
      ...e,
      remainingSeats: e.remainingSeats ?? (e.capacity - e.registeredCount),
      image: formatDriveImageUrl(e.image) || e.image
    }));
    return NextResponse.json({ success: true, events: fallbackEvents, count: fallbackEvents.length, error: error.message });
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

    if (adminDb) {
      try {
        await adminDb
          .collection('artifacts')
          .doc('tsehaycampus-e1a6d')
          .collection('public')
          .doc('data')
          .collection('events')
          .doc(eventId)
          .set(payload, { merge: true });

        await adminDb.collection('events').doc(eventId).set(payload, { merge: true });
      } catch (dbErr) {
        console.warn('Firebase Admin event save warning:', dbErr);
      }
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

    if (adminDb) {
      try {
        await adminDb
          .collection('artifacts')
          .doc('tsehaycampus-e1a6d')
          .collection('public')
          .doc('data')
          .collection('events')
          .doc(eventId)
          .delete();

        await adminDb.collection('events').doc(eventId).delete();
      } catch (dbErr) {
        console.warn('Firebase Admin event delete warning:', dbErr);
      }
    }

    return NextResponse.json({ success: true, deletedId: eventId });
  } catch (error: any) {
    console.error('Error deleting event:', error);
    return NextResponse.json({ error: error.message || 'Failed to delete event' }, { status: 500 });
  }
}
