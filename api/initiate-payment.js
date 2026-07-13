import admin from 'firebase-admin';

if (!admin.apps.length) {
    try {
        if (process.env.FIREBASE_SERVICE_ACCOUNT) {
            const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
            admin.initializeApp({
                credential: admin.credential.cert(serviceAccount)
            });
        } else {
            admin.initializeApp({ projectId: 'tsehaycampus-e1a6d' });
        }
    } catch(e) {
        console.error("Firebase admin init error", e);
    }
}

export default async function handler(req, res) {
    // 🔒 Strict CORS
    const allowedOrigins = ['https://tsehaycampus.com', 'https://www.tsehaycampus.com', 'http://localhost:8080', 'http://localhost:3000', 'http://127.0.0.1:8080'];
    const origin = req.headers.origin;
    if (origin && !allowedOrigins.includes(origin)) {
        return res.status(403).json({ error: 'Forbidden Origin' });
    }
    if (origin) res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (req.method === 'OPTIONS') return res.status(200).end();

    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'Unauthorized: Missing Authentication Token' });
        }
        

        // 🔒 1. Verify Authentication Token Securely
        const decodedToken = await admin.auth().verifyIdToken(authHeader.split('Bearer ')[1]);
        const verifiedUserId = decodedToken.uid;
        
        const { courseId, title, method, email, name, callbackUrl } = req.body;
        
        // 🔒 Input Validation
        if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ error: 'Invalid email' });
        if (!name || name.length < 2 || name.length > 50) return res.status(400).json({ error: 'Invalid name' });
        if (!courseId || typeof courseId !== 'string') return res.status(400).json({ error: 'Invalid course ID' });
        
        // 🔒 2. Fetch Actual Price from Database (Prevent Price Manipulation)
        const db = admin.firestore();
        const courseDoc = await db.collection('artifacts').doc('tsehaycampus-e1a6d').collection('public').doc('data').collection('courses').doc(courseId).get();
        
        if (!courseDoc.exists) {
            return res.status(404).json({ error: 'Course not found in database.' });
        }
        
        const actualPrice = courseDoc.data().price;
        if (!actualPrice || parseFloat(actualPrice) <= 0) {
            return res.status(400).json({ error: 'Invalid course price for payment.' });
        }
        
        const amount = parseFloat(actualPrice);
        const tx_ref = `tsehay-${courseId}-${verifiedUserId}-${Date.now()}`;


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
            const EXCHANGE_RATE = parseFloat(process.env.EXCHANGE_RATE || '115');
            const usdAmount = (parseFloat(amount) / EXCHANGE_RATE).toFixed(2); // ብር ወደ ዶላር
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

            const EXCHANGE_RATE = parseFloat(process.env.EXCHANGE_RATE || '115');
            const usdAmount = (parseFloat(amount) / EXCHANGE_RATE).toFixed(2);
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