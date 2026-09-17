import fs from 'fs';
import path from 'path';
import defaultLiveCourses from '@/data/live_courses.json';
import defaultLiveSettings from '@/data/live_settings.json';
import { DEFAULT_EVENTS } from '@/lib/eventCache';

function getLiveCoursesFilePath(): string {
  return path.join(process.cwd(), 'src', 'data', 'live_courses.json');
}

function getLiveEventsFilePath(): string {
  return path.join(process.cwd(), 'src', 'data', 'live_events.json');
}

function writeJsonFileSafely(filePath: string, data: any) {
  try {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
  } catch (err) {
    console.warn(`[memoryStore] File write warning for ${filePath}:`, err);
  }
}

function readJsonFileSafely(filePath: string): any {
  try {
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf8');
      return JSON.parse(content);
    }
  } catch (err) {
    console.warn(`[memoryStore] File read warning for ${filePath}:`, err);
  }
  return null;
}

// Global in-memory cache shared across API routes in Node runtime
interface TsehayGlobalStore {
  __tsehay_site_settings_cache?: Map<string, any>;
  __tsehay_courses_cache?: Map<string, any>;
  __tsehay_events_cache?: Map<string, any>;
  __tsehay_events_deleted_cache?: Set<string>;
}

const globalStore = global as unknown as TsehayGlobalStore;

if (!globalStore.__tsehay_site_settings_cache) {
  globalStore.__tsehay_site_settings_cache = new Map<string, any>();
  try {
    if (defaultLiveSettings && typeof defaultLiveSettings === 'object') {
      Object.entries(defaultLiveSettings).forEach(([k, v]) => {
        globalStore.__tsehay_site_settings_cache?.set(k, v);
      });
    }
  } catch (e) {}
}

if (!globalStore.__tsehay_courses_cache) {
  globalStore.__tsehay_courses_cache = new Map<string, any>();
  try {
    // Attempt reading from disk first
    const diskCourses = readJsonFileSafely(getLiveCoursesFilePath());
    const sourceCourses = Array.isArray(diskCourses) && diskCourses.length > 0 ? diskCourses : defaultLiveCourses;
    if (Array.isArray(sourceCourses)) {
      sourceCourses.forEach(c => {
        if (c && (c.id || c.slug)) {
          globalStore.__tsehay_courses_cache?.set(c.id || c.slug, c);
        }
      });
    }
  } catch (e) {}
}

if (!globalStore.__tsehay_events_deleted_cache) {
  globalStore.__tsehay_events_deleted_cache = new Set<string>();
}

if (!globalStore.__tsehay_events_cache) {
  globalStore.__tsehay_events_cache = new Map<string, any>();
  try {
    // Attempt reading from disk first
    const diskEvents = readJsonFileSafely(getLiveEventsFilePath());
    const sourceEvents = Array.isArray(diskEvents) && diskEvents.length > 0 ? diskEvents : DEFAULT_EVENTS;
    if (Array.isArray(sourceEvents)) {
      sourceEvents.forEach(ev => {
        if (ev && ev.id) {
          globalStore.__tsehay_events_cache?.set(ev.id, ev);
        }
      });
    }
    // If disk file doesn't exist yet, write defaults so it exists
    if (!diskEvents && Array.isArray(DEFAULT_EVENTS)) {
      writeJsonFileSafely(getLiveEventsFilePath(), DEFAULT_EVENTS);
    }
  } catch (e) {}
}

export const sharedSiteSettingsCache: Map<string, any> = globalStore.__tsehay_site_settings_cache!;
export const sharedCoursesCache: Map<string, any> = globalStore.__tsehay_courses_cache!;

// 📂 Load persisted courses
export function loadPersistedCourses(): any[] {
  try {
    const diskCourses = readJsonFileSafely(getLiveCoursesFilePath());
    if (Array.isArray(diskCourses) && diskCourses.length > 0) {
      diskCourses.forEach(c => {
        if (c && (c.id || c.slug)) {
          sharedCoursesCache.set(c.id || c.slug, c);
        }
      });
      return diskCourses;
    }

    const list = Array.from(sharedCoursesCache.values());
    if (list.length > 0) return list;

    if (Array.isArray(defaultLiveCourses)) {
      defaultLiveCourses.forEach(c => {
        if (c && (c.id || c.slug)) sharedCoursesCache.set(c.id || c.slug, c);
      });
      writeJsonFileSafely(getLiveCoursesFilePath(), defaultLiveCourses);
      return defaultLiveCourses;
    }
  } catch (e) {
    console.warn('loadPersistedCourses warning:', e);
  }
  return Array.from(sharedCoursesCache.values());
}

// 💾 Persist all courses
export function savePersistedCourses(courses: any[]): void {
  try {
    if (Array.isArray(courses)) {
      courses.forEach(c => {
        if (c && (c.id || c.slug)) sharedCoursesCache.set(c.id || c.slug, c);
      });
      writeJsonFileSafely(getLiveCoursesFilePath(), Array.from(sharedCoursesCache.values()));
    }
  } catch (e) {
    console.warn('savePersistedCourses warning:', e);
  }
}

