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

    let authenticatedUserId: string = 'user';
    if (adminAuth) {
      try {
        const decodedToken = await adminAuth.verifyIdToken(idToken);
        authenticatedUserId = decodedToken.uid;
      } catch (authErr) {
        console.warn("Token verification warning in enroll-free (proceeding gracefully):", authErr);
      }
    }

    const { courseId } = await request.json();
    if (!courseId) {
      return NextResponse.json({ error: 'Missing courseId' }, { status: 400 });
    }

    if (adminDb && authenticatedUserId && authenticatedUserId !== 'user') {
      try {
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
        }, { merge: true });

        try {
          const { FieldValue } = await import('firebase-admin/firestore');
          await userDocRef.set({
            enrolledCourses: FieldValue.arrayUnion(courseId)
          }, { merge: true });
        } catch (arrErr) {
          console.warn("Could not update enrolledCourses array:", arrErr);
        }
      } catch (dbErr) {
        console.warn("Admin DB write failed, relying on client sync:", dbErr);
      }
    }

    return NextResponse.json({ success: true, courseId, userId: authenticatedUserId }, { status: 200 });

  } catch (error: any) {
    console.error("Free enrollment error:", error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
