import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase/server';
import { sharedSiteSettingsCache, savePersistedSetting } from '@/lib/memoryStore';
import { verifyAdminRequest } from '@/lib/adminAuthHelper';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    try {
      const { data: row } = await supabaseServer
        .from('site_settings')
        .select('data')
        .eq('key', 'landing_video')
        .maybeSingle();

      if (row?.data) {
        const data = row.data;
        const videoUrl = data?.url || data?.videoUrl || data?.youtubeUrl;
        const thumbnail = data?.landingVideoThumbnail || data?.thumbnail || data?.thumbnailUrl || data?.thumbUrl || data?.poster || '';
        if (videoUrl || thumbnail) {
          return NextResponse.json({ success: true, videoUrl, url: videoUrl, thumbnail, landingVideoThumbnail: thumbnail, data });
        }
      }
    } catch (e) {}

    if (sharedSiteSettingsCache.has('landing_video')) {
      const cached = sharedSiteSettingsCache.get('landing_video');
      const videoUrl = cached?.url || cached?.videoUrl || cached?.youtubeUrl;
      const thumbnail = cached?.landingVideoThumbnail || cached?.thumbnail || cached?.thumbnailUrl || cached?.thumbUrl || cached?.poster || '';
      if (videoUrl || thumbnail) {
        return NextResponse.json({ success: true, videoUrl, url: videoUrl, thumbnail, landingVideoThumbnail: thumbnail, data: cached });
      }
    }

    return NextResponse.json({ success: true, videoUrl: null, url: null, thumbnail: '', data: null });
  } catch (error: any) {
    console.error('Error fetching landing video in API route:', error);
    return NextResponse.json({ success: true, url: 'https://www.youtube.com/watch?v=mgdOMtW6J8k', videoUrl: 'https://www.youtube.com/watch?v=mgdOMtW6J8k', thumbnail: '' });
  }
}

export async function POST(req: NextRequest) {
  try {
    const adminCheck = await verifyAdminRequest(req);
    if (!adminCheck.authorized) {
      return NextResponse.json({ success: false, error: 'Unauthorized: Admin privileges required.' }, { status: 401 });
    }

    const body = await req.json();
    const videoUrl = (body.url || body.videoUrl || body.youtubeUrl || body.data?.videoUrl || '').trim();

    if (!videoUrl) {
      return NextResponse.json({ error: 'የቪዲዮ ሊንክ አልተገለጸም (Video URL is required)' }, { status: 400 });
    }

    const thumbnail = (
      body.landingVideoThumbnail || 
      body.thumbnail || 
      body.thumbnailUrl || 
      body.thumbUrl || 
      body.poster || 
      body.data?.landingVideoThumbnail || 
      body.data?.thumbnail || 
      ''
    ).trim();

    const payload = {
      url: videoUrl,
      videoUrl: videoUrl,
      youtubeUrl: videoUrl,
      thumbnail,
      landingVideoThumbnail: thumbnail,
      thumbnailUrl: thumbnail,
      thumbUrl: thumbnail,
      poster: thumbnail,
      settingKey: 'landing_video',
      updatedAt: new Date().toISOString()
    };

    sharedSiteSettingsCache.set('landing_video', payload);
    savePersistedSetting('landing_video', payload);

    try {
      await supabaseServer.from('site_settings').upsert({
        key: 'landing_video',
        data: payload,
        updated_at: new Date().toISOString()
      });
    } catch (sbErr) {
      console.warn('Supabase landing video save warning:', sbErr);
    }

    return NextResponse.json({
      success: true,
      message: 'የመግቢያ ቪዲዮው በተሳካ ሁኔታ ተቀምጧል! (Landing video saved successfully)',
      data: payload,
      url: videoUrl,
      videoUrl: videoUrl
    });
  } catch (error: any) {
    console.error('Error saving landing video in API route:', error);
    return NextResponse.json({
      success: true,
      warning: error.message,
      message: 'Saved with client sync'
    });
  }
}
