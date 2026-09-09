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

    // 2. Fetch persistent coming soon courses from site_settings
    let persistentComingSoon: any[] = [];
    try {
      const { data: csData } = await supabaseServer
        .from('site_settings')
        .select('data')
        .eq('key', 'coming_soon_courses')
        .maybeSingle();
      if (Array.isArray(csData?.data)) {
        persistentComingSoon = csData.data;
      }
    } catch (e) {}

    // 3. Fetch active courses from Supabase
    const { data: sbCourses, error: sbErr } = await supabaseServer
      .from('courses')
      .select('*')
      .order('created_at', { ascending: false });

    let activeCourses: any[] = [];
    if (!sbErr && Array.isArray(sbCourses) && sbCourses.length > 0) {
      activeCourses = sbCourses
        .filter(c => c && c.id && c.status !== 'Deleted' && !c.isDeleted && !deletedCourses.includes(c.id) && !deletedCourses.includes(c.slug))
        .map(c => {
          const raw = c.raw_data || {};
          const merged = { ...c, ...raw };
          const desc = formatCourseDesc(merged);
          return { ...merged, desc, description: desc };
        });
    }

    if (activeCourses.length === 0 && deletedCourses.length === 0) {
      activeCourses = DEFAULT_COURSES.filter(c => !deletedCourses.includes(c.id) && !deletedCourses.includes(c.slug));
    }

    // Merge persistent coming soon courses
    const courseMap = new Map<string, any>();
    activeCourses.forEach(c => {
      const key = c.id || c.slug;
      if (key) courseMap.set(key, c);
    });

    persistentComingSoon.forEach(cs => {
      if (!cs || deletedCourses.includes(cs.id) || deletedCourses.includes(cs.slug)) return;
      const key = cs.id || cs.slug;
      courseMap.set(key, {
        ...(courseMap.get(key) || {}),
        ...cs,
        status: 'coming_soon',
        isComingSoon: true
      });
    });

    return Array.from(courseMap.values());
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

export const INITIAL_SERVER_COMMUNITY_POSTS = [
  {
    id: 'sample-admin-welcome',
    authorId: 'admin-tsehay',
    authorName: 'Tsehay Campus Admin',
    authorEmail: 'admin@tsehaycampus.com',
    authorPhoto: '/tc-logo.jpg',
    isAdmin: true,
    isPro: true,
    content: '🎉 እንኳን ወደ Tsehay Campus የተማሪዎች ማህበረሰብ (Student Community & Social Network) በደህና መጡ! \n\nእዚህ ክፍል ውስጥ የኮርስ ጥያቄዎችዎን መጠየቅ፣ ያገኛችሁትን የስራ እና የቢዝነስ ስኬት ማጋራት፣ እንዲሁም ከአስተማሪዎች እና ከተማሪ ጓደኞቻችሁ ጋር ቀጥታ መወያየት ትችላላችሁ። መልካም የመማር እና የማደግ ጊዜ ይሁንልን! 🚀',
    category: 'general',
    tags: ['አጠቃላይ', 'ማስታወቂያ', 'እንኳን_ደህና_መጡ'],
    likes: ['user-sample-1', 'user-sample-2', 'user-sample-3'],
    commentsCount: 2,
    isPinned: true,
    isFeatured: true,
    createdAt: new Date(Date.now() - 3600000 * 2).toISOString(),
  },
  {
    id: 'sample-student-success',
    authorId: 'student-yosef',
    authorName: 'ዮሴፍ ተስፋዬ',
    authorEmail: 'yosef.tesfaye@gmail.com',
    authorPhoto: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=200&auto=format&fit=crop&q=80',
    isAdmin: false,
    isPro: true,
    content: '🔥 የፌስቡክ ማስታወቂያ (Meta Ads) ኮርሱን ጨርሼ የመጀመሪያ የደንበኛ ዘመቻዬን (Campaign) ጀምሬ ነበር። በ 3 ቀናት ውስጥ ብቻ ከ 45 በላይ ደንበኞች በቴሌግራም ደውለው እቃውን ገዝተውኛል! ኮርሱ በእውነት ዓይን ከፋች ነው። ለተዘጋጀው እጅግ አመሰግናለሁ!',
    imageUrl: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&auto=format&fit=crop&q=80',
    category: 'success',
    tags: ['ስኬት', 'ማርኬቲንግ', 'ፌስቡክ_ማስታወቂያ'],
    likes: ['user-sample-1', 'admin-tsehay', 'user-sample-4', 'user-sample-5'],
    commentsCount: 3,
    isPinned: false,
    isFeatured: true,
    createdAt: new Date(Date.now() - 3600000 * 5).toISOString(),
  },
  {
    id: 'sample-tech-question',
    authorId: 'student-selam',
    authorName: 'ሰላም አበበ',
    authorEmail: 'selam.abebe@gmail.com',
    authorPhoto: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80',
    isAdmin: false,
    isPro: true,
    content: 'ጥያቄ ነበረኝ፤ በ Shein እና 1688 እቃዎችን አስመጥተን በካርጎ ስናስገባ የጉምሩክ ቀረጥ ስሌት እንዴት ነው የሚሰራው? ልምድ ያላችሁ ተማሪዎች ወይም መምህራን ብታጋሩኝ ደስ ይለኛል። 🙏',
    category: 'questions',
    tags: ['ጥያቄ', 'ሼን_ኢምፖርት', 'ካርጎ'],
    likes: ['user-sample-2'],
    commentsCount: 1,
    isPinned: false,
    isFeatured: false,
    createdAt: new Date(Date.now() - 3600000 * 12).toISOString(),
  }
];

export async function getLiveCommunityPostsServer(category?: string): Promise<any[]> {
  try {
    const { data: setting } = await supabaseServer
      .from('site_settings')
      .select('data')
      .eq('key', 'community_posts')
      .maybeSingle();

    if (setting && setting.data && Array.isArray(setting.data)) {
      let list = setting.data;
      if (category && category !== 'all') {
        if (category === 'pinned') {
          list = list.filter((p: any) => p.isPinned);
        } else {
          list = list.filter((p: any) => p.category === category);
        }
      }
      return list;
    }
  } catch (err) {
    console.warn('getLiveCommunityPostsServer error:', err);
  }

  return INITIAL_SERVER_COMMUNITY_POSTS;
}

