import { NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase/admin';

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized: Missing or invalid authorization token' }, { status: 401 });
    }

    const idToken = authHeader.split('Bearer ')[1].trim();
    if (!idToken) {
      return NextResponse.json({ error: 'Unauthorized: Missing token' }, { status: 401 });
    }

    if (!adminAuth || !adminDb) {
      return NextResponse.json({ error: 'Database service unavailable' }, { status: 500 });
    }

    let authenticatedUserId: string;
    try {
      const decodedToken = await adminAuth.verifyIdToken(idToken);
      authenticatedUserId = decodedToken.uid;
    } catch (authErr) {
      console.warn("Token verification failed in enroll-free:", authErr);
      return NextResponse.json({ error: 'Invalid or expired session token' }, { status: 401 });
    }

    const { courseId } = await request.json();
    if (!courseId) {
      return NextResponse.json({ error: 'Missing courseId' }, { status: 400 });
    }

    const courseDocRef = adminDb
      .collection('artifacts')
      .doc('tsehaycampus-e1a6d')
      .collection('public')
      .doc('data')
      .collection('courses')
      .doc(courseId);

    const courseDoc = await courseDocRef.get();

    if (!courseDoc.exists) {
      return NextResponse.json({ error: 'Course not found' }, { status: 404 });
    }

    const courseData = courseDoc.data();
    const isFree = courseData?.isFree === true || 
                   courseData?.price === 'Free' || 
                   courseData?.price === '0' || 
                   courseData?.price === 0;
    
    if (!isFree) {
      return NextResponse.json({ error: 'Course is not free' }, { status: 403 });
    }

    const userDocRef = adminDb
      .collection('artifacts')
      .doc('tsehaycampus-e1a6d')
      .collection('users')
      .doc(authenticatedUserId);

    // Save to purchased_courses
    await userDocRef.collection('purchased_courses').doc(courseId).set({
      courseId,
      amount: 0,
      paymentMethod: 'free',
      purchasedAt: new Date(),
      status: 'active'
    });

    // Update enrolledCourses array
    try {
      const { FieldValue } = await import('firebase-admin/firestore');
      await userDocRef.set({
        enrolledCourses: FieldValue.arrayUnion(courseId)
      }, { merge: true });
    } catch (arrErr) {
      console.warn("Could not update enrolledCourses array:", arrErr);
    }

    return NextResponse.json({ success: true, courseId, userId: authenticatedUserId }, { status: 200 });

  } catch (error: any) {
    console.error("Free enrollment error:", error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
