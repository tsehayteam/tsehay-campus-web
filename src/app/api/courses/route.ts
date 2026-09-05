import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';
import { generateCourseSlug, DEFAULT_COURSES, isValidCourse } from '@/lib/courseCache';
import { loadPersistedCourses } from '@/lib/memoryStore';

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

    // Build authoritative base courseMap seeded with DEFAULT_COURSES and persisted storage
    const courseMap = new Map<string, any>();
    DEFAULT_COURSES.forEach(c => {
      if (c && c.id && !deletedCourses.includes(c.id) && !deletedCourses.includes(c.slug)) {
        courseMap.set(c.id, c);
      }
    });

    try {
      const persisted = loadPersistedCourses();
      persisted.forEach(c => {
        if (c && c.id && c.status !== 'Deleted' && !c.isDeleted && !deletedCourses.includes(c.id) && !deletedCourses.includes(c.slug)) {
          courseMap.set(c.id, { ...courseMap.get(c.id), ...c });
        }
      });
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

      // Check courseMap directly
      if (courseMap.has(cleanId)) {
        return NextResponse.json(
          { success: true, course: courseMap.get(cleanId) },
          { headers: NO_CACHE_HEADERS }
        );
      }

      // Check slug match in courseMap
      for (const course of courseMap.values()) {
        if (course.slug === cleanLower || (course.title && generateCourseSlug(course.title) === cleanLower)) {
          return NextResponse.json(
            { success: true, course },
            { headers: NO_CACHE_HEADERS }
          );
        }
      }

      return NextResponse.json(
        { success: false, error: 'Course not found' },
        { status: 404, headers: NO_CACHE_HEADERS }
      );
    }

    // 2. Fetch All Courses from Supabase
    try {
      const { data: sbCourses, error: sbErr } = await supabase
        .from('courses')
        .select('*')
        .order('created_at', { ascending: false });

      if (!sbErr && Array.isArray(sbCourses)) {
        sbCourses.forEach(item => {
          if (item && item.id && isValidCourse(item) && item.status !== 'Deleted' && !item.isDeleted && !deletedCourses.includes(item.id) && !deletedCourses.includes(item.slug)) {
            const merged = { ...item, ...(item.raw_data || {}) };
            courseMap.set(item.id, merged);
          }
        });
      }
    } catch (sbE) {}

    const courses = Array.from(courseMap.values()).filter(c => 
      c.status !== 'Deleted' && 
      !c.isDeleted && 
      !deletedCourses.includes(c.id) && 
      !deletedCourses.includes(c.slug)
    );

    return NextResponse.json(
      { success: true, count: courses.length, courses },
      { headers: NO_CACHE_HEADERS }
    );
  } catch (error: any) {
    console.error('Error in /api/courses route:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch courses', courses: DEFAULT_COURSES },
      { status: 500, headers: NO_CACHE_HEADERS }
    );
  }
}