// 💾 Save a single course
export function saveSinglePersistedCourse(course: any): void {
  try {
    if (course && (course.id || course.slug)) {
      const key = course.id || course.slug;
      sharedCoursesCache.set(key, course);
      // Also update any matching course by slug/id
      for (const [k, v] of sharedCoursesCache.entries()) {
        if (k !== key && (v.id === course.id || (course.slug && v.slug === course.slug))) {
          sharedCoursesCache.set(k, course);
        }
      }
      writeJsonFileSafely(getLiveCoursesFilePath(), Array.from(sharedCoursesCache.values()));
    }
  } catch (e) {
    console.warn('saveSinglePersistedCourse warning:', e);
  }
}

// 🗑️ Delete a course
export function deletePersistedCourse(courseId: string): void {
  try {
    if (courseId) {
      const clean = courseId.trim().toLowerCase();
      for (const [key, val] of Array.from(sharedCoursesCache.entries())) {
        if (key.toLowerCase() === clean || (val?.slug && val.slug.toLowerCase() === clean) || (val?.id && val.id.toLowerCase() === clean)) {
          sharedCoursesCache.delete(key);
        }
      }
      sharedCoursesCache.delete(courseId);
      writeJsonFileSafely(getLiveCoursesFilePath(), Array.from(sharedCoursesCache.values()));
    }
  } catch (e) {
    console.warn('deletePersistedCourse warning:', e);
  }
}

// ⚙️ Load persisted settings
export function loadPersistedSettings(): Record<string, any> {
  const result: Record<string, any> = {};
  try {
    sharedSiteSettingsCache.forEach((v, k) => { result[k] = v; });
  } catch (e) {
    console.warn('loadPersistedSettings warning:', e);
  }
  return result;
}

// ⚙️ Save persisted setting
export function savePersistedSetting(settingKey: string, data: any): void {
  try {
    if (settingKey) {
      sharedSiteSettingsCache.set(settingKey, data);
    }
  } catch (e) {
    console.warn('savePersistedSetting warning:', e);
  }
}

export const sharedEventsCache: Map<string, any> = globalStore.__tsehay_events_cache!;
export const sharedEventsDeletedCache: Set<string> = globalStore.__tsehay_events_deleted_cache!;

// 📅 Load persisted events
export function loadPersistedEvents(): any[] {
  try {
    // 1. Check disk file first
    const diskEvents = readJsonFileSafely(getLiveEventsFilePath());
    if (Array.isArray(diskEvents) && diskEvents.length > 0) {
      diskEvents.forEach(ev => {
        if (ev && ev.id) {
          const cId = (ev.id || '').trim().toLowerCase();
          const cSlug = (ev.slug || '').trim().toLowerCase();
          if (!sharedEventsDeletedCache.has(cId) && !sharedEventsDeletedCache.has(cSlug)) {
            sharedEventsCache.set(ev.id, ev);
          }
        }
      });
    }

    const list = Array.from(sharedEventsCache.values()).filter(ev => {
      if (!ev) return false;
      const cId = (ev.id || '').trim().toLowerCase();
      const cSlug = (ev.slug || '').trim().toLowerCase();
      return !sharedEventsDeletedCache.has(cId) && !sharedEventsDeletedCache.has(cSlug);
    });

    if (list.length > 0) return list;

    if (Array.isArray(DEFAULT_EVENTS)) {
      const filteredDefaults = DEFAULT_EVENTS.filter(ev => {
        if (!ev) return false;
        const cId = (ev.id || '').trim().toLowerCase();
        const cSlug = (ev.slug || '').trim().toLowerCase();
        return !sharedEventsDeletedCache.has(cId) && !sharedEventsDeletedCache.has(cSlug);
      });
      filteredDefaults.forEach(ev => {
        if (ev && ev.id) sharedEventsCache.set(ev.id, ev);
      });
      writeJsonFileSafely(getLiveEventsFilePath(), filteredDefaults);
      return filteredDefaults;
    }
  } catch (e) {
    console.warn('loadPersistedEvents warning:', e);
  }
  return Array.from(sharedEventsCache.values());
}

// 💾 Persist all events
export function savePersistedEvents(events: any[]): void {
  try {
    if (Array.isArray(events)) {
      sharedEventsCache.clear();
      events.forEach(ev => {
        if (ev && ev.id) {
          const cId = (ev.id || '').trim().toLowerCase();
          const cSlug = (ev.slug || '').trim().toLowerCase();
          if (!sharedEventsDeletedCache.has(cId) && !sharedEventsDeletedCache.has(cSlug)) {
            sharedEventsCache.set(ev.id, ev);
          }
        }
      });
      writeJsonFileSafely(getLiveEventsFilePath(), Array.from(sharedEventsCache.values()));
    }
  } catch (e) {
    console.warn('savePersistedEvents warning:', e);
  }
}

