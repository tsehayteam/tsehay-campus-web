export default async function handler(req, res) {
  // POST ሪኮዌስት ብቻ እንዲቀበል
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    // ኪዩን ከ Vercel ይወስዳል
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return res.status(500).json({ error: 'የ API ኪይ አልተገኘም (Vercel Environment Variables ውስጥ ያስገቡ)' });

    const { prompt, systemInstruction } = req.body;
    
    // የ ሞዴሉን ስም ወደ ትክክለኛው እና ፈጣኑ (gemini-1.5-flash) ቀይረነዋል
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
    
    const payload = {
      contents: [{ parts: [{ text: prompt }] }],
      systemInstruction: { parts: [{ text: systemInstruction }] }
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = await response.json();

    // Google API ኤረር ከመለሰ (ለምሳሌ ኪዩ ከተሳሳተ) በትክክል በጽሁፍ እንዲያወጣው
    if (data.error) {
        return res.status(400).json({ error: data.error.message || "የ Google API ችግር አጋጥሟል" });
    }

    return res.status(200).json(data);
  } catch (error) {
    console.error("Vercel Backend Error:", error);
    return res.status(500).json({ error: 'ከሰርቨሩ ጋር መገናኘት አልተቻለም' });
  }
}