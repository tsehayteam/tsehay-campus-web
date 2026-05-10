module.exports = async function(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const sendErrorAsMessage = (msg) => {
    return res.status(200).json({
      candidates: [{ content: { parts: [{ text: "⚠️ የሲስተም መልእክት: " + msg }] } }]
    });
  };

  try {
    if (req.method !== 'POST') return sendErrorAsMessage('POST request ብቻ ነው የሚፈቀደው።');

    const apiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;
    if (!apiKey) return sendErrorAsMessage('የ API Key Vercel ላይ አልተገኘም!');

    const { prompt, systemInstruction } = req.body;
    if (!prompt) return sendErrorAsMessage('ጥያቄ ያስገቡ።');

    const combinedText = systemInstruction
      ? `System Instruction: ${systemInstruction}\n\nUser Prompt: ${prompt}`
      : prompt;

    const payload = {
      contents: [{ parts: [{ text: combinedText }] }]
    };

    // ትክክለኛው እና ፈጣኑ ሞዴል (1.5 Flash)
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = await response.json();

    if (!response.ok) {
      let errorDetails = data.error?.message || "Unknown error";
      return sendErrorAsMessage(`Google ስህተት መለሰ: "${errorDetails}"`);
    }

    return res.status(200).json(data);
  } catch (error) {
    return sendErrorAsMessage('የባክኤንድ ስህተት: ' + error.message);
  }
}
