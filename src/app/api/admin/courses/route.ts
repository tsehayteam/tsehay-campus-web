import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';
import { generateCourseSlug, DEFAULT_COURSES } from '@/lib/courseCache';
import { loadPersistedCourses, saveSinglePersistedCourse, deletePersistedCourse } from '@/lib/memoryStore';

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

    const courseMap = new Map<string, any>();
    DEFAULT_COURSES.forEach(c => {
      if (c && c.id) courseMap.set(c.id, c);
    });

    try {
      const persisted = loadPersistedCourses();
      persisted.forEach(c => {
        if (c && c.id && c.status !== 'Deleted' && !c.isDeleted) {
          courseMap.set(c.id, { ...courseMap.get(c.id), ...c });
        }
      });
    } catch (e) {}

    // 1. Single Course Lookup
    if (courseId) {
      const cleanId = courseId.trim();
      const cleanLower = cleanId.toLowerCase();

      try {
        const { data: sbCourse, error: sbErr } = await supabase
          .from('courses')
          .select('*')
          .or(`id.eq.${cleanId},slug.eq.${cleanId},slug.eq.${cleanLower}`)
          .maybeSingle();

        if (sbCourse && !sbErr) {
          const merged = { ...sbCourse, ...(sbCourse.raw_data || {}) };
          return NextResponse.json({ success: true, course: merged }, { headers: NO_CACHE_HEADERS });
        }
      } catch (sbE) {}

      if (courseMap.has(cleanId)) {
        return NextResponse.json({ success: true, course: courseMap.get(cleanId) }, { headers: NO_CACHE_HEADERS });
      }

      for (const course of courseMap.values()) {
        if (course.slug === cleanLower || (course.title && generateCourseSlug(course.title) === cleanLower)) {
          return NextResponse.json({ success: true, course }, { headers: NO_CACHE_HEADERS });
        }
      }

      return NextResponse.json({ success: false, error: 'Course not found' }, { status: 404, headers: NO_CACHE_HEADERS });
    }

    // 2. Fetch All Courses from Supabase
    try {
      const { data: sbCourses, error: sbErr } = await supabase
        .from('courses')
        .select('*')
        .order('created_at', { ascending: false });

      if (!sbErr && Array.isArray(sbCourses)) {
        sbCourses.forEach(item => {
          if (item && item.id) {
            const merged = { ...item, ...(item.raw_data || {}) };
            courseMap.set(item.id, merged);
          }
        });
      }
    } catch (sbE) {}

    const courses = Array.from(courseMap.values()).filter(c => c.status !== 'Deleted' && !c.isDeleted);
    return NextResponse.json({ success: true, count: courses.length, courses }, { headers: NO_CACHE_HEADERS });
  } catch (error: any) {
    console.error('Error fetching admin courses:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500, headers: NO_CACHE_HEADERS });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const courseId = body.id || `course_${Date.now()}`;
    const slug = body.slug || generateCourseSlug(body.title || courseId);

    const payload = {
      ...body,
      id: courseId,
      slug,
      updatedAt: new Date().toISOString()
    };

    saveSinglePersistedCourse(payload);

    // Write to Supabase courses table
    const { error: sbErr } = await supabase.from('courses').upsert({
      id: courseId,
      slug,
      title: payload.title || 'Masterclass',
      title_en: payload.title_en || payload.titleEn || null,
      description: payload.description || payload.desc || '',
      price: Number(payload.price) || 0,
      old_price: Number(payload.old_price ?? payload.oldPrice) || null,
      instructor: payload.instructor || payload.instructorName || 'Eyob Sahle',
      instructor_name: payload.instructorName || payload.instructor || 'Eyob Sahle',
      instructor_image: payload.instructorImage || payload.instructorPhoto || null,
      instructor_photo: payload.instructorPhoto || payload.instructorImage || null,
      image: payload.image || null,
      banner: payload.banner || payload.image || null,
      video: payload.video || null,
      status: payload.status || 'Active',
      is_published: payload.isPublished ?? payload.is_published ?? true,
      category: payload.category || 'Digital Marketing',
      lessons: Array.isArray(payload.lessons) ? payload.lessons : [],
      modules: Array.isArray(payload.modules) ? payload.modules : [],
      raw_data: payload,
      updated_at: new Date().toISOString()
    });

    if (sbErr) {
      console.warn('Supabase course upsert warning:', sbErr);
    }

    return NextResponse.json({ success: true, message: 'Course saved successfully', course: payload });
  } catch (error: any) {
    console.error('Error saving admin course:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const courseId = searchParams.get('courseId') || searchParams.get('id');

    if (!courseId) {
      return NextResponse.json({ success: false, error: 'Missing courseId' }, { status: 400 });
    }

    deletePersistedCourse(courseId);

    // Delete from Supabase
    await supabase.from('courses').delete().eq('id', courseId);
    await supabase.from('courses').delete().eq('slug', courseId);

    return NextResponse.json({ success: true, message: 'Course deleted successfully', deletedId: courseId });
  } catch (error: any) {
    console.error('Error deleting admin course:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
