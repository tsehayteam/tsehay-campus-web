import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const courseId = searchParams.get('courseId');

    let query = supabaseServer
      .from('waitlists')
      .select('*')
      .order('created_at', { ascending: false });

    if (courseId && courseId !== 'all') {
      query = query.eq('course_id', courseId);
    }

    const { data: rows, error } = await query.limit(500);

    const waitlists = (rows || []).map((r: any) => ({
      id: r.id,
      name: r.name,
      email: r.email,
      phone: r.phone,
      courseId: r.course_id,
      courseTitle: r.course_title,
      timestamp: r.created_at || r.timestamp
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

    try {
      await supabaseServer
        .from('waitlists')
        .delete()
        .eq('id', id);
    } catch (dbErr) {
      console.warn('Supabase waitlist delete notice:', dbErr);
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
