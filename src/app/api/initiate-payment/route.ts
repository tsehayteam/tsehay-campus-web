import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { courseId, title, price, userEmail, firstName, lastName, userId } = body;

    if (!courseId || !price || !userEmail) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const tx_ref = `tsehay_tx_${courseId}_${userId}_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

    const chapaPayload = {
      amount: price.toString(),
      currency: "ETB",
      email: userEmail,
      first_name: firstName || "Student",
      last_name: lastName || "Tsehay",
      tx_ref: tx_ref,
      callback_url: `https://tsehaycampus.com/api/webhook`, // Will be pinged by Chapa
      return_url: `https://tsehaycampus.com/dashboard?success=true&course=${courseId}`, // Where user goes after payment
      customization: {
        title: "Tsehay Campus",
        description: `Payment for ${title}`,
        logo: "https://tsehaycampus.com/tc-logo.jpg"
      }
    };

    const CHAPA_SECRET = process.env.CHAPA_SECRET_KEY || 'CHASECK_TEST_placeholder';

    const response = await fetch('https://api.chapa.co/v1/transaction/initialize', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${CHAPA_SECRET}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(chapaPayload)
    });

    const data = await response.json();

    if (data.status === 'success') {
      return NextResponse.json({ checkoutUrl: data.data.checkout_url, tx_ref });
    } else {
      console.error("Chapa Error:", data);
      return NextResponse.json({ error: 'Failed to initialize payment with Chapa' }, { status: 500 });
    }

  } catch (error: any) {
    console.error("Payment API Error:", error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
