import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, supabaseServer } from '@/lib/supabase/server';
import { generateCourseSlug, DEFAULT_COURSES, isValidCourse, formatDriveImageUrl, getCleanCourseImage, getCleanInstructorImage, deduplicateCourses } from '@/lib/courseCache';
import { loadPersistedCourses } from '@/lib/memoryStore';

export const dynamic = 'force-dynamic';

const CACHE_HEADERS = {
  'Cache-Control': 'public, s-maxage=5, stale-while-revalidate=15',
  'CDN-Control': 'public, s-maxage=5, stale-while-revalidate=15',
  'Vercel-CDN-Cache-Control': 'public, s-maxage=5, stale-while-revalidate=15',
};

const NO_CACHE_HEADERS = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
  'CDN-Cache-Control': 'no-store',
  'Vercel-CDN-Cache-Control': 'no-store',
  'Pragma': 'no-cache',
  'Expires': '0',
};

// In-Memory Server Cache (Node process runtime)
interface CacheEntry<T> {
  timestamp: number;
  data: T;
}

const CACHE_TTL_MS = 15 * 1000; // 15 seconds TTL
let allCoursesCache: CacheEntry<{ courses: any[]; deletedCourses: string[] }> | null = null;
const singleCourseCache = new Map<string, CacheEntry<any>>();

/**
 * Public Cache Invalidation Hook
 * Called by admin mutations (create, update, delete course) to clear cache immediately
 */
export function invalidateCoursesCache(): void {
  allCoursesCache = null;
  singleCourseCache.clear();
}

// Columns explicitly projected from the `courses` table
const COURSE_COLUMNS_PROJECTION = [
  'id',
  'slug',
  'title',
  'title_en',
  'description',
  'desc',
  'price',
  'old_price',
  'instructor',
  'instructor_name',
  'instructor_image',
  'instructor_photo',
  'image',
  'banner',
  'video',
  'status',
  'is_published',
  'category',
  'lessons',
  'modules',
  'requirements',
  'includes',
  'what_you_will_learn',
  'ai_prompt',
  'created_at',
  'updated_at'
].join(',');

