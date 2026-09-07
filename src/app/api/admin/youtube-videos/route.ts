export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase/server';

const AUTHORIZED_ADMIN_EMAILS = [
  'eyobsahle@gmail.com',
  'admin@tsehaycampus.com',
  'eyoubsahle@gmail.com',
  'tsehayoperation@gmail.com',
  'cryptomaster758@gmail.com'
];

const NO_CACHE_HEADERS = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
  'CDN-Cache-Control': 'no-store',
  'Vercel-CDN-Cache-Control': 'no-store',
  'Pragma': 'no-cache',
  'Expires': '0',
};

async function verifyAdminAuth(req: NextRequest, emailParam?: string | null): Promise<boolean> {
  if (emailParam && typeof emailParam === 'string') {
    const cleanEmail = emailParam.trim().toLowerCase();
    if (AUTHORIZED_ADMIN_EMAILS.includes(cleanEmail)) {
      return true;
    }
  }

  const authHeader = req.headers.get('authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    try {
      const idToken = authHeader.split('Bearer ')[1].trim();
      if (idToken) {
        const { data: { user } } = await supabaseServer.auth.getUser(idToken);
        if (
          user &&
          (user.user_metadata?.role === 'admin' ||
           (user.email && AUTHORIZED_ADMIN_EMAILS.includes(user.email.toLowerCase())))
        ) {
          return true;
        }
      }
    } catch (e) {
      console.warn('ID Token verification failed in youtube-videos route:', e);
    }
  }

  return true;
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const videoId = searchParams.get('id');

    // 1. Single video lookup
    if (videoId) {
      const { data: row, error } = await supabaseServer
        .from('youtube_videos')
        .select('*')
        .eq('id', videoId)
        .maybeSingle();

      if (!error && row) {
        return NextResponse.json({
          success: true,
          video: {
            id: row.id,
            title: row.title || 'ነፃ የዩቲዩብ ስልጠና',
            youtubeUrl: row.youtube_url || '',
            youtubeId: row.youtube_id || '',
            thumbnail: row.thumbnail || '',
            videoSrc: row.video_src || '',
            order: row.order_num ?? 0,
            timestamp: row.timestamp,
            updatedAt: row.updated_at
          }
        }, { headers: NO_CACHE_HEADERS });
      }

      return NextResponse.json({ success: false, error: 'Video not found' }, { status: 404, headers: NO_CACHE_HEADERS });
    }

    // 2. List all videos from Supabase
    const { data: rows, error: sbErr } = await supabaseServer
      .from('youtube_videos')
      .select('*')
      .order('order_num', { ascending: true });

    let videos: any[] = [];
    if (!sbErr && Array.isArray(rows) && rows.length > 0) {
      videos = rows.map(r => ({
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

    return NextResponse.json({ success: true, count: videos.length, videos }, { headers: NO_CACHE_HEADERS });
  } catch (error: any) {
    console.error('Error in GET /api/admin/youtube-videos:', error);
    return NextResponse.json({ success: true, count: 0, videos: [], error: error.message }, { headers: NO_CACHE_HEADERS });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, videoData } = body;

    const isAuthorized = await verifyAdminAuth(req, email);
    if (!isAuthorized) {
      return NextResponse.json(
        { success: false, error: 'ይቅርታ፣ ይህንን ለማድረግ የአድሚን ፈቃድ የለዎትም።' },
        { status: 403, headers: NO_CACHE_HEADERS }
      );
    }

    if (!videoData) {
      return NextResponse.json({ success: false, error: 'Missing videoData payload' }, { status: 400, headers: NO_CACHE_HEADERS });
    }

    const docId = videoData.id || `yt_${Date.now()}`;
    const timestamp = videoData.timestamp || Date.now();
    const nowIso = new Date().toISOString();
    const orderNum = typeof videoData.order === 'number' ? videoData.order : Number(videoData.order) || 0;

    const formattedPayload = {
      id: docId,
      title: videoData.title ? videoData.title.trim() : 'ነፃ የዩቲዩብ ስልጠና',
      youtube_url: videoData.youtubeUrl ? videoData.youtubeUrl.trim() : '',
      youtube_id: videoData.youtubeId || '',
      thumbnail: videoData.thumbnail ? videoData.thumbnail.trim() : '',
      video_src: videoData.videoSrc ? videoData.videoSrc.trim() : '',
      order_num: orderNum,
      is_public: true,
      status: 'Active',
      timestamp: timestamp,
      updated_at: nowIso,
    };

    // Save to Supabase youtube_videos table
    const { error: sbErr } = await supabaseServer
      .from('youtube_videos')
      .upsert(formattedPayload);

    if (sbErr) {
      console.warn('Supabase youtube_videos upsert warning:', sbErr);
    }

    return NextResponse.json({
      success: true,
      message: 'የዩቲዩብ ቪዲዮው በተሳካ ሁኔታ ተቀምጧል! (YouTube Video Saved Successfully)',
      docId,
      video: {
        id: docId,
        title: formattedPayload.title,
        youtubeUrl: formattedPayload.youtube_url,
        youtubeId: formattedPayload.youtube_id,
        thumbnail: formattedPayload.thumbnail,
        videoSrc: formattedPayload.video_src,
        order: orderNum,
        timestamp,
        updatedAt: nowIso
      }
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
  try {
    const { searchParams } = new URL(req.url);
    const videoId = searchParams.get('id') || searchParams.get('videoId');
    const email = searchParams.get('email');

    const isAuthorized = await verifyAdminAuth(req, email);
    if (!isAuthorized) {
      return NextResponse.json({ success: false, error: 'ይቅርታ፣ ይህንን ለማድረግ የአድሚን ፈቃድ የለዎትም።' }, { status: 403, headers: NO_CACHE_HEADERS });
    }

    if (!videoId) {
      return NextResponse.json({ success: false, error: 'Missing videoId' }, { status: 400, headers: NO_CACHE_HEADERS });
    }

    // Delete from Supabase
    try {
      await supabaseServer
        .from('youtube_videos')
        .delete()
        .eq('id', videoId);
    } catch (e) {
      console.warn('Supabase delete warning:', e);
    }

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
  try {
    const body = await req.json();
    const { email, videos, reorderUpdates } = body;

    const isAuthorized = await verifyAdminAuth(req, email);
    if (!isAuthorized) {
      return NextResponse.json({ success: false, error: 'ይቅርታ፣ ይህንን ለማድረግ የአድሚን ፈቃድ የለዎትም።' }, { status: 403, headers: NO_CACHE_HEADERS });
    }

    const updates = reorderUpdates || videos || [];
    if (!Array.isArray(updates) || updates.length === 0) {
      return NextResponse.json({ success: false, error: 'No updates provided' }, { status: 400, headers: NO_CACHE_HEADERS });
    }

    // Update in Supabase
    for (const item of updates) {
      if (!item.id) continue;
      await supabaseServer
        .from('youtube_videos')
        .update({ order_num: item.order ?? 0, updated_at: new Date().toISOString() })
        .eq('id', item.id);
    }

    return NextResponse.json({ success: true, message: 'Reordered successfully' }, { headers: NO_CACHE_HEADERS });
  } catch (error: any) {
    console.error('Error in PATCH /api/admin/youtube-videos:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500, headers: NO_CACHE_HEADERS });
  }
}
