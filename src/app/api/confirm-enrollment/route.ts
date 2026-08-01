import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { courseId, userId, paymentMethod, amount, tx_ref } = await request.json();

    if (!courseId || !userId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const { adminDb } = await import('@/lib/firebase/admin');
    if (!adminDb) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
    }

    const userDocRef = adminDb
      .collection('artifacts')
      .doc('tsehaycampus-e1a6d')
      .collection('users')
      .doc(userId);

    // 1. Save to purchased_courses collection
    await userDocRef.collection('purchased_courses').doc(courseId).set({
      courseId,
      amount: amount || 0,
      paymentMethod: paymentMethod || 'paypal',
      tx_ref: tx_ref || `tx_${Date.now()}`,
      purchasedAt: new Date(),
      status: 'active'
    });

    // 2. Update user root document enrolledCourses array
    try {
      const admin = await import('firebase-admin');
      await userDocRef.set({
        enrolledCourses: admin.default.firestore.FieldValue.arrayUnion(courseId)
      }, { merge: true });
    } catch (arrayErr) {
      console.warn("Could not update enrolledCourses array via FieldValue, proceeding:", arrayErr);
    }

    return NextResponse.json({ success: true, courseId, userId }, { status: 200 });

  } catch (error: any) {
    console.error("Enrollment confirmation error:", error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