function sanitizeCourseImages(course: any) {
  if (!course || typeof course !== 'object') return course;
  const image = getCleanCourseImage(course) || formatDriveImageUrl(course.image) || course.image;
  const banner = formatDriveImageUrl(course.banner) || course.banner || image;
  const instructorImg = getCleanInstructorImage(course);

  return {
    ...course,
    image,
    banner,
    instructor_image: instructorImg,
    instructor_photo: instructorImg,
    instructorImage: instructorImg,
    instructorPhoto: instructorImg
  };
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const courseId = searchParams.get('courseId') || searchParams.get('id');
    const isFresh = searchParams.get('fresh') === '1' || searchParams.has('t') || searchParams.get('nocache') === '1';
    const now = Date.now();

    // 1. Fetch deleted courses blacklist from site_settings
    let deletedCourses: string[] = [];
    try {
      const { data: delData } = await supabaseAdmin
        .from('site_settings')
        .select('data')
        .eq('key', 'deleted_courses')
        .maybeSingle();
      if (Array.isArray(delData?.data)) {
        deletedCourses = delData.data.map((d: any) => String(d).toLowerCase().trim());
      }
    } catch (e) {}

    // 2. Fetch persistent coming_soon_courses from site_settings
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

    // 3. Fetch persistent custom_courses from site_settings (Dual-store guarantee)
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

    // ==========================================
    // 🎯 SINGLE COURSE LOOKUP
    // ==========================================
    if (courseId) {
      const cleanId = courseId.trim();
      const cleanLower = cleanId.toLowerCase();

      // Check single course memory cache
      if (!isFresh) {
        const cachedSingle = singleCourseCache.get(cleanLower) || singleCourseCache.get(cleanId);
        if (cachedSingle && (now - cachedSingle.timestamp < CACHE_TTL_MS)) {
          return NextResponse.json(
            { success: true, course: cachedSingle.data },
            { headers: CACHE_HEADERS }
          );
        }
      }

      if (deletedCourses.includes(cleanId) || deletedCourses.includes(cleanLower)) {
        return NextResponse.json({ success: false, error: 'Course deleted' }, { status: 404, headers: NO_CACHE_HEADERS });
      }

      // Check persistent coming soon first
      const csMatch = persistentComingSoon.find(c => c && (
        (c.id && c.id.toLowerCase() === cleanLower) || 
        (c.slug && c.slug.toLowerCase() === cleanLower) || 
        c.id === cleanId || 
        c.slug === cleanId
      ));
      if (csMatch) {
        const sanitized = sanitizeCourseImages({ ...csMatch, status: 'coming_soon', isComingSoon: true });
        singleCourseCache.set(cleanId, { timestamp: now, data: sanitized });
        singleCourseCache.set(cleanLower, { timestamp: now, data: sanitized });
        return NextResponse.json({ success: true, course: sanitized }, { headers: CACHE_HEADERS });
      }

      // Check persistent custom courses
      const customMatch = persistentCustomCourses.find(c => c && (
        (c.id && c.id.toLowerCase() === cleanLower) || 
        (c.slug && c.slug.toLowerCase() === cleanLower) || 
        c.id === cleanId || 
        c.slug === cleanId
      ));
      if (customMatch && isValidCourse(customMatch) && customMatch.status !== 'Deleted' && !customMatch.isDeleted) {
        const sanitized = sanitizeCourseImages(customMatch);
        singleCourseCache.set(cleanId, { timestamp: now, data: sanitized });
        singleCourseCache.set(cleanLower, { timestamp: now, data: sanitized });
        return NextResponse.json({ success: true, course: sanitized }, { headers: CACHE_HEADERS });
      }

      // Check Supabase directly using supabaseAdmin (Bypasses RLS)
      try {
        const { data: sbCourse, error: sbErr } = await (supabaseAdmin
          .from('courses') as any)
          .select(COURSE_COLUMNS_PROJECTION)
          .or(`id.eq.${cleanId},slug.eq.${cleanId},slug.eq.${cleanLower}`)
          .maybeSingle();

        if (sbCourse && !sbErr && isValidCourse(sbCourse) && sbCourse.status !== 'Deleted' && !sbCourse.isDeleted) {
          const sanitized = sanitizeCourseImages(sbCourse);
          singleCourseCache.set(cleanId, { timestamp: now, data: sanitized });
          singleCourseCache.set(cleanLower, { timestamp: now, data: sanitized });
          return NextResponse.json({ success: true, course: sanitized }, { headers: CACHE_HEADERS });
        }
      } catch (sbE) {}

      // Check persisted disk / memory courses
      const persistedSingle = loadPersistedCourses();
      const pMatch = persistedSingle.find(c => 
        (c.id === cleanId || c.slug === cleanLower || (c.slug && c.slug.toLowerCase() === cleanLower)) && 
        !deletedCourses.includes(c.id) && 
        !deletedCourses.includes(c.slug)
      );
      if (pMatch) {
        const sanitized = sanitizeCourseImages(pMatch);
        return NextResponse.json({ success: true, course: sanitized }, { headers: CACHE_HEADERS });
      }

      // Fallback to matching default course
      const defMatch = DEFAULT_COURSES.find(c => (c.id === cleanId || c.slug === cleanLower) && !deletedCourses.includes(c.id) && !deletedCourses.includes(c.slug));
      if (defMatch) {
        const sanitized = sanitizeCourseImages(defMatch);
        return NextResponse.json({ success: true, course: sanitized }, { headers: CACHE_HEADERS });
      }

      return NextResponse.json({ success: false, error: 'Course not found' }, { status: 404, headers: NO_CACHE_HEADERS });
    }

    // ==========================================
    // 📚 ALL COURSES LOOKUP
    // ==========================================
    if (!isFresh && allCoursesCache && (now - allCoursesCache.timestamp < CACHE_TTL_MS)) {
      return NextResponse.json({
        success: true,
        count: allCoursesCache.data.courses.length,
        courses: allCoursesCache.data.courses
      }, { headers: CACHE_HEADERS });
    }

    // 4. Fetch All Courses from Supabase courses table using supabaseAdmin
    let activeCourses: any[] = [];
    try {
      const { data: sbCourses, error: sbErr } = await (supabaseAdmin
        .from('courses') as any)
        .select(COURSE_COLUMNS_PROJECTION)
        .order('created_at', { ascending: false });

      if (!sbErr && Array.isArray(sbCourses) && sbCourses.length > 0) {
        activeCourses = sbCourses
          .filter(item => 
            item && 
            item.id && 
            isValidCourse(item) && 
            item.status !== 'Deleted' && 
            !item.isDeleted && 
            !deletedCourses.includes(String(item.id).toLowerCase().trim()) && 
            (!item.slug || !deletedCourses.includes(String(item.slug).toLowerCase().trim()))
          )
          .map(sanitizeCourseImages);
      }
    } catch (sbErr) {
      console.warn('Supabase courses fetch warning in /api/courses:', sbErr);
    }

    const courseMap = new Map<string, any>();
    activeCourses.forEach(c => {
      const key = (c.slug || c.id).toLowerCase().trim();
      if (key) courseMap.set(key, c);
    });

    // 5. Merge persistent custom_courses from site_settings (Dual-Store persistence)
    persistentCustomCourses.forEach(c => {
      if (!c) return;
      const cId = c.id ? String(c.id).toLowerCase().trim() : '';
      const cSlug = c.slug ? String(c.slug).toLowerCase().trim() : '';
      if (deletedCourses.includes(cId) || (cSlug && deletedCourses.includes(cSlug))) return;

      const key = cSlug || cId;
      if (!key) return;

      if (!courseMap.has(key)) {
        courseMap.set(key, sanitizeCourseImages(c));
      }
    });

    // 6. Merge persisted courses from disk / memory store
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
              courseMap.set(key, sanitizeCourseImages(p));
            } else {
              const existing = courseMap.get(key);
              if (p.lessons && p.lessons.length > (existing.lessons?.length || 0)) {
                courseMap.set(key, sanitizeCourseImages({ ...existing, ...p }));
              }
            }
          }
        });
      }
    } catch (e) {}

    // 7. If completely empty and no courses were deleted by user, seed defaults
    if (courseMap.size === 0 && deletedCourses.length === 0) {
      DEFAULT_COURSES
        .filter(c => !deletedCourses.includes(c.id.toLowerCase()) && !deletedCourses.includes(c.slug.toLowerCase()))
        .map(sanitizeCourseImages)
        .forEach(c => {
          const key = (c.slug || c.id).toLowerCase().trim();
          if (key) courseMap.set(key, c);
        });
    }

    // 8. Merge persistent coming_soon courses
    persistentComingSoon.forEach(cs => {
      if (!cs) return;
      const csId = cs.id ? String(cs.id).toLowerCase().trim() : '';
      const csSlug = cs.slug ? String(cs.slug).toLowerCase().trim() : '';
      if (deletedCourses.includes(csId) || (csSlug && deletedCourses.includes(csSlug))) return;

      const primaryKey = csSlug || csId;
      let targetKey = primaryKey;
      if (!courseMap.has(primaryKey)) {
        for (const [k, v] of courseMap.entries()) {
          if (v.id === cs.id || (cs.slug && v.slug === cs.slug)) {
            targetKey = k;
            break;
          }
        }
      }
      courseMap.set(targetKey, sanitizeCourseImages({
        ...(courseMap.get(targetKey) || {}),
        ...cs,
        status: 'coming_soon',
        isComingSoon: true
      }));
    });

    const allMergedCourses = deduplicateCourses(Array.from(courseMap.values()));

    // Update In-Memory Cache
    allCoursesCache = {
      timestamp: now,
      data: {
        courses: allMergedCourses,
        deletedCourses
      }
    };

    return NextResponse.json({
      success: true,
      count: allMergedCourses.length,
      courses: allMergedCourses
    }, { headers: CACHE_HEADERS });
  } catch (error: any) {
    console.error('Error in GET /api/courses:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error', courses: [] },
      { status: 500, headers: NO_CACHE_HEADERS }
    );
  }
}
