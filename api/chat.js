/**
 * TSEHAY CAMPUS - Dual-Free AI Backend
 * Gemini (free tier) + Groq (always free) – የትኛውም ከሰራ ያመጣል
 */
module.exports = async function(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', '*');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const sendFriendly = (msg) => {
    return res.status(200).json({
      candidates: [{ content: { parts: [{ text: "📚 " + msg }] } }]
    });
  };

  try {
    if (req.method !== 'POST') return sendFriendly('POST ብቻ ይፈቀዳል።');

    const { prompt, systemInstruction } = req.body;
    if (!prompt) return sendFriendly('ጥያቄ አልተላከም።');

    const combinedText = systemInstruction 
      ? `System Instruction: ${systemInstruction}\n\nUser Question: ${prompt}` 
      : prompt;

    const geminiKey = (process.env.GEMINI_API_KEY || '').trim();
    const groqKey = (process.env.GROQ_API_KEY || '').trim();

    // 1. Gemini (ነፃ ሞዴሎች ብቻ)
    if (geminiKey) {
      const freeModels = [
        "gemini-1.5-flash-latest",    // ምርጡ ነፃ
        "gemini-2.0-flash-lite",      // አዲስ ፈጣን
        "gemini-1.5-flash"            // ለስላሳ
      ];
      for (const model of freeModels) {
        try {
          const url = `https://generativelanguage.googleapis.com/v1/models/${model}:generateContent?key=${geminiKey}`;
          const resp = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: [{ parts: [{ text: combinedText }] }] })
          });
          const data = await resp.json();
          if (resp.ok && data.candidates && data.candidates[0]?.content?.parts?.[0]?.text) {
            let aiText = data.candidates[0].content.parts[0].text;
            // ባዶ ወይም ያልተለመደ ጽሑፍ ካልሆነ
            if (aiText.trim().length > 20 && !aiText.includes("Всё тело:")) {
              data.candidates[0].content.parts[0].text = "✨ [Gemini]\n\n" + aiText;
              return res.status(200).json(data);
            }
          }
        } catch (e) { continue; }
      }
    }

    // 2. Groq (100% ነፃ ሞዴል)
    if (groqKey) {
      try {
        const groqResp = await fetch("https://api.groq.com/openai/v1/chat/completions", {
          method: "POST",
          headers: {
            "Authorization": "Bearer " + groqKey,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            model: "llama-3.3-70b-versatile",
            messages: [{ role: "user", content: combinedText }]
          })
        });
        const groqData = await groqResp.json();
        if (groqData.choices && groqData.choices[0]?.message?.content) {
          return res.status(200).json({
            candidates: [{ content: { parts: [{ text: "⚡ [Groq AI]\n\n" + groqData.choices[0].message.content }] } }]
          });
        }
      } catch (e) {}
    }

    // ሁለቱም ካልቻሉ
    return sendFriendly(
      "የ AI አገልግሎቱን ለጊዜው ማግኘት አልተቻለም። " +
      "እባክዎ ቆይተው ይሞክሩ ወይም በ info@tsehaycampus.com ያግኙን።"
    );

  } catch (err) {
    return sendFriendly('Backend Crash: ' + err.message);
  }
}