import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.startsWith('Bearer ') ? authHeader.split('Bearer ')[1].trim() : '';

    let authenticatedUserId: string = 'user';
    let userEmail: string = '';

    if (token) {
      try {
        const { data: { user } } = await supabase.auth.getUser(token);
        if (user) {
          authenticatedUserId = user.id;
          userEmail = user.email || '';
        }
      } catch (authErr) {
        console.warn("Token verification notice in enroll-free:", authErr);
      }
    }

    const body = await request.json().catch(() => ({}));
    const { courseId } = body;
    if (!courseId) {
      return NextResponse.json({ error: 'Missing courseId' }, { status: 400 });
    }

    if (authenticatedUserId && authenticatedUserId !== 'user') {
      try {
        await supabase.from('enrollments').upsert({
          id: `${authenticatedUserId}_${courseId}`,
          user_id: authenticatedUserId,
          user_email: userEmail,
          course_id: courseId,
          amount: 0,
          currency: 'ETB',
          payment_method: 'free',
          status: 'completed',
          created_at: new Date().toISOString()
        });
      } catch (dbErr) {
        console.warn("Supabase enroll-free write warning:", dbErr);
      }
    }

    return NextResponse.json({ success: true, courseId, userId: authenticatedUserId }, { status: 200 });

  } catch (error: any) {
    console.error("Free enrollment error:", error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
