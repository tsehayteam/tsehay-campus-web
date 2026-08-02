import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { courseId, title, description, price, paymethod, userEmail, userId, firstName, lastName } = body;

    const numericPrice = typeof price === 'number' ? price : Number(String(price || '').replace(/[^0-9.]/g, '')) || 4500;
    const email = userEmail || 'student@example.com';

    if (!courseId) {
      return NextResponse.json({ error: 'የሚያስፈልጉ መረጃዎች አልተሟሉም (Missing required fields)' }, { status: 400 });
    }

    const host = request.headers.get('host') || 'tsehaycampus.com';
    const protocol = host.includes('localhost') ? 'http' : 'https';
    const origin = process.env.NEXT_PUBLIC_APP_URL || `${protocol}://${host}`;
    const tx_ref = `tsehay_tx_${courseId}_${userId || 'anon'}_${Date.now()}`;
    const selectedMethod = (paymethod || 'lakipay').toLowerCase();

    // Save pending payment record to Firestore for reference lookup in webhook
    try {
      if (adminDb) {
        await adminDb.collection('artifacts').doc('tsehaycampus-e1a6d').collection('pending_payments').doc(tx_ref).set({
          courseId,
          userId: userId || 'anonymous',
          price: numericPrice,
          userEmail: email,
          tx_ref,
          createdAt: new Date()
        });
      }
    } catch (dbErr) {
      console.error("Failed to save pending payment record:", dbErr);
    }

    // 1. LAKIPAY INTEGRATION (Telebirr, CBE, Banks, Wallets & Cards)
    if (selectedMethod === 'lakipay' || selectedMethod === 'addispay') {
      const cleanPriceStr = String(price || '0').replace(/[^0-9.]/g, '');
      const numAmount = parseFloat(cleanPriceStr) || numericPrice;
      
      const formatEthPhone = (raw: string) => {
        let cleaned = String(raw || '').replace(/[^0-9]/g, '');
        if (cleaned.startsWith('0') && cleaned.length === 10) {
          cleaned = '251' + cleaned.slice(1);
        } else if (cleaned.length === 9 && (cleaned.startsWith('9') || cleaned.startsWith('7'))) {
          cleaned = '251' + cleaned;
        } else if (cleaned.length === 12 && cleaned.startsWith('251')) {
          // already 251...
        } else {
          cleaned = '251911234567';
        }
        return cleaned;
      };

      const rawPhone = body.phone_number || body.phoneNumber || body.phone || '';
      const validEthPhone = formatEthPhone(rawPhone);

      const lakipayDirectUrl = process.env.LAKIPAY_DIRECT_URL || process.env.LAKIPAY_CHECKOUT_URL;
      if (lakipayDirectUrl && lakipayDirectUrl.startsWith('http') && !lakipayDirectUrl.includes('api.lakipay.co')) {
        const separator = lakipayDirectUrl.includes('?') ? '&' : '?';
        const finalDirectUrl = lakipayDirectUrl.includes('amount=') ? lakipayDirectUrl : `${lakipayDirectUrl}${separator}amount=${numAmount}&reference=${tx_ref}&phone_number=${validEthPhone}`;
        return NextResponse.json({ checkoutUrl: finalDirectUrl, reference: tx_ref });
      }

      const merchantId = (
        process.env.LAKIPAY_MERCHANT_ID || 
        process.env.LAKIPAY_MERCHANT || 
        process.env.ADDISPAY_MERCHANT_ID || 
        process.env.ADDISPAY_APP_ID || ''
      ).trim();

      const operatorId = (
        process.env.LAKIPAY_OPERATOR_ID || 
        process.env.LAKIPAY_OPERATOR || ''
      ).trim();

      const secretKey = (process.env.LAKIPAY_SECRET_KEY || '').trim().replace(/^["']|["']$/g, '');
      const publicKey = (process.env.LAKIPAY_PUBLIC_KEY || '').trim().replace(/^["']|["']$/g, '');
      const rawApiKey = (process.env.LAKIPAY_API_KEY || '').trim().replace(/^["']|["']$/g, '');

      // Official LakiPay Specification: X-API-Key header format is PUBLICKEY:SECRETKEY
      const formattedApiKey = (publicKey && secretKey) 
        ? `${publicKey}:${secretKey}` 
        : (rawApiKey || secretKey || publicKey);

      const endpoints = Array.from(new Set([
        process.env.LAKIPAY_ENDPOINT,
        process.env.LAKIPAY_CHECKOUT_URL,
        'https://api.lakipay.co/api/v2/payment/checkout',
        'https://api.lakipay.co/api/v1/payment/checkout'
      ].filter(Boolean))) as string[];

      let lastError: string | null = null;

      if (formattedApiKey) {
        for (const endpoint of endpoints) {
          try {
            const lakipayPayload: Record<string, any> = {
              amount: numAmount,
              total_amount: numAmount,
              price: numAmount,
              value: numAmount,
              currency: "ETB",
              reference: tx_ref,
              tx_ref: tx_ref,
              email: email,
              phone_number: validEthPhone,
              phone: validEthPhone,
              customer_phone: validEthPhone,
              first_name: firstName || email.split('@')[0] || "Student",
              last_name: lastName || "Campus",
              title: title || "Tsehay Campus Course",
              description: `Payment for ${title}`,
              callback_url: `${origin}/api/webhook`,
              return_url: `${origin}/dashboard?success=true&course=${courseId}`,
              redirects: {
                success: `${origin}/dashboard?success=true&course=${courseId}`,
                failed: `${origin}/dashboard?failed=true`
              }
            };

            const headers: Record<string, string> = {
              'Content-Type': 'application/json',
              'X-API-Key': formattedApiKey,
              'Authorization': `Bearer ${secretKey || formattedApiKey}`
            };
            if (merchantId) headers['X-Merchant-Id'] = merchantId;
            if (operatorId) headers['X-Operator-Id'] = operatorId;

            const response = await fetch(endpoint, {
              method: 'POST',
              headers,
              body: JSON.stringify(lakipayPayload)
            });

            const data = await response.json().catch(() => null);

            if (data) {
              const returnedRef = data.reference || data.data?.reference || data.transaction_id || data.data?.transaction_id || tx_ref;
              const rawCheckoutUrl = 
                data.checkout_url || 
                data.checkoutUrl || 
                data.payment_url || 
                data.url || 
                data.redirect_url || 
                data.link || 
                data.data?.checkout_url || 
                data.data?.payment_url || 
                data.data?.url || 
                data.data?.link || 
                data.data?.redirect_url ||
                `https://checkout.lakipay.co/pay/${returnedRef}`;

              if (rawCheckoutUrl) {
                let checkoutUrl = rawCheckoutUrl;
                if (!checkoutUrl.includes('amount=') && numAmount > 0) {
                  const separator = checkoutUrl.includes('?') ? '&' : '?';
                  checkoutUrl = `${checkoutUrl}${separator}amount=${numAmount}&reference=${returnedRef}`;
                }
                return NextResponse.json({ checkoutUrl, reference: returnedRef });
              }

              const rawErr = data.error || data.message || data.detail || data.data?.error || data.data?.message;
              if (rawErr) {
                if (typeof rawErr === 'string') {
                  lastError = rawErr;
                } else if (typeof rawErr === 'object') {
                  lastError = rawErr.message || rawErr.detail || rawErr.error || JSON.stringify(rawErr);
                } else {
                  lastError = String(rawErr);
                }
              }
            }
          } catch (gatewayErr: any) {
            console.error(`LakiPay Error on ${endpoint}:`, gatewayErr);
            lastError = gatewayErr.message || 'Connection Error';
          }
        }
      }

      if (lastError) {
        console.warn("LakiPay API notice:", lastError);
      }

      // Check if direct merchant URL is provided in environment variables
      const configuredDirectUrl = process.env.LAKIPAY_DIRECT_URL || process.env.LAKIPAY_CHECKOUT_URL;
      if (configuredDirectUrl && configuredDirectUrl.startsWith('http')) {
        const separator = configuredDirectUrl.includes('?') ? '&' : '?';
        const finalCheckoutUrl = configuredDirectUrl.includes('amount=') 
          ? configuredDirectUrl 
          : `${configuredDirectUrl}${separator}amount=${numAmount}&reference=${tx_ref}&description=${encodeURIComponent(title || 'Course')}`;

        return NextResponse.json({ checkoutUrl: finalCheckoutUrl, reference: tx_ref });
      }

      return NextResponse.json({ 
        error: lastError || 'የLakiPay ቁልፎች (LAKIPAY_PUBLIC_KEY / LAKIPAY_SECRET_KEY) አልተገኙም። እባክዎ Vercel ወይም .env.local ላይ Environment Variables መቀመጣቸውን ያረጋግጡ።' 
      }, { status: 400 });
    }

    // 2. PAYPAL INTEGRATION
    if (selectedMethod === 'paypal') {
      const paypalDirectUrl = process.env.PAYPAL_DIRECT_URL || process.env.PAYPAL_ME_URL || process.env.PAYPAL_CHECKOUT_URL;
      if (paypalDirectUrl && paypalDirectUrl.startsWith('http')) {
        return NextResponse.json({ checkoutUrl: paypalDirectUrl, reference: tx_ref });
      }

      const PAYPAL_CLIENT_ID = process.env.PAYPAL_CLIENT_ID || process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID;
      const PAYPAL_SECRET = process.env.PAYPAL_CLIENT_SECRET || process.env.PAYPAL_SECRET_KEY || process.env.PAYPAL_SECRET;

      if (PAYPAL_CLIENT_ID && PAYPAL_SECRET) {
        try {
          const isSandbox = process.env.PAYPAL_MODE === 'sandbox';
          const baseUrl = isSandbox ? 'https://api-m.sandbox.paypal.com' : 'https://api-m.paypal.com';
          const auth = Buffer.from(`${PAYPAL_CLIENT_ID}:${PAYPAL_SECRET}`).toString('base64');
          
          const tokenRes = await fetch(`${baseUrl}/v1/oauth2/token`, {
            method: 'POST',
            headers: {
              'Authorization': `Basic ${auth}`,
              'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: 'grant_type=client_credentials'
          });
          const tokenData = await tokenRes.json();

          if (tokenData.access_token) {
            const usdPrice = (Number(numericPrice) / 125).toFixed(2);
            const orderRes = await fetch(`${baseUrl}/v2/checkout/orders`, {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${tokenData.access_token}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                intent: 'CAPTURE',
                purchase_units: [{
                  reference_id: tx_ref,
                  description: title,
                  amount: { currency_code: 'USD', value: usdPrice }
                }],
                application_context: {
                  brand_name: 'Tsehay Campus',
                  return_url: `${origin}/dashboard?success=true&course=${courseId}`,
                  cancel_url: `${origin}/courses`
                }
              })
            });
            const orderData = await orderRes.json();
            const approveLink = orderData.links?.find((l: any) => l.rel === 'approve')?.href;

            if (approveLink) {
              return NextResponse.json({ checkoutUrl: approveLink, reference: tx_ref });
            }
          }
        } catch (paypalErr: any) {
          console.error("PayPal Error:", paypalErr);
          return NextResponse.json({ error: `PayPal Error: ${paypalErr.message}` }, { status: 400 });
        }
      }
    }

    // 3. NOWPAYMENTS (Crypto)
    if (selectedMethod === 'nowpayments' || selectedMethod === 'crypto') {
      const nowDirectUrl = process.env.NOWPAYMENTS_DIRECT_URL || process.env.NOWPAYMENTS_CHECKOUT_URL;
      if (nowDirectUrl && nowDirectUrl.startsWith('http')) {
        return NextResponse.json({ checkoutUrl: nowDirectUrl, reference: tx_ref });
      }

      const NOWPAYMENTS_API_KEY = (
        process.env.NOWPAYMENTS_API_KEY || 
        process.env.NOW_PAYMENTS_API_KEY || 
        process.env.NOWPAYMENT_API_KEY || 
        process.env.NEXT_PUBLIC_NOWPAYMENTS_API_KEY ||
        ''
      ).replace(/['"]/g, '').trim();

      if (NOWPAYMENTS_API_KEY) {
        try {
          const usdPrice = (Number(numericPrice) / 125).toFixed(2);
          const nowRes = await fetch('https://api.nowpayments.io/v1/invoice', {
            method: 'POST',
            headers: {
              'x-api-key': NOWPAYMENTS_API_KEY,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              price_amount: Number(usdPrice) > 1 ? Number(usdPrice) : 5.00,
              price_currency: 'usd',
              order_id: tx_ref,
              order_description: title || 'Tsehay Campus Course',
              ipn_callback_url: `${origin}/api/webhook/nowpayments`,
              success_url: `${origin}/dashboard?success=true&course=${courseId}`,
              cancel_url: `${origin}/courses`
            })
          });

          const nowData = await nowRes.json();
          const checkoutUrl = nowData.invoice_url || nowData.url;
          if (checkoutUrl) {
            return NextResponse.json({ checkoutUrl, reference: tx_ref });
          }

          if (nowData.message || nowData.error) {
            return NextResponse.json({ error: `NOWPayments: ${nowData.message || nowData.error}` }, { status: 400 });
          }
        } catch (nowErr: any) {
          console.error("NOWPayments Error:", nowErr);
          return NextResponse.json({ error: `NOWPayments Error: ${nowErr.message}` }, { status: 400 });
        }
      }
    }

    return NextResponse.json({ 
      error: 'የክፍያ ቁልፎች በ Vercel ላይ በደንብ አልተገኙም። እባክዎ Vercel ላይ Environment Variables መቀመጣቸውን እና Redeploy መደረጉን ያረጋግጡ።' 
    }, { status: 400 });

  } catch (error: any) {
    console.error("Payment API Error:", error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
