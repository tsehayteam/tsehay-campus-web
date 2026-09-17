import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase/server';
import { generateCourseSlug, DEFAULT_COURSES, isValidCourse, formatDriveImageUrl, getCleanCourseImage, getCleanInstructorImage, deduplicateCourses } from '@/lib/courseCache';
import { loadPersistedCourses } from '@/lib/memoryStore';

export const dynamic = 'force-dynamic';

const CACHE_HEADERS = {
  'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
  'CDN-Control': 'public, s-maxage=60, stale-while-revalidate=300',
  'Vercel-CDN-Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
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

const CACHE_TTL_MS = 120 * 1000; // 120 seconds TTL
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

// Columns explicitly projected from the `courses` table (omitting the heavy duplicate `raw_data` column)
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
    const now = Date.now();

    // 1. Single Course Lookup
    if (courseId) {
      const cleanId = courseId.trim();
      const cleanLower = cleanId.toLowerCase();

      // Check single course cache
      const cachedSingle = singleCourseCache.get(cleanLower) || singleCourseCache.get(cleanId);
      if (cachedSingle && (now - cachedSingle.timestamp < CACHE_TTL_MS)) {
        return NextResponse.json(
          { success: true, course: cachedSingle.data },
          { headers: CACHE_HEADERS }
        );
      }

      // Fetch deleted courses list (check memory cache first)
      let deletedCourses: string[] = [];
      if (allCoursesCache && (now - allCoursesCache.timestamp < CACHE_TTL_MS)) {
        deletedCourses = allCoursesCache.data.deletedCourses;
      } else {
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
      }

      if (deletedCourses.includes(cleanId) || deletedCourses.includes(cleanLower)) {
        return NextResponse.json({ success: false, error: 'Course deleted' }, { status: 404, headers: NO_CACHE_HEADERS });
      }

      // Check Supabase directly for the single course
      try {
        const { data: sbCourse, error: sbErr }: any = await (supabaseServer
          .from('courses') as any)
          .select(COURSE_COLUMNS_PROJECTION)
          .or(`id.eq.${cleanId},slug.eq.${cleanId},slug.eq.${cleanLower}`)
          .maybeSingle();

        if (sbCourse && !sbErr && isValidCourse(sbCourse) && sbCourse.status !== 'Deleted' && !sbCourse.isDeleted) {
          const sanitized = sanitizeCourseImages(sbCourse);
          singleCourseCache.set(cleanId, { timestamp: now, data: sanitized });
          singleCourseCache.set(cleanLower, { timestamp: now, data: sanitized });
          return NextResponse.json(
            { success: true, course: sanitized },
            { headers: CACHE_HEADERS }
          );
        }
      } catch (sbE) {}

      // Fallback to matching default course
      const defMatch = DEFAULT_COURSES.find(c => (c.id === cleanId || c.slug === cleanLower) && !deletedCourses.includes(c.id) && !deletedCourses.includes(c.slug));
      if (defMatch) {
        const sanitized = sanitizeCourseImages(defMatch);
        return NextResponse.json(
          { success: true, course: sanitized },
          { headers: CACHE_HEADERS }
        );
      }

      return NextResponse.json(
        { success: false, error: 'Course not found' },
        { status: 404, headers: NO_CACHE_HEADERS }
      );
    }

    // 2. Fetch All Courses - Check In-Memory Cache
    if (allCoursesCache && (now - allCoursesCache.timestamp < CACHE_TTL_MS)) {
      return NextResponse.json({
        success: true,
        count: allCoursesCache.data.courses.length,
        courses: allCoursesCache.data.courses
      }, { headers: CACHE_HEADERS });
    }

    // Cache Miss: Query Supabase
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

    // 2. Fetch persistent coming_soon_courses from site_settings (lifetime persistence)
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

    // 3. Single Course Lookup
    if (courseId) {
      const cleanId = courseId.trim();
      const cleanLower = cleanId.toLowerCase();

      if (deletedCourses.includes(cleanId) || deletedCourses.includes(cleanLower)) {
        return NextResponse.json({ success: false, error: 'Course deleted' }, { status: 404, headers: NO_CACHE_HEADERS });
      }

      // Check persistent coming soon first if match
      const csMatch = persistentComingSoon.find(c => (c.id === cleanId || c.slug === cleanLower || c.id === cleanLower));
      if (csMatch) {
        return NextResponse.json(
          { success: true, course: sanitizeCourseImages({ ...csMatch, status: 'coming_soon', isComingSoon: true }) },
          { headers: NO_CACHE_HEADERS }
        );
      }

      // Check Supabase directly with projected columns
      try {
        const { data: sbCourse, error: sbErr }: any = await (supabaseServer
          .from('courses') as any)
          .select(COURSE_COLUMNS_PROJECTION)
          .or(`id.eq.${cleanId},slug.eq.${cleanId},slug.eq.${cleanLower}`)
          .maybeSingle();

        if (sbCourse && !sbErr && isValidCourse(sbCourse) && sbCourse.status !== 'Deleted' && !sbCourse.isDeleted) {
          const sanitized = sanitizeCourseImages(sbCourse);
          singleCourseCache.set(cleanId, { timestamp: now, data: sanitized });
          singleCourseCache.set(cleanLower, { timestamp: now, data: sanitized });
          return NextResponse.json(
            { success: true, course: sanitized },
            { headers: CACHE_HEADERS }
          );
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
        return NextResponse.json(
          { success: true, course: sanitizeCourseImages(pMatch) },
          { headers: NO_CACHE_HEADERS }
        );
      }

      // Fallback only to matching default course
      const defMatch = DEFAULT_COURSES.find(c => (c.id === cleanId || c.slug === cleanLower) && !deletedCourses.includes(c.id) && !deletedCourses.includes(c.slug));
      if (defMatch) {
        const sanitized = sanitizeCourseImages(defMatch);
        return NextResponse.json(
          { success: true, course: sanitized },
          { headers: CACHE_HEADERS }
        );
      }

      return NextResponse.json(
        { success: false, error: 'Course not found' },
        { status: 404, headers: NO_CACHE_HEADERS }
      );
    }

    // 4. Fetch All Courses from Supabase & Persisted Storage
    let activeCourses: any[] = [];

    try {
      const { data: sbCourses, error: sbErr }: any = await (supabaseServer
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
            !deletedCourses.includes(item.id) && 
            !deletedCourses.includes(item.slug)
          )
          .map(sanitizeCourseImages);
      }
    } catch (sbErr) {
      console.warn('Supabase courses fetch warning in /api/courses:', sbErr);
    }

    // Merge persisted courses from disk / memory
    const courseMap = new Map<string, any>();
    activeCourses.forEach(c => {
      const key = c.id || c.slug;
      if (key) courseMap.set(key, c);
    });

    try {
      const persisted = loadPersistedCourses();
      if (Array.isArray(persisted) && persisted.length > 0) {
        persisted.forEach(p => {
          if (p && (p.id || p.slug) && !deletedCourses.includes(p.id) && !deletedCourses.includes(p.slug)) {
            const key = p.id || p.slug;
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

    // If completely empty and no courses were deleted by user, seed defaults
    if (courseMap.size === 0 && deletedCourses.length === 0) {
      DEFAULT_COURSES
        .filter(c => !deletedCourses.includes(c.id) && !deletedCourses.includes(c.slug))
        .map(sanitizeCourseImages)
        .forEach(c => {
          const key = c.id || c.slug;
          if (key) courseMap.set(key, c);
        });
    }

    // Merge persistent coming_soon courses if not already present
    persistentComingSoon.forEach(cs => {
      if (!cs || deletedCourses.includes(cs.id) || deletedCourses.includes(cs.slug)) return;
      const primaryKey = cs.id || cs.slug;
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
