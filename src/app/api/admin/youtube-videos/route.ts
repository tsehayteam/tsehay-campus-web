export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { supabaseAdmin } from '@/lib/supabase/server';
import { verifyAdminRequest } from '@/lib/adminAuthHelper';
import { invalidateServerCoursesCache } from '@/lib/serverCourses';

const NO_CACHE_HEADERS = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
  'CDN-Cache-Control': 'no-store',
  'Vercel-CDN-Cache-Control': 'no-store',
  'Pragma': 'no-cache',
  'Expires': '0',
};

const DEFAULT_VIDEOS = [
  {
    id: 'yt-1',
    title: 'የዩቲዩብ ቻናል አከፋፈት እና ሙሉ ሴቲንግ (Full Setup)',
    youtubeUrl: 'https://www.youtube.com/watch?v=mgdOMtW6J8k',
    youtubeId: 'mgdOMtW6J8k',
    thumbnail: 'https://img.youtube.com/vi/mgdOMtW6J8k/hqdefault.jpg',
    videoSrc: '',
    order: 1,
  },
  {
    id: 'yt-2',
    title: 'ያለ ፊት (Faceless) በ AI ቪዲዮዎችን ማዘጋጀት',
    youtubeUrl: 'https://www.youtube.com/watch?v=mgdOMtW6J8k',
    youtubeId: 'mgdOMtW6J8k',
    thumbnail: 'https://img.youtube.com/vi/mgdOMtW6J8k/hqdefault.jpg',
    videoSrc: '',
    order: 2,
  },
  {
    id: 'yt-3',
    title: 'የዩቲዩብ ስኬት ሚስጥሮች እና ገቢ ማግኛ መንገዶች',
    youtubeUrl: 'https://www.youtube.com/watch?v=B-s71n0dHUk',
    youtubeId: 'B-s71n0dHUk',
    thumbnail: 'https://img.youtube.com/vi/B-s71n0dHUk/hqdefault.jpg',
    videoSrc: '',
    order: 3,
  },
  {
    id: 'yt-4',
    title: 'የሼን (Shein) ኢምፖርት ቢዝነስ አሰራር',
    youtubeUrl: 'https://www.youtube.com/watch?v=mgdOMtW6J8k',
    youtubeId: 'mgdOMtW6J8k',
    thumbnail: 'https://img.youtube.com/vi/mgdOMtW6J8k/hqdefault.jpg',
    videoSrc: '',
    order: 4,
  },
  {
    id: 'yt-5',
    title: 'ዲጂታል ማርኬቲንግ እና AI ለጀማሪዎች',
    youtubeUrl: 'https://www.youtube.com/watch?v=B-s71n0dHUk',
    youtubeId: 'B-s71n0dHUk',
    thumbnail: 'https://img.youtube.com/vi/B-s71n0dHUk/hqdefault.jpg',
    videoSrc: '',
    order: 5,
  },
];

/**
 * Resilient fetch from both youtube_videos table and site_settings fallback
 */
async function getAllVideos(): Promise<any[]> {
  // 1. Try PostgreSQL youtube_videos table
  try {
    const { data: rows, error: sbErr } = await supabaseAdmin
      .from('youtube_videos')
      .select('*')
      .order('order_num', { ascending: true });

    if (!sbErr && Array.isArray(rows) && rows.length > 0) {
      return rows.map(r => ({
        id: r.id,
        title: r.title || 'ነፃ የዩቲዩብ ስልጠና',
        youtubeUrl: r.youtube_url || (r.youtube_id ? `https://www.youtube.com/watch?v=${r.youtube_id}` : ''),
        youtubeId: r.youtube_id || '',
        thumbnail: r.thumbnail || (r.youtube_id ? `https://img.youtube.com/vi/${r.youtube_id}/hqdefault.jpg` : ''),
        videoSrc: r.video_src || '',
        order: r.order_num ?? 0,
        timestamp: r.timestamp,
        updatedAt: r.updated_at
      }));
    }
  } catch (e) {
    console.warn('Error reading from youtube_videos table:', e);
  }

  // 2. Fallback to site_settings key 'youtube_videos'
  try {
    const { data: settingsRow } = await supabaseAdmin
      .from('site_settings')
      .select('data')
      .eq('key', 'youtube_videos')
      .maybeSingle();

    if (settingsRow?.data && Array.isArray(settingsRow.data) && settingsRow.data.length > 0) {
      return settingsRow.data;
    }
  } catch (e) {
    console.warn('Error reading from site_settings:', e);
  }

  // 3. If completely empty, auto-seed default videos into both stores
  try {
    await seedDefaultVideos();
  } catch (e) {}

  return DEFAULT_VIDEOS;
}

/**
 * Seeds default videos into both stores when database is freshly initialized
 */
