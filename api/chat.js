/**
 * TSEHAY CAMPUS - Gemini Free-Tier ONLY
 * ምንም ቢሊንግ አያስፈልግም፤ ነፃ የጂሚኒ ሞዴሎች ብቻ
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

    const apiKey = (process.env.GEMINI_API_KEY || '').trim();
    if (!apiKey) return sendFriendly('የ Gemini API Key አልተገኘም።');

    // ✅ ነፃ የጂሚኒ ሞዴሎች (free tier) – ሁሌም በ v1 ስሪት ይጠቀሙ
    const freeModels = [
      "gemini-1.5-flash-latest",   // ምርጥ ነፃ
      "gemini-2.0-flash-lite",     // አዲስ ፈጣን
      "gemini-1.5-flash"           // ተጠባባቂ
    ];

    for (const model of freeModels) {
      try {
        const url = `https://generativelanguage.googleapis.com/v1/models/${model}:generateContent?key=${apiKey}`;
        const resp = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contents: [{ parts: [{ text: combinedText }] }] })
        });

        const data = await resp.json();

        // Google ስህተት ከሆነ (quota, not found...) → ቀጣዩን ሞዴል ሞክር
        if (resp.ok && data.candidates && data.candidates[0]?.content?.parts?.[0]?.text) {
          const aiText = data.candidates[0].content.parts[0].text;
          if (aiText.trim().length > 5) { // ትርጉም ያለው ምላሽ
            data.candidates[0].content.parts[0].text = "✨ [Gemini]\n\n" + aiText;
            return res.status(200).json(data);
          }
        }
      } catch (e) {
        continue;
      }
    }

    // ሁሉም ሞዴሎች ከሳሳቱ
    return sendFriendly(
      "ለጊዜው AI ማግኘት አልተቻለም። እባክዎ ቆይተው ይሞክሩ (ነፃ ኮታ በየ24 ሰዓቱ ይታደሳል)።"
    );

  } catch (err) {
    return sendFriendly('Backend Crash: ' + err.message);
  }
}