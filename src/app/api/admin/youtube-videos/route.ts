import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';

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
    const { searchParams } = new URL(req.url);
    const videoId = searchParams.get('id');

    if (videoId) {
      const { data: video, error } = await supabase
        .from('youtube_videos')
        .select('*')
        .eq('id', videoId)
        .maybeSingle();

      if (error || !video) {
        return NextResponse.json({ success: false, error: 'Video not found' }, { status: 404 });
      }

      return NextResponse.json({
        success: true,
        video: {
          id: video.id,
          title: video.title,
          youtubeUrl: video.youtube_url,
          youtubeId: video.youtube_id,
          thumbnail: video.thumbnail,
          videoSrc: video.video_src || '',
          order: video.order_num ?? 0,
          isPublic: video.is_public ?? true,
          status: video.status || 'Active'
        }
      });
    }

    const { data: list, error } = await supabase
      .from('youtube_videos')
      .select('*')
      .order('order_num', { ascending: true });

    if (error) {
      console.warn('Supabase fetch youtube_videos error:', error);
      return NextResponse.json({ success: true, count: 0, videos: [] });
    }

    const videos = (list || []).map(item => ({
      id: item.id,
      title: item.title,
      youtubeUrl: item.youtube_url,
      youtubeId: item.youtube_id,
      thumbnail: item.thumbnail,
      videoSrc: item.video_src || '',
      order: item.order_num ?? 0,
      isPublic: item.is_public ?? true,
      status: item.status || 'Active',
      createdAt: item.created_at,
      updatedAt: item.updated_at
    }));

    return NextResponse.json({ success: true, count: videos.length, videos });
  } catch (error: any) {
    console.error('Error in admin GET /api/admin/youtube-videos:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { title, youtubeUrl, videoSrc, thumbnail, order, isPublic = true, status = 'Active' } = body;

    if (!title || (!youtubeUrl && !videoSrc)) {
      return NextResponse.json(
        { success: false, error: 'Title and either YouTube URL or Video Source are required.' },
        { status: 400 }
      );
    }

    const videoId = body.id || `yt-${Date.now()}`;
    const ytId = extractYouTubeId(youtubeUrl || '');
    const autoThumb = thumbnail || (ytId ? `https://img.youtube.com/vi/${ytId}/hqdefault.jpg` : '');

    const record = {
      id: videoId,
      title: title.trim(),
      youtube_url: (youtubeUrl || '').trim(),
      youtube_id: ytId,
      thumbnail: autoThumb,
      video_src: videoSrc || '',
      order_num: Number(order) || 0,
      is_public: Boolean(isPublic),
      status: status || 'Active',
      updated_at: new Date().toISOString()
    };

    const { error } = await supabase.from('youtube_videos').upsert(record);
    if (error) {
      console.error('Supabase upsert youtube_videos error:', error);
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Video saved successfully',
      video: {
        id: record.id,
        title: record.title,
        youtubeUrl: record.youtube_url,
        youtubeId: record.youtube_id,
        thumbnail: record.thumbnail,
        videoSrc: record.video_src,
        order: record.order_num,
        isPublic: record.is_public,
        status: record.status
      }
    });
  } catch (error: any) {
    console.error('Error in admin POST /api/admin/youtube-videos:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, error: 'Missing video ID' }, { status: 400 });
    }

    const { error } = await supabase.from('youtube_videos').delete().eq('id', id);
    if (error) {
      console.error('Supabase delete youtube_videos error:', error);
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: `Video ${id} deleted successfully` });
  } catch (error: any) {
    console.error('Error in admin DELETE /api/admin/youtube-videos:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
