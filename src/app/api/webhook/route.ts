import { NextResponse } from 'next/server';
import crypto from 'crypto';

export async function POST(request: Request) {
  try {
    const { adminDb } = await import('@/lib/firebase/admin');
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
    const tx_ref = event.data?.tx_ref || event.tx_ref || event.order_id;
    const amount = event.data?.amount || event.amount || event.price_amount;

    if (isSuccess && tx_ref) {
      console.log(`Webhook: Payment successful for tx_ref: ${tx_ref}`);

      const parts = tx_ref.split('_');
      const courseId = parts[2];
      const userId = parts[3];

      if (userId && userId !== 'anonymous' && courseId) {
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