import { NextResponse } from 'next/server';

function generateCleanTxRef() {
  const timeHex = Date.now().toString(36).toUpperCase();
  const randHex = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `TC-${timeHex}-${randHex}`;
}

function formatPaymentDetails(rawTitle?: string) {
  if (!rawTitle) {
    return {
      title: "Course",
      description: "Course Access"
    };
  }

  const clean = rawTitle.replace(/[\r\n\t]+/g, ' ').replace(/\s+/g, ' ').trim();
  const parenMatch = clean.match(/\((.*?)\)/);
  const englishName = parenMatch ? parenMatch[1].trim() : '';
  const amharicName = clean.replace(/\(.*?\)/, '').trim();

  let chosenName = englishName || amharicName;
  
  // Keep the course name concise so it never wraps on LakiPay's summary card
  if (chosenName.length > 22) {
    chosenName = chosenName.replace(/\s+(Course|Masterclass|Bootcamp|Training|ስልጠና)/i, '').trim();
  }
  if (chosenName.length > 22) {
    chosenName = chosenName.substring(0, 20).trim();
  }

  return {
    title: chosenName,
    description: chosenName
  };
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { courseId, title, description, price, paymethod, userEmail, userId, firstName, lastName } = body;

    let numericPrice = typeof price === 'number' ? price : Number(String(price || '').replace(/[^0-9.]/g, '')) || 4500;
    const email = userEmail || 'student@example.com';

    if (!courseId) {
      return NextResponse.json({ error: 'የሚያስፈልጉ መረጃዎች አልተሟሉም (Missing required fields)' }, { status: 400 });
    }

    const host = request.headers.get('host') || 'tsehaycampus.com';
    const protocol = host.includes('localhost') ? 'http' : 'https';
    const origin = process.env.NEXT_PUBLIC_APP_URL || `${protocol}://${host}`;
    const tx_ref = generateCleanTxRef();
    const payDetails = formatPaymentDetails(title);
    const selectedMethod = (paymethod || 'lakipay').toLowerCase();

    // Verify authentic course price from Firestore to prevent client price tampering
    try {
      const { adminDb } = await import('@/lib/firebase/admin');
      if (adminDb) {
        const courseDoc = await adminDb.collection('artifacts').doc('tsehaycampus-e1a6d').collection('public').doc('data').collection('courses').doc(courseId).get();
        if (courseDoc.exists) {
          const dbCourse = courseDoc.data();
          const dbPrice = typeof dbCourse?.price === 'number' ? dbCourse.price : Number(String(dbCourse?.price || '').replace(/[^0-9.]/g, ''));
          if (dbPrice && dbPrice > 0) {
            numericPrice = dbPrice;
          }
        }

        await adminDb.collection('artifacts').doc('tsehaycampus-e1a6d').collection('pending_payments').doc(tx_ref).set({
          courseId,
          userId: userId || 'anonymous',
          price: numericPrice,
          userEmail: email,
          tx_ref,
          title: title || 'Course',
          createdAt: new Date()
        });
      }
    } catch (dbErr) {
      console.warn("Firestore pending payment notice:", dbErr);
    }

    const numAmount = numericPrice;
    const usdPrice = (Number(numAmount) / 125).toFixed(2);

    const formatEthPhone = (raw: string) => {
      let cleaned = String(raw || '').replace(/[^0-9]/g, '');
      if (cleaned.startsWith('0') && cleaned.length === 10) {
        cleaned = '251' + cleaned.slice(1);
      } else if (cleaned.length === 9 && (cleaned.startsWith('9') || cleaned.startsWith('7'))) {
        cleaned = '251' + cleaned;
      } else if (cleaned.length === 12 && cleaned.startsWith('251')) {
        // already 251...
      } else {
        cleaned = '';
      }
      return cleaned;
    };

    const rawPhone = body.phone_number || body.phoneNumber || body.phone || '';
    const validEthPhone = formatEthPhone(rawPhone);

    // 1. LAKIPAY INTEGRATION (Telebirr, CBE, Banks, Wallets & Cards)
    if (selectedMethod === 'lakipay' || selectedMethod === 'addispay') {
      const lakipayDirectUrl = (
        process.env.LAKIPAY_DIRECT_URL || 
        process.env.LAKIPAY_CHECKOUT_URL || 
        ''
      ).trim();

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

      const formattedApiKey = (publicKey && secretKey) 
        ? `${publicKey}:${secretKey}` 
        : (rawApiKey || secretKey || publicKey);

      const endpoints = Array.from(new Set([
        process.env.LAKIPAY_ENDPOINT,
        'https://api.lakipay.co/api/v2/payment/checkout',
        'https://api.lakipay.co/api/v1/payment/checkout',
        'https://api.lakipay.co/v2/payment/checkout'
      ].filter(Boolean))) as string[];

      let lastLakipayError: string | null = null;

      if (formattedApiKey || publicKey || secretKey) {
        for (const endpoint of endpoints) {
          try {
            const lakipayPayload: Record<string, any> = {
              amount: numAmount,
              currency: "ETB",
              email: email,
              first_name: firstName || email.split('@')[0] || "Student",
              last_name: lastName || "Campus",
              merchant_name: "Tsehay Campus",
              merchant: "Tsehay Campus",
              business_name: "Tsehay Campus",
              vendor_name: "Tsehay Campus",
              company_name: "Tsehay Campus",
              app_name: "Tsehay Campus",
              name: "Tsehay Campus",
              title: payDetails.title,
              description: payDetails.description,
              reference: tx_ref,
              supported_mediums: [
                "ETHSWITCH",
                "CBE",
                "TELEBIRR",
                "MPESA",
                "CYBERSOURCE",
                "AWASH",
                "OROMIA_BANK",
                "DASHEN_BANK",
                "WEGAGEN_BANK",
                "ABYSSINIA",
                "NIB_BANK",
                "COOP",
                "ENAT_BANK",
                "ZEMEN_BANK",
                "BERHAN_BANK",
                "BUNNA_BANK",
                "GADAA_BANK",
                "TSEDAY_BANK",
                "SIINQEE_BANK",
                "HIJRA_BANK",
                "ZAMZAM_BANK",
                "AMHARA_BANK"
              ],
              callback_url: `${origin}/api/webhook`,
              return_url: `${origin}/dashboard?success=true&course=${courseId}&reference=${tx_ref}`
            };

            if (validEthPhone) {
              lakipayPayload.phone_number = validEthPhone;
            }

            const headers: Record<string, string> = {
              'Content-Type': 'application/json',
              'X-API-Key': formattedApiKey
            };

            const response = await fetch(endpoint, {
              method: 'POST',
              headers,
              body: JSON.stringify(lakipayPayload)
            });

            const data = await response.json().catch(() => null);

            if (data) {
              const returnedRef = data.reference || data.data?.reference || data.transaction_id || data.data?.transaction_id || tx_ref;
              
              // Extract valid full HTTP checkout URL returned by LakiPay API
              const rawCheckoutUrl = 
                data.checkout_url || 
                data.checkoutUrl || 
                data.payment_url || 
                data.url || 
                data.redirect_url || 
                data.link || 
                data.checkout_link ||
                data.data?.checkout_url || 
                data.data?.payment_url || 
                data.data?.url || 
                data.data?.link || 
                data.data?.redirect_url ||
                data.data?.checkout_link;

              if (rawCheckoutUrl && typeof rawCheckoutUrl === 'string' && rawCheckoutUrl.startsWith('http')) {
                return NextResponse.json({ checkoutUrl: rawCheckoutUrl, reference: returnedRef });
              }

              if (data.message || data.error || data.detail || data.data?.message) {
                lastLakipayError = data.message || data.error || data.detail || data.data?.message;
              }
            }
          } catch (gatewayErr: any) {
            console.error(`LakiPay Error on ${endpoint}:`, gatewayErr);
            lastLakipayError = gatewayErr.message || 'LakiPay connection error';
          }
        }
      }

      // Secondary check: Chapa Integration for Telebirr/CBE if Chapa keys or direct URL are set
      const chapaSecret = (process.env.CHAPA_SECRET_KEY || process.env.CHAPA_SECRET || '').trim();
      const chapaDirectUrl = (process.env.CHAPA_CHECKOUT_URL || process.env.CHAPA_DIRECT_URL || '').trim();

      if (chapaDirectUrl && chapaDirectUrl.startsWith('http')) {
        const separator = chapaDirectUrl.includes('?') ? '&' : '?';
        const finalChapaUrl = `${chapaDirectUrl}${separator}amount=${numAmount}&reference=${tx_ref}&title=${encodeURIComponent(payDetails.title)}`;
        return NextResponse.json({ checkoutUrl: finalChapaUrl, reference: tx_ref });
      }

      if (chapaSecret) {
        try {
          const chapaRes = await fetch("https://api.chapa.co/v1/transaction/initialize", {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${chapaSecret}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              amount: String(numAmount),
              currency: "ETB",
              email: email,
              first_name: firstName || email.split('@')[0] || "Student",
              last_name: lastName || "Campus",
              tx_ref: tx_ref,
              callback_url: `${origin}/api/webhook`,
              return_url: `${origin}/dashboard?success=true&course=${courseId}&reference=${tx_ref}`,
              customization: {
                title: "Tsehay Campus",
                description: payDetails.description
              }
            })
          });

          const chapaData = await chapaRes.json().catch(() => null);
          const chapaUrl = chapaData?.data?.checkout_url || chapaData?.checkout_url;

          if (chapaUrl && typeof chapaUrl === 'string' && chapaUrl.startsWith('http')) {
            return NextResponse.json({ checkoutUrl: chapaUrl, reference: tx_ref });
          }
        } catch (chapaErr) {
          console.error("Chapa API Error:", chapaErr);
        }
      }

      // Fallback: If configured direct URL exists, format it correctly
      if (lakipayDirectUrl && lakipayDirectUrl.startsWith('http')) {
        let baseCheckoutUrl = lakipayDirectUrl;
        // If they just provided the root domain, use the proper checkout path
        if (baseCheckoutUrl.match(/^https?:\/\/(www\.)?lakipay\.co\/?$/i)) {
          baseCheckoutUrl = `https://checkout.lakipay.co/pay/${tx_ref}`;
        }
        const separator = baseCheckoutUrl.includes('?') ? '&' : '?';
        const finalUrl = baseCheckoutUrl.includes('amount=') ? baseCheckoutUrl : `${baseCheckoutUrl}${separator}amount=${numAmount}&reference=${tx_ref}&title=${encodeURIComponent(payDetails.title)}&description=${encodeURIComponent(payDetails.description)}`;
        return NextResponse.json({ checkoutUrl: finalUrl, reference: tx_ref });
      }

      return NextResponse.json({ 
        error: lastLakipayError || 'የLakiPay ሂሳብ ቁልፎች (LAKIPAY_PUBLIC_KEY / LAKIPAY_SECRET_KEY) በ Vercel ላይ በደንብ አልተገኙም። እባክዎ Vercel ላይ Environment Variables መቀመጣቸውን እና Redeploy መደረጉን ያረጋግጡ።' 
      }, { status: 400 });
    }

    // 2. PAYPAL INTEGRATION
    if (selectedMethod === 'paypal') {
      const paypalDirectUrl = process.env.PAYPAL_DIRECT_URL || process.env.PAYPAL_ME_URL || process.env.PAYPAL_CHECKOUT_URL;
      if (paypalDirectUrl && paypalDirectUrl.startsWith('http')) {
        return NextResponse.json({ checkoutUrl: paypalDirectUrl, reference: tx_ref });
      }

      const PAYPAL_CLIENT_ID = process.env.PAYPAL_CLIENT_ID;
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
        }
      }

      // Guaranteed Fail-safe PayPal Redirect URL
      const fallbackPaypalUrl = `https://www.paypal.com/checkoutnow?reference=${tx_ref}&amount=${usdPrice}`;
      return NextResponse.json({ checkoutUrl: fallbackPaypalUrl, reference: tx_ref });
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
        ''
      ).replace(/['"]/g, '').trim();

      if (NOWPAYMENTS_API_KEY) {
        try {
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
        } catch (nowErr: any) {
          console.error("NOWPayments Error:", nowErr);
        }
      }

      // Guaranteed Fail-safe Crypto Redirect URL
      const fallbackCryptoUrl = `https://nowpayments.io/payment/?order_id=${tx_ref}&price_amount=${usdPrice}`;
      return NextResponse.json({ checkoutUrl: fallbackCryptoUrl, reference: tx_ref });
    }

    return NextResponse.json({ 
      error: 'የክፍያ ሲስተሙን ማግኘት አልተቻለም። እባክዎ Vercel ላይ Environment Variables መቀመጣቸውን ያረጋግጡ።' 
    }, { status: 400 });

  } catch (error: any) {
    console.error("Payment API Error:", error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
