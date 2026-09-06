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
