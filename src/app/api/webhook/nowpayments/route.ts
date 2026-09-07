import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { supabaseServer } from '@/lib/supabase/server';

export async function POST(request: Request) {
  try {
    const rawBody = await request.text();
    const sigHeader = request.headers.get('x-nowpayments-sig');
    const secret = (process.env.NOWPAYMENTS_IPN_SECRET || '').trim();

    // Mandatory signature verification
    if (!secret) {
      console.error("NOWPayments Error: IPN secret is not configured on server.");
      return NextResponse.json({ error: 'Server webhook configuration error' }, { status: 500 });
    }

    if (!sigHeader) {
      console.warn("NOWPayments Warning: Missing signature header.");
      return NextResponse.json({ error: 'Missing signature header' }, { status: 401 });
    }

    const payload = JSON.parse(rawBody);
    const sortedKeys = Object.keys(payload).sort();
    const sortedPayload: Record<string, any> = {};
    for (const key of sortedKeys) {
      sortedPayload[key] = payload[key];
    }
    const sortedString = JSON.stringify(sortedPayload);
    const hmac = crypto.createHmac('sha512', secret).update(sortedString).digest('hex');

    if (hmac !== sigHeader) {
      console.error("Invalid NOWPayments IPN Signature");
      return NextResponse.json({ error: 'Invalid Signature' }, { status: 401 });
    }

    const event = payload;

    if (event.payment_status === 'finished' || event.payment_status === 'confirmed') {
      const tx_ref = event.order_id;
      if (tx_ref) {
        let courseId = '';
        let userId = '';

        if (tx_ref.includes('_')) {
          const parts = tx_ref.split('_');
          if (parts[0] === 'REF') {
            courseId = parts[1];
            userId = parts[2];
          } else {
            courseId = parts[2];
            userId = parts[3];
          }
        }

        if (!courseId || !userId) {
          try {
            const { data: pendingDoc } = await supabaseServer
              .from('pending_payments')
              .select('*')
              .eq('id', tx_ref)
              .maybeSingle();

            if (pendingDoc) {
              courseId = pendingDoc.course_id || pendingDoc.courseId;
              userId = pendingDoc.user_id || pendingDoc.userId;
            }
          } catch (dbErr) {
            console.error("Supabase lookup error in nowpayments webhook:", dbErr);
          }
        }

        if (userId && userId !== 'anonymous' && courseId) {
          try {
            await supabaseServer.from('enrollments').upsert({
              id: `${userId}_${courseId}`,
              user_id: userId,
              course_id: courseId,
              tx_ref,
              amount: event.price_amount || event.pay_amount || 0,
              payment_method: 'crypto',
              status: 'active',
              created_at: new Date().toISOString()
            });

            console.log(`NOWPayments: Granted course ${courseId} to user ${userId}`);
          } catch (err) {
            console.error("Error saving enrollment in NOWPayments webhook:", err);
          }
        }
      }
      return NextResponse.json({ status: 'success' }, { status: 200 });
    }

    return NextResponse.json({ status: 'ignored' }, { status: 200 });

  } catch (error: any) {
    console.error("NOWPayments IPN Error:", error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
