export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

import { NextRequest, NextResponse } from 'next/server';
import { adminDb, hasAdminCredentials } from '@/lib/firebase/admin';
import { supabase } from '@/lib/supabase/client';

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
    order: 1,
  },
  {
    id: 'yt-2',
    title: 'ያለ ፊት (Faceless) በ AI ቪዲዮዎችን ማዘጋጀት',
    youtubeUrl: 'https://www.youtube.com/watch?v=mgdOMtW6J8k',
    youtubeId: 'mgdOMtW6J8k',
    thumbnail: 'https://img.youtube.com/vi/mgdOMtW6J8k/hqdefault.jpg',
    order: 2,
  },
  {
    id: 'yt-3',
    title: 'የዩቲዩብ ስኬት ሚስጥሮች እና ገቢ ማግኛ መንገዶች',
    youtubeUrl: 'https://www.youtube.com/watch?v=B-s71n0dHUk',
    youtubeId: 'B-s71n0dHUk',
    thumbnail: 'https://img.youtube.com/vi/B-s71n0dHUk/hqdefault.jpg',
    order: 3,
  },
  {
    id: 'yt-4',
    title: 'የሼን (Shein) ኢምፖርት ቢዝነስ አሰራር',
    youtubeUrl: 'https://www.youtube.com/watch?v=mgdOMtW6J8k',
    youtubeId: 'mgdOMtW6J8k',
    thumbnail: 'https://img.youtube.com/vi/mgdOMtW6J8k/hqdefault.jpg',
    order: 4,
  },
  {
    id: 'yt-5',
    title: 'ዲጂታል ማርኬቲንግ እና AI ለጀማሪዎች',
    youtubeUrl: 'https://www.youtube.com/watch?v=B-s71n0dHUk',
    youtubeId: 'B-s71n0dHUk',
    thumbnail: 'https://img.youtube.com/vi/B-s71n0dHUk/hqdefault.jpg',
    order: 5,
  },
];

function extractYouTubeId(url: string): string {
  if (!url) return '';
  const clean = url.trim();
  const match = clean.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/);
  if (match && match[1]) return match[1];
  if (clean.length === 11 && /^[\w-]+$/.test(clean)) return clean;
  return '';
}

export async function GET(req: NextRequest) {
  try {
    const videoMap = new Map<string, any>();

    // 0. Primary Supabase Lookup
    try {
      const { data: sbVideos, error: sbErr } = await supabase
        .from('youtube_videos')
        .select('*')
        .order('order_num', { ascending: true });

      if (!sbErr && Array.isArray(sbVideos) && sbVideos.length > 0) {
        sbVideos.forEach(item => {
          videoMap.set(item.id, {
            id: item.id,
            title: item.title,
            youtubeUrl: item.youtube_url,
            youtubeId: item.youtube_id,
            thumbnail: item.thumbnail,
            videoSrc: item.video_src || '',
            order: item.order_num ?? 0
          });
        });
      }
    } catch (sbE) {}

    // 1. Fetch from artifacts collection
    if (adminDb && hasAdminCredentials && typeof adminDb.collection === 'function') {
      try {
        const snap = await adminDb
          .collection('artifacts')
          .doc('tsehaycampus-e1a6d')
          .collection('public')
          .doc('data')
          .collection('youtube_videos')
          .orderBy('order', 'asc')
          .get();

      snap.docs.forEach((doc) => {
        const d = doc.data();
        const yId = d.youtubeId || extractYouTubeId(d.youtubeUrl || '');
        videoMap.set(doc.id, {
          id: doc.id,
          title: d.title || 'ነፃ የዩቲዩብ ስልጠና',
          youtubeUrl: d.youtubeUrl || (yId ? `https://www.youtube.com/watch?v=${yId}` : ''),
          youtubeId: yId,
          thumbnail: d.thumbnail || (yId ? `https://img.youtube.com/vi/${yId}/hqdefault.jpg` : ''),
          videoSrc: d.videoSrc || '',
          order: d.order ?? 0,
        });
      });
    } catch (e) {}
    }

    // 2. Fetch from root collection fallback
    try {
      const rootSnap = await adminDb.collection('youtube_videos').get();
      rootSnap.docs.forEach((doc) => {
        if (!videoMap.has(doc.id)) {
          const d = doc.data();
          const yId = d.youtubeId || extractYouTubeId(d.youtubeUrl || '');
          videoMap.set(doc.id, {
            id: doc.id,
            title: d.title || 'ነፃ የዩቲዩብ ስልጠና',
            youtubeUrl: d.youtubeUrl || (yId ? `https://www.youtube.com/watch?v=${yId}` : ''),
            youtubeId: yId,
            thumbnail: d.thumbnail || (yId ? `https://img.youtube.com/vi/${yId}/hqdefault.jpg` : ''),
            videoSrc: d.videoSrc || '',
            order: d.order ?? 0,
          });
        }
      });
    } catch (e) {}

    let list = Array.from(videoMap.values());
    if (list.length === 0) {
      list = DEFAULT_VIDEOS;
    }

    return NextResponse.json(
      { success: true, count: list.length, videos: list },
      { headers: NO_CACHE_HEADERS }
    );
  } catch (error: any) {
    console.error('Error fetching public youtube videos:', error);
    return NextResponse.json(
      { success: true, count: DEFAULT_VIDEOS.length, videos: DEFAULT_VIDEOS },
      { headers: NO_CACHE_HEADERS }
    );
  }
}
