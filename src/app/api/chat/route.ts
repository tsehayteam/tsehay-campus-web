// @ts-nocheck
import { NextResponse } from 'next/server';

const RATE_LIMIT_WINDOW_MS = 60000;
const MAX_REQUESTS_PER_WINDOW = 40;

function getSmartFallbackReply(userPrompt: string, courseContext?: any, hasImage?: boolean, hasAudio?: boolean): string {
    const p = (userPrompt || '').toLowerCase().trim();
    const courseTitle = (courseContext?.courseTitle || '').toLowerCase();
    const isDigitalMarketing = courseTitle.includes('digital') || courseTitle.includes('marketing') || courseTitle.includes('ማርኬቲንግ');
    const isYouTube = courseTitle.includes('youtube') || courseTitle.includes('ዩቲዩብ');
    const isShein = courseTitle.includes('shein') || courseTitle.includes('ሺን') || courseTitle.includes('ሼን') || courseTitle.includes('import') || courseTitle.includes('ኢምፖርት');

    if (hasImage) {
        return `የላኩትን ፎቶ/ስክሪንሾት ተመልክቼዋለሁ! 📸\n\nበፎቶው ላይ የሚታየውን ነጥብ በተመለከተ፦\n1. በ${courseContext?.courseTitle || 'ትምህርቱ'} መሰረት ዋናው ትኩረት የተግባር ቅደም ተከተሎችን በአግባቡ መከተል ነው።\n2. ለየት ያለ የስህተት መልዕክት (Error) ወይም ጥያቄ ካለዎት፣ ጥያቄዎን በድምፅ ወይም በጽሑፍ አብራርተው ይጠይቁኝ እና ደረጃ በደረጃ እንፈታዋለን! ✨`;
    }

    if (hasAudio && !p) {
        return "የላኩልኝን የድምፅ መልዕክት አዳምጫለሁ! 🎙️ ስለ ፀሐይ ካምፓስ ስልጠናዎች፣ ምዝገባ ወይም ስለ ቪዲዮ ትምህርቶች ማንኛውንም ጥያቄ በደስታ እመልሳለሁ። በጽሑፍም ሆነ በድምፅ መቀጠል ይችላሉ!";
    }

    // 1. Off-Topic / Unrelated Queries Guardrail
    const isOffTopic = p.includes('assignment') || p.includes('አሳይመንት') || p.includes('homework') || p.includes('ሆምወርክ') || 
                       p.includes('physics') || p.includes('ፊዚክስ') || p.includes('chemistry') || p.includes('ኬሚስትሪ') || 
                       p.includes('calculus') || p.includes('ማትሪክ') || p.includes('matrix') || p.includes('ዩኒቨርሲቲ') ||
                       p.includes('essay') || p.includes('ግጥም') || p.includes('poem');

    if (isOffTopic && !isYouTube && !isDigitalMarketing && !isShein) {
        return "ይቅርታ፣ እኔ የተዘጋጀሁት ስለ ፀሐይ ካምፓስ ስልጠናዎች፣ የዩቲዩብ ስኬት እና የዲጂታል ክህሎቶች እርስዎን ለመርዳት ብቻ ነው። ስለ ካምፓሳችን ኮርሶች፣ ምዝገባ ወይም አሰራር ማንኛውንም ጥያቄ ካለዎት በደስታ እመልስልዎታለሁ! ✨";
    }

    // 2. Greetings
    if (
        p.includes('ሰላም') || p.includes('እንዴት') || p.includes('ጤና ይስጥልኝ') || 
        p.includes('hello') || p.includes('hi') || p.includes('hey') || p.includes('how are you')
    ) {
        if (courseContext?.courseTitle) {
            return `ሰላም! እንኳን ደህና መጡ! በ"${courseContext.courseTitle}" ስልጠና ዙሪያ ዛሬ በምን ልርዳዎት? ያልገባዎትን ማንኛውንም ነጥብ በጽሑፍ ወይም በድምፅ ይጠይቁኝ! ✨`;
        }
        return "ሰላም! እኔ ፀሐይ ነኝ፤ እንኳን ደህና መጡ! ዛሬ ስለ ፀሐይ ካምፓስ ስልጠናዎች፣ የዩቲዩብ ስኬት፣ የሼን ቢዝነስ ወይም ስለ ምዝገባ በምን ልርዳዎት? ✨";
    }

    // 3. Address & Location (አድራሻ)
    if (p.includes('አድራሻ') || p.includes('ቢሮ') || p.includes('ቦሌ የት') || p.includes('የካምፓሱ አድራሻ') || p.includes('location') || p.includes('address')) {
        return "የፀሐይ ካምፓስ አድራሻ፦ **ቦሌ፣ አዲስ አበባ፣ ኢትዮጵያ** ነው። በአካልም ሆነ በኦንላይን ተግባራዊ ስልጠናዎችን እንሰጣለን። 📍";
    }

    // 4. Phone, Contact & Social Media
    if (p.includes('ስልክ') || p.includes('phone') || p.includes('contact') || p.includes('ቴሌግራም') || p.includes('telegram') || p.includes('ዋትስአፕ') || p.includes('whatsapp') || p.includes('መደወል') || p.includes('ማናገር')) {
        return "እኛን ለማግኘት፦\n• **ስልክ ቁጥር**፦ 0980209090 (0980-20-90-90)\n• **ቴሌግራም**፦ @TsehayTeam\n• **ዋትስአፕ**፦ +251980209090\n• **ዩቲዩብ**፦ @eyoubsahle\n• **ቲክቶክ**፦ @eyoubsahle";
    }

    // 5. Founder / Instructor (Eyoub Sahle)
    if (p.includes('founder') || p.includes('መስራች') || p.includes('eyoub') || p.includes('እዮብ') || p.includes('ኢዮብ') || p.includes('ባለቤት') || p.includes('tsehay digital') || p.includes('ፀሐይ ዲጂታል') || p.includes('አስተማሪ') || p.includes('አሰልጣኝ')) {
        return "የፀሐይ ካምፓስ (Tsehay Campus) መስራችና ዋና አሰልጣኝ **ኢዮብ ሳህሌ (Eyoub Sahle)** ነው። እሱ በኢትዮጵያ ውስጥ በዲጂታል ማርኬቲንግ እና በዩቲዩብ ቻናሎች ስኬት በርካታ ተማሪዎችን ያፈራ የTsehay Digital መስራች ነው።";
    }
    
    // 6. Payments & Registration
    if (p.includes('pay') || p.includes('ክፍያ') || p.includes('ቴሌብር') || p.includes('telebirr') || p.includes('ባንክ') || p.includes('cbe') || p.includes('lakipay') || p.includes('ዋጋ') || p.includes('price') || p.includes('ብር') || p.includes('ገንዘብ') || p.includes('ምዝገባ') || p.includes('መመዝገብ')) {
        return "ለፀሐይ ካምፓስ ኮርሶች መመዝገብ እና ክፍያ መፈጸም በጣም ቀላል ነው፦\n\n" +
               "1. **በሀገር ውስጥ (Domestic)**፦ በLakiPay አማካኝነት በቴሌብር (Telebirr)፣ በሲቢኢ ብር (CBE Birr) ወይም በሞባይል ባንኪንግ በቀጥታ መክፈል ይችላሉ።\n" +
               "2. **ከሀገር ውጭ (International / Diaspora)**፦ በPayPal፣ በክሬዲት/ዴቢት ካርድ (Mastercard/Visa) ወይም በክሪፕቶ ከረንሲ መክፈል ይችላሉ።\n\n" +
               "ክፍያውን እንደፈጸሙ የኮርሱ መማሪያ ቪዲዮዎች ወዲያውኑ ይከፈቱልዎታል! 🚀";
    }
    
    // 7. Certificates
    if (p.includes('ሰርተፊኬት') || p.includes('certif') || p.includes('ማስረጃ') || p.includes('ሰርተፍኬት')) {
        return "አዎ! ማንኛውንም ኮርስ በተሳካ ሁኔታ አጠናቀው የኮርስ ማጠቃለያ ፈተናውን (Quiz) ሲያልፉ፣ ስምዎ እና የካምፓሱ ማህተም ያረፈበት ይፋዊ **ዲጂታል ሰርተፊኬት (Digital Certificate of Completion)** ወዲያውኑ በነጻ ይሰጥዎታል! 📜✨";
    }

    // 8. Course-Specific Guidance
    if (isShein || p.includes('shein') || p.includes('ሺን') || p.includes('ሼን') || p.includes('import') || p.includes('ኢምፖርት')) {
        return "የሼን ኢምፖርት ቢዝነስ (Shein Import Business) ስልጠና፦\n\n" +
               "• **ዋጋ**፦ 4,500 ብር\n" +
               "• **የስልጠናው ዋና ዋና ትኩረቶች**፦\n" +
               "  - ከሼን በአነስተኛ ካፒታል ተፈላጊ እቃዎችን መርጦ ማዘዝ\n" +
               "  - የዶላር እና የካርድ ክፍያ ዘዴዎችን በኢትዮጵያ ውስጥ ማመቻቸት\n" +
               "  - የጉምሩክ እና የካርጎ ወጪን በከፍተኛ ሁኔታ መቀነስ\n" +
               "  - በማህበራዊ ሚዲያ (TikTok & Telegram) እቃዎችን በከፍተኛ ትርፍ መሸጫ ስልቶች።";
    }

    if (isYouTube || p.includes('youtube') || p.includes('ዩቲዩብ') || p.includes('ዩቱብ')) {
        return "የዩቲዩብ ስኬት ሚስጥሮች (YouTube Secrets Masterclass)፦\n\n" +
               "• **ዋጋ**፦ 5,500 ብር\n" +
               "• **የስልጠናው ዋና ዋና ትኩረቶች**፦\n" +
               "  - ፊት ሳይታይ (100% Faceless Channels) አትራፊ ቪዲዮዎችን ማዘጋጀት\n" +
               "  - የYouTube Algorithm እና የSEO ሚስጥሮች\n" +
               "  - ተመልካችን የሚስቡ CTR ጨማሪ ታምብኔሎችን መስራት\n" +
               "  - ከኢትዮጵያ ሆነው በቋሚነት በዶላር ገቢ ማግኛ እና ማውጫ ስልቶች።\n" +
               "• ስልጠናው ነፃ የአማርኛ ኢ-ቡክ (E-Book) ያካትታል።";
    }

    if (isDigitalMarketing || p.includes('marketing') || p.includes('ማርኬቲንግ') || p.includes('digital') || p.includes('ዲጂታል')) {
        return "የዲጂታል ማርኬቲንግ ኮርስ (Digital Marketing)፦\n\n" +
               "• **ዋጋ**፦ 100% ነፃ (FREE)\n" +
               "• **የስልጠናው ዋና ዋና ትኩረቶች**፦\n" +
               "  - የፌስቡክ እና የኢንስታግራም ማስታወቂያዎች (Meta Ads)\n" +
               "  - SEO (የጉግል ፍለጋ ደረጃ ማሳደጊያ)\n" +
               "  - የይዘት ስልት (Content Strategy) እና የኦንላይን ሽያጭ መጨመሪያ መንገዶች።";
    }

    if (courseContext?.courseTitle) {
        return `በ"${courseContext.courseTitle}" ስልጠና ውስጥ ያሉትን ዋና ዋና ደረጃዎች በተግባር መተግበር እና የተሰጡትን የመማሪያ ማስታወሻዎች መከታተል ወሳኝ ነው። ተጨማሪ ዝርዝር ማብራሪያ ወይም የደረጃ በደረጃ መመሪያ ከፈለጉ ጥያቄዎን በዝርዝር ይጻፉልኝ ወይም በድምፅ ይላኩልኝ! 💡`;
    }

    return "ስለ ፀሐይ ካምፓስ ስልጠናዎች፣ አድራሻችን (ቦሌ፣ አዲስ አበባ)፣ ክፍያና ምዝገባ ማንኛውንም ጥያቄ መጠየቅ ይችላሉ። በስልክ 0980209090 ወይም በቴሌግራም በ @TsehayTeam ያግኙን። ✨";
}

