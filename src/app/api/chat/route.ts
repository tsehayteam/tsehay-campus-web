// @ts-nocheck
import { NextResponse } from 'next/server';

const RATE_LIMIT_WINDOW_MS = 60000;
const MAX_REQUESTS_PER_WINDOW = 40;

function getSmartFallbackReply(userPrompt: string, courseContext?: any, hasImage?: boolean): string {
    const p = (userPrompt || '').toLowerCase().trim();
    const courseTitle = (courseContext?.courseTitle || '').toLowerCase();
    const isDigitalMarketing = courseTitle.includes('digital') || courseTitle.includes('marketing') || courseTitle.includes('ማርኬቲንግ');
    const isYouTube = courseTitle.includes('youtube') || courseTitle.includes('ዩቲዩብ');
    const isShein = courseTitle.includes('shein') || courseTitle.includes('ሺን') || courseTitle.includes('ሼን') || courseTitle.includes('import') || courseTitle.includes('ኢምፖርት');

    if (hasImage) {
        return `የላኩትን ፎቶ/ስክሪንሾት ተመልክቼዋለሁ! 📸\n\nበፎቶው ላይ የሚታየውን ነጥብ በተመለከተ፦\n1. በ${courseContext?.courseTitle || 'ትምህርቱ'} መሰረት ዋናው ትኩረት የተግባር ቅደም ተከተሎችን በአግባቡ መከተል ነው።\n2. ለየት ያለ የስህተት መልዕክት (Error) ወይም ጥያቄ ካለዎት፣ ጥያቄዎን በድምፅ ወይም በጽሑፍ አብራርተው ይጠይቁኝ እና ደረጃ በደረጃ እንፈታዋለን! ✨`;
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

    // 3. Address & Location (አድራሻ) - Strict Matching
    if (p.includes('አድራሻ') || p.includes('ቢሮ') || p.includes('ቦሌ የት') || p.includes('የካምፓሱ አድራሻ') || p.includes('location') || p.includes('address')) {
        return "የፀሐይ ካምፓስ አድራሻ፦ **ቦሌ፣ አዲስ አበባ፣ ኢትዮጵያ** ነው። በአካልም ሆነ በኦንላይን ተግባራዊ ስልጠናዎችን እንሰጣለን። 📍";
    }

    // 4. Phone, Contact & Social Media (ስልክ ቁጥር፣ ቴሌግራም፣ ዋትስአፕ)
    if (p.includes('ስልክ') || p.includes('phone') || p.includes('contact') || p.includes('ቴሌግራም') || p.includes('telegram') || p.includes('ዋትስአፕ') || p.includes('whatsapp') || p.includes('መደወል') || p.includes('ማናገር')) {
        return "እኛን ለማግኘት፦\n• **ስልክ ቁጥር**፦ 0980209090 (0980-20-90-90)\n• **ቴሌግራም**፦ @TsehayTeam\n• **ዋትስአፕ**፦ +251980209090\n• **ዩቲዩብ**፦ @eyoubsahle\n• **ቲክቶክ**፦ @eyoubsahle";
    }

    // 5. Founder / Instructor (Eyoub Sahle)
    if (p.includes('founder') || p.includes('መስራች') || p.includes('eyoub') || p.includes('እዮብ') || p.includes('ኢዮብ') || p.includes('ባለቤት') || p.includes('tsehay digital') || p.includes('ፀሐይ ዲጂታል') || p.includes('አስተማሪ') || p.includes('አሰልጣኝ')) {
        return "የፀሐይ ካምፓስ (Tsehay Campus) መስራችና ዋና አሰልጣኝ **ኢዮብ ሳህሌ (Eyoub Sahle)** ነው። እሱ በኢትዮጵያ ውስጥ በዲጂታል ማርኬቲንግ እና በዩቲዩብ ቻናሎች ስኬት በርካታ ተማሪዎችን ያፈራ የTsehay Digital መስራች ነው።";
    }
    
    // 6. Payments & Registration (LakiPay, Telebirr, CBE, PayPal, International)
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

  // Security: Token Verification
  const authHeader = req.headers.get('authorization');
  let userId;

  try {
      const { adminAuth, adminDb } = await import('@/lib/firebase/admin');
      
      if (authHeader && authHeader.startsWith('Bearer ') && authHeader !== 'Bearer ') {
          const idToken = authHeader.split('Bearer ')[1];
          try {
              if (adminAuth) {
                 const decodedToken = await adminAuth.verifyIdToken(idToken);
                 userId = decodedToken.uid;
              } else {
                 userId = 'anonymous_user';
              }
          } catch (error) {
              userId = 'anonymous_user';
          }
      } else {
          userId = req.headers.get('x-forwarded-for') || 'anonymous_user';
      }

      // 🔒 Firestore-backed Rate Limiting
      if (adminDb) {
          const db = adminDb;
          const { FieldValue } = await import('firebase-admin/firestore');
          const rateLimitRef = db.collection('artifacts').doc('tsehaycampus-e1a6d').collection('rate_limits').doc(userId);
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
    const { prompt, courseContext, image } = reqBody;
    
    if (!prompt && !image) {
        return NextResponse.json({ reply: getSmartFallbackReply("", courseContext, false) }, { status: 200 });
    }

    const apiKeys = [
        process.env.GEMINI_API_KEY,
        process.env.GENINI_API_KEY,
        process.env.GOOGLE_API_KEY,
        process.env.GOOGLE_GENAI_API_KEY,
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

    const DEFAULT_SYSTEM_INSTRUCTION = `You are "Tsehay AI", the official intelligent AI assistant and virtual mentor of "Tsehay Campus" and founder/lead instructor Eyoub Sahle (ኢዮብ ሳህሌ). 

[PERSONA & HUMAN TONE]
- You talk and think like an authentic, highly knowledgeable, warm, and helpful Ethiopian mentor.
- Respond concisely, naturally, and directly in pure, fluent Amharic (or English if prompted in English).
- CRITICAL: NEVER repeat words, phrases, or robotic introductions. Jump straight into the helpful response!

[COMPREHENSIVE WEBSITE INFORMATION & VERIFIED PLATFORM FACTS]
- Platform Name: Tsehay Campus (ፀሐይ ካምፓስ)
- Official Website: tsehaycampus.com
- Location & Address: ቦሌ፣ አዲስ አበባ፣ ኢትዮጵያ (Bole, Addis Ababa, Ethiopia). We provide both online AI-assisted courses and practical in-person training.
- Official Phone Number: 0980209090 (0980-20-90-90 / +251980209090)
- Official WhatsApp: 0980209090 (+251980209090)
- Official Telegram Channel: @TsehayTeam
- Founder & Lead Instructor: Eyoub Sahle (ኢዮብ ሳህሌ) - Top Ethiopian Digital Marketer and YouTube Monetization Strategist.
- General Manager: Ribka Teshome (ርብቃ ተሾመ).
- YouTube Channel: youtube.com/@eyoubsahle (@eyoubsahle)
- TikTok Channel: tiktok.com/@eyoubsahle (@eyoubsahle)

[COURSE CATALOG & PRICING]
1. Shein Import Business (የሼን ኢምፖርት ቢዝነስ) - 4,500 ETB (4,500 ብር)
2. YouTube Secrets Masterclass & Monetization (የዩቲዩብ ስኬት ሚስጥሮች) - 900 ETB / 5,500 ETB (includes free Amharic E-Book)
3. Digital Marketing & Social Media (ዲጂታል ማርኬቲንግ) - 100% FREE (ነፃ)
4. Web Development & Coding (ዌብ ዴቨሎፕመንት)
5. Crypto Trading Mastery (የክሪፕቶ ግብይት)
6. Free YouTube Lessons (ነፃ የዩቲዩብ ቪዲዮዎች)

[PAYMENTS, CERTIFICATES & SUPPORT]
- Payment Methods: 
  * Domestic: Telebirr (ቴሌብር), CBE Birr (ሲቢኢ ብር / የኢትዮጵያ ንግድ ባንክ), LakiPay
  * International: PayPal, Credit/Debit cards (Visa/Mastercard), Crypto (NOWPayments)
- Certification: Official Free Digital Certificate of Completion upon finishing lessons and passing the AI quiz with 80%+.
- Support: 24/7 AI Tutor assistance + Telegram support @TsehayTeam + Phone 0980209090.

${contextualCourseSection}`;

    const ENFORCED_SYSTEM_INSTRUCTION = `[CRITICAL SECURITY RULES]
You are the official voice assistant for Tsehay Campus. Keep answers concise (1-2 sentences for voice), warm, and accurate. Do not repeat words.
[END SECURITY RULES]

[DYNAMIC CONTEXT]
${DEFAULT_SYSTEM_INSTRUCTION}
[END DYNAMIC CONTEXT]`;

    // 📸 Build user parts with Multimodal Image Support
    const userParts: any[] = [];

    if (image && typeof image === 'string' && image.includes('base64,')) {
        const matches = image.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+);base64,(.+)$/);
        if (matches && matches[1] && matches[2]) {
            userParts.push({
                inlineData: {
                    mimeType: matches[1],
                    data: matches[2]
                }
            });
        }
    }

    userParts.push({
        text: prompt || (image ? "እባክዎ ይህንን የተያያዘ ፎቶ ወይም ስክሪንሾት ተመልክተው ዝርዝር ትንታኔ እና ተግባራዊ መልስ ይስጡኝ።" : "ሰላም")
    });

    const payload = { 
        systemInstruction: {
            parts: [{ text: ENFORCED_SYSTEM_INSTRUCTION }]
        },
        contents: [{ role: "user", parts: userParts }]
    };

    const models = [
        'gemini-1.5-flash',
        'gemini-1.5-flash-latest',
        'gemini-2.0-flash',
        'gemini-2.0-flash-001',
        'gemini-1.5-pro',
        'gemini-2.5-flash'
    ];
    let lastErrorMsg = '';
    let success = false;
    let replyText = '';

    for (const key of apiKeys) {
        const cleanedKey = key.trim().replace(/^["']|["']$/g, '');
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
                lastErrorMsg = err?.message || 'Network error';
            }
        }
        if (success) break;
    }

    if (success && replyText) {
        return NextResponse.json({ reply: replyText }, { status: 200 });
    }

    return NextResponse.json({ reply: getSmartFallbackReply(prompt, courseContext, Boolean(image)) }, { status: 200 });

  } catch (error: any) {
    console.error("Chat API Critical Error:", error);
    return NextResponse.json({ reply: getSmartFallbackReply(reqBody?.prompt || "", reqBody?.courseContext, false) }, { status: 200 });
  }
}