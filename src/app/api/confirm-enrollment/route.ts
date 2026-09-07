import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase/server';

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.split('Bearer ')[1].trim();
    const { data: { user }, error: authErr } = await supabaseServer.auth.getUser(token);

    if (authErr || !user) {
      return NextResponse.json({ error: 'Unauthorized token' }, { status: 401 });
    }

    const userEmail = user.email || '';
    const isAdmin = user.user_metadata?.role === 'admin' ||
                    userEmail === 'eyobsahle@gmail.com' ||
                    userEmail === 'eyoubsahle@gmail.com' ||
                    userEmail === 'admin@tsehaycampus.com' || 
                    userEmail === 'tsehayoperation@gmail.com' ||
                    userEmail === 'habte@gmail.com' ||
                    userEmail === 'cryptomaster758@gmail.com';

    const { courseId, userId, paymentMethod, amount, tx_ref } = await request.json();

    if (!courseId || !userId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const isSelf = user.id === userId;
    if (!isAdmin && !isSelf) {
      return NextResponse.json({ error: 'Forbidden: Unauthorized enrollment target' }, { status: 403 });
    }

    // Save to enrollments table
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
