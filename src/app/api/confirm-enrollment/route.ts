import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase/server';
import { isAuthorizedAdminEmail } from '@/lib/adminAuthHelper';
import { sendCourseEnrollmentEmail } from '@/lib/email';
import { DEFAULT_COURSES } from '@/lib/courseCache';

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized: Missing Authorization header' }, { status: 401 });
    }

    const token = authHeader.split('Bearer ')[1].trim();
    const { data: { user }, error: authErr } = await supabaseServer.auth.getUser(token);

    if (authErr || !user) {
      return NextResponse.json({ error: 'Unauthorized token' }, { status: 401 });
    }

    const userEmail = user.email || '';
    const isAdmin = isAuthorizedAdminEmail(userEmail) || user.app_metadata?.role === 'admin';

    const { courseId, userId, paymentMethod, amount, tx_ref } = await request.json().catch(() => ({}));

    if (!courseId || !userId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Security Gate: If not an admin, verify against authentic pending_payments transaction
    if (!isAdmin) {
      if (user.id !== userId) {
        return NextResponse.json({ error: 'Forbidden: Cannot confirm enrollment for another user' }, { status: 403 });
      }

      if (!tx_ref) {
        return NextResponse.json({ error: 'Forbidden: Missing verified payment transaction reference' }, { status: 403 });
      }

      // Check if valid pending transaction exists in Supabase
      const { data: pendingPayment } = await supabaseServer
        .from('pending_payments')
        .select('*')
        .eq('id', tx_ref)
        .maybeSingle();

      if (!pendingPayment) {
        return NextResponse.json({ error: 'Invalid or unverified transaction reference' }, { status: 403 });
      }

      const pendingUser = pendingPayment.user_id || pendingPayment.userId;
      const pendingCourse = pendingPayment.course_id || pendingPayment.courseId;

      if (pendingUser && pendingUser !== user.id) {
        return NextResponse.json({ error: 'Transaction reference belongs to another user' }, { status: 403 });
      }

      if (pendingCourse && pendingCourse !== courseId) {
        return NextResponse.json({ error: 'Transaction reference does not match course' }, { status: 403 });
      }
    }

    // Save/Upsert to enrollments table
    const safeAmount = Number(amount) || 0;
    const finalRef = tx_ref || `admin_tx_${Date.now()}`;

    await supabaseServer.from('enrollments').upsert({
      id: `${userId}_${courseId}`,
      user_id: userId,
      course_id: courseId,
      amount: safeAmount,
      payment_method: paymentMethod || 'manual_admin',
      tx_ref: finalRef,
      status: 'active',
      created_at: new Date().toISOString()
    });

    // Send Course Enrollment Confirmation Email
    try {
      const { data: targetProfile } = await supabaseServer
        .from('profiles')
        .select('email, full_name, display_name')
        .eq('id', userId)
        .maybeSingle();

      const { data: dbCourse } = await supabaseServer
        .from('courses')
        .select('title, desc, description')
        .or(`id.eq.${courseId},slug.eq.${courseId}`)
        .maybeSingle();

      const defaultMatch = DEFAULT_COURSES.find(c => c.id === courseId || c.slug === courseId);
      const courseTitle = dbCourse?.title || defaultMatch?.title || 'የፀሐይ ካምፓስ ስልጠና';
      const courseDescription = dbCourse?.desc || dbCourse?.description || defaultMatch?.description || '';

      const destEmail = targetProfile?.email || userEmail;
      const destName = targetProfile?.full_name || targetProfile?.display_name || user.user_metadata?.full_name || destEmail.split('@')[0];

      if (destEmail) {
        sendCourseEnrollmentEmail({
          to: destEmail,
          name: destName,
          courseTitle,
          courseDescription,
          price: safeAmount,
          referenceId: finalRef,
          accessUrl: `https://www.tsehaycampus.com/dashboard?view=classroom&courseId=${encodeURIComponent(courseId)}`
        }).catch((e) => console.warn('[Confirm Enrollment Email Error]:', e));
      }
    } catch (e) {
      console.warn('[Confirm Enrollment Email Lookup Error]:', e);
    }

    return NextResponse.json({ success: true, courseId, userId }, { status: 200 });

  } catch (error: any) {
    console.error("Enrollment confirmation error:", error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
