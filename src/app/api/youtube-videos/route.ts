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

export async function GET(req: NextRequest) {
  try {
    // 1. Primary: Fetch from Supabase youtube_videos table
    try {
      const { data: rows, error: sbErr } = await supabaseServer
        .from('youtube_videos')
        .select('*')
        .order('order_num', { ascending: true });

      if (!sbErr && Array.isArray(rows) && rows.length > 0) {
        const list = rows.map(r => ({
          id: r.id,
          title: r.title || 'ነፃ የዩቲዩብ ስልጠና',
          youtubeUrl: r.youtube_url || (r.youtube_id ? `https://www.youtube.com/watch?v=${r.youtube_id}` : ''),
          youtubeId: r.youtube_id || '',
          thumbnail: r.thumbnail || (r.youtube_id ? `https://img.youtube.com/vi/${r.youtube_id}/hqdefault.jpg` : ''),
          videoSrc: r.video_src || '',
          order: r.order_num ?? 0,
        }));

        return NextResponse.json(
          { success: true, count: list.length, videos: list },
          { headers: NO_CACHE_HEADERS }
        );
      }
    } catch (e) {
      console.warn('Supabase youtube_videos GET error in public API:', e);
    }

    return NextResponse.json(
      { success: true, count: DEFAULT_VIDEOS.length, videos: DEFAULT_VIDEOS },
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
