import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const courseId = searchParams.get('courseId');

    let query = supabase
      .from('waitlists')
      .select('*')
      .order('created_at', { ascending: false });

    if (courseId && courseId !== 'all') {
      query = query.eq('course_id', courseId);
    }

    const { data: list, error } = await query.limit(500);
    if (error) {
      console.warn('Supabase waitlists fetch error:', error);
      return NextResponse.json({ success: true, count: 0, waitlists: [] });
    }

    const waitlists = (list || []).map(w => ({
      id: w.id,
      studentName: w.student_name,
      email: w.email,
      phone: w.phone,
      courseId: w.course_id,
      courseTitle: w.course_title,
      createdAt: w.created_at
    }));

    return NextResponse.json({
      success: true,
      count: waitlists.length,
      waitlists
    });
  } catch (error: any) {
    console.error('Admin waitlists fetch error:', error);
    return NextResponse.json({ success: true, count: 0, waitlists: [], error: error.message });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, error: 'Missing waitlist ID' }, { status: 400 });
    }

    const { error } = await supabase.from('waitlists').delete().eq('id', id);
    if (error) {
      console.warn('Supabase delete waitlist error:', error);
    }

    return NextResponse.json({
      success: true,
      message: 'የተጠባባቂ መረጃው በተሳካ ሁኔታ ተሰርዟል (Waitlist entry deleted)'
    });
  } catch (error: any) {
    console.error('Admin waitlist delete error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
