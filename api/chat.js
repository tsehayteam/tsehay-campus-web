export default async function handler(req, res) {
  // CORS መፍቀጃ
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  try {
    // 1. API Key ን ከ Vercel አምጥተን እናጸዳዋለን (Space ወይም Quote ካለው ያጠፋዋል)
    let apiKey = process.env.GEMINI_API_KEY || "";
    apiKey = apiKey.trim().replace(/^["']|["']$/g, '');

    if (!apiKey) {
        return res.status(500).json({ error: "Vercel ላይ API Key አልገባም!" });
    }

    const { prompt, systemInstruction } = req.body;
    
    // 2. መመሪያውን እና ጥያቄውን በአንድ ላይ እናዋህዳለን (Payload Fix)
    const combinedPrompt = systemInstruction 
        ? `መመሪያ: ${systemInstruction}\n\nጥያቄ: ${prompt}`
        : prompt;

    const payload = {
        contents: [{ 
            role: "user", 
            parts: [{ text: combinedPrompt }] 
        }]
    };

    // 3. እምቢ ካለ የሚሞክራቸው የተለያዩ የ API Endpoints (v1beta እና v1 ን ያካትታል)
    const endpointsToTry = [
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
        `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${apiKey}`,
        `https://generativelanguage.googleapis.com/v1/models/gemini-pro:generateContent?key=${apiKey}`,
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro-latest:generateContent?key=${apiKey}`
    ];

    let lastError = "ያልታወቀ ስህተት";

    // 4. የሚሰራውን ሞዴል እና ቨርዥን እስኪያገኝ አንድ በአንድ ይሞክራል
    for (const apiUrl of endpointsToTry) {
        try {
            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const data = await response.json();

            if (response.ok && data.candidates) {
                return res.status(200).json(data); // 🟢 በትክክል ሰርቷል፣ መልሱን ለዌብሳይቱ ይሰጣል
            } else {
                lastError = data.error?.message || "ሞዴሉ አልተገኘም";
            }
        } catch (err) {
            lastError = err.message;
        }
    }

    // 🔴 ሁሉም Endpoints እምቢ ካሉ ብቻ ስህተቱን ያሳውቃል
    return res.status(500).json({ error: `ሁሉም ሞዴሎች እምቢ ብለዋል! የመጨረሻ ስህተት: ${lastError}` });

  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}