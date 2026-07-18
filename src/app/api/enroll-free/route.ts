import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { courseId, userId } = await request.json();

    if (!courseId || !userId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const { adminDb } = await import('@/lib/firebase/admin');
    if (!adminDb) {
        return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
    }

    const courseDocRef = adminDb.collection('artifacts').doc('tsehaycampus-e1a6d').collection('public').doc('data').collection('courses').doc(courseId);
    const courseDoc = await courseDocRef.get();

    if (!courseDoc.exists) {
        return NextResponse.json({ error: 'Course not found' }, { status: 404 });
    }

    const courseData = courseDoc.data();
    const isFree = courseData?.isFree || courseData?.price === 'Free' || courseData?.price === '0' || courseData?.price === 0;
    
    if (!isFree) {
        return NextResponse.json({ error: 'Course is not free' }, { status: 403 });
    }

    const userDocRef = adminDb.collection('artifacts').doc('tsehaycampus-e1a6d').collection('users').doc(userId);
    await userDocRef.collection('purchased_courses').doc(courseId).set({
        courseId,
        amount: 0,
        purchasedAt: new Date(),
        status: 'active'
    });

    return NextResponse.json({ success: true }, { status: 200 });

  } catch (error: any) {
    console.error("Free enrollment error:", error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
