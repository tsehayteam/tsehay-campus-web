import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';
import { generateCourseSlug } from '@/lib/courseCache';
import { saveSinglePersistedCourse } from '@/lib/memoryStore';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

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

    // Save to Supabase courses table
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
      console.warn('Supabase save-course warning:', sbErr);
    }

    return NextResponse.json({ success: true, message: 'Course saved successfully', course: payload });
  } catch (error: any) {
    console.error('Error saving course in /api/admin/save-course:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