async function seedDefaultVideos(): Promise<void> {
  const nowIso = new Date().toISOString();
  // Seed into youtube_videos table
  const rows = DEFAULT_VIDEOS.map((v, idx) => ({
    id: v.id,
    title: v.title,
    youtube_url: v.youtubeUrl,
    youtube_id: v.youtubeId,
    thumbnail: v.thumbnail,
    video_src: '',
    order_num: v.order ?? idx,
    timestamp: nowIso,
    updated_at: nowIso
  }));

  try {
    await supabaseAdmin.from('youtube_videos').upsert(rows);
  } catch (e) {}

  // Seed into site_settings
  try {
    await supabaseAdmin.from('site_settings').upsert({
      key: 'youtube_videos',
      data: DEFAULT_VIDEOS,
      updated_at: nowIso
    });
  } catch (e) {}
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const videoId = searchParams.get('id');

    const videos = await getAllVideos();

    // 1. Single video lookup
    if (videoId) {
      const match = videos.find(v => v.id === videoId);
      if (match) {
        return NextResponse.json({ success: true, video: match }, { headers: NO_CACHE_HEADERS });
      }
      return NextResponse.json({ success: false, error: 'Video not found' }, { status: 404, headers: NO_CACHE_HEADERS });
    }

    return NextResponse.json({ success: true, count: videos.length, videos }, { headers: NO_CACHE_HEADERS });
  } catch (error: any) {
    console.error('Error in GET /api/admin/youtube-videos:', error);
    return NextResponse.json({ success: true, count: DEFAULT_VIDEOS.length, videos: DEFAULT_VIDEOS, error: error.message }, { headers: NO_CACHE_HEADERS });
  }
}

export async function POST(req: NextRequest) {
  const auth = await verifyAdminRequest(req);
  if (!auth.authorized) {
    return NextResponse.json(
      { success: false, error: auth.error || 'ይቅርታ፣ ይህንን ለማድረግ የአድሚን ፈቃድ የለዎትም።' },
      { status: 403, headers: NO_CACHE_HEADERS }
    );
  }

  try {
    const body = await req.json();
    const { videoData } = body;

    if (!videoData) {
      return NextResponse.json({ success: false, error: 'Missing videoData payload' }, { status: 400, headers: NO_CACHE_HEADERS });
    }

    const docId = videoData.id || `yt_${Date.now()}`;
    const nowIso = new Date().toISOString();
    const orderNum = typeof videoData.order === 'number' ? videoData.order : Number(videoData.order) || 0;

    // Strict schema-aligned payload for PostgreSQL table (NO is_public or status columns!)
    const tableRow = {
      id: docId,
      title: videoData.title ? videoData.title.trim() : 'ነፃ የዩቲዩብ ስልጠና',
      youtube_url: videoData.youtubeUrl ? videoData.youtubeUrl.trim() : '',
      youtube_id: videoData.youtubeId || '',
      thumbnail: videoData.thumbnail ? videoData.thumbnail.trim() : '',
      video_src: videoData.videoSrc ? videoData.videoSrc.trim() : '',
      order_num: orderNum,
      timestamp: nowIso,
      updated_at: nowIso,
    };

    const frontendVideo = {
      id: docId,
      title: tableRow.title,
      youtubeUrl: tableRow.youtube_url,
      youtubeId: tableRow.youtube_id,
      thumbnail: tableRow.thumbnail,
      videoSrc: tableRow.video_src,
      order: orderNum,
      timestamp: Date.now(),
      updatedAt: nowIso
    };

    let tableSaveOk = false;
    let settingsSaveOk = false;

    // 1. Save to Supabase youtube_videos table
    try {
      const { error: sbErr } = await supabaseAdmin
        .from('youtube_videos')
        .upsert(tableRow);

      if (!sbErr) {
        tableSaveOk = true;
      } else {
        console.warn('Supabase youtube_videos table upsert warning:', sbErr);
      }
    } catch (err) {
      console.warn('Supabase table error:', err);
    }

    // 2. Dual-store in site_settings key 'youtube_videos' for resilience
    try {
      const currentVideos = await getAllVideos();
      const filtered = currentVideos.filter(v => v.id !== docId);
      const updatedList = [...filtered, frontendVideo].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

      const { error: ssErr } = await supabaseAdmin
        .from('site_settings')
        .upsert({
          key: 'youtube_videos',
          data: updatedList,
          updated_at: nowIso
        });

      if (!ssErr) {
        settingsSaveOk = true;
      } else {
        console.warn('Supabase site_settings upsert warning:', ssErr);
      }
    } catch (err) {
      console.warn('Supabase site_settings error:', err);
    }

    if (!tableSaveOk && !settingsSaveOk) {
      return NextResponse.json(
        { success: false, error: 'ቪዲዮውን ማስቀመጥ አልተቻለም (Failed to persist video to database)' },
        { status: 500, headers: NO_CACHE_HEADERS }
      );
    }

    try {
      invalidateServerCoursesCache();
      revalidatePath('/', 'page');
      revalidatePath('/');
      revalidatePath('/admin');
    } catch (e) {}

    return NextResponse.json({
      success: true,
      message: 'የዩቲዩብ ቪዲዮው በተሳካ ሁኔታ ተቀምጧል! (YouTube Video Saved Successfully)',
      docId,
      video: frontendVideo
    }, { headers: NO_CACHE_HEADERS });

  } catch (error: any) {
    console.error('Error in POST /api/admin/youtube-videos:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal Server Error saving YouTube video' },
      { status: 500, headers: NO_CACHE_HEADERS }
    );
  }
}

