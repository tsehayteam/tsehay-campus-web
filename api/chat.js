/**
 * Gemini AI API Backend (Pro & Free Account Optimized)
 * ይህ ኮድ ለ Pro አካውንት ተጠቃሚዎች Gemini 1.5 Proን ቅድሚያ እንዲጠቀም ተደርጎ የተስተካከለ ነው።
 */
module.exports = async function(req, res) {
  // 1. የ Vercel ሴኪዩሪቲ (CORS) እንዳያግደው መፍቀጃ
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // ስህተቶችን በቻት ቦክሱ ላይ ለመጻፍ
  const sendErrorAsMessage = (msg) => {
    return res.status(200).json({
      candidates: [{ content: { parts: [{ text: "⚠️ የሲስተም መልእክት: " + msg }] } }]
    });
  };

  try {
    if (req.method !== 'POST') {
      return sendErrorAsMessage('POST request ብቻ ነው የሚፈቀደው።');
    }

    const apiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;
    
    if (!apiKey) {
      return sendErrorAsMessage('የ API Key Vercel ላይ አልተገኘም! እባክዎ Settings ውስጥ GEMINI_API_KEY ያስገቡ።');
    }

    const { prompt, systemInstruction } = req.body;
    if (!prompt) return sendErrorAsMessage('እባክዎ ጥያቄዎን ያስገቡ።');

    /**
     * 💡 MODEL PRIORITY LOGIC
     * ለ Pro አካውንት 'gemini-1.5-pro' ምርጥ ምርጫ ነው።
     */
    const modelsToTry = ["gemini-1.5-pro", "gemini-1.5-flash", "gemini-pro"];
    let lastError = "";
    let finalData = null;

    for (const modelName of modelsToTry) {
      try {
        // የ API ስሪቱን ወደ v1beta በመጠቀም የቅርብ ጊዜ ሞዴሎችን ማግኘት ይቻላል
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;
        
        const isLegacy = modelName === "gemini-pro";
        const payload = isLegacy ? {
          contents: [{ parts: [{ text: (systemInstruction ? systemInstruction + "\n\nጥያቄ:\n" : "") + prompt }] }]
        } : {
          contents: [{ parts: [{ text: prompt }] }],
          systemInstruction: systemInstruction ? { parts: [{ text: systemInstruction }] } : undefined
        };

        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        const data = await response.json();

        if (response.ok && data.candidates) {
          finalData = data;
          break; // አንደኛው ሞዴል ከሰራ ከሉፑ ይወጣል
        } else {
          lastError = data.error?.message || "Unknown error";
          // ሞዴሉ ካልተገኘ ብቻ ወደ ቀጣዩ (ለምሳሌ ከ Pro ወደ Flash) ይሸጋገራል
          if (lastError.toLowerCase().includes("not found")) continue;
          else break; 
        }
      } catch (err) {
        lastError = err.message;
        continue;
      }
    }

    if (finalData) {
      return res.status(200).json(finalData);
    } else {
      return sendErrorAsMessage(`ጎግል ስህተት መለሰ: ${lastError}። እባክዎ የ API ቁልፍዎ በ AI Studio (aistudio.google.com) መፈጠሩን ያረጋግጡ።`);
    }

  } catch (error) {
    console.error("AI Error:", error);
    return sendErrorAsMessage('የባክኤንድ ስህተት (Crash): ' + error.message);
  }
}