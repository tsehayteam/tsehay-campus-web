import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { generateCourseSlug } from '@/lib/courseCache';
import { saveSinglePersistedCourse, deletePersistedCourse } from '@/lib/memoryStore';
import { verifyAdminRequest } from '@/lib/adminAuthHelper';
import { invalidateCoursesCache } from '@/app/api/courses/route';
import { invalidateServerCoursesCache } from '@/lib/serverCourses';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

export async function POST(req: NextRequest) {
  const auth = await verifyAdminRequest(req);
  if (!auth.authorized) {
    return NextResponse.json({ success: false, error: auth.error || 'Unauthorized' }, { status: 401 });
  }

  try {
    const raw = await req.json().catch(() => ({}));
    const body = raw.courseData || raw;
    const targetSlug = body.slug || generateCourseSlug(body.title || body.id || `course_${Date.now()}`);
    const courseId = raw.courseId || body.id || targetSlug;
    const slug = targetSlug || courseId;

    const payload = {
      ...body,
      id: courseId,
      slug,
      video: body.video || body.previewVideo || body.previewVideoUrl || body.videoUrl || '',
      updatedAt: new Date().toISOString()
    };

    saveSinglePersistedCourse(payload);

    // Prune any conflicting duplicate row with same slug
    try {
      const { data: existingRows } = await supabaseAdmin
        .from('courses')
        .select('id, slug')
        .or(`id.eq.${courseId},slug.eq.${slug},id.eq.${slug},slug.eq.${courseId}`);

      if (Array.isArray(existingRows) && existingRows.length > 0) {
        for (const r of existingRows) {
          if (r.id !== courseId) {
            await supabaseAdmin.from('courses').delete().eq('id', r.id);
          }
        }
      }
    } catch (e) {}

    // Remove from deleted_courses blacklist if present
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

    // Save to Supabase courses table with supabaseAdmin
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

    // 🌟 Dual-Store to site_settings (key: 'custom_courses' or 'coming_soon_courses')
    const isComingSoon = Boolean(payload.isComingSoon || payload.status === 'coming_soon');
    if (isComingSoon) {
      try {
        const { data: currentCS } = await supabaseAdmin
          .from('site_settings')
          .select('data')
          .eq('key', 'coming_soon_courses')
          .maybeSingle();

        const csList: any[] = Array.isArray(currentCS?.data) ? currentCS.data : [];
        const filtered = csList.filter(c => c && c.id !== courseId && c.slug !== slug && c.id !== slug && c.slug !== courseId);
        await supabaseAdmin.from('site_settings').upsert({
          key: 'coming_soon_courses',
          data: [payload, ...filtered],
          updated_at: new Date().toISOString()
        });
      } catch (e) {}
    } else {
      try {
        const { data: currentActive } = await supabaseAdmin
          .from('site_settings')
          .select('data')
          .eq('key', 'custom_courses')
          .maybeSingle();

        const activeList: any[] = Array.isArray(currentActive?.data) ? currentActive.data : [];
        const filtered = activeList.filter(c => c && c.id !== courseId && c.slug !== slug && c.id !== slug && c.slug !== courseId);
        await supabaseAdmin.from('site_settings').upsert({
          key: 'custom_courses',
          data: [payload, ...filtered],
          updated_at: new Date().toISOString()
        });
      } catch (e) {}
    }

    if (sbErr) {
      console.warn('Supabase save-course warning:', sbErr);
    }

    try {
      invalidateCoursesCache();
      invalidateServerCoursesCache();
    } catch (e) {}

    return NextResponse.json({ success: true, message: 'Course saved successfully', course: payload });
  } catch (error: any) {
    console.error('Error saving course in /api/admin/save-course:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const auth = await verifyAdminRequest(req);
  if (!auth.authorized) {
    return NextResponse.json({ success: false, error: auth.error || 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (id) {
      deletePersistedCourse(id);
      await supabaseAdmin.from('courses').delete().or(`id.eq.${id},slug.eq.${id}`);

      // Prune from custom_courses and coming_soon_courses in site_settings
      try {
        const { data: currentCustom } = await supabaseAdmin
          .from('site_settings')
          .select('data')
          .eq('key', 'custom_courses')
          .maybeSingle();
        if (Array.isArray(currentCustom?.data)) {
          const updated = currentCustom.data.filter((c: any) => c.id !== id && c.slug !== id);
          await supabaseAdmin.from('site_settings').upsert({
            key: 'custom_courses',
            data: updated,
            updated_at: new Date().toISOString()
          });
        }
      } catch (e) {}

      try {
        const { data: currentCS } = await supabaseAdmin
          .from('site_settings')
          .select('data')
          .eq('key', 'coming_soon_courses')
          .maybeSingle();
        if (Array.isArray(currentCS?.data)) {
          const updated = currentCS.data.filter((c: any) => c.id !== id && c.slug !== id);
          await supabaseAdmin.from('site_settings').upsert({
            key: 'coming_soon_courses',
            data: updated,
            updated_at: new Date().toISOString()
          });
        }
      } catch (e) {}

      try {
        invalidateCoursesCache();
        invalidateServerCoursesCache();
      } catch (e) {}
    }
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
