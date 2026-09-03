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
