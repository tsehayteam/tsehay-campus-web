/**
 * Gemini AI API Backend - Clean & Direct
 * ይህ ኮድ ቀለል ያለ እና አንድ ሞዴል ብቻ (gemini-1.5-flash) የሚጠቀም ነው።
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

    const apiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;
    
    if (!apiKey) return sendErrorAsMessage('የ API Key Vercel ላይ አልተገኘም!');

    // 🚨 Firebase Key ከሆነ ማስጠንቀቂያ
    if (apiKey.includes('AIzaSyDCxLwfYAS')) {
        return sendErrorAsMessage('❌ Vercel ላይ ያለው አሁንም የ Firebase ኪይ ነው! እባክዎ አዲሱን የ AI ኪይ አስገብተው Redeploy ያድርጉ።');
    }

    const { prompt, systemInstruction } = req.body;
    if (!prompt) return sendErrorAsMessage('ጥያቄ ያስገቡ።');

    // 💡 ቀጥታ አንድ ሞዴል ብቻ እንጠቀማለን
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
       
       if (errorDetails.toLowerCase().includes('not found')) {
           return sendErrorAsMessage(`❌ የ API ኪይዎ ሞዴሎቹን ማግኘት አልቻለም። ይህ ማለት Vercel አሁንም አሮጌውን (ወይም የተሳሳተውን) ቁልፍ እያነበበ ነው። መፍትሄ: Vercel ላይ አዲሱን ኪይ በትክክል መገባቱን ያረጋግጡ፣ ከዚያ 'Deployments' ታብ ውስጥ ገብተው 'Redeploy' ያድርጉ!`);
       }
       return sendErrorAsMessage(`Google API ስህተት: ${errorDetails}`);
    }

    return res.status(200).json(data);

  } catch (error) {
    console.error("AI Error:", error);
    return sendErrorAsMessage('የባክኤንድ ስህተት (Crash): ' + error.message);
  }
}