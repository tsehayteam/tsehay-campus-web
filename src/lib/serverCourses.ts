import { adminDb, hasAdminCredentials } from '@/lib/firebase/admin';
import { DEFAULT_COURSES, formatCourseDesc, mergeCoursesLists } from '@/lib/courseCache';
import { sharedSiteSettingsCache, loadPersistedCourses, loadPersistedSettings } from '@/lib/memoryStore';

export async function getLiveCoursesServer(): Promise<any[]> {
  try {
    const courseMap = new Map<string, any>();

    // 1. Seed with DEFAULT_COURSES
    DEFAULT_COURSES.forEach(c => {
      if (c && c.id) courseMap.set(c.id, c);
    });

    // 2. Merge persisted / memory courses
    try {
      const persisted = loadPersistedCourses();
      persisted.forEach(c => {
        if (c && c.id && c.status !== 'Deleted' && !c.isDeleted) {
          const cleanDesc = formatCourseDesc(c);
          courseMap.set(c.id, { ...courseMap.get(c.id), ...c, desc: cleanDesc, description: cleanDesc });
        }
      });
    } catch (e) {}

    // 3. Query Firestore if admin credentials are configured
    if (adminDb && hasAdminCredentials) {

    // 1. Nested collection: artifacts/tsehaycampus-e1a6d/public/data/courses
    try {
      const snapA = await adminDb
        .collection('artifacts')
        .doc('tsehaycampus-e1a6d')
        .collection('public')
        .doc('data')
        .collection('courses')
        .get();

      snapA.docs.forEach(doc => {
        if (doc.exists) {
          const data = doc.data();
          if (data && data.status !== 'Deleted' && !data.isDeleted) {
            const cleanDesc = formatCourseDesc(data);
            courseMap.set(doc.id, { id: doc.id, ...data, desc: cleanDesc, description: cleanDesc });
          }
        }
      });
    } catch (e) {}

    // 2. Root collection: courses
    try {
      const snapB = await adminDb.collection('courses').get();
      snapB.docs.forEach(doc => {
        if (doc.exists) {
          const data = doc.data();
          if (data && data.status !== 'Deleted' && !data.isDeleted) {
            const cleanDesc = formatCourseDesc(data);
            if (!courseMap.has(doc.id)) {
              courseMap.set(doc.id, { id: doc.id, ...data, desc: cleanDesc, description: cleanDesc });
            } else {
              courseMap.set(doc.id, { ...courseMap.get(doc.id), ...data, id: doc.id, desc: cleanDesc, description: cleanDesc });
            }
          }
        }
      });
    } catch (e) {}

    // 3. Alt collection: artifacts/tsehaycampus-e1a6d/courses
    try {
      const snapC = await adminDb
        .collection('artifacts')
        .doc('tsehaycampus-e1a6d')
        .collection('courses')
        .get();

      snapC.docs.forEach(doc => {
        if (doc.exists) {
          const data = doc.data();
          if (data && data.status !== 'Deleted' && !data.isDeleted) {
            const cleanDesc = formatCourseDesc(data);
            if (!courseMap.has(doc.id)) {
              courseMap.set(doc.id, { id: doc.id, ...data, desc: cleanDesc, description: cleanDesc });
            } else {
              courseMap.set(doc.id, { ...courseMap.get(doc.id), ...data, id: doc.id, desc: cleanDesc, description: cleanDesc });
            }
          }
        }
      });
    } catch (e) {}
    }

    const list = Array.from(courseMap.values());
    if (list.length > 0) {
      return mergeCoursesLists(DEFAULT_COURSES, list);
    }
  } catch (error) {
    console.warn('getLiveCoursesServer fallback notice:', error);
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
    if (sharedSiteSettingsCache.has('landing_video')) {
      const cached = sharedSiteSettingsCache.get('landing_video');
      const url = cached?.url || cached?.videoUrl || cached?.youtubeUrl;
      const thumb = cached?.landingVideoThumbnail || cached?.thumbnail || cached?.thumbnailUrl || cached?.thumbUrl || cached?.poster;
      if (url && typeof url === 'string' && url.trim()) result.videoUrl = url.trim();
      if (thumb && typeof thumb === 'string' && thumb.trim()) result.thumbnail = thumb.trim();
      if (result.videoUrl !== DEFAULT_LANDING_VIDEO || result.thumbnail !== '/assets/hero-bg-new.jpg') {
        return result;
      }
    }

    try {
      const persistedSettings = loadPersistedSettings();
      if (persistedSettings && persistedSettings['landing_video']) {
        const data = persistedSettings['landing_video'];
        const url = data?.url || data?.videoUrl || data?.youtubeUrl;
        const thumb = data?.landingVideoThumbnail || data?.thumbnail || data?.thumbnailUrl || data?.thumbUrl || data?.poster;
        if (url && typeof url === 'string' && url.trim()) result.videoUrl = url.trim();
        if (thumb && typeof thumb === 'string' && thumb.trim()) result.thumbnail = thumb.trim();
      }
    } catch (e) {}

    if (!adminDb || !hasAdminCredentials) return result;

    // Prioritize direct settings collection lookup as instructed
    const paths = [
      adminDb.collection('settings').doc('landing_video'),
      adminDb.collection('settings').doc('landingVideo'),
      adminDb.collection('site_settings').doc('landing_video'),
      adminDb.collection('artifacts').doc('tsehaycampus-e1a6d').collection('public').doc('data').collection('site_settings').doc('landing_video')
    ];

    for (const p of paths) {
      try {
        const snap = await p.get();
        if (snap.exists) {
          const data = snap.data();
          const url = data?.url || data?.videoUrl || data?.youtubeUrl;
          const thumb = data?.landingVideoThumbnail || data?.thumbnail || data?.thumbnailUrl || data?.thumbUrl || data?.poster;
          if (url && typeof url === 'string' && url.trim()) {
            result.videoUrl = url.trim();
          }
          if (thumb && typeof thumb === 'string' && thumb.trim()) {
            result.thumbnail = thumb.trim();
          }
          if (url || thumb) {
            break;
          }
        }
      } catch (e) {}
    }
  } catch (err) {
    console.warn('getLiveLandingVideoDataServer fallback notice:', err);
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
    const checkKeys = ['about_video', 'aboutVideo', 'about'];
    for (const key of checkKeys) {
      if (sharedSiteSettingsCache.has(key)) {
        const cached = sharedSiteSettingsCache.get(key);
        const url = cached?.url || cached?.videoUrl || cached?.youtubeUrl;
        const thumb = cached?.thumbnail || cached?.thumbnailUrl || cached?.thumbUrl || cached?.poster;
        if (url && typeof url === 'string' && url.trim()) result.videoUrl = url.trim();
        if (thumb && typeof thumb === 'string' && thumb.trim()) result.thumbnail = thumb.trim();
        if (cached?.title && typeof cached.title === 'string' && cached.title.trim()) result.title = cached.title.trim();
        if (result.videoUrl !== DEFAULT_ABOUT_VIDEO) return result;
      }
    }

    try {
      const persistedSettings = loadPersistedSettings();
      if (persistedSettings) {
        for (const key of checkKeys) {
          if (persistedSettings[key]) {
            const data = persistedSettings[key];
            const url = data?.url || data?.videoUrl || data?.youtubeUrl;
            const thumb = data?.thumbnail || data?.thumbnailUrl || data?.thumbUrl || data?.poster;
            if (url && typeof url === 'string' && url.trim()) result.videoUrl = url.trim();
            if (thumb && typeof thumb === 'string' && thumb.trim()) result.thumbnail = thumb.trim();
            if (data?.title && typeof data.title === 'string' && data.title.trim()) result.title = data.title.trim();
          }
        }
      }
    } catch (e) {}

    if (!adminDb || !hasAdminCredentials) return result;

    const paths = [
      adminDb.collection('settings').doc('about_video'),
      adminDb.collection('settings').doc('aboutVideo'),
      adminDb.collection('site_settings').doc('about_video'),
      adminDb.collection('site_settings').doc('aboutVideo'),
      adminDb.collection('artifacts').doc('tsehaycampus-e1a6d').collection('public').doc('data').collection('site_settings').doc('about_video')
    ];

    for (const p of paths) {
      try {
        const snap = await p.get();
        if (snap.exists) {
          const data = snap.data();
          const url = data?.url || data?.videoUrl || data?.youtubeUrl;
          const thumb = data?.thumbnail || data?.thumbnailUrl || data?.thumbUrl || data?.poster;
          if (url && typeof url === 'string' && url.trim()) {
            result.videoUrl = url.trim();
          }
          if (thumb && typeof thumb === 'string' && thumb.trim()) {
            result.thumbnail = thumb.trim();
          }
          if (data?.title && typeof data.title === 'string' && data.title.trim()) {
            result.title = data.title.trim();
          }
          if (result.videoUrl && result.videoUrl !== DEFAULT_ABOUT_VIDEO) {
            break;
          }
        }
      } catch (err) {}
    }
  } catch (err) {
    console.warn('getLiveAboutVideoDataServer error:', err);
  }

  return result;
}

