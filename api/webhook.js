import crypto from 'crypto';

export default async function handler(req, res) {
    // 1. የደህንነት ማረጋገጫ፡ POST ሪኮዌስት ብቻ (GET request ብሎክ ይደረጋል)
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    try {
        const body = req.body;
        const headers = req.headers;

        // =========================================================================
        // ሀ. CHAPA እና TELEBIRR ማረጋገጫ (Chapa Webhook)
        // =========================================================================
        if (headers['chapa-signature'] || headers['x-chapa-signature']) {
            const CHAPA_SECRET = process.env.CHAPA_SECRET_KEY;
            if (!CHAPA_SECRET) throw new Error("Chapa Secret Key is missing in Vercel.");

            const hash = crypto.createHmac('sha256', CHAPA_SECRET).update(JSON.stringify(body)).digest('hex');
            
            if (hash === headers['chapa-signature'] || hash === headers['x-chapa-signature']) {
                if (body.event === 'charge.success' && body.status === 'success') {
                    return await unlockCourse(body.tx_ref, res, "Chapa/Telebirr");
                }
                return res.status(200).json({ message: "Chapa event ignored (Not a success event)." });
            } else {
                console.error("🚨 SECURITY ALERT: Invalid Chapa Signature Detected!");
                return res.status(401).json({ error: "Invalid signature! Intrusion attempt logged." });
            }
        }

        // =========================================================================
        // ለ. CRYPTO ክፍያ ማረጋገጫ (NowPayments Webhook / IPN)
        // =========================================================================
        else if (headers['x-nowpayments-sig']) {
            const NOWPAYMENTS_SECRET = process.env.NOWPAYMENTS_IPN_SECRET; // Vercel ላይ የሚደበቅ ቁልፍ
            if (!NOWPAYMENTS_SECRET) throw new Error("NowPayments IPN Secret is missing in Vercel.");
            
            // የ NowPayments ፊርማ (HMAC-SHA512) ማረጋገጫ ሎጂክ
            const sortedBody = Object.keys(body).sort().reduce((acc, key) => {
                if (key !== 'id') acc[key] = body[key];
                return acc;
            }, {});
            const hash = crypto.createHmac('sha512', NOWPAYMENTS_SECRET).update(JSON.stringify(sortedBody)).digest('hex');

            // ፊርማው ትክክል ከሆነ እና ክፍያው ከተጠናቀቀ
            if (hash === headers['x-nowpayments-sig']) {
                if (body.payment_status === 'finished') {
                    return await unlockCourse(body.order_id, res, "Crypto (USDT/BTC)");
                }
                return res.status(200).json({ message: "Crypto event ignored (Status is not finished yet)." });
            } else {
                console.error("🚨 SECURITY ALERT: Invalid Crypto Signature Detected!");
                return res.status(401).json({ error: "Invalid crypto signature!" });
            }
        }

        // =========================================================================
        // ሐ. PAYPAL ማረጋገጫ (PayPal Webhook)
        // =========================================================================
        else if (headers['paypal-transmission-id']) {
            // ማሳሰቢያ፡ የ PayPal ፊርማ ማረጋገጫ የ PayPal API Certificate ማውረድ ስለሚጠይቅ ትንሽ ይረዝማል።
            // ለአሁን ግን ትክክለኛው የ Order Approved መልዕክት መምጣቱን ቼክ እናደርጋለን።
            if (body.event_type === 'CHECKOUT.ORDER.APPROVED' || body.event_type === 'PAYMENT.CAPTURE.COMPLETED') {
                const tx_ref = body.resource.custom_id; 
                const orderId = body.resource.id;
                
                if (tx_ref && orderId) {
                    try {
                        const CLIENT_ID = process.env.PAYPAL_CLIENT_ID;
                        const CLIENT_SECRET = process.env.PAYPAL_CLIENT_SECRET;
                        const auth = Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64');
                        
                        const tokenResponse = await fetch('https://api-m.paypal.com/v1/oauth2/token', {
                            method: 'POST',
                            body: 'grant_type=client_credentials',
                            headers: { 'Authorization': `Basic ${auth}`, 'Content-Type': 'application/x-www-form-urlencoded' }
                        });
                        const tokenData = await tokenResponse.json();
                        
                        if (tokenData.access_token) {
                            const verifyResponse = await fetch(`https://api-m.paypal.com/v2/checkout/orders/${orderId}`, {
                                headers: { 'Authorization': `Bearer ${tokenData.access_token}` }
                            });
                            const verifyData = await verifyResponse.json();

                            if (verifyData.status === 'COMPLETED' || verifyData.status === 'APPROVED') {
                                return await unlockCourse(tx_ref, res, "PayPal/Card");
                            } else {
                                console.error("🚨 SECURITY ALERT: PayPal Order not completed. Status:", verifyData.status);
                            }
                        }
                    } catch (err) {
                        console.error("PayPal Verification Failed:", err);
                    }
                }
            }
            return res.status(200).json({ message: "PayPal event ignored." });
        }

        // =========================================================================
        // ያልታወቀ ምንጭ (Unknown Provider)
        // =========================================================================
        else {
            console.error("🚨 SECURITY ALERT: Webhook received from unknown source.");
            return res.status(400).json({ error: "Unknown Webhook Provider." });
        }

    } catch (error) {
        console.error("Webhook Processing Error:", error);
        return res.status(500).json({ error: 'Webhook processing failed.' });
    }
}

// =========================================================================
// የጋራ ፈንክሽን፡ ኮርሱን በዳታቤዝ ውስጥ መክፈቻ (Helper Function)
// =========================================================================
async function unlockCourse(tx_ref, res, providerName) {
    if (!tx_ref) return res.status(400).json({ error: "Transaction Reference (tx_ref) is missing." });
    
    const parts = tx_ref.split('-');
    
    // የኛ ትክክለኛ መለዮ (tsehay-courseId-userId-timestamp) መሆኑን ማረጋገጥ
    if (parts[0] === 'tsehay' && parts.length >= 4) {
        const courseId = parts[1];
        const userId = parts[2];
        
        console.log(`✅ SUCCESS: User ${userId} paid for Course ${courseId} via ${providerName}. Opening course...`);
        
        // =========================================================================
        // ዳታቤዝ ውስጥ መመዝገብ (Firebase Admin SDK)
        // =========================================================================
        // TODO: Initialize Firebase Admin and Set Document
        // const db = admin.firestore();
        // await db.collection('artifacts').doc('tsehaycampus-e1a6d').collection('users').doc(userId).collection('enrollments').doc(courseId).set({
        //    courseId: courseId,
        //    enrolledAt: new Date().toISOString(),
        //    paymentType: providerName,
        //    status: 'active',
        //    transactionId: tx_ref
        // });

        return res.status(200).json({ message: `Successfully unlocked course for student via ${providerName}!` });
    } else {
        console.error(`🚨 ALERT: Invalid tx_ref format received: ${tx_ref}`);
        return res.status(400).json({ error: "Invalid transaction reference format." });
    }
}