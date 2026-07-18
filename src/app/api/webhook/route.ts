import { NextResponse } from 'next/server';
import crypto from 'crypto';

export async function POST(request: Request) {
  try {
    const { adminDb } = await import('@/lib/firebase/admin');
    const rawBody = await request.text();
    const signature = request.headers.get('chapa-signature');
    const secret = process.env.CHAPA_WEBHOOK_SECRET || 'CHAPA_WEBHOOK_SECRET_PLACEHOLDER';

    // Verify signature
    const hash = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
    
    if (hash !== signature) {
      console.error("Invalid Chapa Signature");
      return NextResponse.json({ error: 'Invalid Signature' }, { status: 400 });
    }

    const event = JSON.parse(rawBody);

    // Only process successful payments
    if (event.event === 'charge.success') {
      const tx_ref = event.data.tx_ref;
      const email = event.data.email;
      const amount = event.data.amount;
      
      console.log(`Payment successful for tx_ref: ${tx_ref}, email: ${email}, amount: ${amount}`);

      const parts = tx_ref.split('_');
      const courseId = parts[2];
      const userId = parts[3];

      if (userId && userId !== 'anonymous' && courseId) {
         try {
            const userDocRef = adminDb.collection('artifacts').doc('tsehaycampus-e1a6d').collection('users').doc(userId);
            // Save to purchased_courses collection for this user
            await userDocRef.collection('purchased_courses').doc(courseId).set({
               courseId,
               tx_ref,
               amount,
               purchasedAt: new Date(),
               status: 'active'
            });
            console.log(`Successfully granted course ${courseId} access to user ${userId}`);
         } catch (err) {
            console.error("Error saving purchase to Firestore:", err);
         }
      }
      
      // Successfully processed the webhook
      return NextResponse.json({ status: 'success' }, { status: 200 });
    }

    return NextResponse.json({ status: 'ignored' }, { status: 200 });

  } catch (error: any) {
    console.error("Webhook processing error:", error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}