// @ts-nocheck
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

import { NextResponse } from 'next/server';

const RATE_LIMIT_WINDOW_MS = 60000;
const MAX_REQUESTS_PER_WINDOW = 60;

function getSmartFallbackReply(userPrompt: string, courseContext?: any, hasImage?: boolean, hasAudio?: boolean, preferredLanguage?: string): string {
    const raw = (userPrompt || '').trim();
    const p = raw.toLowerCase();
    const courseTitle = (courseContext?.courseTitle || '').toLowerCase();
    const activeLesson = (courseContext?.lessonTitle || '').toLowerCase();

    // 🌐 STRICT LANGUAGE DETERMINATION
    const hasEthiopic = /[\u1200-\u137F]/.test(raw);
    let isEnglish = false;
    if (preferredLanguage === 'en') {
      isEnglish = true;
    } else if (preferredLanguage === 'am') {
      isEnglish = false;
    } else {
      isEnglish = !hasEthiopic && (
        /[a-zA-Z]{2,}/.test(raw) || 
        /^(hi|hello|hey|help|how|what|who|where|can|why|is|tell|price|cost|course|youtube|shein|marketing|pay|payment|certificate|contact|admin|owner|enroll|register)/i.test(p)
      );
    }

    const isDigitalMarketing = courseTitle.includes('digital') || courseTitle.includes('marketing') || courseTitle.includes('ማርኬቲንግ') || p.includes('digital') || p.includes('marketing') || p.includes('ማርኬቲንግ');
    const isYouTube = courseTitle.includes('youtube') || courseTitle.includes('ዩቲዩብ') || courseTitle.includes('ዩቱብ') || p.includes('youtube') || p.includes('ዩቲዩብ') || p.includes('ዩቱብ') || p.includes('ቻናል') || p.includes('ቪዲዮ');
    const isShein = courseTitle.includes('shein') || courseTitle.includes('ሺን') || courseTitle.includes('ሼን') || courseTitle.includes('import') || courseTitle.includes('ኢምፖርት') || p.includes('shein') || p.includes('ሺን') || p.includes('ሼን') || p.includes('import') || p.includes('ኢምፖርት');
    const isCrypto = courseTitle.includes('crypto') || courseTitle.includes('ክሪፕቶ') || p.includes('crypto') || p.includes('ክሪፕቶ') || p.includes('ቢትኮይን') || p.includes('bitcoin') || p.includes('trading') || p.includes('ትሬዲንግ');
    const isCoding = courseTitle.includes('web') || courseTitle.includes('code') || courseTitle.includes('coding') || courseTitle.includes('ዴቨሎፕመንት') || p.includes('web') || p.includes('code') || p.includes('coding') || p.includes('html') || p.includes('javascript') || p.includes('ፕሮግራሚንግ') || p.includes('ኮዲንግ');
    const isMentorship = p.includes('mentorship') || p.includes('ማማከር') || p.includes('ቀጠሮ') || p.includes('1-on-1') || p.includes('1-ለ-1') || p.includes('አማካሪ') || p.includes('consult');

    if (hasImage) {
        if (isEnglish) {
            return `I have reviewed your attached screenshot/image! 📸\n\nRegarding the topic shown:\n1. In line with ${courseContext?.courseTitle || 'the course curriculum'}, the primary focus is following the step-by-step practical implementation.\n2. If you encountered a specific error or issue, feel free to describe it in detail via text or voice, and we will solve it together! ✨`;
        }
        return `የላኩትን ፎቶ/ስክሪንሾት ተመልክቼዋለሁ! 📸\n\nበምስሉ ላይ የሚታየውን ነጥብ በተመለከተ፦\n1. በ${courseContext?.courseTitle || 'ትምህርቱ'} መሰረት ዋናው ትኩረት የተግባር ቅደም ተከተሎችን በአግባቡ መከተል ነው።\n2. ለየት ያለ የስህተት መልዕክት (Error) ካጋጠመዎት፣ ጥያቄዎን በዝርዝር በጽሑፍ ወይም በድምፅ ይጠይቁኝ እና ደረጃ በደረጃ እንፈታዋለን! ✨`;
    }

    if (hasAudio && !p) {
        if (isEnglish) {
            return "I received and listened to your voice message! 🎙️ I am happy to answer any questions about Tsehay Campus courses, registration, video lessons, or certificates. Feel free to continue via text or voice!";
        }
        return "የላኩልኝን የድምፅ መልዕክት አዳምጫለሁ! 🎙️ ስለ ፀሐይ ካምፓስ ስልጠናዎች፣ ምዝገባ ወይም ስለ ቪዲዮ ትምህርቶች ማንኛውንም ጥያቄ በደስታ እመልሳለሁ። በጽሑፍም ሆነ በድምፅ መቀጠል ይችላሉ!";
    }

    // 1. General Business / Tech / Knowledge Assistance (No rigid refusals)
    const isGeneralKnowledge = p.includes('business') || p.includes('ቢዝነስ') || p.includes('tech') || p.includes('ቴክኖሎጂ') || 
                               p.includes('ai') || p.includes('ኮዲንግ') || p.includes('ስራ') || p.includes('ገቢ');

    if (!isYouTube && !isDigitalMarketing && !isShein && !isCrypto && !isCoding && !isMentorship && isGeneralKnowledge) {
        if (isEnglish) {
            return `### 💡 Tsehay AI Comprehensive Advisory\n\nRegarding your question on **${raw || 'business & technology'}**:\n\n1. **Core Concept**: Focus on scalable, high-value skills and consistent practical execution.\n2. **Practical Strategy**: Leverage modern digital tools (AI, social media marketing, and smart payment gateways) to reach your audience effectively.\n3. **Next Steps**: Apply what you learn in our structured courses on Tsehay Campus to turn this knowledge into sustainable income!\n\nFeel free to ask more specific questions or dive deeper into any topic! ✨`;
        }
        return `### 💡 የፀሐይ AI ሁለንተናዊ የቢዝነስ እና የቴክኖሎጂ ማብራሪያ\n\nስለ **${raw || 'ቢዝነስ እና ቴክኖሎጂ'}** ላቀረቡት ጥያቄ፦\n\n1. **ዋነኛ መርህ**፦ ተፈላጊና ዘመናዊ ክህሎቶችን (Digital Skills) በተግባር መማር እና ወጥ የሆነ ስራ መስራት ለስኬት መሰረት ነው።\n2. **የተግባር ስልት**፦ የ AI መሳሪያዎችን፣ የዲጂታል ማርኬቲንግ እና ዘመናዊ የክፍያ መንገዶችን ተጠቅመው ስራዎን በቀላሉ ያሳድጉ።\n3. **የቀጣይ እርምጃ**፦ በፀሐይ ካምፓስ ኮርሶቻችን ውስጥ የተካተቱትን ተግባራዊ መንገዶች በመከተል ወደ ከፍተኛ ገቢ ይቀይሩት!\n\nተጨማሪ ማብራሪያ ወይም በየትኛውም ርዕስ ዙሪያ ጥያቄ ካለዎት በነፃነት ይጠይቁኝ! ✨`;
    }

    // 2. Greetings
    if (
        p === 'ሰላም' || p === 'ሰላም ነው' || p === 'ጤና ይስጥልኝ' || p === 'እንዴት ነህ' || p === 'እንዴት ነሽ' ||
        p.startsWith('ሰላም') || p.startsWith('hello') || p.startsWith('hi') || p.startsWith('hey')
    ) {
        if (isEnglish) {
            if (courseContext?.courseTitle) {
                return `Hello! Welcome! 🌟\n\nHow can I help you today regarding the **"${courseContext.courseTitle}"** course? Feel free to ask any conceptual, practical, or technical questions!`;
            }
            return "Hello! I am **Tsehay AI**, your personal virtual tutor and guide for Tsehay Campus! ☀️\n\nHow can I assist you today? You can ask me anything about our courses (YouTube Secrets Masterclass, Shein Import Business, Digital Marketing), payments, registration, mentorship, or official certificates!";
        }

        if (courseContext?.courseTitle) {
            return `ሰላም! እንኳን ደህና መጡ! 🌟\n\nበ**"${courseContext.courseTitle}"** ስልጠና ዙሪያ ዛሬ በምን ልርዳዎት? ያልገባዎትን ማንኛውንም ፅንሰ ሀሳብ፣ ተግባራዊ እርምጃ ወይም የቪዲዮ ትምህርት ነጥብ ይጠይቁኝ!`;
        }
        return "ሰላም! እኔ **ፀሐይ AI** ነኝ፤ ወደ ፀሐይ ካምፓስ እንኳን ደህና መጡ! ☀️\n\nዛሬ በምን ልርዳዎት? ስለ ስልጠናዎቻችን (የዩቲዩብ ስኬት፣ የሼን ቢዝነስ፣ ዲጂታል ማርኬቲንግ)፣ ክፍያና ምዝገባ፣ ማማከር ወይም ሰርተፊኬት ማንኛውንም ጥያቄ በጽሁፍም ሆነ በድምፅ መጠየቅ ይችላሉ።";
    }

    // 🌟 DYNAMIC ACTIVE COURSE QUICK ACTIONS
    if (courseContext?.courseTitle) {
        const ct = courseContext.courseTitle;
        const wyl = courseContext.whatYouWillLearn || '';
        const lt = courseContext.lessonTitle || '';

        // A. Course Summary
        if (p.includes('ማጠቃለያ') || p.includes('summary') || p.includes('አጠቃልል')) {
            if (isEnglish) {
                return `### 📚 "${ct}" Comprehensive Summary\n\nThis practical masterclass is specifically structured to give you end-to-end expertise:\n\n• **Core Focus**: ${wyl || 'Actionable, real-world skills and proven monetization workflows.'}\n${lt ? `• **Current Module**: ${lt}\n` : ''}• **Key Outcome**: Learn how to systematically build, launch, and monetize in Ethiopia and global markets.\n\nAsk me about any specific lesson or practical technique to dive deeper! ✨`;
            }
            return `### 📚 የ"${ct}" ስልጠና አጠቃላይ ማጠቃለያ\n\nይህ ተግባራዊ ስልጠና ከዜሮ ተነስተው በዘርፉ ብቁ እና ገቢ ፈጣሪ እንዲሆኑ የተቀረጸ ነው፦\n\n• **የስልጠናው ዋና ትኩረት**፦ ${wyl || 'በተግባር የተደገፉ የገበያ እና የቴክኖሎጂ ስልቶችን መተግበር'}\n${lt ? `• **አሁን ያለዎት ትምህርት**፦ ${lt}\n` : ''}• **የሚገኘው ውጤት**፦ በኢትዮጵያ እና በዓለም አቀፍ ደረጃ በቀላሉ ወደ ስራ በመግባት አትራፊ መሆን።\n\nስለ የትኛውም የትምህርቱ ክፍል ወይም አተገባበር ጥያቄ ካለዎት ይጠይቁኝ! ✨`;
        }

        // B. Action Steps
        if (p.includes('ተግባር') || p.includes('action') || p.includes('እርምጃ') || p.includes('እንዴት ልተግብር')) {
            if (isEnglish) {
                return `### 🚀 Actionable Roadmap for "${ct}"\n\nTo turn what you learn in **${ct}** into profitable real-world success:\n\n1. **Step 1 (Master Foundations)**: Watch lessons sequentially and implement the assigned worksheets.\n2. **Step 2 (Setup & Tools)**: Configure necessary software, accounts, and payment systems.\n3. **Step 3 (First Launch / Execution)**: Launch your first practical campaign, content, or product listing.\n4. **Step 4 (Scale & Profit)**: Optimize based on analytics and multiply your revenue streams!\n\nWhich step would you like specific guidance on? 💡`;
            }
            return `### 🚀 የ"${ct}" የተግባር እርምጃዎች (Practical Roadmap)\n\nበ**${ct}** የተማሩትን ወደ እውነተኛ ገቢ ለመቀየር የሚከተሉትን 4 ዋና ዋና ደረጃዎች ይተግብሩ፦\n\n1. **ደረጃ 1 (ትምህርቱን መረዳት)**፦ የቪዲዮ ትምህርቶቹን በቅደም ተከተል በመከታተል ቁልፍ ነጥቦችን ይያዙ።\n2. **ደረጃ 2 (የስራ ማዋቀር)**፦ ለስራው አስፈላጊ የሆኑ መተግበሪያዎችን እና የክፍያ መንገዶችን ያዘጋጁ።\n3. **ደረጃ 3 (የመጀመሪያ ሙከራ)**፦ በስልጠናው በተማሩት መሰረት የመጀመሪያዎን ይዘት ወይም ስራ በተግባር ይጀምሩ።\n4. **ደረጃ 4 (ገቢ ማሳደግ)**፦ ወጥነትን በመጠበቅ እና ጥራትን በማሻሻል ገቢዎን በየጊዜው ያሳድጉ!\n\nበየትኛው ደረጃ ላይ እገዛ ይፈልጋሉ? 💡`;
        }

        // C. Beginner Explanation
        if (p.includes('ጀማሪ') || p.includes('beginner') || p.includes('አብራራልኝ') || p.includes('ቀላል')) {
            if (isEnglish) {
                return `### 💡 "${ct}" Simplified for Beginners\n\nEven with zero prior experience, **${ct}** is designed to take you from the basics to professional confidence:\n\n• **Core Concept**: Breaking down complex industry methods into simple daily steps.\n• **How You Learn**: Follow along video demonstrations with real examples.\n\nTell me which specific concept feels tricky, and I'll explain it simply! 🌟`;
            }
            return `### 💡 "${ct}" ለጀማሪዎች በቀላል አማርኛ\n\nምንም አይነት የቅድመ-ልምድ ባይኖርዎትም ይህ ስልጠና ከዜሮ ተነስተው ደረጃ በደረጃ እንዲረዱት የተዘጋጀ ነው፦\n\n• **ዋናው ሀሳብ**፦ ውስብስብ የሚመስሉ የቢዝነስ እና የቴክኖሎጂ ስልቶችን ወደ ቀላል የተግባር እርምጃዎች መቀየር ነው።\n• **የአጠናን ዘዴ**፦ የኢዮብ ሳህሌን የቪዲዮ ማሳያዎች እየተመለከቱ እርስዎም አብረው ይሰራሉ።\n\nያልገባዎትን ወይም እንዲብራራልዎ የሚፈልጉትን ማንኛውንም ነጥብ እዚህ ይጻፉልኝ! 🌟`;
        }

        // D. Quiz Generator
        if (p.includes('ፈተና') || p.includes('quiz') || p.includes('ጥያቄ አዘጋጅ') || p.includes('ጥያቄ ጠይቀኝ')) {
            if (isEnglish) {
                return `### 📝 "${ct}" Practical Knowledge Check\n\nAnswer these 3 practical questions to test your understanding:\n\n1. What is the single most critical factor for success in **${ct}**?\n2. What is the best strategy to overcome the most common beginner obstacle in this field?\n3. How will you apply the core technique from this course to generate your first results?\n\nType your answers below and I will review and grade them with helpful feedback! 🎯`;
            }
            return `### 📝 የ"${ct}" የተግባር መፈተኛ ጥያቄዎች\n\nእውቀትዎን ለመፈተሽ የሚከተሉትን 3 ጥያቄዎች ይመልሱ፦\n\n1. በ**${ct}** ስልጠና መሰረት ለስኬት በጣም ወሳኙ የመጀመሪያ እርምጃ ምንድን ነው?\n2. በስራ ሂደት ውስጥ የሚያጋጥመውን ዋነኛ ተግዳሮት በቀላሉ እንዴት ማለፍ ይቻላል?\n3. ከስልጠናው ያገኙትን እውቀት ተጠቅመው የመጀመሪያ ገቢዎን እንዴት መፍጠር ይችላሉ?\n\nመልስዎን እዚህ ይጻፉልኝ እና ትክክለኛነቱን ገምግሜ ዝርዝር ማብራሪያ እሰጥዎታለሁ! 🎯`;
        }

        // E. Business Idea Generation
        if (p.includes('ሀሳብ') || p.includes('business') || p.includes('ቢዝነስ') || p.includes('አመንጭ')) {
            if (isEnglish) {
                return `### 💡 Lucrative Business Ideas with "${ct}"\n\nBased on the curriculum of **${ct}**, here are top actionable business opportunities you can start in Ethiopia or remotely:\n\n1. **Direct Service / Creation**: Offer specialized solutions directly to clients and businesses.\n2. **Digital Consulting & Management**: Manage channels, campaigns, or logistics for local and international brands.\n3. **Independent Monetization**: Build your own independent brand and generate scalable passive income!\n\nWhich of these business models excites you the most? 🚀`;
            }
            return `### 💡 በ"${ct}" የሚጀመሩ አትራፊ የቢዝነስ ሀሳቦች\n\nበ**${ct}** ባገኙት እውቀት መሰረት በኢትዮጵያ ውስጥ ወይም በኦንላይን ሊጀምሯቸው የሚችሉ 3 አዋጭ የስራ መስኮች፦\n\n1. **የቀጥታ ስራ / አገልግሎት መስጠት**፦ የተማሩትን ክህሎት ለድርጅቶች እና ለግለሰቦች በመስራት ፈጣን ገቢ ማግኘት\n2. **የዲጂታል አስተዳደር እና ማማከር**፦ የሌሎችን ቻናሎች፣ ማስታወቂያዎች ወይም የንግድ ስራዎች በማስተዳደር ወርሃዊ ክፍያ ማግኘት\n3. **የራስዎን ገለልተኛ ቢዝነስ መገንባት**፦ የራስዎን ብራንድ በማቋቋም ተከታታይ እና ዘላቂ የገቢ ምንጭ መፍጠር!\n\nከእነዚህ ውስጥ የትኛውን ቢዝነስ መጀመር ይፈልጋሉ? 🚀`;
        }
    }

    // 3. 1-on-1 Mentorship Booking
    if (isMentorship) {
        if (isEnglish) {
            return `🤝 **1-on-1 Private Mentorship with Eyoub Sahle**\n\n` +
                   `You can book a personal 1-on-1 mentorship session directly on Tsehay Campus:\n\n` +
                   `• **Focus Areas**: YouTube Growth & Monetization, Shein & E-Commerce Business, Digital Marketing, or scaling an online venture.\n` +
                   `• **Format**: 45-Minute private video consultation + custom action plan.\n` +
                   `• **How to Book**: Navigate to the **/mentorship** page, select your preferred date & time, fill in your details, and submit! 🚀`;
        }
        return `🤝 **ከኢዮብ ሳህሌ ጋር የ 1-ለ-1 የቀጥታ የማማከር ክፍለ-ጊዜ (Mentorship)**\n\n` +
               `በማንኛውም የኦንላይን ቢዝነስ ዙሪያ ከኢዮብ ሳህሌ ጋር በግል ተገናኝተው መማከር ይችላሉ፦\n\n` +
               `• **የማማከሪያ ርዕሶች**፦ የዩቲዩብ ቻናል ስትራቴጂ፣ የሼን እና የኢ-ኮሜርስ ንግድ፣ ዲጂታል ማርኬቲንግ ወይም የኦንላይን ገቢ ማሳደግ።\n` +
               `• **አካሄድ**፦ የ 45 ደቂቃ የቀጥታ የቪዲዮ ቆይታ እና ለቢዝነስዎ የሚሆን ልዩ የድርጊት መርሃግብር (Action Plan)።\n` +
               `• **ቀጠሮ ለማስያዝ**፦ ወደ **/mentorship** ገጽ በመሄድ የቀንና ሰዓት ምርጫዎን ያስገቡና ቀጠሮ ይያዙ! 🚀`;
    }

    // 4. YouTube Secrets Masterclass & Channel Creation
    if (isYouTube) {
        if (isEnglish) {
            return `📹 **YouTube Secrets Masterclass & Monetization**\n\n` +
                   `This practical training covers everything needed to build a highly lucrative YouTube channel from Ethiopia or globally:\n\n` +
                   `• **Price**: 5,500 ETB (One-time payment)\n` +
                   `• **Core Modules**:\n` +
                   `  1. **Faceless Channels**: Creating high-view AI videos without showing your face\n` +
                   `  2. **Algorithm & SEO**: Getting your videos ranked on YouTube Search and Recommended\n` +
                   `  3. **High-CTR Thumbnails**: Designing irresistible thumbnails that drive viral click rates\n` +
                   `  4. **Monetization & Payouts**: Reaching 1,000 Subscribers & 4,000 Watch Hours fast, and withdrawing earnings in USD\n\n` +
                   `🎁 **Bonus**: Full Amharic YouTube Masterclass E-Book included for free!\n\n` +
                   `Enroll now via Telebirr, CBE Birr, LakiPay, or PayPal/Cards!`;
        }
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

    // 5. Shein Import Business
    if (isShein) {
        if (isEnglish) {
            return `🛍️ **Shein Import & E-Commerce Mastery**\n\n` +
                   `Learn how to import high-demand products directly from SHEIN and make profitable returns in Ethiopia:\n\n` +
                   `• **Price**: 4,500 ETB\n` +
                   `• **Curriculum**:\n` +
                   `  1. **Product Sourcing**: Identifying fast-moving, high-margin clothing & accessories\n` +
                   `  2. **Online Card Payments**: Making dollar payments smoothly from Ethiopia\n` +
                   `  3. **Cargo & Logistics**: Minimizing customs, tax, and freight fees\n` +
                   `  4. **TikTok & Telegram Marketing**: Selling items rapidly with premium profits\n\n` +
                   `Visit the Courses page to enroll and start learning instantly!`;
        }
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

    // 6. Digital Marketing (Free Course)
    if (isDigitalMarketing) {
        if (isEnglish) {
            return `🚀 **Digital Marketing Mastery (100% FREE)**\n\n` +
                   `• **Price**: 100% Free\n` +
                   `• **Course Highlights**:\n` +
                   `  - High-performing Meta Ads (Facebook & Instagram)\n` +
                   `  - Strategic Content Planning & Online Audience Growth\n` +
                   `  - Search Engine Optimization (SEO) & Sales Conversion Optimization\n\n` +
                   `Enroll now for free and earn your Certificate of Completion!`;
        }
        return `🚀 **የዲጂታል ማርኬቲንግ ስልጠና (Digital Marketing Mastery)**\n\n` +
               `• **ዋጋ**፦ 100% ነፃ (FREE)\n` +
               `• **የስልጠናው ይዘቶች**፦\n` +
               `  - የፌስቡክ እና የኢንስታግራም ማስታወቂያዎችን (Meta Ads) ውጤታማ በሆነ መንገድ ማስኬድ\n` +
               `  - የይዘት ስልት (Content Strategy) እና የደንበኞችን ቁጥር በኦንላይን ማሳደግ\n` +
               `  - የጉግል ፍለጋ ማሻሻያ (SEO) እና የዲጂታል ሽያጭ መጨመሪያ ስልቶች\n\n` +
               `ይህንን ስልጠና አሁኑኑ በነፃ ገብተው መከታተል እና ሰርተፊኬት ማግኘት ይችላሉ!`;
    }

    // 7. Web Development & Coding
    if (isCoding) {
        if (isEnglish) {
            return `💻 **Web Development & Coding Mastery**\n\n` +
                   `Learn to build responsive, modern full-stack web applications from scratch:\n` +
                   `• HTML5, CSS3, Tailwind CSS & Responsive Layouts\n` +
                   `• JavaScript, React, Next.js & Modern Frontend Frameworks\n` +
                   `• Database Management, REST APIs, and Cloud Deployment.`;
        }
        return `💻 **ዌብ ዴቨሎፕመንት እና ኮዲንግ (Web Development Mastery)**\n\n` +
               `ከጀማሪ እስከ ፕሮፌሽናል ዘመናዊ ዌብሳይቶችን እና አፕሊኬሽኖችን መገንባት የሚያስችል ስልጠና፦\n` +
               `• HTML5, CSS3, Tailwind CSS እና Responsive Design\n` +
               `• JavaScript, React, Next.js እና ዘመናዊ የFrontend ቴክኖሎጂዎች\n` +
               `• የዳታቤዝ አያያዝ እና የዌብሳይት ሆስቲንግ ስራዎች።`;
    }

    // 8. Crypto Trading Mastery
    if (isCrypto) {
        if (isEnglish) {
            return `📈 **Crypto Trading Mastery**\n\n` +
                   `Master profitable trading strategies on Bitcoin and Altcoins with global market analysis:\n` +
                   `• Technical & Fundamental Chart Analysis\n` +
                   `• Risk Management & Capital Preservation\n` +
                   `• Binance, Exchanges, and Secure Crypto Wallets.`;
        }
        return `📈 **የክሪፕቶ ግብይት ስልጠና (Crypto Trading Mastery)**\n\n` +
               `በ Bitcoin እና በ Altcoins ግብይት ዓለም አቀፍ የገበያ ትንተና በማድረግ ትርፋማ መሆን የሚያስችል ስልጠና፦\n` +
               `• Technical & Fundamental Analysis\n` +
               `• Risk Management እና የካፒታል ጥበቃ\n` +
               `• Binance እና የክሪፕቶ ዋሌቶች አጠቃቀም።`;
    }

    // 9. Payments & Registration
    if (p.includes('pay') || p.includes('ክፍያ') || p.includes('ቴሌብር') || p.includes('telebirr') || p.includes('ባንክ') || p.includes('cbe') || p.includes('lakipay') || p.includes('ዋጋ') || p.includes('price') || p.includes('ብር') || p.includes('ገንዘብ') || p.includes('ምዝገባ') || p.includes('መመዝገብ') || p.includes('እንዴት ልክፈል') || p.includes('how to pay')) {
        if (isEnglish) {
            return `💳 **Payment & Registration Methods**\n\n` +
                   `Enrolling in any course is instant and straightforward:\n\n` +
                   `1. **Domestic (In Ethiopia)**:\n` +
                   `   • Pay directly and automatically via **Telebirr**, **CBE Birr**, or Mobile Banking through **LakiPay**.\n` +
                   `2. **International / Diaspora**:\n` +
                   `   • Pay securely via **PayPal**, **Visa / Mastercard (Credit/Debit)**, or **Crypto**.\n\n` +
                   `⚡ Course lessons unlock automatically and immediately upon payment confirmation!`;
        }
        return `💳 **የክፍያ እና የምዝገባ መንገዶች**\n\n` +
               `ለማንኛውም ኮርስ መመዝገብ በጣም ፈጣን እና ቀላል ነው፦\n\n` +
               `1. **በሀገር ውስጥ (Domestic)**፦\n` +
               `   • በ **LakiPay** አማካኝነት በ **ቴሌብር (Telebirr)**፣ በ **ሲቢኢ ብር (CBE Birr)** ወይም በሞባይል ባንኪንግ በቀጥታ በራስ-ሰር መክፈል ይችላሉ።\n` +
               `2. **ከሀገር ውጭ (International / Diaspora)**፦\n` +
               `   • በ **PayPal**፣ በ **Credit/Debit Card (Visa/Mastercard)** ወይም በ **Crypto** መክፈል ይችላሉ።\n\n` +
               `⚡ ክፍያውን እንደፈጸሙ የኮርሱ ቪዲዮዎች እና ማቴሪያሎች ወዲያውኑ ይከፈቱልዎታል!`;
    }

    // 10. Certificates & Quizzes
    if (p.includes('ሰርተፊኬት') || p.includes('certif') || p.includes('ማስረጃ') || p.includes('ሰርተፍኬት') || p.includes('ፈተና') || p.includes('quiz')) {
        if (isEnglish) {
            return `📜 **Official Digital Certificate of Completion**\n\n` +
                   `Yes! Once you complete the video curriculum and achieve 80%+ on the final assessment quiz:\n` +
                   `• An official **Digital Certificate** with your name, the course title, and verified Tsehay Campus seal will be issued immediately for free.\n` +
                   `• You can download and share it on LinkedIn, CVs, and portfolios! 🎓`;
        }
        return `📜 **ይፋዊ ዲጂታል ሰርተፊኬት (Certificate of Completion)**\n\n` +
               `አዎ! የኮርሱን የቪዲዮ ትምህርቶች ተከታትለው ሲያጠናቅቁ እና የማጠቃለያ ፈተናውን (Quiz) 80%+ ውጤት ሲያመጡ፦\n` +
               `• ስምዎ፣ የኮርሱ ርዕስ እና የካምፓሱ ይፋዊ ማህተም ያረፈበት **ዲጂታል ሰርተፊኬት** ወዲያውኑ በነፃ ይሰጥዎታል።\n` +
               `• ሰርተፊኬቱን ማውረድ (Download) እና በ LinkedIn ወይም በ CV ላይ መጠቀም ይችላሉ! 🎓`;
    }

    // 11. Contact, Support, Telegram, Phone & Location
    if (p.includes('ስልክ') || p.includes('phone') || p.includes('contact') || p.includes('ቴሌግራም') || p.includes('telegram') || p.includes('ዋትስአፕ') || p.includes('whatsapp') || p.includes('መደወል') || p.includes('ማናገር') || p.includes('አድራሻ') || p.includes('ቢሮ') || p.includes('ቦሌ') || p.includes('location')) {
        if (isEnglish) {
            return `📞 **Tsehay Campus Contact & Support Information**\n\n` +
                   `• **Location**: Bole, Addis Ababa, Ethiopia\n` +
                   `• **Phone & WhatsApp**: **0980209090** (+251980209090)\n` +
                   `• **Telegram Support**: **@TsehayTeam** (https://t.me/tsehaycampus)\n` +
                   `• **WhatsApp**: **+251980209090**\n` +
                   `• **YouTube Channel**: **@eyoubsahle** (youtube.com/@eyoubsahle)\n` +
                   `• **TikTok**: **@eyoubsahle**`;
        }
        return `📞 **የፀሐይ ካምፓስ አድራሻ እና የእውቂያ መንገዶች**\n\n` +
               `• **አድራሻ**፦ ቦሌ፣ አዲስ አበባ፣ ኢትዮጵያ (Bole, Addis Ababa, Ethiopia)\n` +
               `• **ስልክ ቁጥር**፦ **0980209090** (0980-20-90-90 / +251980209090)\n` +
               `• **ቴሌግራም**፦ **@TsehayTeam** (https://t.me/tsehaycampus)\n` +
               `• **ዋትስአፕ**፦ **+251980209090**\n` +
               `• **ዩቲዩብ ቻናል**፦ **@eyoubsahle** (youtube.com/@eyoubsahle)\n` +
               `• **ቲክቶክ**፦ **@eyoubsahle**`;
    }

    // 12. Founder / Instructor (Eyoub Sahle)
    if (p.includes('founder') || p.includes('መስራች') || p.includes('eyoub') || p.includes('እዮብ') || p.includes('ኢዮብ') || p.includes('ባለቤት') || p.includes('tsehay digital') || p.includes('ፀሐይ ዲጂታል') || p.includes('አስተማሪ') || p.includes('አሰልጣኝ') || p.includes('instructor') || p.includes('teacher')) {
        if (isEnglish) {
            return `👨‍🏫 **About the Lead Instructor (Eyoub Sahle)**\n\n` +
                   `The founder and lead instructor of Tsehay Campus is **Eyoub Sahle**.\n` +
                   `He is the founder of Tsehay Digital, a respected digital entrepreneur, and seasoned YouTube creator with over 100k+ subscribers who has empowered hundreds of students into successful digital businesses.`;
        }
        return `👨‍🏫 **ስለ አሰልጣኙ (ኢዮብ ሳህሌ / Eyoub Sahle)**\n\n` +
               `የፀሐይ ካምፓስ (Tsehay Campus) መስራች እና ዋና አሰልጣኝ **ኢዮብ ሳህሌ (Eyoub Sahle)** ነው።\n` +
               `እሱ በኢትዮጵያ ውስጥ በዲጂታል ማርኬቲንግ እና በዩቲዩብ ቻናሎች ስኬት በርካታ ተማሪዎችን ያፈራ፣ የ Tsehay Digital መስራች እና የ 100k+ ተከታዮች ያሉት የዩቲዩብ ባለሙያ ነው።`;
    }

    // 13. Active Lesson context query
    if (courseContext?.courseTitle) {
        if (isEnglish) {
            return `Practicing the step-by-step concepts taught in **"${courseContext.courseTitle}"** is key to mastering this subject.\n\nIf you need detailed guidance, explanation of a specific technique, or help with any lesson, feel free to ask via text or voice! 💡`;
        }
        return `በ**"${courseContext.courseTitle}"** ስልጠና ውስጥ ያሉትን ዋና ዋና ደረጃዎች በተግባር መተግበር እና የተሰጡትን የመማሪያ ማስታወሻዎች መከታተል ወሳኝ ነው።\n\nተጨማሪ ዝርዝር ማብራሪያ ወይም የደረጃ በደረጃ መመሪያ ከፈለጉ ጥያቄዎን በዝርዝር ይጻፉልኝ ወይም በድምፅ ይላኩልኝ! 💡`;
    }

    if (isEnglish) {
        return `I apologize, but I do not have sufficient information regarding this specific question right now.\n\nFor accurate and complete details, please reach out directly to the **Tsehay Team**:\n• **Phone & WhatsApp**: **0980209090** (+251980209090)\n• **Telegram Support**: **@TsehayTeam** (https://t.me/tsehaycampus)\n• **Office**: Bole, Addis Ababa, Ethiopia\n\nOur support team will be delighted to assist you! ✨`;
    }
    return `ይቅርታ፣ ስለዚህ ጉዳይ አሁን ላይ በቂ መረጃ የለኝም።\n\nትክክለኛና የተሟላ ይፋዊ መረጃ ለማግኘት እባክዎ የእኛን የድጋፍ ሰጪ ቡድን (**ፀሐይ ቲም / Tsehay Team**) በቀጥታ ያግኙ፦\n• **ስልክ እና ዋትስአፕ**፦ **0980209090** (0980-20-90-90 / +251980209090)\n• **ቴሌግራም**፦ **@TsehayTeam** (https://t.me/tsehaycampus)\n• **አድራሻ**፦ ቦሌ፣ አዲስ አበባ፣ ኢትዮጵያ\n\nየፀሐይ ቲም አባላት በደስታ ያስተናግዱዎታል! ✨`;
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
    const { prompt, courseContext, image, audio, preferredLanguage } = reqBody;
    
    if (!prompt && !image && !audio) {
        return NextResponse.json({ reply: getSmartFallbackReply("", courseContext, false, false, preferredLanguage) }, { status: 200 });
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
      const lessonsList = Array.isArray(courseContext.lessons) && courseContext.lessons.length > 0
        ? courseContext.lessons.map((l: any, i: number) => `  ${i + 1}. ${l.title || l.name || ''}${l.desc ? ` - ${l.desc}` : ''}`).join('\n')
        : '';

      const faqsList = Array.isArray(courseContext.faqs) && courseContext.faqs.length > 0
        ? courseContext.faqs.map((f: any, i: number) => `  Q${i + 1}: ${f.question || f.q}\n  A${i + 1}: ${f.answer || f.a}`).join('\n\n')
        : '';

      contextualCourseSection = `
===================================================================
[🎯 ACTIVE COURSE CONTEXT & DEEP INSTRUCTOR DIRECTIVES]
===================================================================
- Course Title: "${courseContext.courseTitle}"
- Course ID: ${courseContext.courseId || 'general'}
- Category: ${courseContext.category || 'Professional Skills'}
- Instructor: ${courseContext.instructor || 'Eyoub Sahle (ኢዮብ ሳህሌ)'}
- Active Lesson / Topic: "${courseContext.lessonTitle || 'Full Course Overview'}"
${courseContext.lessonDesc ? `- Active Lesson Description: "${courseContext.lessonDesc}"` : ''}
${courseContext.whatYouWillLearn ? `- What You Will Learn: "${courseContext.whatYouWillLearn}"` : ''}
${lessonsList ? `\n[COURSE SYLLABUS & LESSON STRUCTURE]:\n${lessonsList}` : ''}
${faqsList ? `\n[FREQUENTLY ASKED QUESTIONS & PINNED KNOWLEDGE (FAQs)]:\n${faqsList}` : ''}

[🌟 ADMIN CUSTOM INSTRUCTIONS FOR THIS COURSE (CRITICAL HIGHEST PRIORITY)]:
${courseContext.courseAiPrompt ? courseContext.courseAiPrompt : `You are the master mentor and virtual teacher for "${courseContext.courseTitle}". You must provide deeply customized, step-by-step, actionable insights, practical examples, and clear explanations strictly specific to "${courseContext.courseTitle}".`}

[DYNAMIC INTELLIGENT RESPONSES DIRECTIVE]
1. When asked for a course summary ("💡 የኮርስ ማጠቃለያ"):
   - Provide a deeply structured, engaging summary of the core modules, key skills gained, and practical business impact of "${courseContext.courseTitle}".
2. When asked for practical action steps ("🚀 የተግባር እርምጃዎች"):
   - Provide a realistic, sequential step-by-step roadmap specifically for "${courseContext.courseTitle}" (how to start from zero in Ethiopia, source/create content, handle payments, and scale).
3. When asked for beginner explanation ("❓ ለጀማሪ አብራራልኝ"):
   - Explain the core concepts of "${courseContext.courseTitle}" in simple, welcoming, friendly Amharic with relatable real-life analogies.
4. When asked for quiz questions ("📝 የፈተና ጥያቄ አዘጋጅልኝ"):
   - Generate 3 to 4 insightful, practical questions based on "${courseContext.courseTitle}" to test their comprehension.
5. NEVER give generic, repetitive boilerplate replies ("አንድ አይነት መልስ ሁሌ አትመልስ"). Tailor every single answer with fresh, rich, and practical insights!
===================================================================
`;
    }

    const isEnglishMode = preferredLanguage === 'en';
    const isAmharicMode = preferredLanguage === 'am';

    let languageDirective = "";
    if (isEnglishMode) {
      languageDirective = `[LANGUAGES & TONE]
- Your language for this response is English. Respond in clear, engaging, professional English.
- Tone: Highly motivational, authoritative, helpful, and encouraging.`;
    } else if (isAmharicMode) {
      languageDirective = `[LANGUAGES & TONE]
- Your primary language is Amharic (አማርኛ) using Ge'ez Fidel script.
- Even if the user types in English letters or transliterated Amharic (e.g. "selam", "course", "shein"), understand their intent and respond strictly in Amharic (አማርኛ).
- Use English ONLY for technical terms (e.g., "SEO", "Facebook Ads", "Retargeting", "E-commerce", "Coding", "Thumbnails", "Algorithm").
- Tone: Highly motivational, authoritative, helpful, and encouraging.`;
    } else {
      languageDirective = `[LANGUAGES & TONE]
- Your primary language is Amharic (አማርኛ). If a student asks in English, respond in clear English. For all other queries, respond strictly in Amharic.
- Use English ONLY for technical terms (e.g., "SEO", "Facebook Ads", "Retargeting", "E-commerce", "Coding", "Thumbnails", "Algorithm").
- Tone: Highly motivational, authoritative, helpful, and encouraging.`;
    }

    const DEFAULT_SYSTEM_INSTRUCTION = `You are "Tsehay AI" (ፀሐይ AI), the exclusive virtual guide and AI Teaching Assistant for "Tsehay Campus" (tsehaycampus.com). Your persona is friendly, deeply knowledgeable, highly professional, and encouraging.

[STRICT CONVERSATION FLOW RULES]
- NEVER repeat your welcome or platform introduction message after the first turn.
- If the user's message is a direct question, IMMEDIATELY answer that specific question in your first sentence without unnecessary repetitive fluff or generic introductory statements.

${languageDirective}

[UNLIMITED HELPFULNESS & EXPERTISE]
- You must answer ANY question asked by students regarding Digital Marketing, Shein Import, YouTube Growth, Video Editing, Business, E-Commerce, Coding, AI Prompts & Tools, or Tsehay Campus platform usage.
- Do NOT refuse to answer valid educational or business questions. Use your full LLM knowledge to provide deep, actionable, step-by-step advice.
- When answering marketing or business questions, reference world-renowned industry leaders and proven frameworks (e.g., Neil Patel for SEO & search traffic, Seth Godin for Permission Marketing & Branding, GaryVee for Social Media & Content Volume, MrBeast for YouTube Title, Thumbnail & Retention mastery).

[BEAUTIFUL STRUCTURE & AESTHETIC FORMATTING]
- Structure answers with exceptional clarity:
  1. Direct, clear opening sentence answering the core question.
  2. Tasteful markdown headings (### 🌟 ...), bold keywords, and clean bullet points.
  3. Numbered actionable steps (1. **Step 1**፦ ...).
  4. Subtle, tasteful emojis (✨, 🚀, 💡, 📚, 🎬, 💳, 📜, 📞, 🌟) to make reading engaging.

[PLATFORM FACTS]
- Platform Name: Tsehay Campus (ፀሐይ ካምፓስ) - tsehaycampus.com
- Founder & Instructor: Eyoub Sahle (ኢዮብ ሳህሌ) - Professional Digital Marketer & Founder of Tsehay Digital (tsehay360.com).
- Support Contact: @TsehayTeam on Telegram or phone 0980209090 (+251980209090).
- Public Community Chat: "ፀሐይ ካምፓስ ቻት" on Telegram (https://t.me/tsehaycampus).
- Payment Methods: Telebirr and Mobile Banking (CBE, Siinqee, Oromia Bank, Coop) via LakiPay / AddisPay for locals, PayPal, Credit/Debit Cards, and Cryptocurrency for international users.
- Flagship Courses:
  1. **Shein Import Business (የሼን ኢምፖርት ቢዝነስ)**
  2. **YouTube Secrets Masterclass & Monetization (የዩቲዩብ ስኬት ሚስጥሮች)**
  3. **Digital Marketing Mastery (ዲጂታል ማርኬቲንግ)** - 100% FREE
  4. **Video Editing Masterclass (የቪዲዮ ኤዲቲንግ)**
  5. **Advanced Paid Digital Marketing (የከፋይ ዲጂታል ማርኬቲንግ)**
  6. **Real Estate & Business Brokerage (የደላላነትና ብሮከሬጅ)**
  7. **Career Development & Leadership (የስራ እና ካሪየር እድገት)**
- 1-on-1 Mentorship: Available with Eyoub Sahle at /mentorship for 45-minute private strategy sessions.
- Certification: Free official Digital Certificate of Completion upon passing the course quiz (80%+).

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