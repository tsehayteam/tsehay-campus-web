/**
 * Gemini AI API Backend - Auto-Healing Version
 * ይህ ኮድ አንዱ የጎግል ሞዴል እምቢ ሲል ሌላኛውን በራሱ እየቀያየረ ይሞክራል!
 */
module.exports = async function(req, res) {
  // የ Vercel ሴኪዩሪቲ (CORS) መፍቀጃ
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

    const apiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;
    if (!apiKey) return sendErrorAsMessage('የ API Key አልተገኘም!');

    const { prompt, systemInstruction } = req.body;
    if (!prompt) return sendErrorAsMessage('ጥያቄ ያስገቡ።');

    // 💡 መመሪያውን እና ጥያቄውን በአንድ ላይ እናጣምራለን (ለሁሉም ሞዴሎች እንዲሰራ)
    const combinedText = systemInstruction 
      ? `System Instruction: ${systemInstruction}\n\nUser Prompt: ${prompt}` 
      : prompt;

    const payload = {
      contents: [{ parts: [{ text: combinedText }] }]
    };

    // 💡 ብልጡ አሰራር፡ የተለያዩ የጎግል ሊንኮችን እና ሞዴሎችን እናዘጋጃለን
    // አንደኛው እምቢ ካለ ወደ ቀጣዩ ይዘላል!
    const endpointsToTry = [
      `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent?key=${apiKey}`,
      `https://generativelanguage.googleapis.com/v1/models/gemini-pro:generateContent?key=${apiKey}`,
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${apiKey}`
    ];

    let lastErrorMessage = "";

    // ሉፕ (Loop) እያደረግን እንሞክራለን
    for (const url of endpointsToTry) {
      try {
        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        const data = await response.json();

        // 100% ከተሳካ መልሱን ለተጠቃሚው ልከን እናቆማለን!
        if (response.ok && data.candidates) {
          return res.status(200).json(data);
        } else {
          lastErrorMessage = data.error?.message || "Unknown Google Error";
        }
      } catch (err) {
        lastErrorMessage = err.message;
      }
    }

    // ሁሉም ሊንኮች እምቢ ካሉ ብቻ ይሄንን ያሳያል
    return sendErrorAsMessage(`ሁሉም የ AI ሞዴሎች እምቢ ብለዋል! ዋናው ስህተት: "${lastErrorMessage}"`);

  } catch (error) {
    return sendErrorAsMessage('የባክኤንድ ስህተት (Crash): ' + error.message);
  }
}