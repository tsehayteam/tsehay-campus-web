import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';

async function getPayPalAccessToken() {
  const clientId = (process.env.PAYPAL_CLIENT_ID || '').trim();
  const secret = (process.env.PAYPAL_CLIENT_SECRET || process.env.PAYPAL_SECRET || '').trim();

  if (!clientId || !secret) {
    throw new Error('PayPal credentials not configured');
  }

  const mode = process.env.PAYPAL_MODE === 'live' ? 'https://api-m.paypal.com' : 'https://api-m.sandbox.paypal.com';
  const auth = Buffer.from(`${clientId}:${secret}`).toString('base64');

  const response = await fetch(`${mode}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error_description || 'Failed to authenticate with PayPal');
  }

  return { accessToken: data.access_token, mode };
}

export async function POST(request: Request) {
  try {
    const { orderID } = await request.json();

    if (!orderID) {
      return NextResponse.json({ error: 'Missing orderID' }, { status: 400 });
    }

    const { accessToken, mode } = await getPayPalAccessToken();

    const response = await fetch(`${mode}/v2/checkout/orders/${orderID}/capture`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`
      }
    });

    const captureData = await response.json();

    if (!response.ok || captureData.status !== 'COMPLETED') {
      console.error("PayPal Capture Error:", captureData);
      return NextResponse.json({ error: captureData.message || 'Payment capture failed' }, { status: 400 });
    }

    // Extract custom_id metadata (userId:courseId)
    const unit = captureData.purchase_units?.[0];
    const customId = unit?.payments?.captures?.[0]?.custom_id || unit?.custom_id || '';
    const [userId, courseId] = customId.split(':');

    if (userId && courseId && adminDb) {
      const userDocRef = adminDb.collection('artifacts').doc('tsehaycampus-e1a6d').collection('users').doc(userId);
      
      // 1. Save purchased_courses doc
      await userDocRef.collection('purchased_courses').doc(courseId).set({
        courseId,
        amount: unit?.payments?.captures?.[0]?.amount?.value || 0,
        paymentMethod: 'paypal',
        tx_ref: orderID,
        purchasedAt: new Date(),
        status: 'active'
      });

      // 2. Add courseId to enrolledCourses array
      try {
        const { FieldValue } = await import('firebase-admin/firestore');
        await userDocRef.set({
          enrolledCourses: FieldValue.arrayUnion(courseId)
        }, { merge: true });
      } catch (err) {
        console.warn("Could not update enrolledCourses array:", err);
      }
    }

    return NextResponse.json({ success: true, status: 'COMPLETED', orderID });

  } catch (error: any) {
    console.error("PayPal Capture Order Error:", error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
