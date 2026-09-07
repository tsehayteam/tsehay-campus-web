import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get('authorization');
    let authenticatedUserId: string = 'user';

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

    const { courseId, referralCode } = await request.json().catch(() => ({}));
    if (!courseId) {
      return NextResponse.json({ error: 'Missing courseId' }, { status: 400 });
    }

    // Save enrollment record in Supabase users/enrollments if user is authenticated
    if (authenticatedUserId && authenticatedUserId !== 'user') {
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
        }
      } catch (dbErr) {
        console.warn('Supabase free enrollment write warning:', dbErr);
      }
    }

    return NextResponse.json({ success: true, courseId, userId: authenticatedUserId }, { status: 200 });
  } catch (error: any) {
    console.error('Free enrollment error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
