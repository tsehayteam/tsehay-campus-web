import { NextResponse } from 'next/server';

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
    const { courseId, title, price, userId } = await request.json();

    if (!courseId || !price || !userId) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    const host = request.headers.get('host') || 'tsehaycampus.com';
    const protocol = host.includes('localhost') ? 'http' : 'https';
    const origin = process.env.NEXT_PUBLIC_APP_URL || `${protocol}://${host}`;

    let accessToken = '';
    let mode = '';
    try {
      const authResult = await getPayPalAccessToken();
      accessToken = authResult.accessToken;
      mode = authResult.mode;
    } catch (err: any) {
      console.warn("PayPal direct API credentials not set, returning fallback indicator:", err.message);
      return NextResponse.json({ useClientFallback: true });
    }

    const usdPrice = (Number(price) / 120).toFixed(2); // Convert ETB to USD estimate

    const orderPayload = {
      intent: 'CAPTURE',
      purchase_units: [
        {
          reference_id: `tsehay_${courseId}_${userId}_${Date.now()}`,
          custom_id: `${userId}:${courseId}`,
          description: `Tsehay Campus - ${title}`,
          amount: {
            currency_code: 'USD',
            value: usdPrice > '1.00' ? usdPrice : '5.00'
          }
        }
      ],
      application_context: {
        brand_name: 'Tsehay Campus',
        user_action: 'PAY_NOW',
        return_url: `${origin}/dashboard?success=true&course=${courseId}`,
        cancel_url: `${origin}/dashboard?canceled=true`
      }
    };

    const response = await fetch(`${mode}/v2/checkout/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`
      },
      body: JSON.stringify(orderPayload)
    });

    const orderData = await response.json();

    if (!response.ok) {
      console.error("PayPal Create Order Error:", orderData);
      return NextResponse.json({ error: orderData.message || 'Failed to create PayPal order' }, { status: 400 });
    }

    const approvalUrl = orderData.links?.find((link: any) => link.rel === 'approve')?.href;

    return NextResponse.json({
      orderID: orderData.id,
      checkoutUrl: approvalUrl || orderData.links?.[0]?.href
    });

  } catch (error: any) {
    console.error("PayPal Order Creation Error:", error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
