import { supabaseServer } from '@/lib/supabase/server';
import { DEFAULT_COURSES, formatCourseDesc } from '@/lib/courseCache';

export async function getLiveCoursesServer(): Promise<any[]> {
  try {
    // 1. Fetch deleted courses blacklist
    let deletedCourses: string[] = [];
    try {
      const { data: delData } = await supabaseServer
        .from('site_settings')
        .select('data')
        .eq('key', 'deleted_courses')
        .maybeSingle();
      if (Array.isArray(delData?.data)) {
        deletedCourses = delData.data;
      }
    } catch (e) {}

    // 2. Fetch active courses from Supabase
    const { data: sbCourses, error: sbErr } = await supabaseServer
      .from('courses')
      .select('*')
      .order('created_at', { ascending: false });

    if (!sbErr && Array.isArray(sbCourses) && sbCourses.length > 0) {
      const active = sbCourses
        .filter(c => c && c.id && c.status !== 'Deleted' && !c.isDeleted && !deletedCourses.includes(c.id) && !deletedCourses.includes(c.slug))
        .map(c => {
          const raw = c.raw_data || {};
          const merged = { ...c, ...raw };
          const desc = formatCourseDesc(merged);
          return { ...merged, desc, description: desc };
        });

      if (active.length > 0) {
        return active;
      }
    }

    if (deletedCourses.length === 0) {
      return DEFAULT_COURSES;
    }
  } catch (error) {
    console.warn('getLiveCoursesServer error:', error);
  }

  return DEFAULT_COURSES;
}

const DEFAULT_LANDING_VIDEO = 'https://www.youtube.com/watch?v=mgdOMtW6J8k';

export interface LiveLandingVideoData {
  videoUrl: string;
  thumbnail: string;
}

export async function getLiveLandingVideoDataServer(): Promise<LiveLandingVideoData> {
  const result: LiveLandingVideoData = {
    videoUrl: DEFAULT_LANDING_VIDEO,
    thumbnail: '/assets/hero-bg-new.jpg'
  };

  try {
    const { data: setting } = await supabaseServer
      .from('site_settings')
      .select('data')
      .eq('key', 'landing_video')
      .maybeSingle();

    if (setting && setting.data) {
      const data = setting.data;
      const url = data.url || data.videoUrl || data.youtubeUrl;
      const thumb = data.landingVideoThumbnail || data.thumbnail || data.thumbnailUrl || data.poster;
      if (url && typeof url === 'string' && url.trim()) result.videoUrl = url.trim();
      if (thumb && typeof thumb === 'string' && thumb.trim()) result.thumbnail = thumb.trim();
    }
  } catch (err) {
    console.warn('getLiveLandingVideoDataServer error:', err);
  }

  return result;
}

export async function getLiveLandingVideoServer(): Promise<string> {
  const data = await getLiveLandingVideoDataServer();
  return data.videoUrl;
}

export interface LiveAboutVideoData {
  videoUrl: string;
  thumbnail: string;
  title: string;
}

const DEFAULT_ABOUT_VIDEO = 'https://www.youtube.com/watch?v=mgdOMtW6J8k';

export async function getLiveAboutVideoDataServer(): Promise<LiveAboutVideoData> {
  const result: LiveAboutVideoData = {
    videoUrl: DEFAULT_ABOUT_VIDEO,
    thumbnail: '/assets/about_video_cover.jpg',
    title: 'ስለ ፀሐይ ካምፓስ'
  };

  try {
    const { data: setting } = await supabaseServer
      .from('site_settings')
      .select('data')
      .eq('key', 'about_video')
      .maybeSingle();

    if (setting && setting.data) {
      const data = setting.data;
      const url = data.url || data.videoUrl || data.youtubeUrl;
      const thumb = data.thumbnail || data.thumbnailUrl || data.poster;
      if (url && typeof url === 'string' && url.trim()) result.videoUrl = url.trim();
      if (thumb && typeof thumb === 'string' && thumb.trim()) result.thumbnail = thumb.trim();
      if (data.title && typeof data.title === 'string' && data.title.trim()) result.title = data.title.trim();
    }
  } catch (err) {
    console.warn('getLiveAboutVideoDataServer error:', err);
  }

  return result;
}

export interface LivePortfolioData {
  localVideoUrl: string;
  internationalVideoUrl: string;
}

const DEFAULT_PORTFOLIO_LOCAL = 'https://youtu.be/h9JsGCkd_4o?si=qoSHzmD3-EWjin8k';
const DEFAULT_PORTFOLIO_INTL = 'https://youtu.be/6Ssyn7H3nWk?si=CGFugLZIcMiAW4oe';

export async function getLivePortfolioVideosServer(): Promise<LivePortfolioData> {
  const result: LivePortfolioData = {
    localVideoUrl: DEFAULT_PORTFOLIO_LOCAL,
    internationalVideoUrl: DEFAULT_PORTFOLIO_INTL
  };

  try {
    const { data: setting } = await supabaseServer
      .from('site_settings')
      .select('data')
      .eq('key', 'youtube_portfolio')
      .maybeSingle();

    if (setting && setting.data) {
      const d = setting.data;
      if (d.localVideoUrl && typeof d.localVideoUrl === 'string' && d.localVideoUrl.trim()) {
        result.localVideoUrl = d.localVideoUrl.trim();
      }
      if (d.internationalVideoUrl && typeof d.internationalVideoUrl === 'string' && d.internationalVideoUrl.trim()) {
        result.internationalVideoUrl = d.internationalVideoUrl.trim();
      }
    }
  } catch (err) {
    console.warn('getLivePortfolioVideosServer error:', err);
  }

  return result;
}

export interface LiveYouTubeVideoItem {
  id: string;
  title: string;
  youtubeUrl: string;
  youtubeId?: string;
  thumbnail?: string;
  videoSrc?: string;
  order?: number;
}

export async function getLiveYouTubeVideosServer(): Promise<LiveYouTubeVideoItem[]> {
  try {
    const { data: rows, error } = await supabaseServer
      .from('youtube_videos')
      .select('*')
      .order('order_num', { ascending: true });

    if (!error && Array.isArray(rows) && rows.length > 0) {
      return rows.map(r => ({
        id: r.id,
        title: r.title || 'ነፃ የዩቲዩብ ስልጠና',
        youtubeUrl: r.youtube_url || (r.youtube_id ? `https://www.youtube.com/watch?v=${r.youtube_id}` : ''),
        youtubeId: r.youtube_id || '',
        thumbnail: r.thumbnail || (r.youtube_id ? `https://img.youtube.com/vi/${r.youtube_id}/hqdefault.jpg` : ''),
        videoSrc: r.video_src || '',
        order: r.order_num ?? 0
      }));
    }
  } catch (err) {
    console.warn('getLiveYouTubeVideosServer error:', err);
  }

  return [];
}
