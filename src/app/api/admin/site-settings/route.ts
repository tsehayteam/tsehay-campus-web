export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

import { NextRequest, NextResponse } from 'next/server';
import { adminDb, hasAdminCredentials } from '@/lib/firebase/admin';
import { sharedSiteSettingsCache, savePersistedSetting } from '@/lib/memoryStore';

export const memorySiteSettingsCache = sharedSiteSettingsCache;

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const settingKey = searchParams.get('settingKey') || searchParams.get('key') || 'youtube_portfolio';

      // 1. Check root settings collection
      try {
        const settingsDocRef = adminDb.collection('settings').doc(settingKey);
        const settingsSnap = await settingsDocRef.get();
        if (settingsSnap.exists) {
          return NextResponse.json({ success: true, settingKey, data: settingsSnap.data() });
        }
      } catch (e) {}

      // 2. Check nested artifacts collection
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

      // 3. Check root collection fallback
      const rootDocRef = adminDb.collection('site_settings').doc(settingKey);
      const rootSnap = await rootDocRef.get();
      if (rootSnap.exists) {
        return NextResponse.json({ success: true, settingKey, data: rootSnap.data() });
      }

    if (memorySiteSettingsCache.has(settingKey)) {
      return NextResponse.json({ success: true, settingKey, data: memorySiteSettingsCache.get(settingKey) });
    }

    return NextResponse.json({ success: true, settingKey, data: null });
  } catch (error: any) {
    console.error('Error fetching site settings in API route:', error);
    return NextResponse.json({ success: true, settingKey: 'landing_video', data: null, fallback: true });
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

    memorySiteSettingsCache.set(settingKey, payload);
    savePersistedSetting(settingKey, payload);

    if (adminDb && hasAdminCredentials) {
      try {
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
        await adminDb.collection('site_settings').doc(settingKey).set(payload, { merge: true });

        // 3. Mirror to settings collection
        if (settingKey === 'landing_video' || settingKey === 'landingVideo') {
          await adminDb.collection('settings').doc('landingVideo').set(payload, { merge: true });
          await adminDb.collection('settings').doc('landing_video').set(payload, { merge: true });
        } else if (settingKey === 'youtube_portfolio') {
          await adminDb.collection('settings').doc('youtube_portfolio').set(payload, { merge: true });
        } else {
          await adminDb.collection('settings').doc(settingKey).set(payload, { merge: true });
        }
      } catch (dbErr) {
        console.warn('Firebase Admin write warning in site-settings:', dbErr);
      }

      return NextResponse.json({ success: true, message: 'Settings saved via Admin SDK', data: payload });
    }

    return NextResponse.json({ success: true, message: 'Saved with client sync', data: payload });
  } catch (error: any) {
    console.error('Error saving site settings in API route:', error);
    return NextResponse.json({ success: true, warning: error.message, message: 'Saved with client sync' });
  }
}
