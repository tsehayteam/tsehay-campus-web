import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { DEFAULT_EVENTS, TsehayEvent } from '@/lib/eventCache';

const AUTHORIZED_ADMIN_EMAILS = [
  'admin@tsehaycampus.com',
  'tsehayoperation@gmail.com',
  'eyoubsahle@gmail.com',
  'habte@gmail.com',
  'cryptomaster758@gmail.com'
];

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const eventId = searchParams.get('id') || searchParams.get('eventId');

    if (!adminDb) {
      if (eventId) {
        const found = DEFAULT_EVENTS.find(e => e.id === eventId);
        return NextResponse.json({ success: true, event: found || null });
      }
      return NextResponse.json({ success: true, events: DEFAULT_EVENTS, count: DEFAULT_EVENTS.length });
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
        return NextResponse.json({ success: true, event: { id: snap.id, ...snap.data() } });
      }

      const defaultMatch = DEFAULT_EVENTS.find(e => e.id === eventId);
      if (defaultMatch) {
        return NextResponse.json({ success: true, event: defaultMatch });
      }

      return NextResponse.json({ success: false, error: 'Event not found' }, { status: 404 });
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

    if (events.length === 0) {
      events = DEFAULT_EVENTS;
    }

    return NextResponse.json({ success: true, events, count: events.length });
  } catch (error: any) {
    console.error('Error fetching events:', error);
    return NextResponse.json({ success: true, events: DEFAULT_EVENTS, count: DEFAULT_EVENTS.length, error: error.message });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const eventData = body.event || body;
    const eventId = eventData.id || `evt_${Date.now()}`;

    if (!adminDb) {
      return NextResponse.json({ error: 'Database service unavailable' }, { status: 500 });
    }

    const payload = {
      ...eventData,
      id: eventId,
      updatedAt: new Date().toISOString(),
      capacity: Number(eventData.capacity) || 100,
      price: Number(eventData.price) || 0,
      registeredCount: Number(eventData.registeredCount) || 0
    };

    // Save to primary nested path and backup root path
    await adminDb
      .collection('artifacts')
      .doc('tsehaycampus-e1a6d')
      .collection('public')
      .doc('data')
      .collection('events')
      .doc(eventId)
      .set(payload, { merge: true });

    try {
      await adminDb.collection('events').doc(eventId).set(payload, { merge: true });
    } catch (e) {}

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

    if (!eventId || !adminDb) {
      return NextResponse.json({ error: 'Event ID required' }, { status: 400 });
    }

    await adminDb
      .collection('artifacts')
      .doc('tsehaycampus-e1a6d')
      .collection('public')
      .doc('data')
      .collection('events')
      .doc(eventId)
      .delete();

    try {
      await adminDb.collection('events').doc(eventId).delete();
    } catch (e) {}

    return NextResponse.json({ success: true, deletedId: eventId });
  } catch (error: any) {
    console.error('Error deleting event:', error);
    return NextResponse.json({ error: error.message || 'Failed to delete event' }, { status: 500 });
  }
}
