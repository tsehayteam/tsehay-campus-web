import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { courseId, title, description, price, paymethod, userEmail, userId } = body;

    const numericPrice = typeof price === 'number' ? price : Number(String(price || '').replace(/[^0-9.]/g, '')) || 4500;
    const email = userEmail || 'student@example.com';

    if (!courseId) {
      return NextResponse.json({ error: 'Missing courseId parameter' }, { status: 400 });
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
          userId: userId || 'anonymous',
          price: numericPrice,
          userEmail: email,
          shortRef,
          createdAt: new Date()
        });
      }
    } catch (dbErr) {
      console.error("Failed to save pending payment record:", dbErr);
    }

    // 1. NOWPayments Crypto Integration
    if (paymethod === 'crypto' || paymethod === 'nowpayments') {
      // Check for direct checkout URL configured in env
      const directUrl = process.env.NOWPAYMENTS_DIRECT_URL || process.env.NOWPAYMENTS_CHECKOUT_URL;
      if (directUrl && directUrl.startsWith('http')) {
        return NextResponse.json({ checkoutUrl: directUrl, reference: shortRef });
      }

      const nowPaymentsApiKey = (
        process.env.NOWPAYMENTS_API_KEY || 
        process.env.NOW_PAYMENTS_API_KEY || 
        process.env.NOWPAYMENT_API_KEY || 
        process.env.NOWPAYMENTS_KEY ||
        process.env.NEXT_PUBLIC_NOWPAYMENTS_API_KEY ||
        ''
      ).replace(/['"]/g, '').trim();
      
      let invoiceUrl = '';
      if (nowPaymentsApiKey) {
        const nowPaymentsPayload = {
          price_amount: Number(numericPrice) / 120 > 1 ? Number((Number(numericPrice) / 120).toFixed(2)) : 5.00,
          price_currency: "usd",
          order_id: shortRef,
          order_description: `Tsehay Campus - ${title || 'Course'}`,
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
          invoiceUrl = cryptoData.invoice_url || cryptoData.url || cryptoData.checkout_url || '';
        } catch (cryptoErr) {
          console.error("NOWPayments API call error:", cryptoErr);
        }

        if (!invoiceUrl) {
          invoiceUrl = `https://nowpayments.io/payment/?order_id=${shortRef}`;
        }

        return NextResponse.json({ checkoutUrl: invoiceUrl, reference: shortRef });
      }

      return NextResponse.json({ requiresManualTransfer: true, reference: shortRef, paymethod: 'crypto' });
    }

    // 2. LakiPay Integration (Telebirr, CBE & Local Banks)
    const publicKey = (
      process.env.LAKIPAY_PUBLIC_KEY || 
      process.env.LAKI_PAY_PUBLIC_KEY || 
      process.env.NEXT_PUBLIC_LAKIPAY_PUBLIC_KEY || 
      process.env.LAKIPAY_KEY ||
      ''
    ).replace(/['"]/g, '').trim();
    
    const secretKey = (
      process.env.LAKIPAY_SECRET_KEY || 
      process.env.LAKI_PAY_SECRET_KEY || 
      process.env.LAKIPAY_SECRET ||
      process.env.LAKI_PAY_SECRET ||
      ''
    ).replace(/['"]/g, '').trim();

    if (publicKey || secretKey) {
      const apiKeyHeader = (publicKey && secretKey) ? `${publicKey}:${secretKey}` : (secretKey || publicKey);
      const checkoutEndpoint = 'https://api.lakipay.co/api/v2/payment/checkout';

      const lakipayPayload = {
        amount: Number(numericPrice),
        currency: "ETB",
        reference: shortRef,
        title: title || "Tsehay Campus Course",
        description: description ? description.slice(0, 120) : `Full Access to ${title || 'Course'} on Tsehay Campus`,
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

      try {
        const response = await fetch(checkoutEndpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-API-Key': apiKeyHeader
          },
          body: JSON.stringify(lakipayPayload)
        });

        const resData = await response.json().catch(() => ({}));

        if (response.ok && (resData.status === "SUCCESS" || resData.data?.checkout_url || resData.checkout_url || resData.url || resData.payment_url)) {
          const checkoutUrl = resData.data?.checkout_url || resData.checkout_url || resData.url || resData.payment_url || resData.data?.url;
          return NextResponse.json({
            success: true,
            url: checkoutUrl,
            checkoutUrl: checkoutUrl,
            reference: shortRef
          });
        } else {
          console.error("LakiPay API Error:", resData);
          const fallbackUrl = resData.data?.checkout_url || resData.checkout_url || resData.url;
          if (fallbackUrl) {
            return NextResponse.json({
              success: true,
              url: fallbackUrl,
              checkoutUrl: fallbackUrl,
              reference: shortRef
            });
          }
          return NextResponse.json({
            success: false,
            error: resData.message || resData.error || "LakiPay error"
          }, { status: response.status || 400 });
        }
      } catch (lakiErr: any) {
        console.error("LakiPay API Fetch Error:", lakiErr);
        return NextResponse.json({
          success: false,
          error: lakiErr.message || "LakiPay request failed"
        }, { status: 500 });
      }
    }

    // 3. Chapa Fallback & Direct Checkout
    const chapaDirectUrl = (
      process.env.CHAPA_CHECKOUT_URL || 
      process.env.CHAPA_DIRECT_URL || 
      process.env.CHAPA_URL ||
      process.env.NEXT_PUBLIC_CHAPA_CHECKOUT_URL ||
      ''
    ).replace(/['"]/g, '').trim();

    if (chapaDirectUrl && chapaDirectUrl.startsWith('http')) {
      return NextResponse.json({ checkoutUrl: chapaDirectUrl, reference: shortRef });
    }

    const chapaSecretKey = (
      process.env.CHAPA_SECRET_KEY || 
      process.env.CHAPA_SECRET || 
      ''
    ).replace(/['"]/g, '').trim();

    if (chapaSecretKey) {
      try {
        const chapaRes = await fetch("https://api.chapa.co/v1/transaction/initialize", {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${chapaSecretKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            amount: String(numericPrice),
            currency: "ETB",
            email: email,
            first_name: email.split('@')[0] || "Student",
            last_name: "Campus",
            tx_ref: shortRef,
            callback_url: `${origin}/api/webhook`,
            return_url: `${origin}/dashboard?success=true&course=${courseId}`,
            customization: {
              title: title || "Tsehay Campus Course",
              description: description ? description.slice(0, 100) : "Full Access to Tsehay Campus Course"
            }
          })
        });

        const chapaData = await chapaRes.json();
        const chapaUrl = chapaData?.data?.checkout_url || chapaData?.checkout_url;

        if (chapaUrl) {
          return NextResponse.json({ checkoutUrl: chapaUrl, reference: shortRef });
        }
      } catch (chapaErr) {
        console.error("Chapa API Fetch Error:", chapaErr);
      }
    }

    // Return manual transfer fallback when live API keys are pending
    return NextResponse.json({ requiresManualTransfer: true, reference: shortRef, paymethod: 'lakipay' });

  } catch (error: any) {
    console.error("Payment API Error:", error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
