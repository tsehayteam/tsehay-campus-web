export default async function handler(req, res) {
  // CORS መፍቀጃ (ዌብሳይትህ ከ Vercel ጋር እንዲነጋገር)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

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