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

      try {
        const { data: sbCourse, error: sbErr } = await supabase
          .from('courses')
          .select('*')
          .or(`id.eq.${cleanId},slug.eq.${cleanId},slug.eq.${cleanLower}`)
          .maybeSingle();

        if (sbCourse && !sbErr && sbCourse.status !== 'Deleted' && !sbCourse.isDeleted) {
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
          if (item && item.id && item.status !== 'Deleted' && !item.isDeleted && !deletedCourses.includes(item.id) && !deletedCourses.includes(item.slug)) {
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

    return NextResponse.json({ success: true, count: courses.length, courses }, { headers: NO_CACHE_HEADERS });
  } catch (error: any) {
    console.error('Error fetching admin courses:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500, headers: NO_CACHE_HEADERS });
  }
}

export async function POST(req: NextRequest) {
  try {
    const raw = await req.json().catch(() => ({}));
    const body = raw.courseData || raw;
    const courseId = raw.courseId || body.id || body.courseId || `course_${Date.now()}`;
    const slug = body.slug || generateCourseSlug(body.title || courseId);

    const payload = {
      ...body,
      id: courseId,
      slug,
      video: body.video || body.previewVideo || body.previewVideoUrl || body.videoUrl || '',
      updatedAt: new Date().toISOString()
    };

    saveSinglePersistedCourse(payload);

    // If this course was previously deleted, remove it from the deleted blacklist
    try {
      const { data: delData } = await supabase.from('site_settings').select('data').eq('key', 'deleted_courses').maybeSingle();
      if (Array.isArray(delData?.data)) {
        const filtered = delData.data.filter((d: string) => d !== courseId && d !== slug);
        await supabase.from('site_settings').upsert({
          key: 'deleted_courses',
          data: filtered,
          updated_at: new Date().toISOString()
        });
      }
    } catch (e) {}

    // Write to Supabase courses table with explicit video, title, and all metadata
    const { error: sbErr } = await supabase.from('courses').upsert({
      id: courseId,
      slug,
      title: payload.title || 'Masterclass',
      title_en: payload.title_en || payload.titleEn || null,
      description: payload.description || payload.desc || '',
      desc: payload.desc || payload.description || '',
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
      requirements: Array.isArray(payload.requirements) ? payload.requirements : [],
      includes: Array.isArray(payload.includes) ? payload.includes : [],
      what_you_will_learn: Array.isArray(payload.whatYouWillLearn) ? payload.whatYouWillLearn : (Array.isArray(payload.what_you_will_learn) ? payload.what_you_will_learn : []),
      ai_prompt: payload.aiPrompt || payload.ai_prompt || '',
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

    // 1. Mark as Deleted in Supabase courses
    await supabase.from('courses').update({ status: 'Deleted', is_published: false }).eq('id', courseId);
    await supabase.from('courses').update({ status: 'Deleted', is_published: false }).eq('slug', courseId);

    // 2. Delete rows directly from Supabase
    await supabase.from('courses').delete().eq('id', courseId);
    await supabase.from('courses').delete().eq('slug', courseId);

    // 3. Add to deleted_courses blacklist in site_settings so DEFAULT_COURSES NEVER resurrects it
    try {
      const { data: currentSettings } = await supabase
        .from('site_settings')
        .select('data')
        .eq('key', 'deleted_courses')
        .maybeSingle();

      const list: string[] = Array.isArray(currentSettings?.data) ? [...currentSettings.data] : [];
      if (!list.includes(courseId)) {
        list.push(courseId);
      }
      await supabase.from('site_settings').upsert({
        key: 'deleted_courses',
        data: list,
        updated_at: new Date().toISOString()
      });
    } catch (e) {
      console.warn('Error recording deleted course in site_settings:', e);
    }

    return NextResponse.json({ success: true, message: 'Course deleted permanently', deletedId: courseId });
  } catch (error: any) {
    console.error('Error deleting admin course:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
