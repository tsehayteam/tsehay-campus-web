/**
 * TSEHAY CAMPUS - Auto-Healing Gemini API Backend
 * የሞዴል ስህተት ሲያጋጥም በራሱ ወደ ሌላ ሞዴል ይቀየራል
 */
module.exports = async function(req, res) {
  // CORS ፍቃድ
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const sendErrorAsMessage = (msg) => {
    return res.status(200).json({
      candidates: [{ content: { parts: [{ text: "⚠️ የሲስተም ማሳወቂያ: " + msg }] } }]
    });
  };

  try {
    if (req.method !== 'POST') return sendErrorAsMessage('POST request ብቻ ይፈቀዳል።');

    const apiKey = (process.env.GEMINI_API_KEY || '').trim();
    if (!apiKey) return sendErrorAsMessage('የ API Key በ Vercel Environment Variables አልተገኘም!');

    const { prompt, systemInstruction } = req.body;
    if (!prompt) return sendErrorAsMessage('ጥያቄ አልተላከም።');

    const combinedText = systemInstruction 
      ? `System Instruction: ${systemInstruction}\n\nUser Question: ${prompt}` 
      : prompt;

    const payload = {
      contents: [{ parts: [{ text: combinedText }] }]
    };

    // 🚀 የሚሞከሩ ሞዴሎች (አዳዲስና አስተማማኝ)
    const configurations = [
      { model: "gemini-1.5-flash-latest", version: "v1" },
      { model: "gemini-2.0-flash", version: "v1beta" },
      { model: "gemini-1.5-flash", version: "v1" }
    ];

    let lastError = "";

    for (const config of configurations) {
      try {
        const url = `https://generativelanguage.googleapis.com/${config.version}/models/${config.model}:generateContent?key=${apiKey}`;
        
        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        const data = await response.json();

        if (response.ok && data.candidates) {
          const modelName = config.model.includes("2.0") ? "Gemini 2.0" : "Gemini 1.5";
          data.candidates[0].content.parts[0].text = `✨ [${modelName}]\n\n` + data.candidates[0].content.parts[0].text;
          return res.status(200).json(data);
        } else {
          lastError = data.error?.message || "Unknown Google error";
          // ሞዴሉ ካልተገኘ ብቻ ወደ ቀጣዩ ሂድ
          if (lastError.toLowerCase().includes("not found") || lastError.toLowerCase().includes("not supported")) {
            continue;
          }
          // ሌላ ስህተት (Quota, Permission) ከሆነ አቁም
          return sendErrorAsMessage(`Google API Error: ${lastError}`);
        }
      } catch (err) {
        lastError = err.message;
        continue;
      }
    }

    return sendErrorAsMessage(`ሁሉም ሞዴሎች አልተሳኩም! የመጨረሻ ስህተት: "${lastError}"። API Key ወይም የሞዴል ስም ያረጋግጡ።`);

  } catch (error) {
    return sendErrorAsMessage('Backend Crash: ' + error.message);
  }
}