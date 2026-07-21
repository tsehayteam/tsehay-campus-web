import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { courseId, title, price, userEmail, firstName, lastName, userId } = body;

    if (!courseId || !price || !userEmail) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const { adminDb } = await import('@/lib/firebase/admin');
    const tx_ref = `tsehay_tx_${courseId}_${userId}_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

    const addisPayPayload = {
      total_amount: price.toString(),
      currency: "ETB",
      email: userEmail,
      first_name: firstName || "Student",
      last_name: lastName || "Tsehay",
      tx_ref: tx_ref,
      callback_url: `https://tsehaycampus.com/api/webhook`,
      return_url: `https://tsehaycampus.com/dashboard?success=true&course=${courseId}`,
      customization: {
        title: "Tsehay Campus",
        description: `Payment for ${title}`,
        logo: "https://tsehaycampus.com/tc-logo.jpg"
      }
    };

    const ADDISPAY_APP_ID = process.env.ADDISPAY_APP_ID || process.env.ADDISPAY_MERCHANT_ID || 'ADDISPAY_APP_ID_placeholder';
    const ADDISPAY_SECRET = process.env.ADDISPAY_SECRET_KEY || process.env.ADDISPAY_API_KEY || 'ADDISPAY_SECRET_placeholder';

    const response = await fetch(process.env.ADDISPAY_CHECKOUT_URL || 'https://api.addispay.et/checkout/payment/initialize', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${ADDISPAY_SECRET}`,
        'X-App-Id': ADDISPAY_APP_ID,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(addisPayPayload)
    });

    const data = await response.json();

    if (data.status === 'success' || data.checkout_url || data.checkoutUrl) {
      return NextResponse.json({ checkoutUrl: data.checkout_url || data.checkoutUrl || data.data?.checkout_url, tx_ref });
    } else {
      console.error("AddisPay Error:", data);
      return NextResponse.json({ error: 'Failed to initialize payment with AddisPay' }, { status: 500 });
    }

  } catch (error: any) {
    console.error("Payment API Error:", error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
