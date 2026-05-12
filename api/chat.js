export default async function handler(req, res) {
  // CORS መፍቀጃ
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return res.status(500).json({ error: "Vercel ላይ API Key አልገባም!" });

    const { prompt, systemInstruction } = req.body;
    
    // 💡 ጓደኛህ በቴሌግራም የላከልህ የ "Payload አወቃቀር" መፍትሄ ይሄ ነው!
    // አንዳንዴ Google የ systemInstruction አወቃቀርን አይቀበልም። ስለዚህ ጥያቄውን እና መመሪያውን እናዋህደዋለን።
    const combinedPrompt = systemInstruction 
        ? `መመሪያ: ${systemInstruction}\n\nጥያቄ: ${prompt}`
        : prompt;

    const payload = {
        contents: [{ parts: [{ text: combinedPrompt }] }]
    };

    // 1. መጀመሪያ በ "gemini-1.5-flash" እንሞክራለን
    let apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
    
    let response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    let data = await response.json();

    // 2. እምቢ ካለ (Error ካመጣ) ወደ አስተማማኙ "gemini-pro" አውቶማቲክ ይቀይራል
    if (!response.ok) {
        apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${apiKey}`;
        response = await fetch(apiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        data = await response.json();
    }
    
    // 3. ሁለቱም እምቢ ካሉ ብቻ ስህተቱን ለተጠቃሚው ያሳውቃል
    if (!response.ok) {
        return res.status(500).json({ error: data.error?.message || "የ Gemini API ስህተት አጋጥሟል" });
    }

    return res.status(200).json(data);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}