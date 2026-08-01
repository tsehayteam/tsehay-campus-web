import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { adminDb } from '@/lib/firebase/admin';

export async function POST(request: Request) {
  try {
    const rawBody = await request.text();
    const signature = request.headers.get('x-lakipay-signature') || request.headers.get('x-nowpayments-sig');
    const secret = process.env.LAKIPAY_SECRET_KEY || process.env.NOWPAYMENTS_IPN_SECRET || 'SECRET_PLACEHOLDER';

    // Verify signature if provided
    if (signature && secret && secret !== 'SECRET_PLACEHOLDER') {
      const hash = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
      if (hash !== signature && request.headers.get('x-lakipay-signature')) {
        console.error("Invalid Webhook Signature");
        return NextResponse.json({ error: 'Invalid Signature' }, { status: 400 });
      }
    }

    const event = JSON.parse(rawBody);

    // LakiPay / Webhook charge success event
    const isSuccess = event.event === 'charge.success' || event.status === 'success' || event.status === 'completed' || event.payment_status === 'finished';
    const tx_ref = event.reference || event.data?.reference || event.data?.tx_ref || event.tx_ref || event.order_id;
    const amount = event.amount || event.data?.amount || event.price_amount;

    if (isSuccess && tx_ref) {
      console.log(`Webhook: Payment successful for reference/tx_ref: ${tx_ref}`);

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

      // If shortRef format (e.g. REF-845266), look up pending_payments in Firestore
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
            console.log(`Successfully granted course ${courseId} access to user ${userId}`);
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