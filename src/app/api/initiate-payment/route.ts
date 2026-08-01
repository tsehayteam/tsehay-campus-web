import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { courseId, title, description, price, paymethod, userEmail, userId } = body;

    if (!courseId || !price || !userEmail) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const host = request.headers.get('host') || 'tsehaycampus.com';
    const protocol = host.includes('localhost') ? 'http' : 'https';
    const origin = process.env.NEXT_PUBLIC_APP_URL || `${protocol}://${host}`;

    const shortRef = `REF-${Date.now().toString().slice(-6)}`;

    // Save pending payment record to Firestore for reference lookup in webhook
    try {
      if (adminDb) {
        await adminDb.collection('artifacts').doc('tsehaycampus-e1a6d').collection('pending_payments').doc(shortRef).set({
          courseId,
          userId,
          price,
          shortRef,
          createdAt: new Date()
        });
      }
    } catch (dbErr) {
      console.error("Failed to save pending payment record:", dbErr);
    }

    // 1. NOWPayments Crypto Integration
    if (paymethod === 'crypto' || paymethod === 'nowpayments') {
      const nowPaymentsApiKey = (process.env.NOWPAYMENTS_API_KEY || '').trim();
      
      if (nowPaymentsApiKey) {
        const nowPaymentsPayload = {
          price_amount: Number(price),
          price_currency: "usd",
          order_id: shortRef,
          order_description: `Tsehay Campus - ${title}`,
          ipn_callback_url: `${origin}/api/webhook/nowpayments`,
          success_url: `${origin}/dashboard?success=true&course=${courseId}`,
          cancel_url: `${origin}/dashboard?canceled=true`
        };

        try {
          const cryptoRes = await fetch("https://api.nowpayments.io/v1/invoice", {
            method: 'POST',
            headers: {
              'x-api-key': nowPaymentsApiKey,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(nowPaymentsPayload)
          });

          const cryptoData = await cryptoRes.json();
          const invoiceUrl = cryptoData.invoice_url || cryptoData.url;

          if (invoiceUrl) {
            return NextResponse.json({ checkoutUrl: invoiceUrl, reference: shortRef });
          }
        } catch (cryptoErr) {
          console.error("NOWPayments API call error:", cryptoErr);
        }
      }

      // Fallback NOWPayments URL if API key pending or error
      const fallbackCryptoUrl = `https://nowpayments.io/payment/?iid=${shortRef}&amount=${price}&title=${encodeURIComponent(title || 'Course')}`;
      return NextResponse.json({ checkoutUrl: fallbackCryptoUrl, reference: shortRef });
    }

    // 2. LakiPay Backend Integration
    const lakipayPayload = {
      amount: Number(price),
      currency: "ETB",
      reference: shortRef,
      title: title || "Tsehay Campus Course",
      description: description ? description.slice(0, 120) : (title ? `Full Access to ${title} on Tsehay Campus` : "Full Access to Tsehay Campus Course"),
      supported_mediums: [
        "TELEBIRR",
        "CBE",
        "MPESA",
        "ETHSWITCH",
        "OROMIA_BANK",
        "AWASH",
        "CYBERSOURCE"
      ],
      callback_url: `${origin}/api/webhook`,
      redirects: {
        success: `${origin}/dashboard?success=true&course=${courseId}`,
        failed: `${origin}/dashboard?failed=true`
      }
    };

    const publicKey = (process.env.LAKIPAY_PUBLIC_KEY || '').trim();
    const secretKey = (process.env.LAKIPAY_SECRET_KEY || '').trim();

    if (publicKey && secretKey) {
      const apiKeyHeader = `${publicKey}:${secretKey}`;
      const checkoutUrl = process.env.LAKIPAY_CHECKOUT_URL || 'https://api.lakipay.co/api/v2/payment/checkout';

      try {
        const response = await fetch(checkoutUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-API-Key': apiKeyHeader
          },
          body: JSON.stringify(lakipayPayload)
        });

        const responseText = await response.text();
        let data: any = {};
        try {
          data = JSON.parse(responseText);
        } catch {
          console.error("LakiPay Non-JSON Response:", responseText);
        }

        const redirectUrl = data.checkout_url || data.checkoutUrl || data.url || data.payment_url || data.redirect_url || data.checkout_link || data.data?.checkout_url || data.data?.url || data.data?.redirect_url || data.data?.checkout_link;

        if (redirectUrl) {
          return NextResponse.json({ checkoutUrl: redirectUrl, reference: shortRef });
        } else if (data.error || data.message) {
          console.error("LakiPay API Response Error:", data);
        }
      } catch (lakiErr) {
        console.error("LakiPay Fetch Error:", lakiErr);
      }
    }

    // Fallback LakiPay URL if credentials pending or network issue
    const fallbackLakiUrl = `https://api.lakipay.co/checkout?ref=${shortRef}&amount=${price}&title=${encodeURIComponent(title || 'Course')}`;
    return NextResponse.json({ checkoutUrl: fallbackLakiUrl, reference: shortRef });

  } catch (error: any) {
    console.error("Payment API Error:", error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
