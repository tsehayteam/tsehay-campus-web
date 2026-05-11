/**
 * TSEHAY CAMPUS - AI Backend
 * Gemini (primary) + Hugging Face (free fallback)
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
    const hfToken = (process.env.HF_API_TOKEN || '').trim();

    // 1. Gemini ሞከር
    if (geminiKey) {
      const models = [
        { model: "gemini-1.5-flash-latest", version: "v1" },
        { model: "gemini-2.0-flash", version: "v1beta" },
        { model: "gemini-1.5-flash", version: "v1" }
      ];
      for (const m of models) {
        try {
          const url = `https://generativelanguage.googleapis.com/${m.version}/models/${m.model}:generateContent?key=${geminiKey}`;
          const resp = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: [{ parts: [{ text: combinedText }] }] })
          });
          const data = await resp.json();
          if (resp.ok && data.candidates) {
            data.candidates[0].content.parts[0].text = "✨ [Gemini]\n\n" + data.candidates[0].content.parts[0].text;
            return res.status(200).json(data);
          }
        } catch (e) { continue; }
      }
    }

    // 2. Hugging Face fallback
    if (hfToken) {
      try {
        const hfResp = await fetch("https://api-inference.huggingface.co/models/google/flan-t5-large", {
          method: 'POST',
          headers: { 'Authorization': 'Bearer ' + hfToken, 'Content-Type': 'application/json' },
          body: JSON.stringify({ inputs: combinedText })
        });
        const hfData = await hfResp.json();
        if (hfData && Array.isArray(hfData) && hfData[0]?.generated_text) {
          return res.status(200).json({
            candidates: [{ content: { parts: [{ text: "🧠 [ጊዜያዊ AI]\n\n" + hfData[0].generated_text }] } }]
          });
        }
      } catch (e) {}
    }

    return sendFriendly('ሁለቱም AI አልተገኙም። እባክዎ ቆይተው ይሞክሩ።');
  } catch (err) {
    return sendFriendly('Backend Crash: ' + err.message);
  }
}