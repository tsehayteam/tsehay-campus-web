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

export async function getLiveLandingVideoServer(): Promise<string> {
  try {
    if (sharedSiteSettingsCache.has('landing_video')) {
      const cached = sharedSiteSettingsCache.get('landing_video');
      const url = cached?.url || cached?.videoUrl || cached?.youtubeUrl;
      if (url && typeof url === 'string' && url.trim()) {
        return url.trim();
      }
    }

    try {
      const persistedSettings = loadPersistedSettings();
      if (persistedSettings && persistedSettings['landing_video']) {
        const data = persistedSettings['landing_video'];
        const url = data?.url || data?.videoUrl || data?.youtubeUrl;
        if (url && typeof url === 'string' && url.trim()) {
          return url.trim();
        }
      }
    } catch (e) {}

    if (!adminDb || !hasAdminCredentials) return DEFAULT_LANDING_VIDEO;

    const paths = [
      adminDb.collection('artifacts').doc('tsehaycampus-e1a6d').collection('public').doc('data').collection('site_settings').doc('landing_video'),
      adminDb.collection('site_settings').doc('landing_video'),
      adminDb.collection('settings').doc('landing_video'),
      adminDb.collection('settings').doc('landingVideo')
    ];

    for (const p of paths) {
      try {
        const snap = await p.get();
        if (snap.exists) {
          const data = snap.data();
          const url = data?.url || data?.videoUrl || data?.youtubeUrl;
          if (url && typeof url === 'string' && url.trim()) {
            return url.trim();
          }
        }
      } catch (e) {}
    }
  } catch (err) {
    console.warn('getLiveLandingVideoServer fallback notice:', err);
  }
  return DEFAULT_LANDING_VIDEO;
}

