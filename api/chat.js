/**
 * Gemini AI API Backend (Universal Model Fallback)
 * Khoutu ye e hlamilwe go šoma le diakhaunto tša Pro le tša Mahala.
 * E leka mebotlolo ye mentši go netefatša gore tšhomišo ga e kgaotše.
 */
module.exports = async function(req, res) {
  // 1. Thulaganyo ya Vercel (CORS) - Tšhireletšo
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Romela phošo bjalo ka molaetša wa AI (Fake message for UI)
  const sendErrorAsMessage = (msg) => {
    return res.status(200).json({
      candidates: [{ content: { parts: [{ text: "⚠️ የሲስተም መልእክት: " + msg }] } }]
    });
  };

  try {
    if (req.method !== 'POST') {
      return sendErrorAsMessage('POST request ብቻ ነው የሚፈቀደው።');
    }

    // Lekola selotlolo sa API go tšwa go Vercel
    const apiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;
    
    if (!apiKey) {
      return sendErrorAsMessage('የ API Key Vercel ላይ አልተገኘም! እባክዎ Settings ውስጥ GEMINI_API_KEY ያስገቡ።');
    }

    const { prompt, systemInstruction } = req.body;
    if (!prompt) return sendErrorAsMessage('እባክዎ ጥያቄዎን ያስገቡ።');

    /**
     * 💡 UNIVERSAL FALLBACK LOGIC
     * Mebotlolo ye re tlago e leka ka tatelano.
     */
    const modelsToTry = ["gemini-1.5-pro", "gemini-1.5-flash", "gemini-pro"];
    let lastError = "";
    let finalData = null;

    for (const modelName of modelsToTry) {
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;
        
        // Gemini 1.5 versions handle system instructions directly
        // gemini-pro (1.0) needs instructions appended to prompt
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
          break; // Success! Exit the loop.
        } else {
          lastError = data.error?.message || "Unknown error";
          // If the model specifically is not found, continue to next model
          if (lastError.toLowerCase().includes("not found")) continue;
          else break; // If it's a different error (like quota), stop.
        }
      } catch (err) {
        lastError = err.message;
        continue;
      }
    }

    if (finalData) {
      return res.status(200).json(finalData);
    } else {
      return sendErrorAsMessage(`ጎግል ስህተት መለሰ: ${lastError}። እባክዎ አዲስ API Key በ AI Studio ፈጥረው Vercel ላይ ይቀይሩ።`);
    }

  } catch (error) {
    console.error("AI Error:", error);
    return sendErrorAsMessage('የባክኤንድ ስህተት (Crash): ' + error.message);
  }
}