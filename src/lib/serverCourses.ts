import { supabaseServer, supabaseAdmin } from '@/lib/supabase/server';
import { DEFAULT_COURSES, formatCourseDesc, deduplicateCourses } from '@/lib/courseCache';
import { loadPersistedCourses, sharedSiteSettingsCache } from '@/lib/memoryStore';

const COURSE_COLUMNS_PROJECTION = [
  'id',
  'slug',
  'title',
  'title_en',
  'description',
  'price',
  'old_price',
  'instructor',
  'instructor_name',
  'instructor_image',
  'image',
  'banner',
  'category',
  'rating',
  'status',
  'is_published',
  'created_at',
  'updated_at',
  'lessons',
  'modules',
  'requirements',
  'target_audience',
  'what_you_will_learn',
  'ai_prompt'
].join(', ');

// Server-side in-memory caches (15-second TTL for rapid sync)
let cachedServerCourses: { data: any[]; timestamp: number } | null = null;
let cachedLandingVideo: { data: LiveLandingVideoData; timestamp: number } | null = null;
let cachedAboutVideo: { data: LiveAboutVideoData; timestamp: number } | null = null;
let cachedAboutCommunityMedia: { data: string; timestamp: number } | null = null;
let cachedPortfolio: { data: LivePortfolioData; timestamp: number } | null = null;
let cachedYouTubeVideos: { data: LiveYouTubeVideoItem[]; timestamp: number } | null = null;
const SERVER_CACHE_TTL_MS = 15 * 1000;

export function invalidateServerCoursesCache() {
  cachedServerCourses = null;
  cachedLandingVideo = null;
  cachedAboutVideo = null;
  cachedAboutCommunityMedia = null;
  cachedPortfolio = null;
  cachedYouTubeVideos = null;
}

