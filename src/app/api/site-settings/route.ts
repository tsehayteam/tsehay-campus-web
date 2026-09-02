export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

import { NextRequest, NextResponse } from 'next/server';
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
    url: 'https://www.youtube.com/watch?v=mgdOMtW6J8k',
    videoUrl: 'https://www.youtube.com/watch?v=mgdOMtW6J8k',
    youtubeUrl: 'https://www.youtube.com/watch?v=mgdOMtW6J8k',
  },
  youtube_portfolio: {
    localVideoUrl: 'https://www.youtube.com/watch?v=mgdOMtW6J8k',
    internationalVideoUrl: 'https://www.youtube.com/watch?v=B-s71n0dHUk',
  },
};

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const settingKey = searchParams.get('settingKey') || searchParams.get('key') || 'youtube_portfolio';

    if (hasAdminCredentials && adminDb && typeof adminDb.collection === 'function') {
      // 1. Check nested artifacts collection
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

      // 2. Check root collection fallback
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
