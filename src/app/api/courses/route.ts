import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';
import { generateCourseSlug, DEFAULT_COURSES, isValidCourse } from '@/lib/courseCache';

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

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const courseId = searchParams.get('courseId') || searchParams.get('id');

    // 1. Fetch deleted courses blacklist from site_settings
    let deletedCourses: string[] = [];
    try {
      const { data: delData } = await supabase
        .from('site_settings')
        .select('data')
        .eq('key', 'deleted_courses')
        .maybeSingle();
      if (Array.isArray(delData?.data)) {
        deletedCourses = delData.data;
      }
    } catch (e) {}

    // 1. Single Course Lookup
    if (courseId) {
      const cleanId = courseId.trim();
      const cleanLower = cleanId.toLowerCase();

      if (deletedCourses.includes(cleanId) || deletedCourses.includes(cleanLower)) {
        return NextResponse.json({ success: false, error: 'Course deleted' }, { status: 404, headers: NO_CACHE_HEADERS });
      }

      // Check Supabase directly
      try {
        const { data: sbCourse, error: sbErr } = await supabase
          .from('courses')
          .select('*')
          .or(`id.eq.${cleanId},slug.eq.${cleanId},slug.eq.${cleanLower}`)
          .maybeSingle();

        if (sbCourse && !sbErr && isValidCourse(sbCourse) && sbCourse.status !== 'Deleted' && !sbCourse.isDeleted) {
          return NextResponse.json(
            { success: true, course: { ...sbCourse, ...(sbCourse.raw_data || {}) } },
            { headers: NO_CACHE_HEADERS }
          );
        }
      } catch (sbE) {}

      // Fallback only to matching default course
      const defMatch = DEFAULT_COURSES.find(c => (c.id === cleanId || c.slug === cleanLower) && !deletedCourses.includes(c.id) && !deletedCourses.includes(c.slug));
      if (defMatch) {
        return NextResponse.json(
          { success: true, course: defMatch },
          { headers: NO_CACHE_HEADERS }
        );
      }

      return NextResponse.json(
        { success: false, error: 'Course not found' },
        { status: 404, headers: NO_CACHE_HEADERS }
      );
    }

    // 2. Fetch All Courses from Supabase
    const { data: sbCourses, error: sbErr } = await supabase
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
        .map(item => ({
          ...item,
          ...(item.raw_data || {})
        }));
    }

    // If Supabase table has 0 rows and no courses have been deleted, seed defaults
    if (activeCourses.length === 0 && (!sbCourses || sbCourses.length === 0) && deletedCourses.length === 0) {
      activeCourses = DEFAULT_COURSES.filter(c => !deletedCourses.includes(c.id) && !deletedCourses.includes(c.slug));
    }

    return NextResponse.json({
      success: true,
      count: activeCourses.length,
      courses: activeCourses
    }, { headers: NO_CACHE_HEADERS });
  } catch (error: any) {
    console.error('Error in GET /api/courses:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error', courses: [] },
      { status: 500, headers: NO_CACHE_HEADERS }
    );
  }
}
