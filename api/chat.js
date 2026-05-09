/**
 * Gemini AI API Backend (Pro Account Optimized)
 * ይህ ኮድ ለ Pro Account ተጠቃሚዎች ተብሎ የተዘጋጀ ሲሆን 'gemini-1.5-pro'ን ይጠቀማል።
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

  // 💡 ስህተቶችን በቻት ቦክሱ ላይ ለመጻፍ
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
      return sendErrorAsMessage('የ API Key Vercel ላይ አልተገኘም! እባክዎ Settings -> Environment Variables ውስጥ GEMINI_API_KEY ያስገቡ።');
    }

    const { prompt, systemInstruction } = req.body;

    if (!prompt) {
      return sendErrorAsMessage('እባክዎ ጥያቄዎን ያስገቡ።');
    }

    /**
     * 💡 PRO ACCOUNT OPTIMIZATION
     * ለ Pro ተጠቃሚዎች 'gemini-1.5-pro' ምርጥ እና ብልጥ ምርጫ ነው።
     */
    const modelName = "gemini-1.5-pro"; 
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;

    const payload = {
      contents: [{ parts: [{ text: prompt }] }]
    };

    if (systemInstruction) {
      payload.systemInstruction = {
        parts: [{ text: systemInstruction }]
      };
    }

    let response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    let data = await response.json();

    if (!response.ok) {
       let errorMsg = data.error?.message || response.statusText;
       
       // ሞዴሉ ካልተገኘ ወደ Flash ሞዴል በራሱ ይቀይራል
       if (errorMsg.toLowerCase().includes('not found')) {
           const fallbackUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
           const fbResponse = await fetch(fallbackUrl, {
               method: 'POST',
               headers: { 'Content-Type': 'application/json' },
               body: JSON.stringify(payload)
           });
           const fbData = await fbResponse.json();
           if (fbResponse.ok) return res.status(200).json(fbData);
       }
       
       return sendErrorAsMessage('ጎግል ስህተት መለሰ: ' + errorMsg);
    }

    return res.status(200).json(data);

  } catch (error) {
    console.error("AI Error:", error);
    return sendErrorAsMessage('የባክኤንድ ስህተት (Crash): ' + error.message);
  }
}