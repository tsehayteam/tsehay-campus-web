// @ts-nocheck
import { NextResponse } from 'next/server';

const RATE_LIMIT_WINDOW_MS = 60000;
const MAX_REQUESTS_PER_WINDOW = 60;

function getSmartFallbackReply(userPrompt: string, courseContext?: any, hasImage?: boolean, hasAudio?: boolean): string {
    const p = (userPrompt || '').toLowerCase().trim();
    const courseTitle = (courseContext?.courseTitle || '').toLowerCase();
    const activeLesson = (courseContext?.lessonTitle || '').toLowerCase();
    const isDigitalMarketing = courseTitle.includes('digital') || courseTitle.includes('marketing') || courseTitle.includes('ማርኬቲንግ') || p.includes('digital') || p.includes('marketing') || p.includes('ማርኬቲንግ');
    const isYouTube = courseTitle.includes('youtube') || courseTitle.includes('ዩቲዩብ') || courseTitle.includes('ዩቱብ') || p.includes('youtube') || p.includes('ዩቲዩብ') || p.includes('ዩቱብ') || p.includes('ቻናል') || p.includes('ቪዲዮ');
    const isShein = courseTitle.includes('shein') || courseTitle.includes('ሺን') || courseTitle.includes('ሼን') || courseTitle.includes('import') || courseTitle.includes('ኢምፖርት') || p.includes('shein') || p.includes('ሺን') || p.includes('ሼን') || p.includes('import') || p.includes('ኢምፖርት');
    const isCrypto = courseTitle.includes('crypto') || courseTitle.includes('ክሪፕቶ') || p.includes('crypto') || p.includes('ክሪፕቶ') || p.includes('ቢትኮይን') || p.includes('bitcoin') || p.includes('trading') || p.includes('ትሬዲንግ');
    const isCoding = courseTitle.includes('web') || courseTitle.includes('code') || courseTitle.includes('coding') || courseTitle.includes('ዴቨሎፕመንት') || p.includes('web') || p.includes('code') || p.includes('coding') || p.includes('html') || p.includes('javascript') || p.includes('ፕሮግራሚንግ') || p.includes('ኮዲንግ');

    if (hasImage) {
        return `የላኩትን ፎቶ/ስክሪንሾት ተመልክቼዋለሁ! 📸\n\nበምስሉ ላይ የሚታየውን ነጥብ በተመለከተ፦\n1. በ${courseContext?.courseTitle || 'ትምህርቱ'} መሰረት ዋናው ትኩረት የተግባር ቅደም ተከተሎችን በአግባቡ መከተል ነው።\n2. ለየት ያለ የስህተት መልዕክት (Error) ካጋጠመዎት፣ ጥያቄዎን በዝርዝር በጽሑፍ ወይም በድምፅ ይጠይቁኝ እና ደረጃ በደረጃ እንፈታዋለን! ✨`;
    }

    if (hasAudio && !p) {
        return "የላኩልኝን የድምፅ መልዕክት አዳምጫለሁ! 🎙️ ስለ ፀሐይ ካምፓስ ስልጠናዎች፣ ምዝገባ ወይም ስለ ቪዲዮ ትምህርቶች ማንኛውንም ጥያቄ በደስታ እመልሳለሁ። በጽሑፍም ሆነ በድምፅ መቀጠል ይችላሉ!";
    }

    // 1. Off-Topic / Unrelated Queries Guardrail
    const isOffTopic = p.includes('assignment') || p.includes('አሳይመንት') || p.includes('homework') || p.includes('ሆምወርክ') || 
                       p.includes('physics') || p.includes('ፊዚክስ') || p.includes('chemistry') || p.includes('ኬሚስትሪ') || 
                       p.includes('calculus') || p.includes('ማትሪክ') || p.includes('matrix') || p.includes('ዩኒቨርሲቲ') ||
                       p.includes('essay') || p.includes('ግጥም') || p.includes('poem');

    if (isOffTopic && !isYouTube && !isDigitalMarketing && !isShein && !isCrypto && !isCoding) {
        return "ይቅርታ፣ እኔ የተዘጋጀሁት ስለ ፀሐይ ካምፓስ ስልጠናዎች፣ የዩቲዩብ ስኬት እና የዲጂታል ክህሎቶች እርስዎን ለመርዳት ብቻ ነው። ስለ ካምፓሳችን ኮርሶች፣ ምዝገባ ወይም አሰራር ማንኛውንም ጥያቄ ካለዎት በደስታ እመልስልዎታለሁ! ✨";
    }

    // 2. Greetings
    if (
        p === 'ሰላም' || p === 'ሰላም ነው' || p === 'ጤና ይስጥልኝ' || p === 'እንዴት ነህ' || p === 'እንዴት ነሽ' ||
        p.startsWith('ሰላም') || p.startsWith('hello') || p.startsWith('hi') || p.startsWith('hey')
    ) {
        if (courseContext?.courseTitle) {
            return `ሰላም! እንኳን ደህና መጡ! 🌟\n\nበ**"${courseContext.courseTitle}"** ስልጠና ዙሪያ ዛሬ በምን ልርዳዎት? ያልገባዎትን ማንኛውንም ፅንሰ ሀሳብ፣ ተግባራዊ እርምጃ ወይም የቪዲዮ ትምህርት ነጥብ ይጠይቁኝ!`;
        }
        return "ሰላም! እኔ **ፀሐይ AI** ነኝ፤ ወደ ፀሐይ ካምፓስ እንኳን ደህና መጡ! ☀️\n\nዛሬ በምን ልርዳዎት? ስለ ስልጠናዎቻችን (የዩቲዩብ ስኬት፣ የሼን ቢዝነስ፣ ዲጂታል ማርኬቲንግ)፣ ክፍያና ምዝገባ ወይም ሰርተፊኬት ማንኛውንም ጥያቄ በጽሁፍም ሆነ በድምፅ መጠየቅ ይችላሉ።";
    }

    // 3. YouTube Secrets Masterclass & Channel Creation
    if (isYouTube) {
        return `📹 **የዩቲዩብ ስኬት ሚስጥሮች (YouTube Secrets Masterclass)**\n\n` +
               `ይህ ስልጠና በኢትዮጵያ ውስጥ እና በዓለም አቀፍ ደረጃ አትራፊ የዩቲዩብ ቻናል ለመገንባት የሚያስፈልጉ ተግባራዊ ሚስጥሮችን ያካትታል፦\n\n` +
               `• **ዋጋ**፦ 5,500 ብር (አንድ ጊዜ የሚከፈል)\n` +
               `• **ዋና ዋና ትምህርቶች**፦\n` +
               `  1. **Faceless Channels**፦ ፊት እና ማንነት ሳያሳዩ በ AI ድምፅ እና ቪዲዮ ከፍተኛ እይታ የሚስቡ ቪዲዮዎችን ማዘጋጀት\n` +
               `  2. **Algorithm & SEO**፦ ቪዲዮዎችን በዩቲዩብ ፍለጋ እና Suggestion ላይ በቀላሉ እንዲወጡ የማድረጊያ ዘዴዎች\n` +
               `  3. **High-CTR Thumbnails**፦ ተመልካች ሳይወድ በግድ የሚጫናቸው ታምብኔሎች (Cover Images) አሰራር\n` +
               `  4. **Monetization & Payouts**፦ 1,000 Subscribers እና 4,000 Watch Hours በአጭር ጊዜ ማሟላት እና ከኢትዮጵያ ሆነው በዶላር ገቢ ማውጣት\n\n` +
               `🎁 **ልዩ ስጦታ**፦ የተሟላ የአማርኛ የዩቲዩብ ማስተርክላስ E-Book በነፃ ተካቷል!\n\n` +
               `ለመመዝገብ በቴሌብር፣ በሲቢኢ ብር ወይም በLakiPay መክፈል ይችላሉ።`;
    }

    // 4. Shein Import Business
    if (isShein) {
        return `🛍️ **የሼን ኢምፖርት ቢዝነስ (Shein Import Business)**\n\n` +
               `ከሼን (SHEIN) በቀጥታ ተፈላጊ እቃዎችን በማስመጣት በኢትዮጵያ ውስጥ ከፍተኛ ትርፍ የሚያገኙበት የተሟላ ስልጠና፦\n\n` +
               `• **ዋጋ**፦ 4,500 ብር\n` +
               `• **ዋና ዋና ትምህርቶች**፦\n` +
               `  1. **ምርጥ እቃዎችን መምረጥ**፦ በኢትዮጵያ ገበያ ተፈላጊ እና ፈጣን ሽያጭ ያላቸውን ልብሶችና እቃዎች መለየት\n` +
               `  2. **የክፍያ ዘዴዎች (Card & Dollar Payments)**፦ በኢትዮጵያ ውስጥ ሆነው በቀላሉ በዶላር እና በኦንላይን ካርዶች ክፍያ መፈጸም\n` +
               `  3. **ካርጎ እና ማጓጓዣ (Shipping & Customs)**፦ የጉምሩክ እና የትራንስፖርት ወጪን በእጅጉ መቀነሻ ስልቶች\n` +
               `  4. **የሽያጭ ማስተዋወቅ (Marketing)**፦ በ TikTok እና በ Telegram ቻናሎች እቃዎችን በከፍተኛ ትርፍ መሸጫ ዘዴዎች\n\n` +
               `ለመመዝገብ ከፈለጉ "ኮርሶች" ገጽ ላይ በመግባት በቴሌብር ወይም በባንክ ክፍያ ፈጽመው ወዲያውኑ መማር መጀመር ይችላሉ!`;
    }

    // 5. Digital Marketing (Free Course)
    if (isDigitalMarketing) {
        return `🚀 **የዲጂታል ማርኬቲንግ ስልጠና (Digital Marketing Mastery)**\n\n` +
               `• **ዋጋ**፦ 100% ነፃ (FREE)\n` +
               `• **የስልጠናው ይዘቶች**፦\n` +
               `  - የፌስቡክ እና የኢንስታግራም ማስታወቂያዎችን (Meta Ads) ውጤታማ በሆነ መንገድ ማስኬድ\n` +
               `  - የይዘት ስልት (Content Strategy) እና የደንበኞችን ቁጥር በኦንላይን ማሳደግ\n` +
               `  - የጉግል ፍለጋ ማሻሻያ (SEO) እና የዲጂታል ሽያጭ መጨመሪያ ስልቶች\n\n` +
               `ይህንን ስልጠና አሁኑኑ በነፃ ገብተው መከታተል እና ሰርተፊኬት ማግኘት ይችላሉ!`;
    }

    // 6. Web Development & Coding
    if (isCoding) {
        return `💻 **ዌብ ዴቨሎፕመንት እና ኮዲንግ (Web Development Mastery)**\n\n` +
               `ከጀማሪ እስከ ፕሮፌሽናል ዘመናዊ ዌብሳይቶችን እና አፕሊኬሽኖችን መገንባት የሚያስችል ስልጠና፦\n` +
               `• HTML5, CSS3, Tailwind CSS እና Responsive Design\n` +
               `• JavaScript, React, Next.js እና ዘመናዊ የFrontend ቴክኖሎጂዎች\n` +
               `• የዳታቤዝ አያያዝ እና የዌብሳይት ሆስቲንግ ስራዎች።`;
    }

    // 7. Crypto Trading Mastery
    if (isCrypto) {
        return `📈 **የክሪፕቶ ግብይት ስልጠና (Crypto Trading Mastery)**\n\n` +
               `በ Bitcoin እና በ Altcoins ግብይት ዓለም አቀፍ የገበያ ትንተና በማድረግ ትርፋማ መሆን የሚያስችል ስልጠና፦\n` +
               `• Technical & Fundamental Analysis\n` +
               `• Risk Management እና የካፒታል ጥበቃ\n` +
               `• Binance እና የክሪፕቶ ዋሌቶች አጠቃቀም።`;
    }

    // 8. Payments & Registration (ቴሌብር፣ ሲቢኢ፣ LakiPay፣ PayPal)
    if (p.includes('pay') || p.includes('ክፍያ') || p.includes('ቴሌብር') || p.includes('telebirr') || p.includes('ባንክ') || p.includes('cbe') || p.includes('lakipay') || p.includes('ዋጋ') || p.includes('price') || p.includes('ብር') || p.includes('ገንዘብ') || p.includes('ምዝገባ') || p.includes('መመዝገብ') || p.includes('እንዴት ልክፈል')) {
        return `💳 **የክፍያ እና የምዝገባ መንገዶች**\n\n` +
               `ለማንኛውም ኮርስ መመዝገብ በጣም ፈጣን እና ቀላል ነው፦\n\n` +
               `1. **በሀገር ውስጥ (Domestic)**፦\n` +
               `   • በ **LakiPay** አማካኝነት በ **ቴሌብር (Telebirr)**፣ በ **ሲቢኢ ብር (CBE Birr)** ወይም በሞባይል ባንኪንግ በቀጥታ በራስ-ሰር መክፈል ይችላሉ።\n` +
               `2. **ከሀገር ውጭ (International / Diaspora)**፦\n` +
               `   • በ **PayPal**፣ በ **Credit/Debit Card (Visa/Mastercard)** ወይም በ **Crypto** መክፈል ይችላሉ።\n\n` +
               `⚡ ክፍያውን እንደፈጸሙ የኮርሱ ቪዲዮዎች እና ማቴሪያሎች ወዲያውኑ ይከፈቱልዎታል!`;
    }

    // 9. Certificates & Quizzes
    if (p.includes('ሰርተፊኬት') || p.includes('certif') || p.includes('ማስረጃ') || p.includes('ሰርተፍኬት') || p.includes('ፈተና') || p.includes('quiz')) {
        return `📜 **ይፋዊ ዲጂታል ሰርተፊኬት (Certificate of Completion)**\n\n` +
               `አዎ! የኮርሱን የቪዲዮ ትምህርቶች ተከታትለው ሲያጠናቅቁ እና የማጠቃለያ ፈተናውን (Quiz) 80%+ ውጤት ሲያመጡ፦\n` +
               `• ስምዎ፣ የኮርሱ ርዕስ እና የካምፓሱ ይፋዊ ማህተም ያረፈበት **ዲጂታል ሰርተፊኬት** ወዲያውኑ በነፃ ይሰጥዎታል።\n` +
               `• ሰርተፊኬቱን ማውረድ (Download) እና በ LinkedIn ወይም በ CV ላይ መጠቀም ይችላሉ! 🎓`;
    }

    // 10. Contact, Support, Telegram, Phone & Location
    if (p.includes('ስልክ') || p.includes('phone') || p.includes('contact') || p.includes('ቴሌግራም') || p.includes('telegram') || p.includes('ዋትስአፕ') || p.includes('whatsapp') || p.includes('መደወል') || p.includes('ማናገር') || p.includes('አድራሻ') || p.includes('ቢሮ') || p.includes('ቦሌ') || p.includes('location')) {
        return `📞 **የፀሐይ ካምፓስ አድራሻ እና የእውቂያ መንገዶች**\n\n` +
               `• **አድራሻ**፦ ቦሌ፣ አዲስ አበባ፣ ኢትዮጵያ (Bole, Addis Ababa, Ethiopia)\n` +
               `• **ስልክ ቁጥር**፦ **0980209090** (0980-20-90-90 / +251980209090)\n` +
               `• **ቴሌግራም**፦ **@TsehayTeam** (https://t.me/tsehaycampus)\n` +
               `• **ዋትስአፕ**፦ **+251980209090**\n` +
               `• **ዩቲዩብ ቻናል**፦ **@eyoubsahle** (youtube.com/@eyoubsahle)\n` +
               `• **ቲክቶክ**፦ **@eyoubsahle**`;
    }

    // 11. Founder / Instructor (Eyoub Sahle)
    if (p.includes('founder') || p.includes('መስራች') || p.includes('eyoub') || p.includes('እዮብ') || p.includes('ኢዮብ') || p.includes('ባለቤት') || p.includes('tsehay digital') || p.includes('ፀሐይ ዲጂታል') || p.includes('አስተማሪ') || p.includes('አሰልጣኝ')) {
        return `👨‍🏫 **ስለ አሰልጣኙ (ኢዮብ ሳህሌ / Eyoub Sahle)**\n\n` +
               `የፀሐይ ካምፓስ (Tsehay Campus) መስራች እና ዋና አሰልጣኝ **ኢዮብ ሳህሌ (Eyoub Sahle)** ነው።\n` +
               `እሱ በኢትዮጵያ ውስጥ በዲጂታል ማርኬቲንግ እና በዩቲዩብ ቻናሎች ስኬት በርካታ ተማሪዎችን ያፈራ፣ የ Tsehay Digital መስራች እና የ 100k+ ተከታዮች ያሉት የዩቲዩብ ባለሙያ ነው።`;
    }

    // 12. Active Lesson context query
    if (courseContext?.courseTitle) {
        return `በ**"${courseContext.courseTitle}"** ስልጠና ውስጥ ያሉትን ዋና ዋና ደረጃዎች በተግባር መተግበር እና የተሰጡትን የመማሪያ ማስታወሻዎች መከታተል ወሳኝ ነው።\n\nተጨማሪ ዝርዝር ማብራሪያ ወይም የደረጃ በደረጃ መመሪያ ከፈለጉ ጥያቄዎን በዝርዝር ይጻፉልኝ ወይም በድምፅ ይላኩልኝ! 💡`;
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

    const DEFAULT_SYSTEM_INSTRUCTION = `You are "Tsehay AI" (ፀሐይ AI), the smart, world-class virtual mentor and assistant for Tsehay Campus (ፀሐይ ካምፓስ) and lead mentor Eyoub Sahle (ኢዮብ ሳህሌ).

[CRITICAL LANGUAGE DETECTION & ADAPTATION]
- If the user communicates in Amharic (አማርኛ) -> You MUST respond entirely in natural, fluent, engaging Amharic.
- If the user communicates in English -> You MUST respond entirely in polished, friendly, professional English.
- Seamlessly adapt to the user's language automatically.

[BEAUTIFUL STRUCTURE & AESTHETIC FORMATTING RULES]
- Structure all answers with high visual quality:
  1. Use clear, tasteful markdown headings (e.g., "### 🌟 የኮርሱ አጠቃላይ ገጽታ" or "### 💡 ዋና ዋና ደረጃዎች").
  2. Use structured bullet points with bold keywords: "• **ቁልፍ ነጥብ፦** ማብራሪያ...".
  3. Use numbered lists for sequential steps: "1. **ደረጃ አንድ**፦ ...".
  4. Include vibrant, tasteful emojis (✨, 🚀, 💡, 📚, 🎬, 💳, 📜, 📞, 🌟) to make the text lively and readable.
  5. Never produce a wall of unformatted text or robotic boilerplate repetitions.

[PLATFORM KNOWLEDGE BASE]
- Platform: Tsehay Campus (ፀሐይ ካምፓስ) - tsehaycampus.com
- Location: ቦሌ፣ አዲስ አበባ፣ ኢትዮጵያ (Bole, Addis Ababa, Ethiopia)
- Phone & WhatsApp: 0980209090 (+251980209090)
- Telegram Channel & Support: @TsehayTeam (https://t.me/tsehaycampus)
- Founder & Lead Mentor: Eyoub Sahle (ኢዮብ ሳህሌ)
- Flagship Courses:
  1. **Shein Import Business (የሼን ኢምፖርት ቢዝነስ)** - 4,500 ETB
  2. **YouTube Secrets Masterclass & Monetization (የዩቲዩብ ስኬት ሚስጥሮች)** - 5,500 ETB (includes free Amharic E-Book)
  3. **Digital Marketing Mastery (ዲጂታል ማርኬቲንግ)** - 100% FREE
  4. **Web Development & Coding (ዌብ ዴቨሎፕመንት)**
  5. **Crypto Trading Mastery (የክሪፕቶ ግብይት)**
- Payment Methods: Telebirr (ቴሌብር), CBE Birr (ሲቢኢ ብር), LakiPay (Domestic); PayPal, Credit/Debit Cards, Crypto (International).
- Certification: Free official Digital Certificate of Completion upon passing the quiz (80%+).

${contextualCourseSection}`;

    // 🎙️ / 📸 Build user parts with Native Multimodal Audio & Image Support
    const userParts: any[] = [];

    // 1. Process Multimodal Direct Audio (Base64)
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
            parts: [{ text: DEFAULT_SYSTEM_INSTRUCTION }]
        },
        contents: [{ role: "user", parts: userParts }],
        generationConfig: {
            temperature: 0.7,
            topP: 0.95,
            maxOutputTokens: 2048
        }
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