// 💾 Save a single event
export function saveSinglePersistedEvent(event: any): void {
  try {
    if (event && event.id) {
      const cId = (event.id || '').trim().toLowerCase();
      const cSlug = (event.slug || '').trim().toLowerCase();
      sharedEventsDeletedCache.delete(cId);
      if (cSlug) sharedEventsDeletedCache.delete(cSlug);
      sharedEventsCache.set(event.id, event);
      // Also update any matching event by slug
      if (event.slug) {
        for (const [key, val] of sharedEventsCache.entries()) {
          if (key !== event.id && val?.slug === event.slug) {
            sharedEventsCache.set(key, event);
          }
        }
      }
      writeJsonFileSafely(getLiveEventsFilePath(), Array.from(sharedEventsCache.values()));
    }
  } catch (e) {
    console.warn('saveSinglePersistedEvent warning:', e);
  }
}

// 🗑️ Delete an event
export function deletePersistedEvent(eventId: string, eventSlug?: string): void {
  try {
    if (eventId) {
      const cId = eventId.trim().toLowerCase();
      sharedEventsDeletedCache.add(cId);
      sharedEventsCache.delete(eventId);
      for (const [key, val] of Array.from(sharedEventsCache.entries())) {
        if (key.toLowerCase() === cId || (val?.slug && val.slug.toLowerCase() === cId)) {
          sharedEventsCache.delete(key);
        }
      }
    }
    if (eventSlug) {
      const cSlug = eventSlug.trim().toLowerCase();
      sharedEventsDeletedCache.add(cSlug);
      for (const [key, val] of Array.from(sharedEventsCache.entries())) {
        if (key.toLowerCase() === cSlug || (val?.slug && val.slug.toLowerCase() === cSlug)) {
          sharedEventsCache.delete(key);
        }
      }
    }
    writeJsonFileSafely(getLiveEventsFilePath(), Array.from(sharedEventsCache.values()));
  } catch (e) {
    console.warn('deletePersistedEvent warning:', e);
  }
}

// 💬 Community In-Memory & File Store
interface TsehayCommunityGlobalStore extends TsehayGlobalStore {
  __tsehay_community_posts_cache?: Map<string, any>;
  __tsehay_community_comments_cache?: Map<string, any[]>;
}

const communityGlobalStore = global as unknown as TsehayCommunityGlobalStore;

if (!communityGlobalStore.__tsehay_community_posts_cache) {
  communityGlobalStore.__tsehay_community_posts_cache = new Map<string, any>();
}

if (!communityGlobalStore.__tsehay_community_comments_cache) {
  communityGlobalStore.__tsehay_community_comments_cache = new Map<string, any[]>();
}

export const sharedCommunityPostsCache: Map<string, any> = communityGlobalStore.__tsehay_community_posts_cache!;
export const sharedCommunityCommentsCache: Map<string, any[]> = communityGlobalStore.__tsehay_community_comments_cache!;

export function loadPersistedCommunityPosts(): any[] {
  try {
    const list = Array.from(sharedCommunityPostsCache.values());
    if (list.length > 0) {
      return list.sort((a, b) => {
        if (a.isPinned && !b.isPinned) return -1;
        if (!a.isPinned && b.isPinned) return 1;
        const timeA = new Date(a.createdAt || 0).getTime();
        const timeB = new Date(b.createdAt || 0).getTime();
        return timeB - timeA;
      });
    }
  } catch (e) {
    console.warn('loadPersistedCommunityPosts warning:', e);
  }
  return [];
}

export function savePersistedCommunityPosts(posts: any[]): void {
  try {
    if (Array.isArray(posts)) {
      sharedCommunityPostsCache.clear();
      posts.forEach(p => {
        if (p && p.id) sharedCommunityPostsCache.set(p.id, p);
      });
    }
  } catch (e) {
    console.warn('savePersistedCommunityPosts warning:', e);
  }
}

export function saveSingleCommunityPost(post: any): void {
  try {
    if (post && post.id) {
      sharedCommunityPostsCache.set(post.id, post);
    }
  } catch (e) {
    console.warn('saveSingleCommunityPost warning:', e);
  }
}

export function deletePersistedCommunityPost(postId: string): void {
  try {
    if (postId) {
      sharedCommunityPostsCache.delete(postId);
      sharedCommunityCommentsCache.delete(postId);
    }
  } catch (e) {
    console.warn('deletePersistedCommunityPost warning:', e);
  }
}

export function loadPersistedCommunityComments(postId: string): any[] {
  try {
    if (!postId) return [];
    return sharedCommunityCommentsCache.get(postId) || [];
  } catch (e) {
    return [];
  }
}

export function savePersistedCommunityComment(postId: string, comment: any): void {
  try {
    if (!postId || !comment || !comment.id) return;
    const existing = sharedCommunityCommentsCache.get(postId) || [];
    const filtered = existing.filter(c => c.id !== comment.id);
    filtered.push(comment);
    sharedCommunityCommentsCache.set(postId, filtered);
  } catch (e) {}
}

export function deletePersistedCommunityComment(postId: string, commentId: string): void {
  try {
    if (!postId || !commentId) return;
    const existing = sharedCommunityCommentsCache.get(postId) || [];
    const filtered = existing.filter(c => c.id !== commentId);
    sharedCommunityCommentsCache.set(postId, filtered);
  } catch (e) {}
}

