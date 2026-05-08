/**
 * Gemini AI API Backend (Fetch API ka upyog karke)
 * Yeh file Vercel par AI requests ko handle karega.
 */
module.exports = async function(req, res) {
  // Sirf POST request ko allow karein
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Sirf POST request allowed hai.' });
  }

  try {
    // API key Vercel environment variables se lein
    const apiKey = process.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY;
    
    if (!apiKey) {
      return res.status(500).json({ error: 'API Key nahi mili. Kripya Vercel par set karein.' });
    }

    const { prompt, systemInstruction } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: 'Kripya apna sawal likhein.' });
    }

    // Google Gemini API endpoint (Gemini 1.5 Flash model)
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

    // API ke liye payload tayar karein
    const payload = {
      contents: [{ parts: [{ text: prompt }] }]
    };

    // Agar system instruction hai, toh usko add karein
    if (systemInstruction) {
      payload.systemInstruction = {
        parts: [{ text: systemInstruction }]
      };
    }

    // Fetch API ke madhyam se Google ko request bhejein
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json();

    if (!response.ok) {
       return res.status(400).json({ error: data.error?.message || 'Google API se error aaya.' });
    }

    // Frontend ko response wapas bhejein
    return res.status(200).json(data);

  } catch (error) {
    console.error("AI Error:", error);
    // Error aane par user ko batayein
    return res.status(500).json({ error: 'AI server se judne mein samasya aayi.' });
  }
}