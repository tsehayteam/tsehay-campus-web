/**
 * Gemini AI API Backend - Gemini 2.0 Flash Support
 * ይህ ኮድ አዲሱን እና ፈጣኑን Gemini 2.0 ሞዴል ቅድሚያ እንዲጠቀም ተደርጎ የተዘጋጀ ነው።
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
      candidates: [{ content: { parts: [{ text: "⚠️ የሲስተም ማሳወቂያ: " + msg }] } }]
    });
  };

  try {
    if (req.method !== 'POST') return sendErrorAsMessage('POST request ብቻ ነው የሚፈቀደው።');

    const rawKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY || '';
    const apiKey = rawKey.trim();
    
    if (!apiKey) return sendErrorAsMessage('የ API Key አልተገኘም!');

    const { prompt, systemInstruction } = req.body;
    if (!prompt) return sendErrorAsMessage('ጥያቄ ያስገቡ።');

    const combinedText = systemInstruction 
      ? `System Instruction: ${systemInstruction}\n\nUser Question: ${prompt}` 
      : prompt;

    const payload = {
      contents: [{ parts: [{ text: combinedText }] }]
    };

    /**
     * 🚀 NEXT-GEN MODEL PRIORITY
     * 1. gemini-2.0-flash-exp (እጅግ ፈጣኑ እና አዲሱ)
     * 2. gemini-1.5-flash (ሁልጊዜ አስተማማኙ)
     */
    const modelsToTry = [
      "gemini-2.0-flash-exp",
      "gemini-1.5-flash"
    ];

    let lastError = "";

    for (const modelName of modelsToTry) {
      try {
        // Gemini 2.0 የሚሰራው በ v1beta ስሪት ብቻ ነው
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;
        
        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        const data = await response.json();

        if (response.ok && data.candidates) {
          // የትኛው ሞዴል እንደመለሰልን ምልክት እንጨምርበታለን (ለእኛ ለማወቅ)
          const modelMark = modelName.includes("2.0") ? "🚀 [Gemini 2.0]" : "⚡ [Gemini 1.5]";
          data.candidates[0].content.parts[0].text = `${modelMark}\n\n` + data.candidates[0].content.parts[0].text;
          
          return res.status(200).json(data);
        } else {
          lastError = data.error?.message || "Unknown error";
          // ሞዴሉ ካልተገኘ ብቻ ወደ ቀጣዩ ይሸጋገራል
          if (lastError.toLowerCase().includes("not found") || lastError.toLowerCase().includes("not supported")) continue;
          else break;
        }
      } catch (err) {
        lastError = err.message;
        continue;
      }
    }

    return sendErrorAsMessage(`ምንም የሚሰራ ሞዴል አልተገኘም። ስህተት: "${lastError}"`);

  } catch (error) {
    return sendErrorAsMessage('Backend Crash: ' + error.message);
  }
}