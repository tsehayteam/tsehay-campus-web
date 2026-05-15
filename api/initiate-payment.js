/**
 * Baara in ye PayPal dambɛ ni Chapa integration de ye.
 * (ይህ ፋይል ለፔፓል እና ለቻፓ ክፍያ አስጀማሪ ነው)
 */
export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    try {
        const { courseId, title, amount, method, userId, email, name, callbackUrl } = req.body;
        const tx_ref = `tsehay-${courseId}-${userId}-${Date.now()}`;

        // 1. CHAPA & TELEBIRR (🇪🇹)
        if (method === 'chapa' || method === 'telebirr') {
            const CHAPA_SECRET = process.env.CHAPA_SECRET_KEY;
            const response = await fetch('https://api.chapa.co/v1/transaction/initialize', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${CHAPA_SECRET}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    amount: amount.toString(), currency: 'ETB', email: email || 'student@tsehay.com',
                    first_name: name || 'Student', tx_ref: tx_ref, return_url: callbackUrl
                })
            });
            const data = await response.json();
            return res.status(200).json({ checkout_url: data.data.checkout_url });
        }

        // 2. PAYPAL & CARDS (🌍) - 💡 ይሄ ነው የተስተካከለው!
        else if (method === 'paypal') {
            const CLIENT_ID = process.env.PAYPAL_CLIENT_ID;
            const CLIENT_SECRET = process.env.PAYPAL_CLIENT_SECRET;
            
            // Access Token in bɛ bɔ PayPal fɛ
            const auth = Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64');
            const tokenResponse = await fetch('https://api-m.paypal.com/v1/oauth2/token', {
                method: 'POST',
                body: 'grant_type=client_credentials',
                headers: { 'Authorization': `Basic ${auth}`, 'Content-Type': 'application/x-www-form-urlencoded' }
            });
            const { access_token } = await tokenResponse.json();

            // Order in bɛ dila (ትዕዛዝ መፍጠሪያ)
            const usdAmount = (parseFloat(amount) / 115).toFixed(2); // ብር ወደ ዶላር
            const orderResponse = await fetch('https://api-m.paypal.com/v2/checkout/orders', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${access_token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    intent: 'CAPTURE',
                    purchase_units: [{
                        amount: { currency_code: 'USD', value: usdAmount },
                        description: title,
                        custom_id: tx_ref // 💡 ለ Webhook ማሳወቂያ በጣም ወሳኝ ነው
                    }],
                    application_context: { 
                        return_url: callbackUrl, 
                        cancel_url: callbackUrl,
                        brand_name: "Tsehay Campus",
                        user_action: "PAY_NOW"
                    }
                })
            });
            const orderData = await orderResponse.json();
            
            if (orderData.links) {
                const approveLink = orderData.links.find(link => link.rel === 'approve').href;
                return res.status(200).json({ checkout_url: approveLink });
            } else {
                throw new Error("PayPal order failed: " + JSON.stringify(orderData));
            }
        }

        // 3. CRYPTO (🪙)
        else if (method === 'crypto') {
            const CRYPTO_API_KEY = process.env.NOWPAYMENTS_API_KEY;
            const usdAmount = (parseFloat(amount) / 115).toFixed(2);
            const response = await fetch('https://api.nowpayments.io/v1/invoice', {
                method: 'POST',
                headers: { 'x-api-key': CRYPTO_API_KEY, 'Content-Type': 'application/json' },
                body: JSON.stringify({ price_amount: usdAmount, price_currency: "usd", order_id: tx_ref, success_url: callbackUrl })
            });
            const data = await response.json();
            return res.status(200).json({ checkout_url: data.invoice_url });
        }

    } catch (error) {
        console.error("Server Logic Error:", error);
        return res.status(500).json({ error: "አገልጋዩ ላይ ስህተት ተፈጥሯል፡ " + error.message });
    }
}