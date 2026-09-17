import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { generateCourseSlug, DEFAULT_COURSES, formatDriveImageUrl, getCleanCourseImage, getCleanInstructorImage, deduplicateCourses } from '@/lib/courseCache';
import { saveSinglePersistedCourse, deletePersistedCourse, loadPersistedCourses } from '@/lib/memoryStore';
import { verifyAdminRequest } from '@/lib/adminAuthHelper';
import { invalidateCoursesCache } from '@/app/api/courses/route';
import { invalidateServerCoursesCache } from '@/lib/serverCourses';

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
  const instructorImg = getCleanInstructorImage(course) || formatDriveImageUrl(course.instructorImage || course.instructorPhoto || course.instructor_image || course.instructor_photo);
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

    // 1. Fetch deleted courses blacklist from site_settings using supabaseAdmin
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

    // Single Course Lookup
    if (courseId) {
      const cleanId = courseId.trim();
      const cleanLower = cleanId.toLowerCase();

      if (deletedCourses.includes(cleanId) || deletedCourses.includes(cleanLower)) {
        return NextResponse.json({ success: false, error: 'Course deleted' }, { status: 404, headers: NO_CACHE_HEADERS });
      }

      try {
        const { data: sbCourse, error: sbErr } = await supabaseAdmin
          .from('courses')
          .select('*')
          .or(`id.eq.${cleanId},slug.eq.${cleanId},slug.eq.${cleanLower}`)
          .maybeSingle();

        if (sbCourse && !sbErr && sbCourse.status !== 'Deleted' && !sbCourse.isDeleted) {
          const merged = sanitizeCourseImages({ ...sbCourse, ...(sbCourse.raw_data || {}), id: sbCourse.id, slug: sbCourse.slug });
          return NextResponse.json({ success: true, course: merged }, { headers: NO_CACHE_HEADERS });
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
        return NextResponse.json({ success: true, course: sanitizeCourseImages(pMatch) }, { headers: NO_CACHE_HEADERS });
      }

      // Fallback to DEFAULT_COURSES only if matching ID/slug
      const defMatch = DEFAULT_COURSES.find(c => (c.id === cleanId || c.slug === cleanLower || c.id === cleanLower) && !deletedCourses.includes(c.id) && !deletedCourses.includes(c.slug));
      if (defMatch) {
        return NextResponse.json({ success: true, course: sanitizeCourseImages(defMatch) }, { headers: NO_CACHE_HEADERS });
      }

      return NextResponse.json({ success: false, error: 'Course not found' }, { status: 404, headers: NO_CACHE_HEADERS });
    }

    // 2. Fetch All Courses directly from Supabase using supabaseAdmin (Authoritative)
    const { data: sbCourses, error: sbErr } = await supabaseAdmin
      .from('courses')
      .select('*')
      .order('created_at', { ascending: false });

    const courseMap = new Map<string, any>();

    if (!sbErr && Array.isArray(sbCourses) && sbCourses.length > 0) {
      sbCourses
        .filter(item => {
          if (!item || !item.id) return false;
          if (item.status === 'Deleted' || item.isDeleted) return false;
          const idLower = String(item.id).toLowerCase().trim();
          const slugLower = item.slug ? String(item.slug).toLowerCase().trim() : '';
          if (deletedCourses.includes(idLower) || (slugLower && deletedCourses.includes(slugLower))) return false;
          return true;
        })
        .forEach(item => {
          const sanitized = sanitizeCourseImages({
            ...item,
            ...(item.raw_data || {}),
            id: item.id,
            slug: item.slug || item.id
          });
          const canonicalKey = (item.slug || item.id).toLowerCase().trim();
          if (!courseMap.has(canonicalKey)) {
            courseMap.set(canonicalKey, sanitized);
          }
        });
    }

    // 🌟 3. Merge Persistent Coming Soon Courses from site_settings
    try {
      const { data: csSettings } = await supabaseAdmin
        .from('site_settings')
        .select('data')
        .eq('key', 'coming_soon_courses')
        .maybeSingle();

      if (Array.isArray(csSettings?.data) && csSettings.data.length > 0) {
        csSettings.data.forEach((cs: any) => {
          if (!cs) return;
          const csId = cs.id ? String(cs.id).toLowerCase().trim() : '';
          const csSlug = cs.slug ? String(cs.slug).toLowerCase().trim() : '';
          if (deletedCourses.includes(csId) || (csSlug && deletedCourses.includes(csSlug))) return;

          const canonicalKey = csSlug || csId;
          if (!canonicalKey) return;

          const existing = courseMap.get(canonicalKey) || {};
          const sanitized = sanitizeCourseImages({
            ...existing,
            ...cs,
            id: cs.id || existing.id || canonicalKey,
            slug: cs.slug || existing.slug || canonicalKey,
            isComingSoon: true,
            status: 'coming_soon'
          });
          courseMap.set(canonicalKey, sanitized);
        });
      }
    } catch (csErr) {
      console.warn('site_settings coming_soon_courses fetch warning:', csErr);
    }

    // 🌟 4. Merge Persisted Courses from Disk / Memory Store (Ensures Zero Data Loss)
    try {
      const persistedCourses = loadPersistedCourses();
      if (Array.isArray(persistedCourses) && persistedCourses.length > 0) {
        persistedCourses.forEach(p => {
          if (p && (p.id || p.slug)) {
            const pId = String(p.id).toLowerCase().trim();
            const pSlug = p.slug ? String(p.slug).toLowerCase().trim() : '';
            if (deletedCourses.includes(pId) || (pSlug && deletedCourses.includes(pSlug))) return;

            const canonicalKey = pSlug || pId;
            if (!courseMap.has(canonicalKey)) {
              courseMap.set(canonicalKey, sanitizeCourseImages(p));
            } else {
              // Merge if local disk has more complete lesson or raw data
              const existing = courseMap.get(canonicalKey);
              if (p.lessons && p.lessons.length > (existing.lessons?.length || 0)) {
                courseMap.set(canonicalKey, sanitizeCourseImages({ ...existing, ...p }));
              }
            }
          }
        });
      }
    } catch (pErr) {
      console.warn('Persisted courses merge notice:', pErr);
    }

    let activeCourses = deduplicateCourses(Array.from(courseMap.values()));

    // If Supabase table is completely empty and no courses were deleted by user, seed default courses
    if (activeCourses.length === 0 && (!sbCourses || sbCourses.length === 0) && deletedCourses.length === 0) {
      activeCourses = deduplicateCourses(DEFAULT_COURSES
        .filter(c => !deletedCourses.includes(c.id.toLowerCase()) && !deletedCourses.includes(c.slug.toLowerCase()))
        .map(sanitizeCourseImages));
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
    
    // Resolve canonical slug and course ID
    const targetSlug = body.slug || generateCourseSlug(body.title || body.id || `course_${Date.now()}`);
    const courseId = raw.courseId || body.id || targetSlug;
    const slug = targetSlug || courseId;

    const cleanImage = formatDriveImageUrl(body.image || body.thumbnailUrl || body.thumbnail);
    const cleanBanner = formatDriveImageUrl(body.banner) || cleanImage;
    const cleanInstructor = getCleanInstructorImage(body) || formatDriveImageUrl(body.instructorImage || body.instructorPhoto || body.instructor_image || body.instructor_photo);
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

    // If previously in deleted_courses blacklist, remove it using supabaseAdmin
    try {
      const { data: currentSettings } = await supabaseAdmin
        .from('site_settings')
        .select('data')
        .eq('key', 'deleted_courses')
        .maybeSingle();

      if (Array.isArray(currentSettings?.data)) {
        const idLower = courseId.toLowerCase();
        const slugLower = slug.toLowerCase();
        if (currentSettings.data.some((x: string) => x.toLowerCase() === idLower || x.toLowerCase() === slugLower)) {
          const updatedList = currentSettings.data.filter((x: string) => x.toLowerCase() !== idLower && x.toLowerCase() !== slugLower);
          await supabaseAdmin.from('site_settings').upsert({
            key: 'deleted_courses',
            data: updatedList,
            updated_at: new Date().toISOString()
          });
        }
      }
    } catch (e) {}

    // 🛡️ ANTI-DUPLICATION GUARD: Check if another row exists with this slug or id and prune conflicting duplicates
    try {
      const { data: existingRows } = await supabaseAdmin
        .from('courses')
        .select('id, slug')
        .or(`id.eq.${courseId},slug.eq.${slug},id.eq.${slug},slug.eq.${courseId}`);

      if (Array.isArray(existingRows) && existingRows.length > 0) {
        const oldConflictingIds = existingRows
          .map(r => r.id)
          .filter(existingId => existingId !== courseId);

        for (const oldId of oldConflictingIds) {
          await supabaseAdmin.from('courses').delete().eq('id', oldId);
        }
      }
    } catch (cleanErr) {
      console.warn('Anti-duplication cleanup warning:', cleanErr);
    }

    // 🌟 Save/Upsert directly to Supabase courses table with supabaseAdmin (Bypasses RLS)
    const { error: sbErr } = await supabaseAdmin.from('courses').upsert({
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

    // 🌟 Mirror Coming Soon Courses to site_settings (key: 'coming_soon_courses')
    let siteSettingsSaved = false;
    if (isComingSoon) {
      try {
        const { data: currentCS } = await supabaseAdmin
          .from('site_settings')
          .select('data')
          .eq('key', 'coming_soon_courses')
          .maybeSingle();

        const csList: any[] = Array.isArray(currentCS?.data) ? currentCS.data : [];
        const filtered = csList.filter(c => c && c.id !== courseId && c.slug !== slug && c.id !== slug && c.slug !== courseId);
        const updatedCS = deduplicateCourses([payload, ...filtered]);

        const { error: csSaveErr } = await supabaseAdmin.from('site_settings').upsert({
          key: 'coming_soon_courses',
          data: updatedCS,
          updated_at: new Date().toISOString()
        });
        if (!csSaveErr) {
          siteSettingsSaved = true;
        }
      } catch (csSaveErr) {
        console.warn('Mirror coming soon courses warning:', csSaveErr);
      }
    } else {
      // If course is active, ensure it is pruned from coming_soon_courses
      try {
        const { data: currentCS } = await supabaseAdmin
          .from('site_settings')
          .select('data')
          .eq('key', 'coming_soon_courses')
          .maybeSingle();

        if (Array.isArray(currentCS?.data)) {
          const updatedCS = currentCS.data.filter(c => c && c.id !== courseId && c.slug !== slug && c.id !== slug && c.slug !== courseId);
          await supabaseAdmin.from('site_settings').upsert({
            key: 'coming_soon_courses',
            data: updatedCS,
            updated_at: new Date().toISOString()
          });
        }
      } catch (e) {}
    }

    if (sbErr) {
      console.warn('Supabase save course notice (persisted to disk and memory store):', sbErr.message);
    }

    try {
      invalidateCoursesCache();
      invalidateServerCoursesCache();
    } catch (e) {}

    return NextResponse.json({ 
      success: true, 
      message: 'Course saved successfully', 
      id: courseId, 
      course: payload,
      dbWarning: sbErr ? sbErr.message : undefined
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
    const cleanId = courseId.trim().toLowerCase();

    // 1. Delete rows directly from Supabase with supabaseAdmin (Bypasses RLS)
    await supabaseAdmin.from('courses').delete().eq('id', courseId);
    await supabaseAdmin.from('courses').delete().eq('slug', courseId);
    await supabaseAdmin.from('courses').delete().or(`id.eq.${courseId},slug.eq.${courseId},slug.eq.${cleanId},id.eq.${cleanId}`);

    // 2. Remove from coming_soon_courses mirror in site_settings
    try {
      const { data: currentCS } = await supabaseAdmin
        .from('site_settings')
        .select('data')
        .eq('key', 'coming_soon_courses')
        .maybeSingle();

      if (Array.isArray(currentCS?.data)) {
        const updatedCS = currentCS.data.filter((c: any) => c.id !== courseId && c.slug !== courseId && c.id !== cleanId && c.slug !== cleanId);
        await supabaseAdmin.from('site_settings').upsert({
          key: 'coming_soon_courses',
          data: updatedCS,
          updated_at: new Date().toISOString()
        });
      }
    } catch (e) {}

    // 3. Add to deleted_courses blacklist in site_settings
    try {
      const { data: currentSettings } = await supabaseAdmin
        .from('site_settings')
        .select('data')
        .eq('key', 'deleted_courses')
        .maybeSingle();

      const list: string[] = Array.isArray(currentSettings?.data) ? [...currentSettings.data] : [];
      if (!list.includes(courseId)) list.push(courseId);
      if (!list.includes(cleanId)) list.push(cleanId);
      await supabaseAdmin.from('site_settings').upsert({
        key: 'deleted_courses',
        data: list,
        updated_at: new Date().toISOString()
      });
    } catch (e) {
      console.warn('Error recording deleted course in site_settings:', e);
    }

    try {
      invalidateCoursesCache();
      invalidateServerCoursesCache();
    } catch (e) {}

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
