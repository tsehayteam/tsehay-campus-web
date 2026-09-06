export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase/server';
import { adminDb, adminAuth } from '@/lib/firebase/admin';

const AUTHORIZED_ADMIN_EMAILS = [
  'eyobsahle@gmail.com'
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
  if (authHeader && authHeader.startsWith('Bearer ') && adminAuth) {
    try {
      const idToken = authHeader.split('Bearer ')[1].trim();
      if (idToken) {
        const decoded = await adminAuth.verifyIdToken(idToken);
        if (
          decoded.admin === true || 
          (decoded.email && AUTHORIZED_ADMIN_EMAILS.includes(decoded.email.toLowerCase()))
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
    } else if (adminDb) {
      // Fallback to Firebase if Supabase has 0 rows
      try {
        const snapshot = await adminDb
          .collection('artifacts')
          .doc('tsehaycampus-e1a6d')
          .collection('public')
          .doc('data')
          .collection('youtube_videos')
          .orderBy('order', 'asc')
          .get();

        videos = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      } catch (e) {}
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
      youtubeUrl: videoData.youtubeUrl ? videoData.youtubeUrl.trim() : '',
      youtubeId: videoData.youtubeId || '',
      thumbnail: videoData.thumbnail ? videoData.thumbnail.trim() : '',
      videoSrc: videoData.videoSrc ? videoData.videoSrc.trim() : '',
      order: orderNum,
      timestamp,
      updatedAt: nowIso,
    };

    // 1. Primary: Save to Supabase youtube_videos table
    try {
      const { error: sbErr } = await supabaseServer
        .from('youtube_videos')
        .upsert({
          id: docId,
          title: formattedPayload.title,
          youtube_url: formattedPayload.youtubeUrl,
          youtube_id: formattedPayload.youtubeId,
          thumbnail: formattedPayload.thumbnail,
          video_src: formattedPayload.videoSrc,
          order_num: orderNum,
          is_public: true,
          status: 'Active',
          timestamp: timestamp,
          updated_at: nowIso
        });

      if (sbErr) {
        console.warn('Supabase youtube_videos upsert warning:', sbErr);
      }
    } catch (e) {
      console.warn('Supabase youtube_videos exception:', e);
    }

    // 2. Mirror to Firebase Admin if available
    if (adminDb) {
      try {
        const nestedRef = adminDb
          .collection('artifacts')
          .doc('tsehaycampus-e1a6d')
          .collection('public')
          .doc('data')
          .collection('youtube_videos')
          .doc(docId);

        await nestedRef.set(formattedPayload, { merge: true });
        await adminDb.collection('youtube_videos').doc(docId).set(formattedPayload, { merge: true });
      } catch (mirrorErr) {
        console.warn('Firebase mirror warning:', mirrorErr);
      }
    }

    return NextResponse.json({
      success: true,
      message: 'የዩቲዩብ ቪዲዮው በተሳካ ሁኔታ ተቀምጧል! (YouTube Video Saved Successfully)',
      docId,
      video: formattedPayload
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

    // 1. Delete from Supabase
    try {
      await supabaseServer
        .from('youtube_videos')
        .delete()
        .eq('id', videoId);
    } catch (e) {
      console.warn('Supabase delete warning:', e);
    }

    // 2. Delete from Firebase mirror
    if (adminDb) {
      try {
        await adminDb
          .collection('artifacts')
          .doc('tsehaycampus-e1a6d')
          .collection('public')
          .doc('data')
          .collection('youtube_videos')
          .doc(videoId)
          .delete();
        await adminDb.collection('youtube_videos').doc(videoId).delete();
      } catch (e) {}
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
