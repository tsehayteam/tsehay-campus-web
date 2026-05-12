/**
 * TSEHAY CAMPUS - Gemini + Groq (Always Free Fallback)
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

    // 1. Gemini (free models)
    if (geminiKey) {
      const models = ["gemini-1.5-flash-latest", "gemini-2.0-flash-lite", "gemini-1.5-flash"];
      for (const model of models) {
        try {
          const url = `https://generativelanguage.googleapis.com/v1/models/${model}:generateContent?key=${geminiKey}`;
          const resp = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: [{ parts: [{ text: combinedText }] }] })
          });
          const data = await resp.json();
          if (resp.ok && data.candidates?.[0]?.content?.parts?.[0]?.text) {
            const text = data.candidates[0].content.parts[0].text;
            if (text.trim().length > 5) {
              data.candidates[0].content.parts[0].text = "✨ [Gemini]\n\n" + text;
              return res.status(200).json(data);
            }
          }
        } catch (e) { continue; }
      }
    }

    // 2. Groq (100% free, no credit card)
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
        if (groqData.choices?.[0]?.message?.content) {
          return res.status(200).json({
            candidates: [{ content: { parts: [{ text: "⚡ [Groq AI]\n\n" + groqData.choices[0].message.content }] } }]
          });
        }
      } catch (e) {}
    }

    // ሁለቱም ካልቻሉ
    return sendFriendly("AI is temporarily unavailable. Please try again later (free quotas renew daily).");
  } catch (err) {
    return sendFriendly('Backend Crash: ' + err.message);
  }
}