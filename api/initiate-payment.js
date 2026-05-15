export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    try {
        const { courseId, title, amount, method, userId, email, name, callbackUrl } = req.body;
        const tx_ref = `tsehay-${courseId}-${userId}-${Date.now()}`;

        // 1. CHAPA & TELEBIRR (🇪🇹)
        if (method === 'chapa' || method === 'telebirr') {
            const CHAPA_SECRET = process.env.CHAPA_SECRET_KEY;
            if (!CHAPA_SECRET) throw new Error("የ ቻፓ ሚስጥራዊ ቁልፍ አልተገኘም!");

            const response = await fetch('https://api.chapa.co/v1/transaction/initialize', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${CHAPA_SECRET}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    amount: amount.toString(), currency: 'ETB', email: email || 'student@tsehay.com',
                    first_name: name || 'Student', tx_ref: tx_ref, return_url: callbackUrl
                })
            });
            const data = await response.json();
            if (data.status === 'success') {
                return res.status(200).json({ checkout_url: data.data.checkout_url });
            } else {
                throw new Error("ከቻፓ ጋር መገናኘት አልተቻለም፡ " + data.message);
            }
        }

        // 2. PAYPAL & CARDS (🌍) - 💡 እውነተኛ (Live) ክፍያ!
        else if (method === 'paypal') {
            const CLIENT_ID = process.env.PAYPAL_CLIENT_ID;
            const CLIENT_SECRET = process.env.PAYPAL_CLIENT_SECRET;
            
            if (!CLIENT_ID || !CLIENT_SECRET) throw new Error("የ PayPal ቁልፎች (Keys) Vercel ላይ አልገቡም!");
            
            // ሀ. Access Token ማምጣት (Live API)
            const auth = Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64');
            const tokenResponse = await fetch('https://api-m.paypal.com/v1/oauth2/token', {
                method: 'POST',
                body: 'grant_type=client_credentials',
                headers: { 'Authorization': `Basic ${auth}`, 'Content-Type': 'application/x-www-form-urlencoded' }
            });
            const tokenData = await tokenResponse.json();
            
            if (!tokenData.access_token) throw new Error("PayPal Authentication Failed! እባክዎ እውነተኛ (Live) ቁልፎችዎን Vercel ላይ ያስገቡ።");

            // ለ. የፔፓል ትዕዛዝ መፍጠር (Live API)
            const usdAmount = (parseFloat(amount) / 115).toFixed(2); // ብር ወደ ዶላር
            const orderResponse = await fetch('https://api-m.paypal.com/v2/checkout/orders', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${tokenData.access_token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    intent: 'CAPTURE',
                    purchase_units: [{
                        amount: { currency_code: 'USD', value: usdAmount },
                        description: title,
                        custom_id: tx_ref 
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
                throw new Error("PayPal order failed.");
            }
        }

        // 3. CRYPTO (🪙)
        else if (method === 'crypto') {
            const CRYPTO_API_KEY = process.env.NOWPAYMENTS_API_KEY;
            if (!CRYPTO_API_KEY) throw new Error("የ ክሪፕቶ API ቁልፍ አልተገኘም!");

            const usdAmount = (parseFloat(amount) / 115).toFixed(2);
            const response = await fetch('https://api.nowpayments.io/v1/invoice', {
                method: 'POST',
                headers: { 'x-api-key': CRYPTO_API_KEY, 'Content-Type': 'application/json' },
                body: JSON.stringify({ price_amount: usdAmount, price_currency: "usd", order_id: tx_ref, success_url: callbackUrl })
            });
            const data = await response.json();
            if (data.invoice_url) {
                return res.status(200).json({ checkout_url: data.invoice_url });
            } else {
                throw new Error("የክሪፕቶ ክፍያ ሊንክ ማመንጨት አልተቻለም።");
            }
        }

        else {
            return res.status(400).json({ error: "ያልታወቀ የክፍያ መንገድ!" });
        }

    } catch (error) {
        console.error("Server Logic Error:", error);
        return res.status(500).json({ error: error.message });
    }
}