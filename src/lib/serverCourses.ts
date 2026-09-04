import { supabaseServer } from '@/lib/supabase/server';
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

    // 3. Query native Supabase courses table
    try {
      const { data: supaCourses, error } = await supabaseServer
        .from('courses')
        .select('*');

      if (!error && supaCourses && Array.isArray(supaCourses)) {
        supaCourses.forEach((c: any) => {
          if (c && c.id && c.status !== 'Deleted' && !c.isDeleted) {
            const cleanDesc = formatCourseDesc(c);
            const existing = courseMap.get(c.id) || {};
            courseMap.set(c.id, { ...existing, ...c, desc: cleanDesc, description: cleanDesc });
          }
        });
      }
    } catch (e) {}

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

    // Fetch from Supabase site_settings
    try {
      const { data, error } = await supabaseServer
        .from('site_settings')
        .select('data')
        .eq('key', 'landing_video')
        .maybeSingle();

      if (!error && data?.data) {
        const landingData = data.data;
        const url = landingData?.url || landingData?.videoUrl || landingData?.youtubeUrl;
        if (url && typeof url === 'string' && url.trim()) {
          return url.trim();
        }
      }
    } catch (e) {}
  } catch (err) {
    console.warn('getLiveLandingVideoServer fallback notice:', err);
  }
  return DEFAULT_LANDING_VIDEO;
}
