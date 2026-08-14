import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { adminDb } from '@/lib/firebase/admin';

export async function POST(request: Request) {
  try {
    const rawBody = await request.text();
    const signature = request.headers.get('x-lakipay-signature') || request.headers.get('x-chapa-signature');
    const secret = (process.env.LAKIPAY_SECRET_KEY || process.env.CHAPA_SECRET_KEY || '').trim();

    // Mandatory signature verification: reject if secret is not configured or signature is missing
    if (!secret) {
      console.error("Webhook Error: Gateway secret key is not configured on server.");
      return NextResponse.json({ error: 'Server webhook configuration error' }, { status: 500 });
    }

    if (!signature) {
      console.warn("Webhook Warning: Rejected request missing signature header.");
      return NextResponse.json({ error: 'Missing signature header' }, { status: 401 });
    }

    const hash = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
    if (hash !== signature) {
      console.error("Webhook Error: Invalid signature hash verification failed.");
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    const event = JSON.parse(rawBody);

    // LakiPay / Chapa charge success event validation
    const isSuccess = event.event === 'charge.success' || event.status === 'success' || event.status === 'completed';
    const tx_ref = event.reference || event.data?.reference || event.data?.tx_ref || event.tx_ref;
    const amount = Number(event.amount || event.data?.amount || 0);

    if (isSuccess && tx_ref) {
      console.log(`Webhook: Verified payment successful for tx_ref: ${tx_ref}`);

      let courseId = '';
      let userId = '';

      if (tx_ref.includes('_')) {
        const parts = tx_ref.split('_');
        if (parts[0] === 'REF') {
          courseId = parts[1];
          userId = parts[2];
        } else {
          courseId = parts[2];
          userId = parts[3];
        }
      }

      // If reference format is short or clean, look up pending_payments in Firestore
      if (adminDb && (!courseId || !userId)) {
        try {
          const pendingDoc = await adminDb.collection('artifacts').doc('tsehaycampus-e1a6d').collection('pending_payments').doc(tx_ref).get();
          if (pendingDoc.exists) {
            const pendingData = pendingDoc.data();
            courseId = pendingData?.courseId;
            userId = pendingData?.userId;
          }
        } catch (dbLookupErr) {
          console.error("Error looking up pending payment:", dbLookupErr);
        }
      }

      if (adminDb && userId && userId !== 'anonymous' && courseId) {
         try {
            const userDocRef = adminDb.collection('artifacts').doc('tsehaycampus-e1a6d').collection('users').doc(userId);
            await userDocRef.collection('purchased_courses').doc(courseId).set({
               courseId,
               tx_ref,
               amount: amount || 0,
               purchasedAt: new Date(),
               status: 'active'
            });

            const { FieldValue } = await import('firebase-admin/firestore');
            await userDocRef.set({
              enrolledCourses: FieldValue.arrayUnion(courseId)
            }, { merge: true });

            console.log(`Successfully verified and granted course ${courseId} access to user ${userId}`);
         } catch (err) {
            console.error("Error saving purchase to Firestore:", err);
         }
      }
      
      return NextResponse.json({ status: 'success' }, { status: 200 });
    }

    return NextResponse.json({ status: 'ignored' }, { status: 200 });

  } catch (error: any) {
    console.error("Webhook processing error:", error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}