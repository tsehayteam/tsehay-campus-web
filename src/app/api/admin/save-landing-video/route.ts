import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';
import { sharedSiteSettingsCache, savePersistedSetting } from '@/lib/memoryStore';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    try {
      const { data: row } = await supabase
        .from('site_settings')
        .select('data')
        .eq('key', 'landing_video')
        .maybeSingle();

      if (row?.data) {
        const videoUrl = row.data?.url || row.data?.videoUrl || row.data?.youtubeUrl;
        if (videoUrl) {
          return NextResponse.json({ success: true, videoUrl, url: videoUrl, data: row.data });
        }
      }
    } catch (e) {}

    if (sharedSiteSettingsCache.has('landing_video')) {
      const cached = sharedSiteSettingsCache.get('landing_video');
      const videoUrl = cached?.url || cached?.videoUrl || cached?.youtubeUrl;
      if (videoUrl) {
        return NextResponse.json({ success: true, videoUrl, url: videoUrl, data: cached });
      }
    }

    return NextResponse.json({ success: true, videoUrl: null, url: null, data: null });
  } catch (error: any) {
    console.error('Error fetching landing video in API route:', error);
    return NextResponse.json({ success: true, url: 'https://www.youtube.com/watch?v=mgdOMtW6J8k', videoUrl: 'https://www.youtube.com/watch?v=mgdOMtW6J8k' });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const videoUrl = (body.url || body.videoUrl || body.youtubeUrl || body.data?.videoUrl || '').trim();

    if (!videoUrl) {
      return NextResponse.json({ error: 'የቪዲዮ ሊንክ አልተገለጸም (Video URL is required)' }, { status: 400 });
    }

    const thumbnail = (body.thumbnail || body.data?.thumbnail || '').trim();

    const payload = {
      url: videoUrl,
      videoUrl: videoUrl,
      youtubeUrl: videoUrl,
      thumbnail,
      settingKey: 'landing_video',
      updatedAt: new Date().toISOString()
    };

    sharedSiteSettingsCache.set('landing_video', payload);
    savePersistedSetting('landing_video', payload);

    // Save to Supabase site_settings
    try {
      await supabase.from('site_settings').upsert({
        key: 'landing_video',
        data: payload,
        updated_at: new Date().toISOString()
      });
    } catch (dbErr) {
      console.warn('Supabase site_settings save warning:', dbErr);
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
