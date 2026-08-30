import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';

export const dynamic = 'force-dynamic';

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

    const snapshot = await query.limit(500).get();
    const waitlists = snapshot.docs.map((doc: any) => ({ ...doc.data() }));

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

    if (adminDb) {
      try {
        await adminDb
          .collection('artifacts')
          .doc('tsehaycampus-e1a6d')
          .collection('course_waitlists')
          .doc(id)
          .delete();

        await adminDb
          .collection('course_waitlists')
          .doc(id)
          .delete();
      } catch (dbErr) {
        console.warn('Firestore delete notice:', dbErr);
      }
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
