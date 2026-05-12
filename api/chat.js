export default async function handler(req, res) {
  // 1. የ CORS ፍቃዶችን መጨመር (CORS Fix - ዌብሳይቱ Block እንዳይደረግ)
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  // የ OPTIONS ሪኮዌስት (Preflight) ሲመጣ ማሳለፍ
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // POST Request ብቻ እንዲቀበል መገደብ
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    // ከተማሪው የሚመጣውን ጥያቄ መቀበል
    const { prompt, systemInstruction } = req.body;
    
    // ከ Vercel Environment Variables ላይ ሚስጥራዊውን ቁልፍ ማንበብ
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return res.status(500).json({ error: "API Key is missing in Vercel. እባክዎ Vercel Settings ላይ GEMINI_API_KEY ያስገቡ።" });
    }

    // ትክክለኛው እና ፈጣኑ ሞዴል (Gemini 1.5 Flash)
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

    // ወደ Google Gemini በቀጥታ መላክ
    const googleResponse = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        systemInstruction: systemInstruction ? { parts: [{ text: systemInstruction }] } : undefined
      })
    });

    const data = await googleResponse.json();

    // መልሱን ወደ ዌብሳይታችን መመለስ
    return res.status(200).json(data);

  } catch (error) {
    // ኮዱ ላይ ስህተት ካጋጠመ ለዌብሳይቱ ማሳወቅ
    return res.status(500).json({ error: error.message });
  }
}