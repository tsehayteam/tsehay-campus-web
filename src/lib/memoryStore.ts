import fs from 'fs';
import path from 'path';

// Global in-memory cache shared across API routes in Node runtime
interface TsehayGlobalStore {
  __tsehay_site_settings_cache?: Map<string, any>;
  __tsehay_courses_cache?: Map<string, any>;
  __tsehay_initialized?: boolean;
}

const globalStore = global as unknown as TsehayGlobalStore;

if (!globalStore.__tsehay_site_settings_cache) {
  globalStore.__tsehay_site_settings_cache = new Map<string, any>();
}
if (!globalStore.__tsehay_courses_cache) {
  globalStore.__tsehay_courses_cache = new Map<string, any>();
}

export const sharedSiteSettingsCache = globalStore.__tsehay_site_settings_cache;
export const sharedCoursesCache = globalStore.__tsehay_courses_cache;

const DATA_DIR = path.join(process.cwd(), 'src', 'data');
const COURSES_FILE = path.join(DATA_DIR, 'live_courses.json');
const SETTINGS_FILE = path.join(DATA_DIR, 'live_settings.json');

// Ensure data directory exists
function ensureDataDir() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
  } catch (e) {
    console.warn('Could not create data directory:', e);
  }
}

// 📂 Load persisted courses from disk
export function loadPersistedCourses(): any[] {
  try {
    if (fs.existsSync(COURSES_FILE)) {
      const raw = fs.readFileSync(COURSES_FILE, 'utf8');
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        parsed.forEach(c => {
          if (c && c.id) {
            sharedCoursesCache.set(c.id, c);
          }
        });
        return parsed;
      }
    }
  } catch (e) {
    console.warn('Error reading persisted courses:', e);
  }
  return Array.from(sharedCoursesCache.values());
}

// 💾 Persist all courses to disk and memory
export function savePersistedCourses(courses: any[]): void {
  try {
    ensureDataDir();
    courses.forEach(c => {
      if (c && c.id) {
        sharedCoursesCache.set(c.id, c);
      }
    });
    const list = Array.from(sharedCoursesCache.values());
    fs.writeFileSync(COURSES_FILE, JSON.stringify(list, null, 2), 'utf8');
  } catch (e) {
    console.warn('Error writing persisted courses:', e);
  }
}

// 💾 Save a single course to disk and memory
export function saveSinglePersistedCourse(course: any): void {
  if (!course || !course.id) return;
  try {
    ensureDataDir();
    sharedCoursesCache.set(course.id, course);
    const list = Array.from(sharedCoursesCache.values());
    fs.writeFileSync(COURSES_FILE, JSON.stringify(list, null, 2), 'utf8');
  } catch (e) {
    console.warn('Error saving single course to disk:', e);
  }
}

// 🗑️ Delete a course from disk and memory
export function deletePersistedCourse(courseId: string): void {
  if (!courseId) return;
  try {
    ensureDataDir();
    sharedCoursesCache.delete(courseId);
    const list = Array.from(sharedCoursesCache.values());
    fs.writeFileSync(COURSES_FILE, JSON.stringify(list, null, 2), 'utf8');
  } catch (e) {
    console.warn('Error deleting course from disk:', e);
  }
}

// ⚙️ Load persisted settings
export function loadPersistedSettings(): Record<string, any> {
  try {
    if (fs.existsSync(SETTINGS_FILE)) {
      const raw = fs.readFileSync(SETTINGS_FILE, 'utf8');
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        Object.entries(parsed).forEach(([k, v]) => {
          sharedSiteSettingsCache.set(k, v);
        });
        return parsed;
      }
    }
  } catch (e) {
    console.warn('Error reading persisted settings:', e);
  }
  const result: Record<string, any> = {};
  sharedSiteSettingsCache.forEach((v, k) => { result[k] = v; });
  return result;
}

// ⚙️ Save persisted setting
export function savePersistedSetting(settingKey: string, data: any): void {
  if (!settingKey) return;
  try {
    ensureDataDir();
    sharedSiteSettingsCache.set(settingKey, data);
    const result: Record<string, any> = {};
    sharedSiteSettingsCache.forEach((v, k) => { result[k] = v; });
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify(result, null, 2), 'utf8');
  } catch (e) {
    console.warn('Error saving persisted setting:', e);
  }
}

// Initialize on module load
if (!globalStore.__tsehay_initialized) {
  globalStore.__tsehay_initialized = true;
  loadPersistedCourses();
  loadPersistedSettings();
}
