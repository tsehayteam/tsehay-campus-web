import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, supabaseServer } from '@/lib/supabase/server';
import { generateCourseSlug, DEFAULT_COURSES, isValidCourse, formatDriveImageUrl, getCleanCourseImage, getCleanInstructorImage, deduplicateCourses } from '@/lib/courseCache';
import { loadPersistedCourses } from '@/lib/memoryStore';
import { verifyAdminRequest } from '@/lib/adminAuthHelper';

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

async function checkCourseAccess(req: NextRequest, targetCourse: any): Promise<{ hasAccess: boolean }> {
  try {
    if (!targetCourse) return { hasAccess: false };
    const isFree = targetCourse.isFree || targetCourse.price === 'Free' || targetCourse.price === 0 || targetCourse.price === '0';
    if (isFree) return { hasAccess: true };

    // 1. Admin fast-path
    try {
      const adminCheck = await verifyAdminRequest(req);
      if (adminCheck && adminCheck.authorized) {
        return { hasAccess: true };
      }
    } catch (e) {}

    // 2. Check Bearer token in Authorization header
    const authHeader = req.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return { hasAccess: false };
    }

    const token = authHeader.split('Bearer ')[1].trim();
    if (!token) return { hasAccess: false };

    const { data: { user }, error: authErr } = await supabaseServer.auth.getUser(token);
    if (authErr || !user) return { hasAccess: false };

    // 3. Check enrollment in Supabase enrollments table
    const targetIds = [targetCourse.id, targetCourse.slug].filter(Boolean).map(x => String(x).toLowerCase().trim());
    const { data: enrollments, error: enrErr } = await supabaseAdmin
      .from('enrollments')
      .select('id, course_id, status')
      .eq('user_id', user.id);

    if (!enrErr && enrollments && Array.isArray(enrollments)) {
      const isEnrolled = enrollments.some((enr: any) => {
        const enrCourse = String(enr.course_id || '').toLowerCase().trim();
        const isCompleted = enr.status === 'completed' || enr.status === 'success' || enr.status === 'active' || !enr.status;
        return isCompleted && (targetIds.includes(enrCourse) || targetIds.some(t => enrCourse.includes(t) || t.includes(enrCourse)));
      });
      if (isEnrolled) return { hasAccess: true };
    }

    return { hasAccess: false };
  } catch (e) {
    return { hasAccess: false };
  }
}

