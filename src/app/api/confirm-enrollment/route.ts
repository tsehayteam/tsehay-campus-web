import { NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase/admin';

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const idToken = authHeader.split('Bearer ')[1].trim();
    if (!adminAuth || !adminDb) {
      return NextResponse.json({ error: 'Database service unavailable' }, { status: 500 });
    }

    const decodedToken = await adminAuth.verifyIdToken(idToken);
    const isAdmin = decodedToken.admin === true || 
                    decodedToken.email === 'eyobsahle@gmail.com' ||
                    decodedToken.email === 'eyoubsahle@gmail.com' ||
                    decodedToken.email === 'admin@tsehaycampus.com' || 
                    decodedToken.email === 'tsehayoperation@gmail.com' ||
                    decodedToken.email === 'habte@gmail.com' ||
                    decodedToken.email === 'cryptomaster758@gmail.com';

    if (!isAdmin) {
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const { courseId, userId, paymentMethod, amount, tx_ref } = await request.json();

    if (!courseId || !userId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const userDocRef = adminDb
      .collection('artifacts')
      .doc('tsehaycampus-e1a6d')
      .collection('users')
      .doc(userId);

    // 1. Save to purchased_courses collection
    await userDocRef.collection('purchased_courses').doc(courseId).set({
      courseId,
      amount: Number(amount) || 0,
      paymentMethod: paymentMethod || 'manual_admin',
      tx_ref: tx_ref || `admin_tx_${Date.now()}`,
      purchasedAt: new Date(),
      status: 'active'
    });

    // 2. Update user root document enrolledCourses array
    try {
      const { FieldValue } = await import('firebase-admin/firestore');
      await userDocRef.set({
        enrolledCourses: FieldValue.arrayUnion(courseId)
      }, { merge: true });
    } catch (arrayErr) {
      console.warn("Could not update enrolledCourses array via FieldValue, proceeding:", arrayErr);
    }

    return NextResponse.json({ success: true, courseId, userId }, { status: 200 });

  } catch (error: any) {
    console.error("Enrollment confirmation error:", error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
