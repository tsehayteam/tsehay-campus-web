/**
 * Gemini AI API Backend (Fetch API በመጠቀም)
 * ይህ ፋይል የዌብሳይትህን ጥያቄ ተቀብሎ ወደ Google Gemini ይልካል (Vercel Serverless Function).
 */
module.exports = async function(req, res) {
  // 1. የ Vercel ሴኪዩሪቲ (CORS) እንዳያግደው መፍቀጃ
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // የ POST ጥያቄ (Request) ብቻ እንዲቀበል
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'POST request ብቻ ነው የሚፈቀደው።' });
  }

  try {
    // 2. የ API ኪዩን (Key) ከ Vercel Settings ላይ ይወስዳል
    const apiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;
    
    if (!apiKey) {
      return res.status(500).json({ error: 'የ API Key አልተገኘም! እባክዎ Vercel Settings ላይ ያስገቡ። (Redeploy ማድረጎን አይርሱ)' });
    }

    const { prompt, systemInstruction } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: 'እባክዎ ጥያቄዎን ያስገቡ።' });
    }

    // 3. የ Google Gemini API ሊንክ (Gemini 1.5 Flash model)
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

    // ለ AIው የሚላከው ዳታ (Payload)
    const payload = {
      contents: [{ parts: [{ text: prompt }] }]
    };

    // የ AIው መመሪያ (System Instruction) ካለ መጨመር
    if (systemInstruction) {
      payload.systemInstruction = {
        parts: [{ text: systemInstruction }]
      };
    }

    // 4. ጥያቄውን ወደ Google መላክ
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json();

    if (!response.ok) {
       return res.status(400).json({ error: data.error?.message || 'ከ Google AI ጋር መገናኘት አልተቻለም።' });
    }

    // 5. የተመለሰውን መልስ ለዌብሳይታችን (Frontend) መላክ
    return res.status(200).json(data);

  } catch (error) {
    console.error("AI Error:", error);
    // የኢንተርኔት ወይም የሰርቨር ችግር ካለ ማሳወቅ
    return res.status(500).json({ error: 'የቴክኒክ ችግር! ከ AI አገልጋይ ጋር መገናኘት አልተቻለም።' });
  }
}