export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase/server';
import { adminDb, hasAdminCredentials } from '@/lib/firebase/admin';

const NO_CACHE_HEADERS = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
  'CDN-Cache-Control': 'no-store',
  'Vercel-CDN-Cache-Control': 'no-store',
  'Pragma': 'no-cache',
  'Expires': '0',
};

const DEFAULT_SETTINGS: Record<string, any> = {
  landing_video: {
    url: 'https://iframe.mediadelivery.net/embed/738515/e5140f50-c80d-424d-9830-6f1e2c5a0139',
    videoUrl: 'https://iframe.mediadelivery.net/embed/738515/e5140f50-c80d-424d-9830-6f1e2c5a0139',
    thumbnail: '/assets/hero-bg-new.jpg',
  },
  youtube_portfolio: {
    localVideoUrl: 'https://youtu.be/h9JsGCkd_4o?si=qoSHzmD3-EWjin8k',
    internationalVideoUrl: 'https://youtu.be/6Ssyn7H3nWk?si=CGFugLZIcMiAW4oe',
  },
  about_video: {
    videoUrl: 'https://iframe.mediadelivery.net/embed/738515/250574a7-8f25-4496-b31f-2fed1cd9d83a',
    thumbnail: '/assets/about_video_cover.jpg',
  }
};

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const settingKey = searchParams.get('settingKey') || searchParams.get('key') || 'youtube_portfolio';

    // 1. Primary: Supabase site_settings table
    try {
      const { data: sbRow, error: sbErr } = await supabaseServer
        .from('site_settings')
        .select('*')
        .eq('key', settingKey)
        .maybeSingle();

      if (!sbErr && sbRow?.data) {
        return NextResponse.json(
          { success: true, settingKey, data: sbRow.data },
          { headers: NO_CACHE_HEADERS }
        );
      }
    } catch (e) {
      console.warn('Supabase site_settings GET error in public API:', e);
    }

    // 2. Firebase Admin fallback
    if (hasAdminCredentials && adminDb && typeof adminDb.collection === 'function') {
      // Check root settings collection & aliases
      try {
        const settingsDocRef = adminDb.collection('settings').doc(settingKey);
        const settingsSnap = await settingsDocRef.get();
        if (settingsSnap.exists) {
          return NextResponse.json(
            { success: true, settingKey, data: settingsSnap.data() },
            { headers: NO_CACHE_HEADERS }
          );
        }

        const aliasKey = settingKey === 'landing_video' ? 'landingVideo' : (settingKey === 'landingVideo' ? 'landing_video' : '');
        if (aliasKey) {
          const aliasSnap = await adminDb.collection('settings').doc(aliasKey).get();
          if (aliasSnap.exists) {
            return NextResponse.json(
              { success: true, settingKey, data: aliasSnap.data() },
              { headers: NO_CACHE_HEADERS }
            );
          }
        }
      } catch (e) {}

      // Check nested artifacts collection
      try {
        const docRef = adminDb
          .collection('artifacts')
          .doc('tsehaycampus-e1a6d')
          .collection('public')
          .doc('data')
          .collection('site_settings')
          .doc(settingKey);
        
        const snap = await docRef.get();
        if (snap.exists) {
          return NextResponse.json(
            { success: true, settingKey, data: snap.data() },
            { headers: NO_CACHE_HEADERS }
          );
        }
      } catch (e) {}

      // Check root collection fallback
      try {
        const rootDocRef = adminDb.collection('site_settings').doc(settingKey);
        const rootSnap = await rootDocRef.get();
        if (rootSnap.exists) {
          return NextResponse.json(
            { success: true, settingKey, data: rootSnap.data() },
            { headers: NO_CACHE_HEADERS }
          );
        }
      } catch (e) {}
    }

    const fallbackData = DEFAULT_SETTINGS[settingKey] || null;
    return NextResponse.json(
      { success: true, settingKey, data: fallbackData },
      { headers: NO_CACHE_HEADERS }
    );
  } catch (error: any) {
    console.error('Error fetching public site settings:', error);
    return NextResponse.json(
      { success: true, settingKey: 'default', data: null },
      { headers: NO_CACHE_HEADERS }
    );
  }
}
