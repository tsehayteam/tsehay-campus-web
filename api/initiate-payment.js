export default async function handler(req, res) {
    // 1. የደህንነት ማረጋገጫ፡ POST ሪኮዌስት ብቻ ነው የምንቀበለው
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        // 2. ከተማሪው ዌብሳይት የመጣውን ዳታ መቀበል
        const { courseId, title, amount, method, userId, email, name, callbackUrl } = req.body;

        // 3. ልዩ የክፍያ መለዮ (Transaction ID) መፍጠር
        const tx_ref = `tsehay-${courseId}-${userId}-${Date.now()}`;

        // ==========================================
        // ሎጂክ ሀ፡ Chapa ወይም Telebirr ከተመረጠ
        // ==========================================
        if (method === 'chapa' || method === 'telebirr') {
            const CHAPA_SECRET = process.env.CHAPA_SECRET_KEY;
            
            if (!CHAPA_SECRET) throw new Error("የ ቻፓ ሚስጥራዊ ቁልፍ (Secret Key) አልተገኘም!");

            const payload = {
                amount: amount.toString(),
                currency: 'ETB',
                email: email || 'student@tsehaycampus.com',
                first_name: name || 'Tsehay',
                last_name: 'Student',
                tx_ref: tx_ref,
                return_url: callbackUrl,
                customization: {
                    title: "Tsehay Campus",
                    description: `${title} - የኮርስ ክፍያ`
                }
            };

            const chapaResponse = await fetch('https://api.chapa.co/v1/transaction/initialize', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${CHAPA_SECRET}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });

            const data = await chapaResponse.json();
            
            if (data.status === 'success') {
                return res.status(200).json({ checkout_url: data.data.checkout_url });
            } else {
                throw new Error(data.message || "ከቻፓ ጋር መገናኘት አልተቻለም።");
            }
        }
        
        // ==========================================
        // ሎጂክ ለ፡ PayPal ከተመረጠ
        // ==========================================
        else if (method === 'paypal') {
            return res.status(400).json({ error: "PayPal ክፍያ በአሁኑ ሰዓት በዝግጅት ላይ ነው። እባክዎ በቻፓ ወይም በክሪፕቶ ይሞክሩ።" });
        }

        // ==========================================
        // ሎጂክ ሐ፡ Crypto ከተመረጠ (NowPayments)
        // ==========================================
        else if (method === 'crypto') {
            const CRYPTO_API_KEY = process.env.NOWPAYMENTS_API_KEY;
            
            if (!CRYPTO_API_KEY) throw new Error("የ ክሪፕቶ API ቁልፍ (NOWPAYMENTS_API_KEY) አልተገኘም!");

            // ዶላር ወደ ብር የምንመነዝርበት ሎጂክ (ግምታዊ፡ 1 USD = 115 ETB)
            const usdAmount = (parseFloat(amount) / 115).toFixed(2);

            // 💡 ማሳሰቢያ፡ ተማሪው የሚመቸውን እንዲመርጥ `pay_currency` የሚለው ትዕዛዝ ሙሉ በሙሉ ጠፍቷል!
            const payload = {
                price_amount: usdAmount,
                price_currency: "usd",
                order_id: tx_ref,
                order_description: title,
                success_url: callbackUrl
            };

            const cryptoResponse = await fetch('https://api.nowpayments.io/v1/invoice', {
                method: 'POST',
                headers: {
                    'x-api-key': CRYPTO_API_KEY,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });

            const data = await cryptoResponse.json();
            
            if (data.invoice_url) {
                return res.status(200).json({ checkout_url: data.invoice_url });
            } else {
                throw new Error("የክሪፕቶ ክፍያ ሊንክ ማመንጨት አልተቻለም። NowPayments Wallet ማስገባትዎን ያረጋግጡ።");
            }
        }

        else {
            return res.status(400).json({ error: "ያልታወቀ የክፍያ መንገድ!" });
        }

    } catch (error) {
        console.error("Payment API Error:", error);
        return res.status(500).json({ error: error.message || 'ከክፍያ ሰርቨር ጋር መገናኘት አልተቻለም' });
    }
}