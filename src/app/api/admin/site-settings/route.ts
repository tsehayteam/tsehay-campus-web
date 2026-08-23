import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const settingKey = searchParams.get('settingKey') || searchParams.get('key') || 'youtube_portfolio';

    if (adminDb) {
      // 1. Check nested artifacts collection
      const docRef = adminDb
        .collection('artifacts')
        .doc('tsehaycampus-e1a6d')
        .collection('public')
        .doc('data')
        .collection('site_settings')
        .doc(settingKey);
      
      const snap = await docRef.get();
      if (snap.exists) {
        return NextResponse.json({ success: true, settingKey, data: snap.data() });
      }

      // 2. Check root collection fallback
      const rootDocRef = adminDb.collection('site_settings').doc(settingKey);
      const rootSnap = await rootDocRef.get();
      if (rootSnap.exists) {
        return NextResponse.json({ success: true, settingKey, data: rootSnap.data() });
      }
    }

    return NextResponse.json({ success: true, settingKey, data: null });
  } catch (error: any) {
    console.error('Error fetching site settings in API route:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { settingKey, data } = body;

    if (!settingKey || !data) {
      return NextResponse.json({ error: 'Missing settingKey or data' }, { status: 400 });
    }

    const payload = {
      ...data,
      settingKey,
      updatedAt: new Date().toISOString()
    };

    if (adminDb) {
      // 1. Write to artifacts/tsehaycampus-e1a6d/public/data/site_settings/${settingKey}
      const docRef = adminDb
        .collection('artifacts')
        .doc('tsehaycampus-e1a6d')
        .collection('public')
        .doc('data')
        .collection('site_settings')
        .doc(settingKey);
      
      await docRef.set(payload, { merge: true });

      // 2. Mirror to root site_settings
      try {
        await adminDb.collection('site_settings').doc(settingKey).set(payload, { merge: true });
      } catch (e) {}

      return NextResponse.json({ success: true, message: 'Settings saved via Admin SDK', data: payload });
    }

    return NextResponse.json({ success: true, message: 'Saved with client sync', data: payload });
  } catch (error: any) {
    console.error('Error saving site settings in API route:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
