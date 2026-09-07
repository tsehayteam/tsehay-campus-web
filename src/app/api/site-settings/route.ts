export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase/server';

const NO_CACHE_HEADERS = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
  'CDN-Cache-Control': 'no-store',
  'Vercel-CDN-Cache-Control': 'no-store',
  'Pragma': 'no-cache',
  'Expires': '0',
};

const DEFAULT_SETTINGS: Record<string, any> = {
  landing_video: {
    url: 'https://player.mediadelivery.net/play/738515/e5140f50-c80d-424d-9830-6f1e2c5a0139',
    videoUrl: 'https://player.mediadelivery.net/play/738515/e5140f50-c80d-424d-9830-6f1e2c5a0139',
    thumbnail: '/assets/hero-bg-new.jpg',
  },
  youtube_portfolio: {
    localVideoUrl: 'https://youtu.be/h9JsGCkd_4o?si=qoSHzmD3-EWjin8k',
    internationalVideoUrl: 'https://youtu.be/6Ssyn7H3nWk?si=CGFugLZIcMiAW4oe',
  },
  about_video: {
    videoUrl: 'https://player.mediadelivery.net/play/738515/250574a7-8f25-4496-b31f-2fed1cd9d83a',
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
