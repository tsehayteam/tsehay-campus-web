/**
 * Gemini AI API Backend (Stable v1 Optimized)
 * ይህ ኮድ ማንኛውንም የ Google AI Studio ቁልፍ እንዲቀበል ተደርጎ የተስተካከለ የመጨረሻ ስሪት ነው።
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
     * 💡 STABLE MODEL LOGIC
     * 'gemini-1.5-flash' በአሁኑ ሰዓት ለሁሉም የ AI Studio ቁልፎች (ነፃም ሆነ ፕሪሚየም) 
     * በጣም አስተማማኝው ሞዴል ነው።
     */
    const modelsToTry = ["gemini-1.5-flash", "gemini-1.5-pro", "gemini-pro"];
    let lastError = "";
    let finalData = null;

    // 💡 'Unknown name systemInstruction' የሚለውን ኤረር ለመፍታት፡
    // መመሪያውን እና ጥያቄውን በአንድ ላይ አጣምረን እንልከዋለን። 
    // ይህ አሰራር በማንኛውም የጎግል ቨርዥን ላይ ይሰራል!
    const combinedText = systemInstruction 
      ? `System Instruction: ${systemInstruction}\n\nUser Prompt: ${prompt}` 
      : prompt;

    for (const modelName of modelsToTry) {
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;
        
        const payload = {
          contents: [{ parts: [{ text: combinedText }] }]
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
          // ሞዴሉ ካልተገኘ ብቻ ወደ ቀጣዩ ይሸጋገራል
          if (lastError.toLowerCase().includes("not found") || lastError.toLowerCase().includes("not supported")) continue;
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
      return sendErrorAsMessage(`ጎግል ስህተት መለሰ: ${lastError}። እባክዎ አዲስ API Key በ AI Studio (aistudio.google.com) ዛሬውኑ ፈጥረው Vercel ላይ ይቀይሩ።`);
    }

  } catch (error) {
    console.error("AI Error:", error);
    return sendErrorAsMessage('የባክኤንድ ስህተት (Crash): ' + error.message);
  }
}