export async function getLiveCoursesServer(): Promise<any[]> {
  if (cachedServerCourses && (Date.now() - cachedServerCourses.timestamp < SERVER_CACHE_TTL_MS)) {
    return cachedServerCourses.data;
  }

  try {
    // 1. Fetch deleted courses blacklist using supabaseAdmin
    let deletedCourses: string[] = [];
    try {
      const { data: delData } = await supabaseAdmin
        .from('site_settings')
        .select('data')
        .eq('key', 'deleted_courses')
        .maybeSingle();
      if (Array.isArray(delData?.data)) {
        deletedCourses = delData.data.map((x: any) => String(x).toLowerCase().trim());
      }
    } catch (e) {}

    // 2. Fetch persistent coming soon courses from site_settings
    let persistentComingSoon: any[] = [];
    try {
      const { data: csData } = await supabaseAdmin
        .from('site_settings')
        .select('data')
        .eq('key', 'coming_soon_courses')
        .maybeSingle();
      if (Array.isArray(csData?.data)) {
        persistentComingSoon = csData.data;
      }
    } catch (e) {}

    // 2b. Fetch persistent custom active courses from site_settings (Dual-Store persistence)
    let persistentCustomCourses: any[] = [];
    try {
      const { data: customData } = await supabaseAdmin
        .from('site_settings')
        .select('data')
        .eq('key', 'custom_courses')
        .maybeSingle();
      if (Array.isArray(customData?.data)) {
        persistentCustomCourses = customData.data;
      }
    } catch (e) {}

    // 3. Fetch active courses from Supabase using projected columns with supabaseAdmin
    let activeCourses: any[] = [];
    try {
      const { data: sbCourses, error: sbErr }: any = await (supabaseAdmin
        .from('courses') as any)
        .select(COURSE_COLUMNS_PROJECTION)
        .order('created_at', { ascending: false });

      if (!sbErr && Array.isArray(sbCourses) && sbCourses.length > 0) {
        activeCourses = sbCourses
          .filter(c => {
            if (!c || !c.id || c.status === 'Deleted' || c.isDeleted) return false;
            const cid = String(c.id).toLowerCase().trim();
            const cslug = c.slug ? String(c.slug).toLowerCase().trim() : '';
            return !deletedCourses.includes(cid) && (!cslug || !deletedCourses.includes(cslug));
          })
          .map(c => {
            const desc = formatCourseDesc(c);
            return { ...c, desc, description: desc };
          });
      }
    } catch (sbErr) {
      console.warn('getLiveCoursesServer Supabase fetch warning:', sbErr);
    }

    const courseMap = new Map<string, any>();
    activeCourses.forEach(c => {
      const key = (c.slug || c.id).toLowerCase().trim();
      if (key) courseMap.set(key, c);
    });

    // 4. Merge persistent custom courses from site_settings
    persistentCustomCourses.forEach(c => {
      if (!c) return;
      const cId = c.id ? String(c.id).toLowerCase().trim() : '';
      const cSlug = c.slug ? String(c.slug).toLowerCase().trim() : '';
      if (deletedCourses.includes(cId) || (cSlug && deletedCourses.includes(cSlug))) return;

      const key = cSlug || cId;
      if (!key) return;

      if (!courseMap.has(key)) {
        const desc = formatCourseDesc(c);
        courseMap.set(key, { ...c, desc, description: desc });
      }
    });

    // 5. Merge Persisted Courses from Disk / Memory Store
    try {
      const persisted = loadPersistedCourses();
      if (Array.isArray(persisted) && persisted.length > 0) {
        persisted.forEach(p => {
          if (p && (p.id || p.slug)) {
            const pId = String(p.id).toLowerCase().trim();
            const pSlug = p.slug ? String(p.slug).toLowerCase().trim() : '';
            if (deletedCourses.includes(pId) || (pSlug && deletedCourses.includes(pSlug))) return;

            const key = pSlug || pId;
            if (!courseMap.has(key)) {
              const desc = formatCourseDesc(p);
              courseMap.set(key, { ...p, desc, description: desc });
            }
          }
        });
      }
    } catch (pErr) {}

    if (courseMap.size === 0 && deletedCourses.length === 0) {
      DEFAULT_COURSES
        .filter(c => !deletedCourses.includes(c.id.toLowerCase()) && !deletedCourses.includes(c.slug.toLowerCase()))
        .forEach(c => {
          const key = (c.slug || c.id).toLowerCase().trim();
          if (key) courseMap.set(key, c);
        });
    }

    persistentComingSoon.forEach(cs => {
      if (!cs) return;
      const csId = cs.id ? String(cs.id).toLowerCase().trim() : '';
      const csSlug = cs.slug ? String(cs.slug).toLowerCase().trim() : '';
      if (deletedCourses.includes(csId) || (csSlug && deletedCourses.includes(csSlug))) return;

      const key = csSlug || csId;
      courseMap.set(key, {
        ...(courseMap.get(key) || {}),
        ...cs,
        status: 'coming_soon',
        isComingSoon: true
      });
    });

    const finalResult = deduplicateCourses(Array.from(courseMap.values()));
    if (finalResult.length > 0) {
      cachedServerCourses = { data: finalResult, timestamp: Date.now() };
    }
    return finalResult;
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
  if (cachedLandingVideo && (Date.now() - cachedLandingVideo.timestamp < SERVER_CACHE_TTL_MS)) {
    return cachedLandingVideo.data;
  }

  const result: LiveLandingVideoData = {
    videoUrl: DEFAULT_LANDING_VIDEO,
    thumbnail: ''
  };

  try {
    const { data: setting } = await supabaseAdmin
      .from('site_settings')
      .select('data')
      .eq('key', 'landing_video')
      .maybeSingle();

    if (setting && setting.data) {
      const data = setting.data;
      const url = data.url || data.videoUrl || data.youtubeUrl;
      const thumb = data.heroThumbnailUrl || data.posterUrl || data.landingVideoThumbnail || data.thumbnail || data.thumbnailUrl || data.thumbUrl || data.poster || '';
      if (url && typeof url === 'string' && url.trim()) result.videoUrl = url.trim();
      if (thumb && typeof thumb === 'string') result.thumbnail = thumb.trim();
    } else if (sharedSiteSettingsCache.has('landing_video')) {
      const cached = sharedSiteSettingsCache.get('landing_video');
      const url = cached?.url || cached?.videoUrl || cached?.youtubeUrl;
      const thumb = cached?.heroThumbnailUrl || cached?.posterUrl || cached?.landingVideoThumbnail || cached?.thumbnail || cached?.thumbnailUrl || cached?.thumbUrl || cached?.poster || '';
      if (url && typeof url === 'string' && url.trim()) result.videoUrl = url.trim();
      if (thumb && typeof thumb === 'string') result.thumbnail = thumb.trim();
    }

    cachedLandingVideo = { data: result, timestamp: Date.now() };
  } catch (err) {
    console.warn('getLiveLandingVideoDataServer error:', err);
    if (sharedSiteSettingsCache.has('landing_video')) {
      const cached = sharedSiteSettingsCache.get('landing_video');
      const url = cached?.url || cached?.videoUrl || cached?.youtubeUrl;
      const thumb = cached?.heroThumbnailUrl || cached?.posterUrl || cached?.landingVideoThumbnail || cached?.thumbnail || cached?.thumbnailUrl || cached?.thumbUrl || cached?.poster || '';
      if (url && typeof url === 'string' && url.trim()) result.videoUrl = url.trim();
      if (thumb && typeof thumb === 'string') result.thumbnail = thumb.trim();
    }
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
  if (cachedAboutVideo && (Date.now() - cachedAboutVideo.timestamp < SERVER_CACHE_TTL_MS)) {
    return cachedAboutVideo.data;
  }

  const result: LiveAboutVideoData = {
    videoUrl: DEFAULT_ABOUT_VIDEO,
    thumbnail: '/assets/about_video_cover.jpg',
    title: 'ስለ ፀሐይ ካምፓስ'
  };

  try {
    const { data: setting } = await supabaseAdmin
      .from('site_settings')
      .select('data')
      .eq('key', 'about_video')
      .maybeSingle();

    if (setting && setting.data) {
      const data = setting.data;
      const url = data.url || data.videoUrl || data.youtubeUrl;
      const thumb = data.thumbnail || data.thumbnailUrl || data.thumbUrl || data.poster;
      if (url && typeof url === 'string' && url.trim()) result.videoUrl = url.trim();
      if (thumb && typeof thumb === 'string' && thumb.trim()) result.thumbnail = thumb.trim();
      if (data.title && typeof data.title === 'string' && data.title.trim()) result.title = data.title.trim();
    } else if (sharedSiteSettingsCache.has('about_video')) {
      const cached = sharedSiteSettingsCache.get('about_video');
      const url = cached?.url || cached?.videoUrl || cached?.youtubeUrl;
      const thumb = cached?.thumbnail || cached?.thumbnailUrl || cached?.thumbUrl || cached?.poster;
      if (url && typeof url === 'string' && url.trim()) result.videoUrl = url.trim();
      if (thumb && typeof thumb === 'string' && thumb.trim()) result.thumbnail = thumb.trim();
      if (cached?.title && typeof cached.title === 'string' && cached.title.trim()) result.title = cached.title.trim();
    }

    cachedAboutVideo = { data: result, timestamp: Date.now() };
  } catch (err) {
    console.warn('getLiveAboutVideoDataServer error:', err);
    if (sharedSiteSettingsCache.has('about_video')) {
      const cached = sharedSiteSettingsCache.get('about_video');
      const url = cached?.url || cached?.videoUrl || cached?.youtubeUrl;
      const thumb = cached?.thumbnail || cached?.thumbnailUrl || cached?.thumbUrl || cached?.poster;
      if (url && typeof url === 'string' && url.trim()) result.videoUrl = url.trim();
      if (thumb && typeof thumb === 'string' && thumb.trim()) result.thumbnail = thumb.trim();
      if (cached?.title && typeof cached.title === 'string' && cached.title.trim()) result.title = cached.title.trim();
    }
  }

  return result;
}

export async function getLiveAboutCommunityMediaServer(): Promise<string> {
  if (cachedAboutCommunityMedia && (Date.now() - cachedAboutCommunityMedia.timestamp < SERVER_CACHE_TTL_MS)) {
    return cachedAboutCommunityMedia.data;
  }

  let mediaUrl = '/assets/community_placeholder.jpg';
  try {
    const { data: setting } = await supabaseAdmin
      .from('site_settings')
      .select('data')
      .eq('key', 'about_community_media')
      .maybeSingle();

    if (setting?.data) {
      const data = setting.data;
      const raw = data.mediaUrl || data.url || data.imageUrl || data.videoUrl;
      if (raw && typeof raw === 'string') {
        mediaUrl = raw.trim();
      }
    } else if (sharedSiteSettingsCache.has('about_community_media')) {
      const cached = sharedSiteSettingsCache.get('about_community_media');
      const raw = cached?.mediaUrl || cached?.url || cached?.imageUrl || cached?.videoUrl;
      if (raw && typeof raw === 'string') {
        mediaUrl = raw.trim();
      }
    }
    cachedAboutCommunityMedia = { data: mediaUrl, timestamp: Date.now() };
  } catch (err) {
    console.warn('getLiveAboutCommunityMediaServer error:', err);
    if (sharedSiteSettingsCache.has('about_community_media')) {
      const cached = sharedSiteSettingsCache.get('about_community_media');
      const raw = cached?.mediaUrl || cached?.url || cached?.imageUrl || cached?.videoUrl;
      if (raw && typeof raw === 'string') {
        mediaUrl = raw.trim();
      }
    }
  }

  return mediaUrl;
}

export interface LivePortfolioData {
  localVideoUrl: string;
  internationalVideoUrl: string;
}

const DEFAULT_PORTFOLIO_LOCAL = 'https://youtu.be/h9JsGCkd_4o?si=qoSHzmD3-EWjin8k';
const DEFAULT_PORTFOLIO_INTL = 'https://youtu.be/6Ssyn7H3nWk?si=CGFugLZIcMiAW4oe';

export async function getLivePortfolioVideosServer(): Promise<LivePortfolioData> {
  if (cachedPortfolio && (Date.now() - cachedPortfolio.timestamp < SERVER_CACHE_TTL_MS)) {
    return cachedPortfolio.data;
  }

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

    cachedPortfolio = { data: result, timestamp: Date.now() };
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
  if (cachedYouTubeVideos && (Date.now() - cachedYouTubeVideos.timestamp < SERVER_CACHE_TTL_MS)) {
    return cachedYouTubeVideos.data;
  }

  try {
    const { data: rows, error }: any = await (supabaseServer
      .from('youtube_videos') as any)
      .select('id, title, youtube_url, youtube_id, thumbnail, video_src, order_num')
      .order('order_num', { ascending: true });

    if (!error && Array.isArray(rows) && rows.length > 0) {
      const mapped = rows.map(r => ({
        id: r.id,
        title: r.title || 'ነፃ የዩቲዩብ ስልጠና',
        youtubeUrl: r.youtube_url || (r.youtube_id ? `https://www.youtube.com/watch?v=${r.youtube_id}` : ''),
        youtubeId: r.youtube_id || '',
        thumbnail: r.thumbnail || (r.youtube_id ? `https://img.youtube.com/vi/${r.youtube_id}/hqdefault.jpg` : ''),
        videoSrc: r.video_src || '',
        order: r.order_num ?? 0
      }));

      cachedYouTubeVideos = { data: mapped, timestamp: Date.now() };
      return mapped;
    }
  } catch (err) {}

  try {
    const { data: setting } = await supabaseServer
      .from('site_settings')
      .select('data')
      .eq('key', 'youtube_videos')
      .maybeSingle();

    if (setting && setting.data && Array.isArray(setting.data) && setting.data.length > 0) {
      cachedYouTubeVideos = { data: setting.data, timestamp: Date.now() };
      return setting.data;
    }
  } catch (e) {}

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

