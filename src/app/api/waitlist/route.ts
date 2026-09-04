import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { studentName, email, phone, courseId = 'general', courseTitle = 'Tsehay Campus Masterclass' } = body;

    if (!studentName || !phone) {
      return NextResponse.json(
        { success: false, error: 'እባክዎ ሙሉ ስምዎን እና ስልክ ቁጥርዎን ያስገቡ (Full name and phone are required).' },
        { status: 400 }
      );
    }

    const waitlistId = `wl_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const newEntry = {
      id: waitlistId,
      student_name: studentName.trim(),
      email: (email || '').trim().toLowerCase(),
      phone: phone.trim(),
      course_id: courseId,
      course_title: courseTitle,
      created_at: new Date().toISOString()
    };

    const { error } = await supabase.from('waitlists').insert(newEntry);
    if (error) {
      console.warn('Supabase waitlist write warning:', error);
    }

    return NextResponse.json({
      success: true,
      message: 'የተጠባባቂዎች ዝርዝር ውስጥ በተሳካ ሁኔታ ተመዝግበዋል!',
      waitlist: newEntry
    });
  } catch (error: any) {
    console.error('Waitlist submission error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Server error occurred' },
      { status: 500 }
    );
  }
}

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

    const { data: waitlists, error } = await query.limit(100);
    if (error) {
      console.warn('Supabase waitlist fetch warning:', error);
    }

    return NextResponse.json({
      success: true,
      count: waitlists?.length || 0,
      waitlists: waitlists || []
    });
  } catch (error: any) {
    console.warn('Waitlist GET error:', error);
    return NextResponse.json({ success: true, count: 0, waitlists: [] });
  }
}
