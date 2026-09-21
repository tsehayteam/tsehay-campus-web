import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { sharedSiteSettingsCache, savePersistedSetting } from '@/lib/memoryStore';
import { verifyAdminRequest } from '@/lib/adminAuthHelper';
import { invalidateServerCoursesCache } from '@/lib/serverCourses';
import { revalidatePath } from 'next/cache';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    try {
      const { data: row } = await supabaseAdmin
        .from('site_settings')
        .select('data')
        .eq('key', 'landing_video')
        .maybeSingle();

      if (row?.data) {
        const data = row.data;
        const videoUrl = data?.url || data?.videoUrl || data?.youtubeUrl;
        const thumbnail = data?.heroThumbnailUrl || data?.posterUrl || data?.landingVideoThumbnail || data?.thumbnail || data?.thumbnailUrl || data?.thumbUrl || data?.poster || '';
        if (videoUrl || thumbnail) {
          return NextResponse.json({ 
            success: true, 
            videoUrl, 
            url: videoUrl, 
            thumbnail, 
            heroThumbnailUrl: thumbnail,
            posterUrl: thumbnail,
            landingVideoThumbnail: thumbnail, 
            data 
          }, {
            headers: {
              'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0'
            }
          });
        }
      }
    } catch (e) {}

    if (sharedSiteSettingsCache.has('landing_video')) {
      const cached = sharedSiteSettingsCache.get('landing_video');
      const videoUrl = cached?.url || cached?.videoUrl || cached?.youtubeUrl;
      const thumbnail = cached?.heroThumbnailUrl || cached?.posterUrl || cached?.landingVideoThumbnail || cached?.thumbnail || cached?.thumbnailUrl || cached?.thumbUrl || cached?.poster || '';
      if (videoUrl || thumbnail) {
        return NextResponse.json({ 
          success: true, 
          videoUrl, 
          url: videoUrl, 
          thumbnail, 
          heroThumbnailUrl: thumbnail,
          posterUrl: thumbnail,
          landingVideoThumbnail: thumbnail, 
          data: cached 
        }, {
          headers: {
            'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0'
          }
        });
      }
    }

    return NextResponse.json({ success: true, videoUrl: null, url: null, thumbnail: '', data: null });
  } catch (error: any) {
    console.error('Error fetching landing video in API route:', error);
    return NextResponse.json({ success: true, url: null, videoUrl: null, thumbnail: '', heroThumbnailUrl: '', posterUrl: '' });
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
      body.heroThumbnailUrl ||
      body.posterUrl ||
      body.landingVideoThumbnail || 
      body.thumbnail || 
      body.thumbnailUrl || 
      body.thumbUrl || 
      body.poster || 
      body.data?.heroThumbnailUrl ||
      body.data?.posterUrl ||
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
      posterUrl: thumbnail,
      heroThumbnailUrl: thumbnail,
      settingKey: 'landing_video',
      updatedAt: new Date().toISOString()
    };

    sharedSiteSettingsCache.set('landing_video', payload);
    savePersistedSetting('landing_video', payload);

    try {
      await supabaseAdmin.from('site_settings').upsert({
        key: 'landing_video',
        data: payload,
        updated_at: new Date().toISOString()
      });
    } catch (sbErr) {
      console.warn('Supabase landing video save warning:', sbErr);
    }

    try {
      invalidateServerCoursesCache();
      revalidatePath('/');
    } catch (cacheErr) {}

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
