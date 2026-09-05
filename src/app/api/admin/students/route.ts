import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    // 1. Fetch all student profiles from Supabase
    const { data: profiles, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });

    if (profileError) {
      console.warn('Supabase profiles fetch error in admin/students:', profileError);
    }

    // 2. Fetch all enrollments / course purchases from Supabase
    const { data: enrollments, error: enrollmentError } = await supabase
      .from('enrollments')
      .select('*')
      .order('created_at', { ascending: false });

    if (enrollmentError) {
      console.warn('Supabase enrollments fetch error in admin/students:', enrollmentError);
    }

    const safeProfiles = (profiles || []).map(p => ({
      id: p.id,
      uid: p.id,
      name: p.full_name || '',
      fullName: p.full_name || '',
      displayName: p.full_name || '',
      email: p.email || '',
      phone: p.phone || '',
      photoURL: p.avatar_url || '',
      avatarUrl: p.avatar_url || '',
      role: p.role || 'student',
      isAdmin: !!p.is_admin,
      createdAt: p.created_at,
      updatedAt: p.updated_at
    }));

    const safeEnrollments = (enrollments || []).map(e => ({
      id: e.id,
      userId: e.user_id,
      studentEmail: e.user_email,
      email: e.user_email,
      courseId: e.course_id,
      courseTitle: e.course_title,
      amount: Number(e.amount || 0),
      currency: e.currency || 'ETB',
      paymentMethod: e.payment_method || 'free',
      transactionRef: e.transaction_ref,
      status: e.status || 'completed',
      purchasedAt: e.created_at,
      createdAt: e.created_at
    }));

    return NextResponse.json({
      success: true,
      count: safeProfiles.length,
      profiles: safeProfiles,
      enrollments: safeEnrollments
    });
  } catch (err: any) {
    console.error('Admin students API error:', err);
    return NextResponse.json(
      { success: false, error: err.message, profiles: [], enrollments: [] },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    const type = searchParams.get('type') || 'profile';

    if (!id) {
      return NextResponse.json({ success: false, error: 'Missing ID' }, { status: 400 });
    }

    if (type === 'enrollment') {
      const { error } = await supabase.from('enrollments').delete().eq('id', id);
      if (error) throw error;
    } else {
      const { error } = await supabase.from('profiles').delete().eq('id', id);
      if (error) throw error;
    }

    return NextResponse.json({ success: true, message: `Deleted ${type} ${id}` });
  } catch (err: any) {
    console.error('Delete student/enrollment error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
