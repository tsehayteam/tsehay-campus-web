import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { adminDb } from '@/lib/firebase/admin';

export async function POST(request: Request) {
  try {
    const rawBody = await request.text();
    const sigHeader = request.headers.get('x-nowpayments-sig');
    const secret = (process.env.NOWPAYMENTS_IPN_SECRET || '').trim();

    // Mandatory signature verification
    if (!secret) {
      console.error("NOWPayments Error: IPN secret is not configured on server.");
      return NextResponse.json({ error: 'Server webhook configuration error' }, { status: 500 });
    }

    if (!sigHeader) {
      console.warn("NOWPayments Warning: Missing signature header.");
      return NextResponse.json({ error: 'Missing signature header' }, { status: 401 });
    }

    const payload = JSON.parse(rawBody);
    const sortedKeys = Object.keys(payload).sort();
    const sortedPayload: Record<string, any> = {};
    for (const key of sortedKeys) {
      sortedPayload[key] = payload[key];
    }
    const sortedString = JSON.stringify(sortedPayload);
    const hmac = crypto.createHmac('sha512', secret).update(sortedString).digest('hex');

    if (hmac !== sigHeader) {
      console.error("Invalid NOWPayments IPN Signature");
      return NextResponse.json({ error: 'Invalid Signature' }, { status: 401 });
    }

    const event = payload;

    if (event.payment_status === 'finished' || event.payment_status === 'confirmed') {
      const tx_ref = event.order_id;
      if (tx_ref) {
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

        if (adminDb && (!courseId || !userId)) {
          try {
            const pendingDoc = await adminDb.collection('artifacts').doc('tsehaycampus-e1a6d').collection('pending_payments').doc(tx_ref).get();
            if (pendingDoc.exists) {
              const pendingData = pendingDoc.data();
              courseId = pendingData?.courseId;
              userId = pendingData?.userId;
            }
          } catch (dbErr) {
            console.error("Firestore lookup error in nowpayments webhook:", dbErr);
          }
        }

        if (adminDb && userId && userId !== 'anonymous' && courseId) {
          const userDocRef = adminDb.collection('artifacts').doc('tsehaycampus-e1a6d').collection('users').doc(userId);
          await userDocRef.collection('purchased_courses').doc(courseId).set({
            courseId,
            tx_ref,
            amount: event.price_amount || event.pay_amount || 0,
            paymentMethod: 'crypto',
            purchasedAt: new Date(),
            status: 'active'
          });

          const { FieldValue } = await import('firebase-admin/firestore');
          await userDocRef.set({
            enrolledCourses: FieldValue.arrayUnion(courseId)
          }, { merge: true });

          console.log(`NOWPayments: Granted course ${courseId} to user ${userId}`);
        }
      }
      return NextResponse.json({ status: 'success' }, { status: 200 });
    }

    return NextResponse.json({ status: 'ignored' }, { status: 200 });

  } catch (error: any) {
    console.error("NOWPayments IPN Error:", error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
