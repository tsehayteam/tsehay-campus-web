import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase/server';
import { generateCourseSlug, DEFAULT_COURSES, isValidCourse, formatDriveImageUrl, getCleanCourseImage } from '@/lib/courseCache';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

const NO_CACHE_HEADERS = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
  'CDN-Cache-Control': 'no-store',
  'Vercel-CDN-Cache-Control': 'no-store',
  'Pragma': 'no-cache',
  'Expires': '0',
};

function sanitizeCourseImages(course: any) {
  if (!course || typeof course !== 'object') return course;
  const image = getCleanCourseImage(course) || formatDriveImageUrl(course.image) || course.image;
  const banner = formatDriveImageUrl(course.banner) || course.banner || image;
  const instructorImg = formatDriveImageUrl(course.instructorImage || course.instructorPhoto || course.instructor_image || course.instructor_photo) || course.instructorImage || course.instructorPhoto || course.instructor_image || course.instructor_photo;

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

    // 1. Fetch deleted courses blacklist from site_settings
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

      // Check Supabase directly
      try {
        const { data: sbCourse, error: sbErr } = await supabaseServer
          .from('courses')
          .select('*')
          .or(`id.eq.${cleanId},slug.eq.${cleanId},slug.eq.${cleanLower}`)
          .maybeSingle();

        if (sbCourse && !sbErr && isValidCourse(sbCourse) && sbCourse.status !== 'Deleted' && !sbCourse.isDeleted) {
          return NextResponse.json(
            { success: true, course: sanitizeCourseImages({ ...sbCourse, ...(sbCourse.raw_data || {}) }) },
            { headers: NO_CACHE_HEADERS }
          );
        }
      } catch (sbE) {}

      // Fallback only to matching default course
      const defMatch = DEFAULT_COURSES.find(c => (c.id === cleanId || c.slug === cleanLower) && !deletedCourses.includes(c.id) && !deletedCourses.includes(c.slug));
      if (defMatch) {
        return NextResponse.json(
          { success: true, course: sanitizeCourseImages(defMatch) },
          { headers: NO_CACHE_HEADERS }
        );
      }

      return NextResponse.json(
        { success: false, error: 'Course not found' },
        { status: 404, headers: NO_CACHE_HEADERS }
      );
    }

    // 4. Fetch All Courses from Supabase
    const { data: sbCourses, error: sbErr } = await supabaseServer
      .from('courses')
      .select('*')
      .order('created_at', { ascending: false });

    let activeCourses: any[] = [];

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
        .map(item => sanitizeCourseImages({
          ...item,
          ...(item.raw_data || {})
        }));
    }

    // If Supabase table has 0 rows and no courses have been deleted, seed defaults
    if (activeCourses.length === 0 && (!sbCourses || sbCourses.length === 0) && deletedCourses.length === 0) {
      activeCourses = DEFAULT_COURSES
        .filter(c => !deletedCourses.includes(c.id) && !deletedCourses.includes(c.slug))
        .map(sanitizeCourseImages);
    }

    // Merge persistent coming_soon courses if not already present
    const courseMap = new Map<string, any>();
    activeCourses.forEach(c => {
      const key = c.id || c.slug;
      if (key) courseMap.set(key, c);
    });

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

    const allMergedCourses = Array.from(courseMap.values());

    return NextResponse.json({
      success: true,
      count: allMergedCourses.length,
      courses: allMergedCourses
    }, { headers: NO_CACHE_HEADERS });
  } catch (error: any) {
    console.error('Error in GET /api/courses:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error', courses: [] },
      { status: 500, headers: NO_CACHE_HEADERS }
    );
  }
}