export async function DELETE(req: NextRequest) {
  const auth = await verifyAdminRequest(req);
  if (!auth.authorized) {
    return NextResponse.json({ success: false, error: auth.error || 'ይቅርታ፣ ይህንን ለማድረግ የአድሚን ፈቃድ የለዎትም።' }, { status: 403, headers: NO_CACHE_HEADERS });
  }

  try {
    const { searchParams } = new URL(req.url);
    const videoId = searchParams.get('id') || searchParams.get('videoId');

    if (!videoId) {
      return NextResponse.json({ success: false, error: 'Missing videoId' }, { status: 400, headers: NO_CACHE_HEADERS });
    }

    // 1. Delete from youtube_videos table
    try {
      await supabaseAdmin
        .from('youtube_videos')
        .delete()
        .eq('id', videoId);
    } catch (e) {
      console.warn('Supabase delete warning:', e);
    }

    // 2. Delete from site_settings
    try {
      const currentVideos = await getAllVideos();
      const updatedList = currentVideos.filter(v => v.id !== videoId);
      await supabaseAdmin
        .from('site_settings')
        .upsert({
          key: 'youtube_videos',
          data: updatedList,
          updated_at: new Date().toISOString()
        });
    } catch (e) {
      console.warn('site_settings delete warning:', e);
    }

    try {
      invalidateServerCoursesCache();
      revalidatePath('/', 'page');
      revalidatePath('/');
      revalidatePath('/admin');
    } catch (e) {}

    return NextResponse.json({
      success: true,
      message: 'ቪዲዮው በተሳካ ሁኔታ ተሰርዟል (YouTube Video deleted successfully)',
      videoId
    }, { headers: NO_CACHE_HEADERS });
  } catch (error: any) {
    console.error('Error in DELETE /api/admin/youtube-videos:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500, headers: NO_CACHE_HEADERS });
  }
}

export async function PATCH(req: NextRequest) {
  const auth = await verifyAdminRequest(req);
  if (!auth.authorized) {
    return NextResponse.json({ success: false, error: auth.error || 'ይቅርታ፣ ይህንን ለማድረግ የአድሚን ፈቃድ የለዎትም።' }, { status: 403, headers: NO_CACHE_HEADERS });
  }

  try {
    const body = await req.json();
    const { videos, reorderUpdates } = body;

    const updates = reorderUpdates || videos || [];
    if (!Array.isArray(updates) || updates.length === 0) {
      return NextResponse.json({ success: false, error: 'No updates provided' }, { status: 400, headers: NO_CACHE_HEADERS });
    }

    const nowIso = new Date().toISOString();

    // 1. Update in youtube_videos table
    for (const item of updates) {
      if (!item.id) continue;
      try {
        await supabaseAdmin
          .from('youtube_videos')
          .update({ order_num: item.order ?? 0, updated_at: nowIso })
          .eq('id', item.id);
      } catch (e) {}
    }

    // 2. Update in site_settings
    try {
      const currentVideos = await getAllVideos();
      const orderMap = new Map<string, number>();
      updates.forEach(u => {
        if (u.id) orderMap.set(u.id, u.order ?? 0);
      });

      const updatedList = currentVideos.map(v => {
        if (orderMap.has(v.id)) {
          return { ...v, order: orderMap.get(v.id), updatedAt: nowIso };
        }
        return v;
      }).sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

      await supabaseAdmin
        .from('site_settings')
        .upsert({
          key: 'youtube_videos',
          data: updatedList,
          updated_at: nowIso
        });
    } catch (e) {}

    try {
      invalidateServerCoursesCache();
      revalidatePath('/', 'page');
      revalidatePath('/');
      revalidatePath('/admin');
    } catch (e) {}

    return NextResponse.json({ success: true, message: 'Reordered successfully' }, { headers: NO_CACHE_HEADERS });
  } catch (error: any) {
    console.error('Error in PATCH /api/admin/youtube-videos:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500, headers: NO_CACHE_HEADERS });
  }
}
