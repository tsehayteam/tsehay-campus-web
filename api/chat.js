import admin from 'firebase-admin';

if (!admin.apps.length) {
    try {
        if (process.env.FIREBASE_SERVICE_ACCOUNT) {
            const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
            admin.initializeApp({
                credential: admin.credential.cert(serviceAccount)
            });
        } else {
            // Fallback initialization with Project ID for token verification
            admin.initializeApp({
                projectId: 'tsehaycampus-e1a6d'
            });
        }
    } catch(e) {
        console.error("Firebase admin init error", e);
    }
}

// In-memory rate limiting map (per Vercel instance)
const rateLimitMap = new Map();
const RATE_LIMIT_WINDOW_MS = 60000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 10; // 10 requests per minute per user

export default async function handler(req, res) {
  // CORS validation
  const allowedOrigins = ['https://tsehaycampus.com', 'https://www.tsehaycampus.com', 'http://localhost:8080', 'http://localhost:3000', 'http://127.0.0.1:8080'];
  const origin = req.headers.origin;
  
  if (allowedOrigins.includes(origin)) {
      res.setHeader('Access-Control-Allow-Origin', origin);
  } else {
      res.setHeader('Access-Control-Allow-Origin', allowedOrigins[0]);
  }
  
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  // Security: Token Verification
  const authHeader = req.headers.authorization;
  let userId;

  if (authHeader && authHeader.startsWith('Bearer ') && authHeader !== 'Bearer ') {
      const idToken = authHeader.split('Bearer ')[1];
      try {
          const decodedToken = await admin.auth().verifyIdToken(idToken);
          userId = decodedToken.uid;
      } catch (error) {
          return res.status(401).json({ error: "Unauthorized: Token verification failed." });
      }
  } else {
      // Fallback to IP address for anonymous users
      userId = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'anonymous_user';
  }

  // Security: Rate Limiting
  const now = Date.now();
  if (!rateLimitMap.has(userId)) {
      rateLimitMap.set(userId, { count: 1, startTime: now });
  } else {
      const rateData = rateLimitMap.get(userId);
      if (now - rateData.startTime > RATE_LIMIT_WINDOW_MS) {
          rateLimitMap.set(userId, { count: 1, startTime: now });
      } else {
          rateData.count++;
          if (rateData.count > MAX_REQUESTS_PER_WINDOW) {
              return res.status(429).json({ error: "Too many requests. Please wait a minute before sending another message." });
          }
      }
  }

  try {
    let apiKey = process.env.GEMINI_API_KEY || "";
    apiKey = apiKey.trim().replace(/^["']|["']$/g, '');

    if (!apiKey) {
        return res.status(500).json({ error: "Vercel ላይ API Key አልገባም!" });
    }

    const { prompt, systemInstruction } = req.body;
    
    // 💡 ሚስጥር 1፡ ልክ በ Static ዌብሳይትህ ላይ እንደሰራው፣ መመሪያውን እና ጥያቄውን በአንድ Text እናዋህደዋለን!
    const combinedMessage = `[ጥብቅ መመሪያ: ${systemInstruction || 'አንተ የ Tsehay Campus ረዳት ነህ።'}]\n\nየተጠቃሚ ጥያቄ: ${prompt}`;

    const payload = { 
        contents: [{ parts: [{ text: combinedMessage }] }]
    };

    // 💡 ሚስጥር 2፡ የሞዴሉን ስም ልክ በ Static ዌብሳይትህ ላይ ወደሰራው "gemini-flash-latest" ቀይረነዋል!
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${apiKey}`;

    const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });

    const data = await response.json();

    if (!response.ok) {
        return res.status(500).json({ 
            error: data.error?.message || JSON.stringify(data.error) || "የ Gemini API ስህተት አጋጥሟል" 
        });
    }

    return res.status(200).json(data);

  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}