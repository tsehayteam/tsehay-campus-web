import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase/admin';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { email } = body;

    if (!email || typeof email !== 'string') {
      return NextResponse.json({ exists: false, error: 'Email required' }, { status: 400 });
    }

    const cleanEmail = email.trim().toLowerCase();

    // Strict validation
    if (!cleanEmail.includes('@')) {
      return NextResponse.json({ exists: false });
    }

    let userExists = false;
    let displayName = '';
    let photoURL = '';
    let uid = '';

    // 1. Check with Firebase Admin Auth
    if (adminAuth) {
      try {
        const userRecord = await adminAuth.getUserByEmail(cleanEmail);
        if (userRecord && userRecord.uid) {
          userExists = true;
          uid = userRecord.uid;
          displayName = userRecord.displayName || '';
          photoURL = userRecord.photoURL || '';
        }
      } catch (err: any) {
        if (err?.code !== 'auth/user-not-found') {
          console.warn('[check-email] adminAuth warning:', err?.message || err);
        }
      }
    }

    // 2. Fallback check in Firestore if Admin Auth didn't find or errored
    if (!userExists && adminDb) {
      try {
        const userQuery = await adminDb
          .collection('artifacts')
          .doc('tsehaycampus-e1a6d')
          .collection('users')
          .where('email', '==', cleanEmail)
          .limit(1)
          .get();

        if (!userQuery.empty) {
          const docData = userQuery.docs[0].data();
          userExists = true;
          uid = userQuery.docs[0].id;
          displayName = docData.name || docData.displayName || docData.fullName || '';
          photoURL = docData.photoURL || '';
        }
      } catch (dbErr) {
        console.warn('[check-email] Firestore lookup warning:', dbErr);
      }
    }

    return NextResponse.json({
      exists: userExists,
      email: cleanEmail,
      displayName,
      photoURL,
      uid: userExists ? uid : undefined
    });

  } catch (error: any) {
    console.error('Error in check-email route:', error);
    return NextResponse.json({ exists: false });
  }
}
