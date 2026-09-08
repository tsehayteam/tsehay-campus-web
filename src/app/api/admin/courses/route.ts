import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';
import { generateCourseSlug, DEFAULT_COURSES, formatDriveImageUrl, getCleanCourseImage } from '@/lib/courseCache';
import { saveSinglePersistedCourse, deletePersistedCourse } from '@/lib/memoryStore';
import { verifyAdminRequest } from '@/lib/adminAuthHelper';

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

      try {
        const { data: sbCourse, error: sbErr } = await supabase
          .from('courses')
          .select('*')
          .or(`id.eq.${cleanId},slug.eq.${cleanId},slug.eq.${cleanLower}`)
          .maybeSingle();

        if (sbCourse && !sbErr && sbCourse.status !== 'Deleted' && !sbCourse.isDeleted) {
          const merged = sanitizeCourseImages({ ...sbCourse, ...(sbCourse.raw_data || {}) });
          return NextResponse.json({ success: true, course: merged }, { headers: NO_CACHE_HEADERS });
        }
      } catch (sbE) {}

      // Fallback to DEFAULT_COURSES only if matching ID/slug
      const defMatch = DEFAULT_COURSES.find(c => (c.id === cleanId || c.slug === cleanLower) && !deletedCourses.includes(c.id) && !deletedCourses.includes(c.slug));
      if (defMatch) {
        return NextResponse.json({ success: true, course: sanitizeCourseImages(defMatch) }, { headers: NO_CACHE_HEADERS });
      }

      return NextResponse.json({ success: false, error: 'Course not found' }, { status: 404, headers: NO_CACHE_HEADERS });
    }

    // 2. Fetch All Courses directly from Supabase (Source of Truth)
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

    // If Supabase table is completely empty and no courses were deleted by user, seed default courses
    if (activeCourses.length === 0 && (!sbCourses || sbCourses.length === 0) && deletedCourses.length === 0) {
      activeCourses = DEFAULT_COURSES
        .filter(c => !deletedCourses.includes(c.id) && !deletedCourses.includes(c.slug))
        .map(sanitizeCourseImages);
    }

    return NextResponse.json({ 
      success: true, 
      count: activeCourses.length, 
      courses: activeCourses 
    }, { headers: NO_CACHE_HEADERS });
  } catch (error: any) {
    console.error('Error fetching admin courses:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500, headers: NO_CACHE_HEADERS });
  }
}

export async function POST(req: NextRequest) {
  try {
    const adminCheck = await verifyAdminRequest(req);
    if (!adminCheck.authorized) {
      return NextResponse.json({ success: false, error: 'Unauthorized: Admin privileges required.' }, { status: 401 });
    }

    const raw = await req.json().catch(() => ({}));
    const body = raw.courseData || raw;
    const courseId = raw.courseId || body.id || body.courseId || `course_${Date.now()}`;
    const slug = body.slug || generateCourseSlug(body.title || courseId);

    const cleanImage = formatDriveImageUrl(body.image || body.thumbnailUrl || body.thumbnail);
    const cleanBanner = formatDriveImageUrl(body.banner) || cleanImage;
    const cleanInstructor = formatDriveImageUrl(body.instructorImage || body.instructorPhoto || body.instructor_image || body.instructor_photo);

    const payload = {
      ...body,
      id: courseId,
      slug,
      image: cleanImage || body.image || null,
      banner: cleanBanner || body.banner || cleanImage || null,
      instructorImage: cleanInstructor || body.instructorImage || body.instructorPhoto || null,
      instructorPhoto: cleanInstructor || body.instructorPhoto || body.instructorImage || null,
      video: body.video || body.previewVideo || body.previewVideoUrl || body.videoUrl || '',
      status: body.status || 'Active',
      isDeleted: false,
      updatedAt: new Date().toISOString()
    };

    saveSinglePersistedCourse(payload);

    // If previously in deleted_courses blacklist, remove it
    try {
      const { data: currentSettings } = await supabase
        .from('site_settings')
        .select('data')
        .eq('key', 'deleted_courses')
        .maybeSingle();

      if (Array.isArray(currentSettings?.data) && (currentSettings.data.includes(courseId) || currentSettings.data.includes(slug))) {
        const updatedList = currentSettings.data.filter((id: string) => id !== courseId && id !== slug);
        await supabase.from('site_settings').upsert({
          key: 'deleted_courses',
          data: updatedList,
          updated_at: new Date().toISOString()
        });
      }
    } catch (e) {}

    // Save/Upsert directly to Supabase courses table
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
      status: payload.status || (payload.isComingSoon ? 'coming_soon' : 'Active'),
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
      console.warn('Supabase save course warning:', sbErr);
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Course saved successfully', 
      id: courseId, 
      course: payload 
    }, { headers: NO_CACHE_HEADERS });
  } catch (error: any) {
    console.error('Error saving admin course:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500, headers: NO_CACHE_HEADERS });
  }
}

export async function PUT(req: NextRequest) {
  return POST(req);
}

export async function DELETE(req: NextRequest) {
  try {
    const adminCheck = await verifyAdminRequest(req);
    if (!adminCheck.authorized) {
      return NextResponse.json({ success: false, error: 'Unauthorized: Admin privileges required.' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const courseId = searchParams.get('id') || searchParams.get('courseId');

    if (!courseId) {
      return NextResponse.json({ success: false, error: 'Missing courseId parameter' }, { status: 400, headers: NO_CACHE_HEADERS });
    }

    deletePersistedCourse(courseId);

    // 1. Delete rows directly from Supabase
    await supabase.from('courses').delete().eq('id', courseId);
    await supabase.from('courses').delete().eq('slug', courseId);

    // 2. Add to deleted_courses blacklist in site_settings so default courses NEVER resurrect it
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

    return NextResponse.json({ 
      success: true, 
      message: 'Course deleted permanently', 
      deletedId: courseId 
    }, { headers: NO_CACHE_HEADERS });
  } catch (error: any) {
    console.error('Error deleting admin course:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500, headers: NO_CACHE_HEADERS });
  }
}
