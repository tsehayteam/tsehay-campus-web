/**
 * Gemini AI API Backend - Smart Debugger
 * ይህ ኮድ Vercel የትኛውን ኪይ እየተጠቀመ እንደሆነ ያጋልጣል!
 */
module.exports = async function(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const sendErrorAsMessage = (msg) => {
    return res.status(200).json({
      candidates: [{ content: { parts: [{ text: "🔍 ምርመራ: " + msg }] } }]
    });
  };

  try {
    if (req.method !== 'POST') return sendErrorAsMessage('POST request ብቻ ነው የሚፈቀደው።');

    const apiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;
    if (!apiKey) return sendErrorAsMessage('የ API Key Vercel ላይ አልተገኘም!');

    // 💡 ሚስጥሩን ሙሉ ለሙሉ ሳናወጣ የመጀመሪያዎቹን 15 ፊደላት ብቻ እንወስዳለን
    const keySnippet = apiKey.substring(0, 15) + "...";

    const { prompt, systemInstruction } = req.body;
    if (!prompt) return sendErrorAsMessage('ጥያቄ ያስገቡ።');

    const modelName = "gemini-1.5-flash";
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;

    const combinedText = systemInstruction 
      ? `System Instruction: ${systemInstruction}\n\nUser Prompt: ${prompt}` 
      : prompt;

    const payload = {
      contents: [{ parts: [{ text: combinedText }] }]
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = await response.json();

    if (!response.ok) {
       let errorDetails = data.error?.message || "Unknown error";
       // 🚨 Vercel እየተጠቀመ ያለውን ኪይ እና ትክክለኛውን የጎግል ኤረር እናሳያለን!
       return sendErrorAsMessage(`Vercel አሁን እያነበበ ያለው ኪይ በዚህ ይጀምራል [ ${keySnippet} ] \n\nGoogle የመለሰው ስህተት ደግሞ ይህንን ነው: "${errorDetails}"`);
    }

    return res.status(200).json(data);

  } catch (error) {
    return sendErrorAsMessage('የባክኤንድ ስህተት: ' + error.message);
  }
}