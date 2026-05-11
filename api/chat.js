/**
 * TSEHAY CAMPUS - AI Backend (Gemini + Hugging Face Fallback)
 * ቢሊንግ ሳያስፈልግ ለጊዜው ነጻ AI ይጠቀማል
 */
module.exports = async function(req, res) {
  // CORS ፍቃድ
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  if (req.method === 'OPTIONS') return res.status(200).end();

  // ለተማሪ ምቹ መልእክት
  const sendErrorAsMessage = (msg) => {
    const userMsg = "📚 የ AI አገልግሎት ለጊዜው አይገኝም። እባክዎ ቆይተው ይሞክሩ። እስከዚያው ቀደም ያሉትን ትምህርቶች መከለስ ይችላሉ። (ስህተት: " + msg + ")";
    return res.status(200).json({
      candidates: [{ content: { parts: [{ text: userMsg }] } }]
    });
  };

  try {
    if (req.method !== 'POST') return sendErrorAsMessage('POST request ብቻ ይፈቀዳል።');

    const { prompt, systemInstruction } = req.body;
    if (!prompt) return sendErrorAsMessage('ጥያቄ አልተላከም።');

    const combinedText = systemInstruction 
      ? `System Instruction: ${systemInstruction}\n\nUser Question: ${prompt}` 
      : prompt;

    // ---------- 1. መጀመሪያ Gemini ሞክር ----------
    const geminiKey = (process.env.GEMINI_API_KEY || '').trim();
    if (geminiKey) {
      const geminiConfigs = [
        { model: "gemini-1.5-flash-latest", version: "v1" },
        { model: "gemini-2.0-flash", version: "v1beta" },
        { model: "gemini-1.5-flash", version: "v1" }
      ];

      for (const config of geminiConfigs) {
        try {
          const url = `https://generativelanguage.googleapis.com/${config.version}/models/${config.model}:generateContent?key=${geminiKey}`;
          const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: [{ parts: [{ text: combinedText }] }] })
          });

          const data = await response.json();
          if (response.ok && data.candidates) {
            const modelName = config.model.includes("2.0") ? "Gemini 2.0" : "Gemini 1.5";
            data.candidates[0].content.parts[0].text = `✨ [${modelName}]\n\n` + data.candidates[0].content.parts[0].text;
            return res.status(200).json(data);
          } else {
            // ስህተቱ "not found", "quota"፣ ወይም ሌላ - ወደ ቀጣዩ ሞዴል መቀጠል
            continue;
          }
        } catch (err) {
          continue;
        }
      }
    }

    // ---------- 2. Gemini ካልሰራ Hugging Face ሞክር (FREE) ----------
    const hfToken = (process.env.HF_API_TOKEN || '').trim();
    if (hfToken) {
      try {
        const hfResponse = await fetch("https://api-inference.huggingface.co/models/google/flan-t5-large", {
          method: "POST",
          headers: {
            "Authorization": "Bearer " + hfToken,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ inputs: combinedText })
        });

        const hfData = await hfResponse.json();
        // Hugging Face ምላሽ አረጋግጥ
        if (hfData && Array.isArray(hfData) && hfData[0]?.generated_text) {
          const hfText = "🧠 [Hugging Face - ጊዜያዊ AI]\n\n" + hfData[0].generated_text;
          return res.status(200).json({
            candidates: [{ content: { parts: [{ text: hfText }] } }]
          });
        } else if (hfData?.error) {
          return sendErrorAsMessage("Hugging Face error: " + hfData.error);
        }
      } catch (err) {
        return sendErrorAsMessage("Hugging Face ማግኘት አልተቻለም: " + err.message);
      }
    }

    // ---------- 3. ሁለቱም ካልቻሉ መልእክት ላክ ----------
    return sendErrorAsMessage("ምንም AI ሞዴል አልተገኘም። Vercel ላይ GEMINI_API_KEY ወይም HF_API_TOKEN ያስገቡ።");

  } catch (error) {
    return sendErrorAsMessage('Backend Crash: ' + error.message);
  }
}