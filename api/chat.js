/**
 * Gemini AI API Backend - Clean & Trimmed Version
 * የ API ኪይ ላይ ያሉ ክፍት ቦታዎችን (Spaces) የሚያጸዳ እና የተረጋጋውን v1 API የሚጠቀም።
 */
module.exports = async function(req, res) {
  // CORS Security
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const sendErrorAsMessage = (msg) => {
    return res.status(200).json({
      candidates: [{ content: { parts: [{ text: "⚠️ " + msg }] } }]
    });
  };

  try {
    if (req.method !== 'POST') return sendErrorAsMessage('POST request ብቻ ነው የሚፈቀደው።');

    // 💡 ኪዩን ከ Vercel እናነባለን
    const rawKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY || '';
    
    // 💡 ይህ በጣም ወሳኝ ነው! (Space ወይም Enter አብሮ ኮፒ ተደርጎ ከሆነ ያጠፋዋል)
    const apiKey = rawKey.trim(); 
    
    if (!apiKey) return sendErrorAsMessage('API Key አልተገኘም!');

    const { prompt, systemInstruction } = req.body;
    if (!prompt) return sendErrorAsMessage('ጥያቄ ያስገቡ።');

    const combinedText = systemInstruction 
      ? `System Instruction: ${systemInstruction}\n\nUser Prompt: ${prompt}` 
      : prompt;

    const payload = {
      contents: [{ parts: [{ text: combinedText }] }]
    };

    // 💡 መፍትሄው፡ ሞዴሉን ወደ አንጋፋው 'gemini-pro' እና ስሪቱን ወደ 'v1' ቀይረናል!
    const modelName = "gemini-pro";
    const url = `https://generativelanguage.googleapis.com/v1/models/${modelName}:generateContent?key=${apiKey}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = await response.json();

    if (response.ok && data.candidates) {
      return res.status(200).json(data);
    } else {
      const errorMsg = data.error?.message || "Unknown Google Error";
      return sendErrorAsMessage(`Google Error (${modelName}): "${errorMsg}"`);
    }

  } catch (error) {
    return sendErrorAsMessage('Backend Crash: ' + error.message);
  }
}