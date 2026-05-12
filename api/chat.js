// Vercel Edge Runtime - የ 10 ሰከንዱን ገደብ (Timeout) እንዳያቋርጥብን ይረዳል
export const config = {
  runtime: 'edge', 
};

export default async function handler(req) {
  // POST Request ብቻ እንዲቀበል መገደብ (Security)
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method Not Allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    // ከተማሪው የሚመጣውን ጥያቄ መቀበል
    const { prompt, systemInstruction } = await req.json();
    
    // ከ Vercel Environment Variables ላይ ሚስጥራዊውን ቁልፍ ማንበብ
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return new Response(JSON.stringify({ error: "API Key is missing in Vercel. እባክዎ Vercel Settings ላይ GEMINI_API_KEY ያስገቡ።" }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 💡 ትክክለኛው እና ፈጣኑ ሞዴል (gemini-1.5-flash) - "Model not found" የሚለውን ስህተት ያስቀራል
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

    // ወደ Google Gemini በቀጥታ መላክ
    const googleResponse = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        systemInstruction: systemInstruction ? { parts: [{ text: systemInstruction }] } : undefined
      })
    });

    const data = await googleResponse.json();

    // መልሱን ወደ ዌብሳይታችን መመለስ
    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    // ኮዱ ላይ ስህተት ካጋጠመ ለዌብሳይቱ ማሳወቅ
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}