/**
 * Gemini AI API Backend (Fetch API በመጠቀም)
 * ይህ ኮድ ማንኛውንም ስህተት በቀጥታ በቻት ቦክሱ ላይ ይጽፍልሃል!
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

  // 💡 ብልጡ ዘዴ፡ ማንኛውንም ስህተት እንደ AI መልስ (Fake Message) አድርጎ ወደ ዌብሳይቱ የሚልክ ፋንክሽን
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
      return sendErrorAsMessage('የ API Key Vercel ላይ አልተገኘም! እባክዎ Settings -> Environment Variables ውስጥ GEMINI_API_KEY ያስገቡ እና Redeploy ያድርጉ።');
    }

    const { prompt, systemInstruction } = req.body;

    if (!prompt) {
      return sendErrorAsMessage('እባክዎ ጥያቄዎን ያስገቡ። (Prompt is missing)');
    }

    // መጀመሪያ አዲሱን እና ፈጣኑን ሞዴል እንሞክራለን (gemini-1.5-flash)
    let url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

    let payload = {
      contents: [{ parts: [{ text: prompt }] }]
    };

    if (systemInstruction) {
      payload.systemInstruction = {
        parts: [{ text: systemInstruction }]
      };
    }

    // Fetch API መኖሩን ማረጋገጥ
    if (typeof fetch === 'undefined') {
        return sendErrorAsMessage('በዚህ Vercel ቨርዥን ላይ Fetch API አይሰራም። እባክዎ Node.js 18+ ይጠቀሙ።');
    }

    let response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    let data = await response.json();

    // 💡 AUTO-FALLBACK 1: የመጀመሪያው ሞዴል እምቢ ካለ ወደ ትልቁ (gemini-1.5-pro) ይሞክራል
    if (!response.ok && data.error?.message?.toLowerCase().includes('not found')) {
        url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent?key=${apiKey}`;
        response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        data = await response.json();
    }

    // 💡 AUTO-FALLBACK 2: አሁንም እምቢ ካለ (አሮጌ API Key ከሆነ) ወደ አሮጌው (gemini-1.0-pro) ይሞክራል
    if (!response.ok && data.error?.message?.toLowerCase().includes('not found')) {
        url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.0-pro:generateContent?key=${apiKey}`;
        
        // አሮጌው ሞዴል systemInstruction ስለማይቀበል ከጥያቄው ጋር ደምረን እንልከዋለን
        payload = {
          contents: [{ parts: [{ text: (systemInstruction ? systemInstruction + "\n\nተጠቃሚው የሚከተለውን ጥያቄ ጠይቋል:\n" : "") + prompt }] }]
        };
        
        response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        data = await response.json();
    }

    // አሁንም Google API ሌላ ስህተት ካመጣ
    if (!response.ok) {
       return sendErrorAsMessage('ከ Google AI ስህተት ተገኝቷል: ' + (data.error?.message || response.statusText));
    }

    // ሁሉም ነገር ትክክል ከሆነ ትክክለኛውን መልስ መላክ
    return res.status(200).json(data);

  } catch (error) {
    console.error("AI Error:", error);
    return sendErrorAsMessage('የኮድ ስህተት ተፈጥሯል (Backend Crash): ' + error.message);
  }
}