import { NextResponse } from 'next/server';

export async function GET() {
  const secretKey = (process.env.LAKIPAY_SECRET_KEY || process.env.NEXT_PUBLIC_LAKIPAY_SECRET_KEY || '').trim().replace(/^["']|["']$/g, '');
  const publicKey = (process.env.LAKIPAY_PUBLIC_KEY || process.env.NEXT_PUBLIC_LAKIPAY_PUBLIC_KEY || '').trim().replace(/^["']|["']$/g, '');
  const rawApiKey = (process.env.LAKIPAY_API_KEY || '').trim().replace(/^["']|["']$/g, '');

  const formattedApiKey = (publicKey && secretKey) 
    ? `${publicKey}:${secretKey}` 
    : (rawApiKey || secretKey || publicKey);

  const endpoints = [
    'https://api.lakipay.co/api/v2/payment/checkout',
    'https://api.lakipay.co/api/v1/payment/checkout',
    'https://api.lakipay.co/v2/payment/checkout',
    'https://api.lakipay.co/api/v2/checkout'
  ];

  const results: any[] = [];

  for (const endpoint of endpoints) {
    try {
      const payload = {
        amount: 4500,
        currency: "ETB",
        reference: `test_ref_${Date.now()}`,
        email: "test@example.com",
        phone_number: "251911234567",
        first_name: "Test",
        last_name: "Student",
        title: "Test Course",
        description: "Test Payment",
        callback_url: "https://tsehaycampus.com/api/webhook",
        return_url: "https://tsehaycampus.com/dashboard?success=true"
      };

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': formattedApiKey,
          'Authorization': `Bearer ${secretKey}`
        },
        body: JSON.stringify(payload)
      });

      const text = await res.text();
      let json = null;
      try { json = JSON.parse(text); } catch (e) {}

      results.push({
        endpoint,
        status: res.status,
        headers: Object.fromEntries(res.headers.entries()),
        response: json || text
      });
    } catch (err: any) {
      results.push({ endpoint, error: err.message });
    }
  }

  return NextResponse.json({
    keysPresent: {
      hasPublicKey: Boolean(publicKey),
      hasSecretKey: Boolean(secretKey),
      publicKeyLength: publicKey.length,
      secretKeyLength: secretKey.length,
      formattedApiKeyPreview: formattedApiKey ? `${formattedApiKey.slice(0, 8)}...` : 'NONE'
    },
    results
  });
}
