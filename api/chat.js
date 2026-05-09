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

    // ትክክለኛው እና ፈጣኑ ሞዴል (gemini-1.5-flash)
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

    let payload = {
      contents: [{ parts: [{ text: prompt }] }]
    };

    if (systemInstruction) {
      payload.systemInstruction = {
        parts: [{ text: systemInstruction }]
      };
    }

    let response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    let data = await response.json();

    // ከ Google API ስህተት ከመጣ (ለምሳሌ የተሳሳተ API Key ከሆነ)
    if (!response.ok) {
       return sendErrorAsMessage('ከ Google AI ስህተት ተገኝቷል: ' + (data.error?.message || response.statusText) + ' (እባክዎ ትክክለኛ የ Google AI Studio API Key መጠቀሞን ያረጋግጡ)');
    }

    // ሁሉም ነገር ትክክል ከሆነ ትክክለኛውን መልስ መላክ
    return res.status(200).json(data);

  } catch (error) {
    console.error("AI Error:", error);
    return sendErrorAsMessage('የኮድ ስህተት ተፈጥሯል (Backend Crash): ' + error.message);
  }
}