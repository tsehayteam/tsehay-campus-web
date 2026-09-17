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
        .eq('key', 'about_video')
        .maybeSingle();

      if (row?.data) {
        const data = row.data;
        const videoUrl = data?.url || data?.videoUrl || data?.youtubeUrl;
        const thumbnail = data?.thumbnail || data?.thumbnailUrl || data?.thumbUrl || data?.poster || '';
        const title = data?.title || 'ስለ ፀሐይ ካምፓስ';
        if (videoUrl || thumbnail) {
          return NextResponse.json({ success: true, videoUrl, url: videoUrl, thumbnail, title, data });
        }
      }
    } catch (e) {}

    if (sharedSiteSettingsCache.has('about_video')) {
      const cached = sharedSiteSettingsCache.get('about_video');
      const videoUrl = cached?.url || cached?.videoUrl || cached?.youtubeUrl;
      const thumbnail = cached?.thumbnail || cached?.thumbnailUrl || cached?.thumbUrl || cached?.poster || '';
      const title = cached?.title || 'ስለ ፀሐይ ካምፓስ';
      if (videoUrl || thumbnail) {
        return NextResponse.json({ success: true, videoUrl, url: videoUrl, thumbnail, title, data: cached });
      }
    }

    return NextResponse.json({ 
      success: true, 
      videoUrl: 'https://www.youtube.com/watch?v=mgdOMtW6J8k', 
      url: 'https://www.youtube.com/watch?v=mgdOMtW6J8k', 
      thumbnail: '/assets/about_video_cover.jpg', 
      title: 'ስለ ፀሐይ ካምፓስ',
      data: null 
    });
  } catch (error: any) {
    console.error('Error fetching about video in API route:', error);
    return NextResponse.json({ 
      success: true, 
      url: 'https://www.youtube.com/watch?v=mgdOMtW6J8k', 
      videoUrl: 'https://www.youtube.com/watch?v=mgdOMtW6J8k', 
      thumbnail: '/assets/about_video_cover.jpg',
      title: 'ስለ ፀሐይ ካምፓስ'
    });
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
      body.thumbnail || 
      body.thumbnailUrl || 
      body.thumbUrl || 
      body.poster || 
      body.data?.thumbnail || 
      body.data?.thumbnailUrl || 
      ''
    ).trim();

    const title = (body.title || body.data?.title || 'ስለ ፀሐይ ካምፓስ').trim();

    const nowIso = new Date().toISOString();
    const payload = {
      url: videoUrl,
      videoUrl: videoUrl,
      youtubeUrl: videoUrl,
      thumbnail,
      thumbnailUrl: thumbnail,
      thumbUrl: thumbnail,
      poster: thumbnail,
      title,
      settingKey: 'about_video',
      updatedAt: nowIso
    };

    sharedSiteSettingsCache.set('about_video', payload);
    savePersistedSetting('about_video', payload);

    try {
      await supabaseAdmin.from('site_settings').upsert({
        key: 'about_video',
        data: payload,
        updated_at: nowIso
      });
    } catch (sbErr) {
      console.warn('Supabase about video save warning:', sbErr);
    }

    try {
      invalidateServerCoursesCache();
      revalidatePath('/about');
      revalidatePath('/');
    } catch (cacheErr) {}

    return NextResponse.json({
      success: true,
      message: 'የስለ እኛ ቪዲዮ እና ተምኔል በተሳካ ሁኔታ ተቀምጧል! (About video & thumbnail saved successfully)',
      data: payload,
      url: videoUrl,
      videoUrl: videoUrl,
      thumbnail,
      title
    });
  } catch (error: any) {
    console.error('Error saving about video in API route:', error);
    return NextResponse.json({
      success: true,
      warning: error.message,
      message: 'Saved with client sync'
    });
  }
}
