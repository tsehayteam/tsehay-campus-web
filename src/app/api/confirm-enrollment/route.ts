import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase/server';
import { isAuthorizedAdminEmail } from '@/lib/adminAuthHelper';

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
    await supabaseServer.from('enrollments').upsert({
      id: `${userId}_${courseId}`,
      user_id: userId,
      course_id: courseId,
      amount: Number(amount) || 0,
      payment_method: paymentMethod || 'manual_admin',
      tx_ref: tx_ref || `admin_tx_${Date.now()}`,
      status: 'active',
      created_at: new Date().toISOString()
    });

    return NextResponse.json({ success: true, courseId, userId }, { status: 200 });

  } catch (error: any) {
    console.error("Enrollment confirmation error:", error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