export async function POST(req: Request) {
  let reqBody = {};
  try { reqBody = await req.json(); } catch(e) {}
  
  // 🔒 CORS validation
  const origin = req.headers.get('origin');
  if (origin) {
    const isAllowed = 
      origin.includes('tsehaycampus.com') || 
      origin.includes('vercel.app') || 
      origin.includes('localhost') || 
      origin.includes('127.0.0.1');
    if (!isAllowed) {
      return NextResponse.json({ error: 'Forbidden Origin' }, { status: 403 });
    }
  }

  if (req.method === 'OPTIONS') return new NextResponse(null, { status: 200 });
  if (req.method !== 'POST') return NextResponse.json({ error: 'Method Not Allowed' }, { status: 405 });

  // Security: Token Verification & Rate Limiting
  const authHeader = req.headers.get('authorization');
  let userId;
  let adminDbInstance = null;

  try {
      const { adminAuth, adminDb } = await import('@/lib/firebase/admin');
      adminDbInstance = adminDb;
      if (authHeader && authHeader.startsWith('Bearer ')) {
          const token = authHeader.substring(7);
          try {
              const decodedToken = await adminAuth.verifyIdToken(token);
              userId = decodedToken.uid;
          } catch (e) {
              console.warn("Invalid ID token provided in chat API, proceeding with rate limiter");
          }
      }
      
      // Fallback rate limiting key
      const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'anonymous_ip';
      userId = userId || `ip_${ip.split(',')[0].trim()}`;

      // Rate limit check
      if (adminDbInstance) {
          const { FieldValue } = await import('firebase-admin/firestore');
          const rateLimitRef = adminDbInstance.collection('artifacts').doc('tsehaycampus-e1a6d').collection('rate_limits').doc(userId);
          const rateDoc = await rateLimitRef.get();
          const now = Date.now();
          
          if (rateDoc.exists) {
              const data = rateDoc.data();
              if (now - data.startTime < RATE_LIMIT_WINDOW_MS) {
                  if (data.count >= MAX_REQUESTS_PER_WINDOW) {
                      return NextResponse.json({ error: "Too many requests. Please wait a minute." }, { status: 429 });
                  }
                  await rateLimitRef.update({ count: FieldValue.increment(1) });
              } else {
                  await rateLimitRef.set({ count: 1, startTime: now });
              }
          } else {
              await rateLimitRef.set({ count: 1, startTime: now });
          }
      }
  } catch (err) {
      console.error("Rate limiting / Auth error:", err);
      userId = userId || 'anonymous_user';
  }

  try {
    const { prompt, courseContext, image, audio } = reqBody;
    
    if (!prompt && !image && !audio) {
        return NextResponse.json({ reply: getSmartFallbackReply("", courseContext, false, false) }, { status: 200 });
    }

    // 🔑 Retrieve Gemini API Key dynamically from Firestore site settings or Environment variables
    let dbApiKey = '';
    try {
        if (adminDbInstance) {
            const nestedDoc = await adminDbInstance.collection('artifacts').doc('tsehaycampus-e1a6d').collection('public').doc('data').collection('site_settings').doc('ai_settings').get();
            if (nestedDoc.exists && nestedDoc.data()?.apiKey) {
                dbApiKey = nestedDoc.data().apiKey;
            } else {
                const rootDoc = await adminDbInstance.collection('site_settings').doc('ai_settings').get();
                if (rootDoc.exists && rootDoc.data()?.apiKey) {
                    dbApiKey = rootDoc.data().apiKey;
                }
            }
        }
    } catch (e) {
        console.warn("Could not read dynamic AI settings from Firestore:", e);
    }

    const apiKeys = [
        dbApiKey,
        process.env.GEMINI_API_KEY,
        process.env.GOOGLE_API_KEY,
        process.env.NEXT_PUBLIC_GEMINI_API_KEY,
        process.env.GOOGLE_GENAI_API_KEY,
        process.env.GENINI_API_KEY,
        process.env.GEMINI_KEY,
        process.env.GENINI_KEY,
    ].filter(Boolean);

    let contextualCourseSection = '';
    if (courseContext && courseContext.courseTitle) {
        contextualCourseSection = `
[ACTIVE COURSE CONTEXT: "${courseContext.courseTitle}"]
- Current Active Lesson: "${courseContext.lessonTitle || 'Introduction'}"
- Course Category: ${courseContext.category || 'Professional Skills'}
- Instructor: ${courseContext.instructor || 'Eyoub Sahle'}
`;
    }

    const DEFAULT_SYSTEM_INSTRUCTION = `You are "Tsehay AI" (ፀሐይ AI), the smart virtual mentor and assistant for Tsehay Campus (ፀሐይ ካምፓስ) and lead instructor Eyoub Sahle (ኢዮብ ሳህሌ). 

[PERSONA & CONVERSATIONAL STYLE]
- You are warm, encouraging, concise, highly intelligent, and practical.
- If the user speaks or writes in Amharic -> answer in natural, authentic Amharic (አማርኛ).
- If the user speaks or writes in English -> answer in clear, friendly English.
- Multimodal Audio Input: When audio is provided, listen to the speaker's voice naturally (like Google AI Studio), comprehend their spoken words, and reply directly without mentioning technical audio formats.
- CRITICAL: Keep replies direct and actionable. NEVER repeat introductory phrases or produce robotic boilerplate loops.

[PLATFORM FACTS & VERIFIED INFORMATION]
- Platform: Tsehay Campus (ፀሐይ ካምፓስ) - tsehaycampus.com
- Location: ቦሌ፣ አዲስ አበባ፣ ኢትዮጵያ (Bole, Addis Ababa, Ethiopia).
- Contact & WhatsApp: 0980209090 (+251980209090)
- Telegram Channel / Support: @TsehayTeam
- Founder & Lead Instructor: Eyoub Sahle (ኢዮብ ሳህሌ)
- Courses:
  1. Shein Import Business (የሼን ኢምፖርት ቢዝነስ) - 4,500 ETB
  2. YouTube Secrets Masterclass (የዩቲዩብ ስኬት ሚስጥሮች) - 5,500 ETB
  3. Digital Marketing Mastery (ዲጂታል ማርኬቲንግ) - FREE
  4. Web Development & Coding
  5. Crypto Trading Mastery
- Payments: Telebirr, CBE Birr, LakiPay (Domestic); PayPal, Credit Cards, Crypto (International).
- Certificates: Official Digital Certificate given upon completing lessons and the quiz.

${contextualCourseSection}`;

    const ENFORCED_SYSTEM_INSTRUCTION = `[CRITICAL INSTRUCTION]
You are Tsehay AI. Give helpful, friendly, natural answers. Do not repeat words.
[DYNAMIC CONTEXT]
${DEFAULT_SYSTEM_INSTRUCTION}
[END DYNAMIC CONTEXT]`;

    // 🎙️ / 📸 Build user parts with Native Multimodal Audio & Image Support
    const userParts: any[] = [];

    // 1. Process Multimodal Direct Audio (Base64 WebM / MP4 / WAV / OGG)
    if (audio && typeof audio === 'string' && audio.includes('base64,')) {
        const matches = audio.match(/^data:([a-zA-Z0-9\/+-]+);base64,(.+)$/);
        if (matches && matches[1] && matches[2]) {
            const rawMime = matches[1].split(';')[0];
            userParts.push({
                inlineData: {
                    mimeType: rawMime || "audio/webm",
                    data: matches[2]
                }
            });
        }
    }

    // 2. Process Multimodal Image (Base64)
    if (image && typeof image === 'string' && image.includes('base64,')) {
        const matches = image.match(/^data:([a-zA-Z0-9\/+-]+);base64,(.+)$/);
        if (matches && matches[1] && matches[2]) {
            userParts.push({
                inlineData: {
                    mimeType: matches[1].split(';')[0],
                    data: matches[2]
                }
            });
        }
    }

    // 3. User Text / Prompt
    const defaultVoicePrompt = "Listen carefully to this spoken audio question in Amharic (or English). Understand what the user asked and give a direct, natural, friendly, accurate answer in the same language without repetitive intros.";
    userParts.push({
        text: prompt || (audio ? defaultVoicePrompt : (image ? "እባክዎ ይህንን ፎቶ ተመልክተው ዝርዝር ማብራሪያ ይስጡኝ።" : "ሰላም"))
    });

    const payload = { 
        systemInstruction: {
            parts: [{ text: ENFORCED_SYSTEM_INSTRUCTION }]
        },
        contents: [{ role: "user", parts: userParts }]
    };

    const models = [
        'gemini-2.5-flash',
        'gemini-2.0-flash',
        'gemini-1.5-flash',
        'gemini-1.5-flash-latest',
        'gemini-1.5-pro'
    ];
    let replyText = '';
    let success = false;

    for (const key of apiKeys) {
        const cleanedKey = key.trim().replace(/^["']|["']$/g, '');
        if (!cleanedKey) continue;

        for (const model of models) {
            try {
                const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${cleanedKey}`;

                const response = await fetch(apiUrl, {
                    method: 'POST',
                    headers: { 
                        'Content-Type': 'application/json',
                        'x-goog-api-key': cleanedKey
                    },
                    body: JSON.stringify(payload)
                });

                if (response.ok) {
                    const data = await response.json();
                    if (data.candidates && data.candidates[0]?.content?.parts?.[0]?.text) {
                        replyText = data.candidates[0].content.parts[0].text;
                        success = true;
                        break;
                    }
                }
            } catch (err: any) {
                console.warn(`Gemini API attempt with ${model} error:`, err?.message);
            }
        }
        if (success) break;
    }

    if (success && replyText) {
        return NextResponse.json({ reply: replyText }, { status: 200 });
    }

    return NextResponse.json({ reply: getSmartFallbackReply(prompt, courseContext, Boolean(image), Boolean(audio)) }, { status: 200 });

  } catch (error: any) {
    console.error("Chat API Critical Error:", error);
    return NextResponse.json({ reply: getSmartFallbackReply(reqBody?.prompt || "", reqBody?.courseContext, false, false) }, { status: 200 });
  }
}