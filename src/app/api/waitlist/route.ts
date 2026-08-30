import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';

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
      studentName: studentName.trim(),
      email: (email || '').trim().toLowerCase(),
      phone: phone.trim(),
      courseId,
      courseTitle,
      createdAt: new Date().toISOString(),
      timestamp: Date.now(),
      status: 'pending'
    };

    if (adminDb) {
      try {
        // Dual write for nested artifacts and root collection
        await adminDb
          .collection('artifacts')
          .doc('tsehaycampus-e1a6d')
          .collection('course_waitlists')
          .doc(waitlistId)
          .set(newEntry);

        await adminDb
          .collection('course_waitlists')
          .doc(waitlistId)
          .set(newEntry);
      } catch (dbErr) {
        console.warn('Firestore waitlist write notice:', dbErr);
      }
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
    if (!adminDb) {
      return NextResponse.json({ success: true, count: 0, waitlists: [] });
    }

    const { searchParams } = new URL(req.url);
    const courseId = searchParams.get('courseId');

    let query: any = adminDb
      .collection('artifacts')
      .doc('tsehaycampus-e1a6d')
      .collection('course_waitlists')
      .orderBy('timestamp', 'desc');

    if (courseId && courseId !== 'all') {
      query = query.where('courseId', '==', courseId);
    }

    const snapshot = await query.limit(100).get();
    const waitlists = snapshot.docs.map((doc: any) => ({ ...doc.data() }));

    return NextResponse.json({
      success: true,
      count: waitlists.length,
      waitlists
    });
  } catch (error: any) {
    console.warn('Waitlist GET error:', error);
    return NextResponse.json({ success: true, count: 0, waitlists: [] });
  }
}
