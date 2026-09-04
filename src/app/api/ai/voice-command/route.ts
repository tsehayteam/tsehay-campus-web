import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { prompt, language = 'am' } = await req.json();

    if (!prompt || !prompt.trim()) {
      return NextResponse.json({ error: 'Missing prompt' }, { status: 400 });
    }

    const cleanPrompt = prompt.trim();
    const isEng = language === 'en' || /^[a-zA-Z0-9\s?,.!'":;@#$%^&*()_\-+=\[\]{}]+$/.test(cleanPrompt);

    // 1. Check for quick local navigation / modal intents for 0ms latency
    const norm = cleanPrompt.toLowerCase();

    // Home navigation
    if (/መነሻ|ዋናው\s*ገጽ|ወደ\s*ሆም|ሆም\s*ፔጅ|go\s*to\s*home|home\s*page/i.test(norm)) {
      return NextResponse.json({
        action: 'route',
        path: '/',
        speech: isEng ? 'Taking you to the home page.' : 'እሺ፣ ወደ ዋናው መነሻ ገጽ እየወሰድኩዎት ነው።'
      });
    }

    // Courses navigation
    if (/ኮርሶች|ስልጠናዎች|ትምህርቶች|የኮርስ\s*ዝርዝር|all\s*courses|show\s*courses|view\s*courses/i.test(norm)) {
      return NextResponse.json({
        action: 'route',
        path: '/courses',
        speech: isEng ? 'Taking you to our complete course catalog.' : 'እሺ፣ ወደ ኮርሶች ዝርዝር እየወሰድኩዎት ነው።'
      });
    }

    // Admin navigation
    if (/አድሚን|አድሚን\s*ገጽ|ዳሽቦርድ|admin|admin\s*page|go\s*to\s*admin/i.test(norm)) {
      return NextResponse.json({
        action: 'route',
        path: '/admin',
        speech: isEng ? 'Taking you to the admin dashboard.' : 'እሺ፣ ወደ አድሚን ገጽ እየወሰድኩዎት ነው።'
      });
    }

    // Payment modal
    if (/ክፍያ|መክፈል|ቴሌብር|ባንክ|ዋጋው\s*ስንት|how\s*to\s*pay|payment|telebirr/i.test(norm)) {
      return NextResponse.json({
        action: 'modal',
        modal: 'payment',
        speech: isEng 
          ? 'Opening payment options. You can pay with Telebirr, CBE Birr, LakiPay, or Cards.' 
          : 'እሺ፣ የክፍያ አማራጮችን ከፍቼልዎታለሁ። በቴሌብር፣ በሲቢኢ ብር (CBE) ወይም በካርድ መክፈል ይችላሉ።'
      });
    }

    // Auth / Login / Signup modal
    if (/ግባ|መግባት|ሎጊን|ተመዝገብ|ምዝገባ|login|sign\s*in|register|sign\s*up/i.test(norm)) {
      const isSignup = /ተመዝገብ|ምዝገባ|register|sign\s*up/i.test(norm);
      return NextResponse.json({
        action: 'modal',
        modal: 'auth',
        isSignupMode: isSignup,
        speech: isEng 
          ? (isSignup ? 'Opening the student registration window.' : 'Opening the login window.') 
          : (isSignup ? 'እሺ፣ የመመዝገቢያ መስኮቱን ከፍቼልዎታለሁ።' : 'እሺ፣ የመግቢያ መስኮቱን ከፍቼልዎታለሁ።')
      });
    }

    // 2. Intelligent Gemini API Call with Structured JSON Output
    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY;

    if (apiKey) {
      const systemInstruction = `You are "Tsehay AI", the invisible, voice-activated AI mentor and assistant for "Tsehay Campus" (tsehaycampus.com) founded by Eyoub Sahle (ኢዮብ ሳህሌ).
Address: Bole, Addis Ababa, Ethiopia. Phone: 0980209090. Telegram: @TsehayTeam.
Courses: Shein Import (4,500 ETB), YouTube Monetization (5,500 ETB), Digital Marketing (Free).

CRITICAL: You MUST respond ONLY with a JSON object strictly matching this schema:
{
  "action": "route" | "modal" | "reply",
  "path": "/" | "/courses" | "/admin" | "/dashboard" | "/certificate" | "/about",
  "modal": "payment" | "auth",
  "isSignupMode": boolean,
  "speech": "concise 1-2 sentence spoken response in authentic ${isEng ? 'English' : 'Amharic'}"
}
Do NOT output markdown blocks or extra text. Output purely the valid JSON string.`;

      const geminiEndpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

      const geminiRes = await fetch(geminiEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: cleanPrompt }] }],
          systemInstruction: { parts: [{ text: systemInstruction }] },
          generationConfig: {
            responseMimeType: 'application/json',
            temperature: 0.2,
            maxOutputTokens: 250
          }
        })
      });

      if (geminiRes.ok) {
        const data = await geminiRes.json();
        const rawJsonText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (rawJsonText) {
          try {
            const parsed = JSON.parse(rawJsonText);
            if (parsed && parsed.speech) {
              return NextResponse.json(parsed);
            }
          } catch (e) {}
        }
      }
    }

    // 3. Fallback Smart Response
    return NextResponse.json({
      action: 'reply',
      speech: isEng 
        ? 'Your question was received! Feel free to explore our courses or call 0980209090.' 
        : 'ጥያቄዎ ደርሶኛል! ስለ ፀሐይ ካምፓስ ኮርሶች፣ ክፍያና ምዝገባ በዝርዝር የኮርሶችን ገጽ መመልከት ወይም በ 0980209090 መደወል ይችላሉ።'
    });

  } catch (error: any) {
    return NextResponse.json({
      action: 'reply',
      speech: 'ይቅርታ፣ ጥያቄዎን ለማስተናገድ ችግር አጋጥሟል። እባክዎ እንደገና ይሞክሩ።'
    }, { status: 500 });
  }
}
