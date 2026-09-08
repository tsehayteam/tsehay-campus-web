import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase/server';
import { DEFAULT_COURSES } from '@/lib/courseCache';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get('authorization');
    let authenticatedUserId: string | null = null;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split('Bearer ')[1].trim();
      if (token) {
        try {
          const { data: { user } } = await supabaseServer.auth.getUser(token);
          if (user?.id) {
            authenticatedUserId = user.id;
          }
        } catch (e) {}
      }
    }

    if (!authenticatedUserId) {
      return NextResponse.json({ error: 'Unauthorized: You must be logged in to enroll' }, { status: 401 });
    }

    const { courseId } = await request.json().catch(() => ({}));
    if (!courseId) {
      return NextResponse.json({ error: 'Missing courseId' }, { status: 400 });
    }

    // 🛡️ Security Check: Verify that the course is legitimately free!
    const { data: dbCourse } = await supabaseServer
      .from('courses')
      .select('price, is_free')
      .or(`id.eq.${courseId},slug.eq.${courseId}`)
      .maybeSingle();

    let isFreeCourse = false;
    if (dbCourse) {
      isFreeCourse = Number(dbCourse.price) === 0 || dbCourse.is_free === true;
    } else {
      const defaultMatch = DEFAULT_COURSES.find(c => c.id === courseId || c.slug === courseId);
      if (defaultMatch) {
        isFreeCourse = Number(defaultMatch.price) === 0 || defaultMatch.isFree === true;
      }
    }

    if (!isFreeCourse) {
      return NextResponse.json({ error: 'Forbidden: This course is a paid masterclass and requires enrollment payment.' }, { status: 403 });
    }

    // Save enrollment record in Supabase users and enrollments table
    try {
      const { data: userRow } = await supabaseServer
        .from('users')
        .select('enrolled_courses')
        .eq('id', authenticatedUserId)
        .maybeSingle();

      const currentEnrolled: string[] = Array.isArray(userRow?.enrolled_courses) ? userRow.enrolled_courses : [];
      if (!currentEnrolled.includes(courseId)) {
        await supabaseServer
          .from('users')
          .upsert({
            id: authenticatedUserId,
            enrolled_courses: [...currentEnrolled, courseId],
            updated_at: new Date().toISOString()
          });

        await supabaseServer
          .from('enrollments')
          .upsert({
            id: `${authenticatedUserId}_${courseId}`,
            user_id: authenticatedUserId,
            course_id: courseId,
            amount: 0,
            payment_method: 'free_enrollment',
            status: 'active',
            created_at: new Date().toISOString()
          });
      }
    } catch (dbErr) {
      console.warn('Supabase free enrollment write notice:', dbErr);
    }

    return NextResponse.json({ success: true, courseId, userId: authenticatedUserId }, { status: 200 });
  } catch (error: any) {
    console.error('Free enrollment error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
