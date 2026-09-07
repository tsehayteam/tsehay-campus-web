import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase/server';

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

    if (userId && courseId) {
      try {
        await supabaseServer.from('enrollments').upsert({
          id: `${userId}_${courseId}`,
          user_id: userId,
          course_id: courseId,
          amount: unit?.payments?.captures?.[0]?.amount?.value || 0,
          payment_method: 'paypal',
          tx_ref: orderID,
          status: 'active',
          created_at: new Date().toISOString()
        });
      } catch (err) {
        console.warn("Could not save PayPal enrollment to Supabase:", err);
      }
    }

    return NextResponse.json({ success: true, status: 'COMPLETED', orderID });

  } catch (error: any) {
    console.error("PayPal Capture Order Error:", error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
