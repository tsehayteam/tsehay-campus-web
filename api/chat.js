/**
 * Gemini AI API Backend - Ultimate Auto-Healing Version
 * ይህ ኮድ ማንኛውንም የሞዴል መጥፋት ወይም የ API ስሪት አለመጣጣም ችግርን በራሱ ይፈታል!
 * Gemini 1.5, 2.0 እና legacy ሞዴሎችን በየተራ ይሞክራል።
 */
module.exports = async function(req, res) {
  // 1. የ Vercel ሴኪዩሪቲ (CORS) መፍቀጃ
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  if (req.method === 'OPTIONS') return res.status(200).end();

  // ስህተቶችን ለተጠቃሚው መልእክት አድርጎ መላኪያ
  const sendErrorAsMessage = (msg) => {
    return res.status(200).json({
      candidates: [{ content: { parts: [{ text: "⚠️ የሲስተም ማሳወቂያ: " + msg }] } }]
    });
  };

  try {
    if (req.method !== 'POST') return sendErrorAsMessage('POST request ብቻ ነው የሚፈቀደው።');

    // 💡 ኪዩን በማጽዳት (Trim) ማንኛውንም ክፍት ቦታ እናጠፋለን
    const rawKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY || '';
    const apiKey = rawKey.trim();
    
    if (!apiKey) return sendErrorAsMessage('የ API Key Vercel ላይ አልተገኘም!');

    const { prompt, systemInstruction } = req.body;
    if (!prompt) return sendErrorAsMessage('እባክዎ ጥያቄዎን ያስገቡ።');

    // 💡 መመሪያውን እና ጥያቄውን በአንድ ላይ ማዋሃድ (ለሁሉም ሞዴሎች እንዲሰራ)
    const combinedText = systemInstruction 
      ? `System Instruction: ${systemInstruction}\n\nUser Question: ${prompt}` 
      : prompt;

    const payload = {
      contents: [{ parts: [{ text: combinedText }] }]
    };

    /**
     * 🚀 MULTI-VERSION FALLBACK STRATEGY
     * መጀመሪያ በጣም አስተማማኙን (v1) እንሞክራለን።
     * ከዚያ አዲሱን (2.0) እና የቆዩትን በየተራ ይሞክራል።
     */
    const configurations = [
      { model: "gemini-1.5-flash", version: "v1" },      // በጣም አስተማማኝ (Stable)
      { model: "gemini-1.5-flash", version: "v1beta" },  // አማራጭ
      { model: "gemini-2.0-flash-exp", version: "v1beta" }, // አዲሱ Gemini 2.0
      { model: "gemini-pro", version: "v1" }             // የመጨረሻ አማራጭ
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

        // ስራው ከተሳካ ውጤቱን ልከን እንወጣለን
        if (response.ok && data.candidates) {
          // የትኛው ሞዴል እንደሰራ ምልክት እንጨምርበታለን
          const modelMark = config.model.includes("2.0") ? "🚀 [Gemini 2.0]" : "⚡ [Gemini 1.5]";
          data.candidates[0].content.parts[0].text = `${modelMark}\n\n` + data.candidates[0].content.parts[0].text;
          
          return res.status(200).json(data);
        } else {
          lastError = data.error?.message || "Unknown Google error";
          // ሞዴሉ ካልተገኘ ወይም ስሪቱ ካልሰራ ብቻ ወደ ቀጣዩ እንቀጥላለን
          if (lastError.toLowerCase().includes("not found") || lastError.toLowerCase().includes("not supported")) {
            continue;
          } else {
            // ሌሎች ስህተቶች (እንደ Quota ያሉ) ካሉ እዚህ ያቆማል
            break;
          }
        }
      } catch (err) {
        lastError = err.message;
        continue;
      }
    }

    // ሁሉም አማራጮች ካልሰሩ የመጨረሻውን ስህተት እናሳያለን
    return sendErrorAsMessage(`ምንም የሚሰራ የ AI ሞዴል አልተገኘም! የመጨረሻ ስህተት: "${lastError}"። እባክዎ የ API Key በትክክል መገባቱን ያረጋግጡ።`);

  } catch (error) {
    return sendErrorAsMessage('Backend Crash: ' + error.message);
  }
}