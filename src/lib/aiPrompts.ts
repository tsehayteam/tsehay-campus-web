export interface PinnedPrompt {
  label: string;
  prompt: string;
}

export function getCoursePinnedPrompts(course: any, lang: string = 'am'): PinnedPrompt[] {
  if (!course) {
    // 🌐 General Campus AI Pinned Prompts
    return lang === 'am' ? [
      { label: '💡 ስለ ካምፓሱ ንገረኝ', prompt: 'ስለ ፀሐይ ካምፓስ (Tsehay Campus) ዓላማ፣ የሚሰጡ ስልጠናዎች እና የመማሪያ ሂደቱ አጠቃላይ ማብራሪያ ስጠኝ።' },
      { label: '💳 የክፍያ እና ምዝገባ ሁኔታ', prompt: 'ለስልጠናዎች በቴሌብር (Telebirr)፣ በሲቢኢ ብር (CBE Birr) ወይም በካርድ እንዴት እከፍላለሁ? ምዝገባስ እንዴት ይፈጸማል?' },
      { label: '📞 አድራሻ እና ስልክ ቁጥር', prompt: 'የፀሐይ ካምፓስ ይፋዊ አድራሻ፣ ስልክ ቁጥር እና የቴሌግራም መገናኛዎችን ንገረኝ።' },
      { label: '🤝 1-ለ-1 ማማከር (Mentorship)', prompt: 'ከኢዮብ ሳህሌ (Eyoub Sahle) ጋር የቀጥታ የ 1-ለ-1 የማማከር ቀጠሮ እንዴት ማስያዝ እችላለሁ?' },
      { label: '📜 ስለ ሰርተፊኬት', prompt: 'ስልጠናዎችን ስጨርስ ይፋዊ ዲጂታል ሰርተፊኬት (Certificate of Completion) እንዴት ማግኘት እችላለሁ?' }
    ] : [
      { label: '💡 About Tsehay Campus', prompt: 'Tell me about Tsehay Campus, the available courses, and the learning experience.' },
      { label: '💳 Payment & Enrollment', prompt: 'How do I pay and enroll using Telebirr, CBE Birr, or International Cards?' },
      { label: '📞 Contact & Location', prompt: 'What are the official contact numbers, Telegram handle, and office location for Tsehay Campus?' },
      { label: '🤝 1-on-1 Mentorship', prompt: 'How can I schedule a 1-on-1 strategy consultation session with Eyoub Sahle?' },
      { label: '📜 Certificates', prompt: 'How do I earn a verified Certificate of Completion after finishing a course?' }
    ];
  }

  const title = (course.title || '').toLowerCase();
  const cTitle = course.title || 'ይህ ስልጠና';

  // 1. Digital Marketing
  if (title.includes('digital') || title.includes('marketing') || title.includes('ማርኬቲንግ')) {
    return lang === 'am' ? [
      { label: '🎯 የ Meta Ads አሰራር', prompt: 'በፌስቡክ እና በኢንስታግራም (Meta Ads) ውጤታማ ማስታወቂያዎችን እንዴት ማስኬድ ይቻላል? የበጀት እና የ Target አሰራርስ?' },
      { label: '📈 የ SEO እና የይዘት ስልት', prompt: 'በኦንላይን ተከታታይ ደንበኞችን ለመሳብ የይዘት ስልት (Content Strategy) እና የ SEO ስራዎች እንዴት ይሰራሉ?' },
      { label: '💰 ከዲጂታል ማርኬቲንግ ገቢ መፍጠር', prompt: 'የዲጂታል ማርኬቲንግ እውቀቴን ተጠቅሜ ለድርጅቶች ማርኬቲንግ በመስራት ወይም በራሴ እንዴት ገቢ መፍጠር እችላለሁ?' },
      { label: '💡 የኮርስ ማጠቃለያ', prompt: `የ"${cTitle}" ኮርስ ዋና ዋና ነጥቦችን እና ክህሎቶችን አጠቃልልልኝ` },
      { label: '📝 የፈተና ጥያቄ', prompt: `በ"${cTitle}" የተማርኩትን ለመፈተሽ 3 ተግባራዊ ጥያቄዎችን አዘጋጅተህ ጠይቀኝ` }
    ] : [
      { label: '🎯 Meta Ads Campaign', prompt: 'How do I set up profitable Facebook & Instagram ad campaigns with high ROI?' },
      { label: '📈 SEO & Content Strategy', prompt: 'How do I build an effective content and SEO strategy to attract organic leads?' },
      { label: '💰 Monetization & Agency', prompt: 'How can I monetize digital marketing skills to serve clients and build a business?' },
      { label: '💡 Course Summary', prompt: `Summarize the core lessons and actionable takeaways of "${cTitle}"` },
      { label: '📝 Quiz Me', prompt: `Give me 3 practical quiz questions based on "${cTitle}" to test my mastery` }
    ];
  }

  // 2. YouTube Secrets Masterclass
  if (title.includes('youtube') || title.includes('ዩቲዩብ') || title.includes('ዩቱብ')) {
    return lang === 'am' ? [
      { label: '🎬 Faceless AI ቻናል አሰራር', prompt: 'ፊት ሳያሳዩ በ AI ድምፅ እና ቪዲዮ ከፍተኛ እይታ የሚስብ የዩቲዩብ ቻናል ደረጃ በደረጃ እንዴት መገንባት ይቻላል?' },
      { label: '🔥 1000 Sub & 4000 ሰዓት', prompt: 'የዩቲዩብ የሞኒታይዜሽን መስፈርት (1,000 Subscribers እና 4,000 ሰዓት) በአጭር ጊዜ ለማሟላት ምን ዘዴ ልጠቀም?' },
      { label: '🖼️ High-CTR ታምብኔል ዲዛይን', prompt: 'ተመልካቾች ሳይወዱ በግድ እንዲጫኑት የሚያደርግ ማራኪ ታምብኔል (Thumbnail) እና Title እንዴት ይዘጋጃል?' },
      { label: '💵 ዶላር ከኢትዮጵያ ማውጣት', prompt: 'ከኢትዮጵያ ሆነን ከዩቲዩብ የሚገኘውን የዶላር ገቢ በህጋዊ መንገድ እንዴት ማውጣት ይቻላል?' },
      { label: '💡 የኮርስ ማጠቃለያ', prompt: `የ"${cTitle}" ዋና ዋና ሚስጥሮችን እና የተግባር እርምጃዎችን አጠቃልልልኝ` }
    ] : [
      { label: '🎬 Faceless AI Channel', prompt: 'How do I create and automate a high-traffic faceless YouTube channel using AI?' },
      { label: '🔥 Fast Monetization', prompt: 'What is the fastest strategy to achieve 1,000 subscribers and 4,000 watch hours?' },
      { label: '🖼️ High-CTR Thumbnails', prompt: 'How do I design viral thumbnails and write high-click titles?' },
      { label: '💵 USD Payouts in Ethiopia', prompt: 'How do I withdraw YouTube ad revenue smoothly in Ethiopia?' },
      { label: '💡 Course Summary', prompt: `Summarize the key strategies and takeaways of "${cTitle}"` }
    ];
  }

  // 3. Shein Import Business
  if (title.includes('shein') || title.includes('ሺን') || title.includes('ሼን') || title.includes('import') || title.includes('ኢምፖርት')) {
    return lang === 'am' ? [
      { label: '🛍️ ተፈላጊ እቃዎችን መምረጥ', prompt: 'ከሼን (SHEIN) እና ከቻይና ፈጣን ሽያጭ እና ከፍተኛ የትርፍ ህዳግ ያላቸውን እቃዎች እንዴት ልምረጥ?' },
      { label: '💳 በዶላር እና በኦንላይን ካርድ መክፈል', prompt: 'ከኢትዮጵያ ሆነን ለሼን እና ለቻይና ድረ-ገጾች የዶላር እና የካርድ ክፍያ በቀላሉ እንዴት መፈጸም ይቻላል?' },
      { label: '📦 ካርጎ እና የጉምሩክ ወጪን መቀነስ', prompt: 'የማጓጓዣ (Cargo) እና የጉምሩክ ክፍያን በመቀነስ ትርፋማ የምንሆንበት ዘዴ ምንድን ነው?' },
      { label: '📱 በ TikTok & Telegram መሸጥ', prompt: 'የመጡትን እቃዎች በ TikTok እና በ Telegram ቻናሎች በከፍተኛ ትርፍ እና በፍጥነት እንዴት እንሽጣቸው?' },
      { label: '💡 የኮርስ ማጠቃለያ', prompt: `የ"${cTitle}" ስልጠና ዋና ዋና ደረጃዎችን አጠቃልልልኝ` }
    ] : [
      { label: '🛍️ Product Selection', prompt: 'How do I find high-margin winning products to import from SHEIN?' },
      { label: '💳 Online USD Payments', prompt: 'How do I handle international dollar and card payments from Ethiopia?' },
      { label: '📦 Cargo & Customs', prompt: 'How do I minimize shipping, freight, and customs fees?' },
      { label: '📱 TikTok & Telegram Sales', prompt: 'How do I market and sell imported items fast with premium profits?' },
      { label: '💡 Course Summary', prompt: `Summarize the complete import workflow for "${cTitle}"` }
    ];
  }

  // 4. Web Development & Coding
  if (title.includes('web') || title.includes('code') || title.includes('coding') || title.includes('ፕሮግራሚንግ') || title.includes('ኮዲንግ')) {
    return lang === 'am' ? [
      { label: '💻 HTML, CSS & React መማር', prompt: 'ዘመናዊ የዌብሳይት ዲዛይን እና ቴክኖሎጂዎችን (HTML, CSS, JavaScript, React) ደረጃ በደረጃ እንዴት ልማር?' },
      { label: '🌐 የመጀመሪያ ዌብሳይት መገንባት', prompt: 'የመጀመሪያዬን የተሟላ ዌብሳይት ለመገንባት ምን ምን ደረጃዎችን መከተል አለብኝ?' },
      { label: '🚀 የሆስቲንግ እና የዴቨሎፐር ስራ', prompt: 'የሰራሁትን ዌብሳይት ኦንላይን ላይ እንዴት መጫን (Deploy) እችላለሁ? በዘርፉስ እንዴት ስራ አገኛለሁ?' },
      { label: '💡 የኮርስ ማጠቃለያ', prompt: `የ"${cTitle}" ዋና ዋና ርዕሶችን አጠቃልልልኝ` },
      { label: '📝 የፈተና ጥያቄ', prompt: `በ"${cTitle}" የተማርኩትን ለመፈተሽ ተግባራዊ የኮዲንግ ጥያቄዎችን አዘጋጅተህ ጠይቀኝ` }
    ] : [
      { label: '💻 Frontend Foundations', prompt: 'What are the best practices for learning HTML, CSS, Tailwind, and React?' },
      { label: '🌐 Build First Project', prompt: 'What are the steps to build and launch my first real-world web application?' },
      { label: '🚀 Hosting & Career', prompt: 'How do I deploy full-stack apps and find remote developer opportunities?' },
      { label: '💡 Course Summary', prompt: `Summarize the syllabus and outcomes of "${cTitle}"` },
      { label: '📝 Coding Quiz', prompt: `Give me 3 practical coding comprehension questions for "${cTitle}"` }
    ];
  }

  // 5. Crypto Trading
  if (title.includes('crypto') || title.includes('ክሪፕቶ') || title.includes('bitcoin') || title.includes('ትሬዲንግ')) {
    return lang === 'am' ? [
      { label: '📈 የገበያ ትንተና (Analysis)', prompt: 'የክሪፕቶ ቻርቶችን እና የገበያ እንቅስቃሴን (Technical & Fundamental Analysis) እንዴት መተንተን እችላለሁ?' },
      { label: '🛡️ የካፒታል ጥበቃ (Risk Management)', prompt: 'በክሪፕቶ ግብይት ወቅት ኪሳራን ለመቀነስ እና ካፒታልን ለመጠበቅ ምን አይነት የ Risk Management ህግጋትን ልከተል?' },
      { label: '💰 Binance & ዋሌቶች አጠቃቀም', prompt: 'የ Binance አካውንት አጠቃቀም እና የክሪፕቶ ዋሌቶች ጥበቃ እንዴት ይሰራል?' },
      { label: '💡 የኮርስ ማጠቃለያ', prompt: `የ"${cTitle}" ዋና ዋና የትሬዲንግ ስትራቴጂዎችን አጠቃልልልኝ` }
    ] : [
      { label: '📈 Market Analysis', prompt: 'How do I conduct technical chart and fundamental market analysis in crypto?' },
      { label: '🛡️ Risk Management', prompt: 'What are the core rules of capital preservation and position sizing in trading?' },
      { label: '💰 Binance & Wallets', prompt: 'How do I securely set up and trade on Binance and hardware/software wallets?' },
      { label: '💡 Course Summary', prompt: `Summarize the trading strategies of "${cTitle}"` }
    ];
  }

  // Default Custom Course Prompts
  return lang === 'am' ? [
    { label: `💡 የ${cTitle} ማጠቃለያ`, prompt: `የ"${cTitle}" ኮርስ ዋና ዋና ነጥቦችን እና የተግባር እርምጃዎችን አጠቃልልልኝ` },
    { label: '🚀 የተግባር እርምጃዎች', prompt: `በ"${cTitle}" የተማርነውን በኢትዮጵያ ውስጥ በተግባር እንዴት ልተግብረው?` },
    { label: '❓ ለጀማሪ አብራራልኝ', prompt: `ስለ "${cTitle}" ያልገባኝን ነገር በቀላል እና ግልጽ በሆነ አማርኛ ደረጃ በደረጃ አብራራልኝ` },
    { label: '📝 የፈተና ጥያቄ አዘጋጅልኝ', prompt: `በ"${cTitle}" የተማርኩትን ለመፈተሽ 3 ተግባራዊ ጥያቄዎችን አዘጋጅተህ ጠይቀኝ` },
    { label: '💡 የቢዝነስ ሀሳቦች', prompt: `ከ"${cTitle}" ባገኘሁት እውቀት መሰረት በኢትዮጵያ ውስጥ ምን አይነት አትራፊ ስራዎችን መጀመር እችላለሁ?` }
  ] : [
    { label: `💡 ${cTitle} Summary`, prompt: `Summarize the core takeaways and practical roadmap of "${cTitle}"` },
    { label: '🚀 Action Steps', prompt: `How do I practically implement what is taught in "${cTitle}"?` },
    { label: '❓ Beginner Guide', prompt: `Explain the key concepts of "${cTitle}" in simple terms for beginners` },
    { label: '📝 Quiz Me', prompt: `Give me 3 practical quiz questions based on "${cTitle}" to test my mastery` },
    { label: '💡 Business Ideas', prompt: `What profitable business models can I start based on "${cTitle}"?` }
  ];
}