function protectCoursePayload(course: any, hasAccess: boolean) {
  if (!course || typeof course !== 'object') return course;
  const isPaidCourse = !course.isFree && course.price !== 'Free' && Number(course.price || 0) > 0;

  // Free course or verified enrollment/admin: return full content
  if (!isPaidCourse || hasAccess) {
    return {
      ...course,
      is_enrolled: hasAccess,
      lessons: Array.isArray(course.lessons)
        ? course.lessons.map((lesson: any) => ({
            ...lesson,
            is_locked: false,
            is_free_preview: Boolean(lesson.is_free_preview || lesson.isFreePreview || lesson.free_preview || lesson.freePreview)
          }))
        : course.lessons,
      modules: Array.isArray(course.modules)
        ? course.modules.map((m: any) => ({
            ...m,
            lessons: Array.isArray(m.lessons)
              ? m.lessons.map((lesson: any) => ({
                  ...lesson,
                  is_locked: false,
                  is_free_preview: Boolean(lesson.is_free_preview || lesson.isFreePreview || lesson.free_preview || lesson.freePreview)
                }))
              : m.lessons
          }))
        : course.modules
    };
  }

  // Unauthenticated / non-enrolled on paid course: protect locked lesson media!
  const sanitizeLesson = (lesson: any) => {
    if (!lesson || typeof lesson !== 'object') return lesson;
    const isFreePreview = Boolean(lesson.is_free_preview || lesson.isFreePreview || lesson.free_preview || lesson.freePreview);
    if (isFreePreview) {
      return {
        ...lesson,
        is_locked: false,
        is_free_preview: true
      };
    }

    const { video, videoUrl, url, downloadUrl, resources, materials, attachments, file, ...safe } = lesson;
    return {
      ...safe,
      is_locked: true,
      is_free_preview: false,
      video: null,
      videoUrl: null,
      url: null,
      downloadUrl: null,
      resources: null,
      materials: null,
      attachments: null
    };
  };

  return {
    ...course,
    is_enrolled: false,
    lessons: Array.isArray(course.lessons) ? course.lessons.map(sanitizeLesson) : [],
    modules: Array.isArray(course.modules) ? course.modules.map((m: any) => ({
      ...m,
      lessons: Array.isArray(m.lessons) ? m.lessons.map(sanitizeLesson) : []
    })) : []
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

      const returnSingleCourse = async (rawCourse: any) => {
        const sanitized = sanitizeCourseImages(rawCourse);
        singleCourseCache.set(cleanId, { timestamp: now, data: sanitized });
        singleCourseCache.set(cleanLower, { timestamp: now, data: sanitized });
        const { hasAccess } = await checkCourseAccess(req, sanitized);
        const responseData = protectCoursePayload(sanitized, hasAccess);
        return NextResponse.json(
          { success: true, course: responseData },
          { headers: hasAccess ? NO_CACHE_HEADERS : CACHE_HEADERS }
        );
      };

      // Check single course memory cache
      if (!isFresh) {
        const cachedSingle = singleCourseCache.get(cleanLower) || singleCourseCache.get(cleanId);
        if (cachedSingle && (now - cachedSingle.timestamp < CACHE_TTL_MS)) {
          const { hasAccess } = await checkCourseAccess(req, cachedSingle.data);
          const responseData = protectCoursePayload(cachedSingle.data, hasAccess);
          return NextResponse.json(
            { success: true, course: responseData },
            { headers: hasAccess ? NO_CACHE_HEADERS : CACHE_HEADERS }
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
        return await returnSingleCourse({ ...csMatch, status: 'coming_soon', isComingSoon: true });
      }

      // Check persistent custom courses
      const customMatch = persistentCustomCourses.find(c => c && (
        (c.id && c.id.toLowerCase() === cleanLower) || 
        (c.slug && c.slug.toLowerCase() === cleanLower) || 
        c.id === cleanId || 
        c.slug === cleanId
      ));
      if (customMatch && isValidCourse(customMatch) && customMatch.status !== 'Deleted' && !customMatch.isDeleted) {
        return await returnSingleCourse(customMatch);
      }

      // Check Supabase directly using supabaseAdmin (Bypasses RLS)
      try {
        const { data: sbCourse, error: sbErr } = await (supabaseAdmin
          .from('courses') as any)
          .select(COURSE_COLUMNS_PROJECTION)
          .or(`id.eq.${cleanId},slug.eq.${cleanId},slug.eq.${cleanLower}`)
          .maybeSingle();

        if (sbCourse && !sbErr && isValidCourse(sbCourse) && sbCourse.status !== 'Deleted' && !sbCourse.isDeleted) {
          return await returnSingleCourse(sbCourse);
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
        return await returnSingleCourse(pMatch);
      }

      // Fallback to matching default course
      const defMatch = DEFAULT_COURSES.find(c => (c.id === cleanId || c.slug === cleanLower) && !deletedCourses.includes(c.id) && !deletedCourses.includes(c.slug));
      if (defMatch) {
        return await returnSingleCourse(defMatch);
      }

      return NextResponse.json({ success: false, error: 'Course not found' }, { status: 404, headers: NO_CACHE_HEADERS });
    }

    // ==========================================
    // 📚 ALL COURSES LOOKUP
    // ==========================================
    if (!isFresh && allCoursesCache && (now - allCoursesCache.timestamp < CACHE_TTL_MS)) {
      const publicCourses = allCoursesCache.data.courses.map(c => protectCoursePayload(c, false));
      return NextResponse.json({
        success: true,
        count: publicCourses.length,
        courses: publicCourses
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

    const publicMergedCourses = allMergedCourses.map(c => protectCoursePayload(c, false));

    return NextResponse.json({
      success: true,
      count: publicMergedCourses.length,
      courses: publicMergedCourses
    }, { headers: CACHE_HEADERS });
  } catch (error: any) {
    console.error('Error in GET /api/courses:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error', courses: [] },
      { status: 500, headers: NO_CACHE_HEADERS }
    );
  }
}
