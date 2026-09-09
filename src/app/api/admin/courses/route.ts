import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase/server';
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
  const video = course.video || course.videoUrl || course.previewVideoUrl || '';

  return {
    ...course,
    image,
    banner,
    video,
    videoUrl: video,
    previewVideoUrl: video,
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

    // Single Course Lookup
    if (courseId) {
      const cleanId = courseId.trim();
      const cleanLower = cleanId.toLowerCase();

      if (deletedCourses.includes(cleanId) || deletedCourses.includes(cleanLower)) {
        return NextResponse.json({ success: false, error: 'Course deleted' }, { status: 404, headers: NO_CACHE_HEADERS });
      }

      try {
        const { data: sbCourse, error: sbErr } = await supabaseServer
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
    const { data: sbCourses, error: sbErr } = await supabaseServer
      .from('courses')
      .select('*')
      .order('created_at', { ascending: false });

    const courseMap = new Map<string, any>();

    if (!sbErr && Array.isArray(sbCourses) && sbCourses.length > 0) {
      sbCourses
        .filter(item => 
          item && 
          item.id && 
          item.status !== 'Deleted' && 
          !item.isDeleted && 
          !deletedCourses.includes(item.id) && 
          !deletedCourses.includes(item.slug)
        )
        .forEach(item => {
          const sanitized = sanitizeCourseImages({
            ...item,
            ...(item.raw_data || {})
          });
          courseMap.set(item.id, sanitized);
          if (item.slug) courseMap.set(item.slug, sanitized);
        });
    }

    // 🌟 3. Merge Persistent Coming Soon Courses from site_settings (Guaranteed Lifetime Persistence)
    try {
      const { data: csSettings } = await supabaseServer
        .from('site_settings')
        .select('data')
        .or('key.eq.coming_soon_courses,id.eq.coming_soon_courses')
        .maybeSingle();

      if (Array.isArray(csSettings?.data) && csSettings.data.length > 0) {
        csSettings.data.forEach((cs: any) => {
          if (cs && (cs.id || cs.slug) && !deletedCourses.includes(cs.id) && !deletedCourses.includes(cs.slug)) {
            const key = cs.id || cs.slug;
            const existing = courseMap.get(key) || {};
            const sanitized = sanitizeCourseImages({
              ...existing,
              ...cs,
              isComingSoon: true,
              status: 'coming_soon'
            });
            courseMap.set(key, sanitized);
          }
        });
      }
    } catch (csErr) {
      console.warn('site_settings coming_soon_courses fetch warning:', csErr);
    }

    let activeCourses = Array.from(new Set(courseMap.values()));

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
    const cleanVideo = body.video || body.previewVideo || body.previewVideoUrl || body.videoUrl || '';

    const isComingSoon = Boolean(body.isComingSoon || body.status === 'coming_soon' || body.status === 'Coming Soon');

    const payload = {
      ...body,
      id: courseId,
      slug,
      title: body.title,
      titleEn: body.titleEn || body.title,
      description: body.description || body.desc || '',
      desc: body.description || body.desc || '',
      category: body.category || 'E-Commerce',
      tag: body.tag || body.category || 'E-Commerce',
      instructor: body.instructor || 'Eyoub Sahle',
      price: isComingSoon ? 0 : Number(body.price || 0),
      isFree: isComingSoon ? false : Boolean(body.isFree || Number(body.price || 0) === 0),
      image: cleanImage,
      banner: cleanBanner,
      instructorImage: cleanInstructor,
      instructorPhoto: cleanInstructor,
      video: cleanVideo,
      videoUrl: cleanVideo,
      previewVideoUrl: cleanVideo,
      lessons: Array.isArray(body.lessons) ? body.lessons : [],
      status: isComingSoon ? 'coming_soon' : (body.status || 'Active'),
      isComingSoon,
      enableWaitlist: isComingSoon ? (body.enableWaitlist !== undefined ? Boolean(body.enableWaitlist) : true) : false,
      highlightBadge: body.highlightBadge || '',
      expectedDate: body.expectedDate || '',
      benefits: Array.isArray(body.benefits) ? body.benefits : [],
      timestamp: body.timestamp || Date.now(),
      isDeleted: false,
      updatedAt: new Date().toISOString()
    };

    saveSinglePersistedCourse(payload);

    // If previously in deleted_courses blacklist, remove it
    try {
      const { data: currentSettings } = await supabaseServer
        .from('site_settings')
        .select('data')
        .eq('key', 'deleted_courses')
        .maybeSingle();

      if (Array.isArray(currentSettings?.data) && (currentSettings.data.includes(courseId) || currentSettings.data.includes(slug))) {
        const updatedList = currentSettings.data.filter((id: string) => id !== courseId && id !== slug);
        await supabaseServer.from('site_settings').upsert({
          key: 'deleted_courses',
          data: updatedList,
          updated_at: new Date().toISOString()
        });
      }
    } catch (e) {}

    // 🌟 Save/Upsert directly to Supabase courses table with supabaseServer
    const { error: sbErr } = await supabaseServer.from('courses').upsert({
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
      status: payload.status,
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

    // 🌟 If Coming Soon: Mirror to site_settings (key: 'coming_soon_courses') for 100% Lifetime Persistence
    if (isComingSoon) {
      try {
        const { data: currentCS } = await supabaseServer
          .from('site_settings')
          .select('data')
          .or('key.eq.coming_soon_courses,id.eq.coming_soon_courses')
          .maybeSingle();

        const csList: any[] = Array.isArray(currentCS?.data) ? currentCS.data : [];
        const filtered = csList.filter(c => c && c.id !== courseId && c.slug !== slug);
        const updatedCS = [payload, ...filtered];

        await supabaseServer.from('site_settings').upsert({
          key: 'coming_soon_courses',
          id: 'coming_soon_courses',
          data: updatedCS,
          updated_at: new Date().toISOString()
        });
      } catch (csSaveErr) {
        console.warn('Mirror coming soon courses to site_settings warning:', csSaveErr);
      }
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
    await supabaseServer.from('courses').delete().eq('id', courseId);
    await supabaseServer.from('courses').delete().eq('slug', courseId);

    // 2. Remove from coming_soon_courses mirror in site_settings if exists
    try {
      const { data: currentCS } = await supabaseServer
        .from('site_settings')
        .select('data')
        .eq('key', 'coming_soon_courses')
        .maybeSingle();

      if (Array.isArray(currentCS?.data)) {
        const updatedCS = currentCS.data.filter((c: any) => c.id !== courseId && c.slug !== courseId);
        await supabaseServer.from('site_settings').upsert({
          key: 'coming_soon_courses',
          data: updatedCS,
          updated_at: new Date().toISOString()
        });
      }
    } catch (e) {}

    // 3. Add to deleted_courses blacklist in site_settings so default courses NEVER resurrect it
    try {
      const { data: currentSettings } = await supabaseServer
        .from('site_settings')
        .select('data')
        .eq('key', 'deleted_courses')
        .maybeSingle();

      const list: string[] = Array.isArray(currentSettings?.data) ? [...currentSettings.data] : [];
      if (!list.includes(courseId)) {
        list.push(courseId);
      }
      await supabaseServer.from('site_settings').upsert({
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
