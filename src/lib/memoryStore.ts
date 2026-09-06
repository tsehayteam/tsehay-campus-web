import defaultLiveCourses from '@/data/live_courses.json';
import defaultLiveSettings from '@/data/live_settings.json';
import { DEFAULT_EVENTS } from '@/lib/eventCache';

// Global in-memory cache shared across API routes in Node runtime
interface TsehayGlobalStore {
  __tsehay_site_settings_cache?: Map<string, any>;
  __tsehay_courses_cache?: Map<string, any>;
  __tsehay_events_cache?: Map<string, any>;
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
    if (Array.isArray(defaultLiveCourses)) {
      defaultLiveCourses.forEach(c => {
        if (c && c.id) {
          globalStore.__tsehay_courses_cache?.set(c.id, c);
        }
      });
    }
  } catch (e) {}
}

if (!globalStore.__tsehay_events_cache) {
  globalStore.__tsehay_events_cache = new Map<string, any>();
  try {
    if (Array.isArray(DEFAULT_EVENTS)) {
      DEFAULT_EVENTS.forEach(ev => {
        if (ev && ev.id) {
          globalStore.__tsehay_events_cache?.set(ev.id, ev);
        }
      });
    }
  } catch (e) {}
}

export const sharedSiteSettingsCache: Map<string, any> = globalStore.__tsehay_site_settings_cache!;
export const sharedCoursesCache: Map<string, any> = globalStore.__tsehay_courses_cache!;

// 📂 Load persisted courses
export function loadPersistedCourses(): any[] {
  try {
    const list = Array.from(sharedCoursesCache.values());
    if (list.length > 0) return list;
    if (Array.isArray(defaultLiveCourses)) {
      defaultLiveCourses.forEach(c => {
        if (c && c.id) sharedCoursesCache.set(c.id, c);
      });
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
        if (c && c.id) sharedCoursesCache.set(c.id, c);
      });
    }
  } catch (e) {
    console.warn('savePersistedCourses warning:', e);
  }
}

// 💾 Save a single course
export function saveSinglePersistedCourse(course: any): void {
  try {
    if (course && course.id) {
      sharedCoursesCache.set(course.id, course);
    }
  } catch (e) {
    console.warn('saveSinglePersistedCourse warning:', e);
  }
}

// 🗑️ Delete a course
export function deletePersistedCourse(courseId: string): void {
  try {
    if (courseId) {
      sharedCoursesCache.delete(courseId);
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

// 📅 Load persisted events
export function loadPersistedEvents(): any[] {
  try {
    const list = Array.from(sharedEventsCache.values());
    if (list.length > 0) return list;
    if (Array.isArray(DEFAULT_EVENTS)) {
      DEFAULT_EVENTS.forEach(ev => {
        if (ev && ev.id) sharedEventsCache.set(ev.id, ev);
      });
      return DEFAULT_EVENTS;
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
      events.forEach(ev => {
        if (ev && ev.id) sharedEventsCache.set(ev.id, ev);
      });
    }
  } catch (e) {
    console.warn('savePersistedEvents warning:', e);
  }
}

// 💾 Save a single event
export function saveSinglePersistedEvent(event: any): void {
  try {
    if (event && event.id) {
      sharedEventsCache.set(event.id, event);
    }
  } catch (e) {
    console.warn('saveSinglePersistedEvent warning:', e);
  }
}

// 🗑️ Delete an event
export function deletePersistedEvent(eventId: string): void {
  try {
    if (eventId) {
      sharedEventsCache.delete(eventId);
    }
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

