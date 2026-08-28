'use client';
import React, { useState, useEffect } from 'react';

export interface QuizQuestion {
  id: number;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

const QUESTION_BANKS: Record<string, QuizQuestion[]> = {
  marketing: [
    {
      id: 1,
      question: 'በዲጂታል ማርኬቲንግ ውስጥ "Target Audience (ዒላማ ደንበኛ)" ማለት ምን ማለት ነው?',
      options: [
        'የድርጅቱ ሰራተኞች እና አጋሮች ስብስብ',
        'የእርስዎ ምርት ወይም አገልግሎት በቀጥታ የሚመለከታቸውና የሚገዙ ትክክለኛ ደንበኞች',
        'በአካባቢው የሚገኙ የቢዝነስ ተፎካካሪዎች',
        'የማስታወቂያው አጠቃላይ የወጪ በጀት'
      ],
      correctIndex: 1,
      explanation: 'Target Audience ማለት የእርስዎን ምርት ወይም አገልግሎት ፍላጎት ያላቸውና ለመግዛት ዝግጁ የሆኑ ትክክለኛ ደንበኞች ናቸው።'
    },
    {
      id: 2,
      question: 'በማህበራዊ ሚዲያ ማስታወቂያ (Meta/Google Ads) ውስጥ "CTR (Click-Through Rate)" ምንድን ነው?',
      options: [
        'የቪዲዮው አጠቃላይ የእይታ ሰዓት',
        'ማስታወቂያውን ካዩት ሰዎች መካከል ሊንኩን ነክተው የገቡት በመቶኛ',
        'ለማስታወቂያው የተከፈለው አጠቃላይ ክፍያ',
        'የፌስቡክ ፔጅ የፎሎወር ብዛት'
      ],
      correctIndex: 1,
      explanation: 'CTR ማስታወቂያዎን ካዩት ሰዎች ውስጥ ስንቱ ጠቅ (Click) እንዳደረጉ የሚያሳይ የውጤታማነት መቶኛ ነው።'
    },
    {
      id: 3,
      question: 'የ "Sales Funnel (የሽያጭ መስመር)" ዋና ግብና ተግባር ምንድን ነው?',
      options: [
        'ተጠቃሚን ከማያውቀን ሰውነት ወደ ታማኝ ከፋይ ደንበኝነት በደረጃ ማሸጋገር',
        'የዌብሳይትን የመጫን ፍጥነት መጨመር ብቻ',
        'የይለፍ ቃል ደህንነትን ማረጋገጥ',
        'የቴሌግራም ቻናል አባላትን ማጥፋት'
      ],
      correctIndex: 0,
      explanation: 'Sales Funnel ደንበኛን ከአስተዋዋቂነት (Awareness) እስከ ግዢ (Conversion) ድረስ ደረጃ በደረጃ የሚመራ ስልት ነው።'
    },
    {
      id: 4,
      question: 'የ Organic Reach እና Paid Reach ዋነኛ ልዩነት ምንድን ነው?',
      options: [
        'Organic Reach ያለክፍያ በጥራት የሚገኝ ሲሆን Paid Reach በገንዘብ ክፍያ ማስታወቂያ በማስኬድ የሚገኝ ነው',
        'Organic ሁልጊዜ ለቪዲዮ ብቻ ነው የሚሰራው',
        'Paid Reach በነፃ የሚሰራ ነው',
        'በሁለቱ መካከል ምንም አይነት ልዩነት የለም'
      ],
      correctIndex: 0,
      explanation: 'Organic Reach ያለ ክፍያ በጥራትና በአልጎሪዝም የሚገኝ ሲሆን፣ Paid Reach በማስታወቂያ በጀት የሚገዛ ተደራሽነት ነው።'
    },
    {
      id: 5,
      question: 'በዲጂታል ማርኬቲንግ ውስጥ ውጤታማ "Call-To-Action (CTA)" ምሳሌ የቱ ነው?',
      options: [
        'ዝም ብለህ እይ',
        'አሁን ይመዝገቡና የ 50% ቅናሽ ያግኙ',
        'ምናልባት ነገ ይግዙ',
        'ይህ ተራ ማስታወቂያ ነው'
      ],
      correctIndex: 1,
      explanation: 'ጠንካራ CTA ደንበኛው ወዲያውኑ ግልጽ፣ ቀጥተኛና ጠቃሚ እርምጃ እንዲወስድ የሚያበረታታ መሆን አለበት።'
    },
    {
      id: 6,
      question: 'በ Meta (Facebook/Instagram) Ads ውስጥ "Meta Pixel / CAPI" ዋና ጠቀሜታ ምንድን ነው?',
      options: [
        'የዌብሳይት ተጠቃሚዎችን ባህሪና ግዢ በመከታተል ማስታወቂያን ውጤታማ ማድረግ (Tracking & Conversion)',
        'የኮምፒውተሩን ስክሪን ጥራት መጨመር',
        'የፌስቡክ ፓስዎርድ ማስታወሻ መያዝ',
        'የቪዲዮ ፋይል ማሳነስ'
      ],
      correctIndex: 0,
      explanation: 'Meta Pixel በዌብሳይት ላይ የሚደረጉ እንቅስቃሴዎችን (እንደ ግዢ፣ ምዝገባ) በመከታተል ለማስታወቂያ ውጤታማነት መረጃ ይሰጣል።'
    },
    {
      id: 7,
      question: 'በ Facebook Ads ውስጥ "Boost Post" ከ "Ads Manager" በምን ይለያል?',
      options: [
        'Boost Post በጣም ውስን አማራጮች ያሉት ሲሆን Ads Manager ግን ጥልቅ Targeting፣ Pixel እና የበጀት ቁጥጥር ይሰጣል',
        'Boost Post ሁልጊዜ ነፃ ነው',
        'Ads Manager ለሞባይል አይሰራም',
        'ሁለቱም ፍጹም አንድ አይነት ናቸው'
      ],
      correctIndex: 0,
      explanation: 'Ads Manager ለሙያዊ ማርኬቲንግ ጥልቅ ዒላማ ማድረጊያዎችን፣ የሽያጭ ኦብጀክቲቭን እና ትክክለኛ የልወጣ ትንታኔን ያካትታል።'
    },
    {
      id: 8,
      question: '"Lookalike Audience" በማስታወቂያ ሲስተም ውስጥ ምን ማለት ነው?',
      options: [
        'ያሉዎትን ምርጥ ደንበኞች ባህሪ የሚመስሉ አዳዲስ ተጠቃሚዎችን በ AI ፈልጎ ማግኘት',
        'ከተፎካካሪዎ የተሰረቁ ደንበኞች ዝርዝር',
        'የፌስቡክ ጓደኞች ዝርዝር ብቻ',
        'የተዘጉ የፌስቡክ አካውንቶች'
      ],
      correctIndex: 0,
      explanation: 'Lookalike Audience አሁን ካሉዎት ምርጥ ደንበኞች ጋር ተመሳሳይ ፍላጎትና ባህሪ ያላቸውን በሚሊዮኖች የሚቆጠሩ አዳዲስ ደንበኞች ያገኛል።'
    },
    {
      id: 9,
      question: 'የ "A/B Testing (Split Testing)" ዋነኛ ዓላማ ምንድን ነው?',
      options: [
        'ሁለት የተለያዩ የማስታወቂያ ምስሎችን፣ ቪዲዮዎችን ወይም ጽሁፎችን በማወዳደር የቱ የበለጠ ውጤታማ እንደሆነ መለየት',
        'የማስታወቂያውን ወጪ በእጥፍ መጨመር',
        'ማስታወቂያዎችን በአንድ ጊዜ ማጥፋት',
        'የፌስቡክን አገልጋይ ማጨናነቅ'
      ],
      correctIndex: 0,
      explanation: 'A/B Testing የትኛው ማስታወቂያ የተሻለ ሽያጭና ተደራሽነት እንደሚያመጣ በተግባር ለመፈተሽ ይረዳል።'
    },
    {
      id: 10,
      question: 'በማስታወቂያ ትንታኔ ውስጥ "ROAS (Return on Ad Spend)" ምን ያሳያል?',
      options: [
        'ለማስታወቂያ በወጣው እያንዳንዱ ብር የተገኘውን አጠቃላይ የገቢ ብዜት (Revenue ÷ Ad Spend)',
        'የሰራተኞች የወር ደመወዝ',
        'የፔጁን አጠቃላይ የፎቶ ብዛት',
        'የማስታወቂያውን ቆይታ ጊዜ ብቻ'
      ],
      correctIndex: 0,
      explanation: 'ROAS ለማስታወቂያ ካወጡት ገንዘብ አንጻር ምን ያህል ትርፍና ገቢ እንደተመለሰ የሚያሰላ ቁልፍ መለኪያ ነው።'
    },
    {
      id: 11,
      question: 'የቪዲዮ ወይም የጽሁፍ ማስታወቂያ "Hook (መንጠቆ)" የትኛው ክፍል ነው?',
      options: [
        'በመጀመሪያዎቹ 3 ሰከንዶች ውስጥ የተጠቃሚውን ትኩረት ስቦ የሚያስቆመው ኃይለኛ አጀማመር',
        'የቪዲዮው የመጨረሻ ምስጋና',
        'የድረ-ገጹ አድራሻ ብቻ',
        'የሙዚቃው ስም'
      ],
      correctIndex: 0,
      explanation: 'Hook ሰዎች ማህበራዊ ሚዲያ ሲያንሸራትቱ ወዲያውኑ ቆመው የእርስዎን መልዕክት እንዲያዳምጡ የሚያደርግ ወሳኝ መክፈቻ ነው።'
    },
    {
      id: 12,
      question: '"Retargeting / Remarketing" ለምን ጥቅም ላይ ይውላል?',
      options: [
        'ቀደም ሲል ምርትዎን አይተው ወይም ፍላጎት አሳይተው ሳይገዙ ለቀሩ ሰዎች ድጋሚ ማስታወቂያ በማሳየት ግዢ እንዲፈጽሙ ለማድረግ',
        'አዲስ የማያውቁ ሰዎችን ብቻ ለመፈለግ',
        'የድሮ ደንበኞችን ለማገድ',
        'የማስታወቂያ በጀትን ለማባከን'
      ],
      correctIndex: 0,
      explanation: 'Retargeting ምርቱን አይተው የሄዱ ሰዎችን መልሶ በማስታወስ እና ተጨማሪ ቅናሽ በመስጠት የመግዛት እድላቸውን በእጥፍ ይጨምራል።'
    },
    {
      id: 13,
      question: 'የፌስቡክ የማስታወቂያ ፖሊሲ (Ad Policies) እንዳይጣስ ምን ማድረግ ያስፈልጋል?',
      options: [
        'የተጋነኑ የሀሰት ተስፋዎችን (Before/After) አለመጠቀምና ህጋዊ የሆኑ እውነተኛ ምርቶችን ማስተዋወቅ',
        'ያልተፈቀዱ የቅጂ መብት ያላቸውን ቪዲዮዎች መጫን',
        'ሰዎችን የሚያሸማቅቁ ቃላትን ማብዛት',
        'የተከለከሉ እቃዎችን ማስተዋወቅ'
      ],
      correctIndex: 0,
      explanation: 'የፌስቡክ ፖሊሲዎችን ማክበር የማስታወቂያ አካውንት እንዳይታገድና ማስታወቂያው በተቀላጠፈ ሁኔታ እንዲሰራ ያረጋግጣል።'
    },
    {
      id: 14,
      question: 'በማርኬቲንግ ውስጥ "Lead" ማለት ምን ማለት ነው?',
      options: [
        'ለእርስዎ ምርት ፍላጎት አሳይቶ ስልክ፣ ኢሜል ወይም መረጃውን ያስረከበ እምቅ ደንበኛ',
        'የማስታወቂያው ርዕስ',
        'የኮምፒውተር ገመድ',
        'የተጠናቀቀ የባንክ ክፍያ ብቻ'
      ],
      correctIndex: 0,
      explanation: 'Lead ማለት ምርትዎን ወይም አገልግሎትዎን ለመግዛት ፍላጎት አሳይቶ ግንኙነት የፈጠረ የወደፊት ደንበኛ ነው።'
    },
    {
      id: 15,
      question: 'የቪዲዮ ማስታወቂያ የመጀመሪያ 3 ሰከንዶች ለምን ወሳኝ ናቸው?',
      options: [
        'አብዛኛው ተጠቃሚ ቪዲዮውን መመልከቱን ወይም ማለፉን የሚወስነው በመጀመሪያዎቹ 3 ሰከንዶች ውስጥ ስለሆነ',
        'ፌስቡክ ክፍያ የሚጠይቀው ለ 3 ሰከንድ ብቻ ስለሆነ',
        'ቪዲዮው ከዛ በኋላ ስለማይሰራ',
        'ምንም ጥቅም ስለሌለው'
      ],
      correctIndex: 0,
      explanation: 'በማህበራዊ ሚዲያ ላይ ሰዎች በፈጣን ፍጥነት ስክሪን ስለሚያንሸራትቱ የመጀመሪያዎቹ 3 ሰከንዶች ትኩረትን ለመሳብ ወሳኝ ናቸው።'
    },
    {
      id: 16,
      question: 'በማስታወቂያ ውስጥ "CPC (Cost Per Click)" ማለት ምን ማለት ነው?',
      options: [
        'አንድ ደንበኛ ማስታወቂያዎን ጠቅ ባደረገ (Click) ቁጥር የሚከፈለው አማካይ ወጪ',
        'የፌስቡክ ወርሃዊ ክፍያ',
        'የኮምፒውተር ጥገና ወጪ',
        'የምርቱ የመሸጫ ዋጋ'
      ],
      correctIndex: 0,
      explanation: 'CPC አንድ ሰው ማስታወቂያዎን ነክቶ ወደ ዌብሳይትዎ ወይም ገጽዎ ሲገባ የሚከፈለው ትክክለኛ ወጪ ነው።'
    },
    {
      id: 17,
      question: 'ደንበኛ "ዋጋው ውድ ነው" የሚል ቅሬታ ሲያነሳ ምርጡ የማርኬቲንግ ምላሽ የቱ ነው?',
      options: [
        'የምርቱን ጥራት፣ የሚፈታውን ትልቅ ችግር እና የሚያስገኘውን የላቀ እሴት (Value) በምሳሌ ማስረዳት',
        'ከደንበኛው ጋር መጣላት',
        'ምንም ምላሽ አለመስጠት',
        'ቢዝነሱን ወዲያውኑ መዝጋት'
      ],
      correctIndex: 0,
      explanation: 'የዋጋ ጥያቄ ሲነሳ ትኩረቱን ከወጪው ወደሚያገኘው የላቀ ጥቅም (Value Proposition) እና ዘላቂ መፍትሄ ማዞር ይመረጣል።'
    },
    {
      id: 18,
      question: '"Social Proof (ማህበራዊ ማረጋገጫ)" በማርኬቲንግ ውስጥ ለምን ይጠቅማል?',
      options: [
        'የቀድሞ ደንበኞች ምስክርነትና ሪቪው አዳዲስ ደንበኞች በእርስዎ ላይ ሙሉ እምነት እንዲጥሉ ስለሚያደርግ',
        'የማስታወቂያውን ቀለም ለመቀየር',
        'የዌብሳይት ስም ለመቀየር',
        'ምንም ጥቅም የለውም'
      ],
      correctIndex: 0,
      explanation: 'ሰዎች ሌሎች ሰዎች ተጠቅመው የተደሰቱበትን ምርት ለመግዛት ያላቸው ፍላጎትና እምነት እጅግ ከፍተኛ ነው።'
    },
    {
      id: 19,
      question: 'የ "Landing Page Conversion Rate" ለማሳደግ የቱ ወሳኝ ነው?',
      options: [
        'ፈጣን የመጫን ፍጥነት፣ ግልጽ ርዕስ፣ ማራኪ ምስሎች እና ቀላል የትዕዛዝ ማዘዣ ቅጽ (Frictionless Checkout)',
        'በጣም ረጅም እና አሰልቺ ጽሁፍ መጻፍ',
        'የግዢ ቁልፉን መደበቅ',
        'ምንም ምስል አለመጠቀም'
      ],
      correctIndex: 0,
      explanation: 'ቀላል፣ ፈጣን እና ማራኪ የሆነ ገጽ የመጡትን ጎብኚዎች በቀላሉ ወደ እውነተኛ ገዢዎች ይቀይራቸዋል።'
    },
    {
      id: 20,
      question: 'የዲጂታል ማርኬቲንግ ዘመቻን (Campaign) ወደ ላቀ ደረጃ ለማሳደግ (Scaling) ምን ያስፈልጋል?',
      options: [
        'አትራፊ የሆኑ ማስታወቂያዎችን በመለየት በጀትን ደረጃ በደረጃ መጨመርና አዳዲስ Lookalike/Broad ታዳሚዎችን መሞከር',
        'በአንድ ቀን በጀቱን 10 እጥፍ መጨመር',
        'ማስታወቂያዎችን በሙሉ በአንድ ጊዜ ማጥፋት',
        'ያለ ምንም ትንታኔ ገንዘብ መጨመር'
      ],
      correctIndex: 0,
      explanation: 'ስኬታማ ስኬሊንግ የሚከናወነው አትራፊ የሆኑትን ማስታወቂያዎች በዳታ እያረጋገጡ በጀትን በስልት በማሳደግ ነው።'
    }
  ],

  shein_import: [
    {
      id: 1,
      question: 'ከሼን (Shein) ወይም ከቻይና እቃዎችን በኢምፖርት ለማስመጣት ቀዳሚውና ወሳኙ እርምጃ ምንድን ነው?',
      options: [
        'ተፈላጊና ከፍተኛ የትርፍ ህዳግ ያላቸውን ምርቶች በጥናት መለየት (Product Research)',
        'በዘፈቀደ ማንኛውንም እቃ በብዛት ማዘዝ',
        'ሱቅ አስቀድሞ በከፍተኛ ዋጋ መከራየት',
        'የቴሌቪዥን ማስታወቂያ መስጠት'
      ],
      correctIndex: 0,
      explanation: 'ስኬታማ የኢምፖርት ቢዝነስ የሚጀምረው በገበያ ላይ ተፈላጊና አትራፊ ምርትን በጥናት በመምረጥ ነው።'
    },
    {
      id: 2,
      question: 'በኢምፖርት ሂደት ውስጥ "Freight Forwarder (ካርጎ/አስተላላፊ)" ሚና ምንድን ነው?',
      options: [
        'እቃዎችን በሱቅ ውስጥ መሸጥ',
        'እቃዎችን ከአቅራቢው መጋዘን ተረክቦ ደህንነታቸውን ጠብቆ ወደ ሀገር ውስጥ ማጓጓዝ',
        'የደንበኞችን ፎቶ ማንሳት',
        'የፌስቡክ ፔጅ ማስተዳደር'
      ],
      correctIndex: 1,
      explanation: 'Freight Forwarder እቃዎችን ከአቅራቢው ተረክቦ ወደ ኢትዮጵያ በካርጎ የሚያጓጉዝ እና የሚያስረክብ አካል ነው።'
    },
    {
      id: 3,
      question: 'ትክክለኛ የተጣራ ትርፍ (Net Profit) ለማስላት የትኛው ቀመር ትክክል ነው?',
      options: [
        'የመሸጫ ዋጋ - (የእቃ መግዣ ዋጋ + የማጓጓዣ/ቀረጥ ወጪ + ማስታወቂያ)',
        'የመሸጫ ዋጋ ብቻ',
        'የእቃው ክብደት ሲደመር ዋጋው',
        'የካርጎ ክፍያ ብቻ'
      ],
      correctIndex: 0,
      explanation: 'ትክክለኛ የተጣራ ትርፍ የሚሰላው ሁሉንም የእቃውን፣ የማጓጓዣ እና የተጓዳኝ ወጪዎችን ከመሸጫ ዋጋው ላይ በመቀነስ ነው።'
    },
    {
      id: 4,
      question: 'ከአቅራቢዎች ጋር በሚደረግ ግንኙነት አስተማማኝነታቸውን ለማረጋገጥ ምን ማድረግ ይመከራል?',
      options: [
        'የደንበኞች ግምገማዎችን (Reviews)፣ የሻጩን ታሪክና ደረጃ መፈተሽ',
        'ምንም ሳያረጋግጡ ሙሉ ክፍያ ወዲያውኑ መላክ',
        'በጣም ርካሹን ብቻ ያለምንም ጥናት መምረጥ',
        'ስማቸውን ብቻ ማየት'
      ],
      correctIndex: 0,
      explanation: 'የአቅራቢውን ደረጃ፣ የደንበኞች ሪቪው እና ትክክለኛነት አስቀድሞ መመርመር ከአደጋና ከኪሳራ ይጠብቃል።'
    },
    {
      id: 5,
      question: 'እቃዎች ከደረሱ በኋላ በኢትዮጵያ ውስጥ በፍጥነት ለገበያ ለማቅረብ የተሻለው መንገድ ምንድን ነው?',
      options: [
        'በማህበራዊ ሚዲያ (ቲክቶክ/ቴሌግራም/ኢንስታግራም) ጥራት ያለው ቪዲዮና ማስታወቂያ መስራት',
        'እቃውን ደብቆ ማስቀመጥ',
        'ለቤተሰብ ብቻ ማሳወቅ',
        'ምንም ፖስት አለማድረግ'
      ],
      correctIndex: 0,
      explanation: 'በማህበራዊ ሚዲያዎች ላይ ማራኪ ቪዲዮዎችን እና ማስታወቂያዎችን በማሰራጨት ፈጣን ሽያጭ ማግኘት ይቻላል።'
    },
    {
      id: 6,
      question: 'በካርጎ ማጓጓዣ ውስጥ በ "Air Cargo (አየር መንገድ)" እና "Sea Cargo (በባህር)" መካከል ያለው ዋነኛ ልዩነት ምንድን ነው?',
      options: [
        'አየር ካርጎ ፈጣን (ከ 7-14 ቀናት) ግን ውድ ሲሆን የባህር ካርጎ ረጅም ጊዜ የሚወስድ ግን በጣም ርካሽ ነው',
        'የባህር ካርጎ በአውሮፕላን ነው የሚመጣው',
        'በሁለቱ መካከል ምንም ልዩነት የለም',
        'አየር ካርጎ ነፃ ነው'
      ],
      correctIndex: 0,
      explanation: 'ለቀላል እና አጣዳፊ እቃዎች የአየር ካርጎ፣ ለከባድና ለብዙ እቃዎች ደግሞ የባህር ካርጎ ይመረጣል።'
    },
    {
      id: 7,
      question: 'በካርጎ ስሌት ውስጥ "CBM (Cubic Meter)" ማለት ምን ማለት ነው?',
      options: [
        'የእቃው ሳጥን የቦታ ይዘት መጠን (ርዝመት × ስፋት × ቁመት በመተር)',
        'የእቃው ጠቅላላ ዋጋ',
        'የአውሮፕላኑ ቁጥር',
        'የአሽከርካሪው ስም'
      ],
      correctIndex: 0,
      explanation: 'CBM የእቃውን ሳጥን መጠንና የሚይዘውን የቦታ ስፋት በማስላት የማጓጓዣ ዋጋ የሚተመንበት አለምአቀፍ መለኪያ ነው።'
    },
    {
      id: 8,
      question: 'በሼን (Shein) ግዢ ወቅት ወጪን በእጅጉ ለመቀነስ የሚረዱ አማራጮች የትኞቹ ናቸው?',
      options: [
        'የኩፖን ኮዶች (Coupons)፣ የነጥቦች ክምችት (Points) እና የ Flash Sale ቅናሾችን መጠቀም',
        'ሙሉ ዋጋ ብቻ መክፈል',
        'ማታ ብቻ ማዘዝ',
        'ምንም ቅናሽ አለመጠቀም'
      ],
      correctIndex: 0,
      explanation: 'ኩፖኖችን እና በየቀኑ የሚሰበሰቡ ፖይንቶችን በአግባቡ መጠቀም እስከ 30-40% ተጨማሪ ትርፍ ያስገኛል።'
    },
    {
      id: 9,
      question: 'አዲስ እቃ ለመጀመሪያ ጊዜ ሲያስመጡ ከኪሳራ ለመዳን ምን ማድረግ ይመከራል?',
      options: [
        'በመጀመሪያ በትንሽ መጠን (Sample) አስመጥቶ የገበያውን ፍላጎትና ጥራት መፈተሽ',
        'ሁሉንም ካፒታል በአንድ ምርት ላይ ማፍሰስ',
        'ያልተሞከረ እቃ በኮንቴይነር ማዘዝ',
        'ሳይፈትሹ ለደንበኞች ቃል መግባት'
      ],
      correctIndex: 0,
      explanation: 'የምርት ጥራቱንና የገበያ ተቀባይነቱን በትንሽ ናሙና መፈተሽ ካልተፈለገ የካፒታል መታሰር ያድናል።'
    },
    {
      id: 10,
      question: 'በኢምፖርት ቢዝነስ ውስጥ "Fast-Moving Consumer Goods (FMCG)" ምን አይነት እቃዎች ናቸው?',
      options: [
        'በየቀኑ የሚፈለጉና በከፍተኛ ፍጥነት ተሽጠው የሚያልቁ ምርቶች',
        'በአመት አንድ ጊዜ ብቻ የሚሸጡ',
        'ማንም የማይገዛቸው',
        'በጣም ውድ የሆኑ ማሽነሪዎች ብቻ'
      ],
      correctIndex: 0,
      explanation: 'በፍጥነት የሚሸጡ እቃዎች የገንዘብ ዝውውርን (Cashflow) በማፋጠን ፈጣን ትርፍ ያስገኛሉ።'
    },
    {
      id: 11,
      question: 'እቃዎች ከካርጎ መጋዘን ሲደርሱ ቀዳሚው ተግባር ምን መሆን አለበት?',
      options: [
        'ሳጥኖቹን ከፍቶ የእቃውን ብዛት፣ ቀለም፣ መጠንና የጥራት ሁኔታ በጥንቃቄ መፈተሽ',
        'ሳያዩ ለደንበኛ ወዲያውኑ መላክ',
        'ሳጥኑን ባለበት መተው',
        'ሁሉንም እቃ ወዲያውኑ ማቃጠል'
      ],
      correctIndex: 0,
      explanation: 'አስቀድሞ እቃዎችን መፈተሽ የተበላሸ ወይም የጎደለ እቃ ካለ ከካርጎው ወይም ከአቅራቢው ጋር ፈጣን መፍትሄ ለመፈለግ ያስችላል።'
    },
    {
      id: 12,
      question: 'በቴሌግራም ቻናል ሽያጭ ላይ የደንበኞችን አመኔታ ለመገንባት የቱ ወሳኝ ነው?',
      options: [
        'የእቃውን ትክክለኛ ቪዲዮ መቅረጽ፣ ዋጋን በግልጽ ማስቀመጥ እና የደረሱ ደንበኞችን አስተያየት ማጋራት',
        'የሌሎች ሰዎችን ፎቶ ብቻ መጠቀም',
        'ዋጋን በውስጥ መስመር ብቻ ማለት',
        'የደንበኞችን ስልክ አለማንሳት'
      ],
      correctIndex: 0,
      explanation: 'ትክክለኛ የእጅ ላይ ቪዲዮ እና ግልጽ ዋጋ ደንበኞች ያለ ምንም ማመንታት ወዲያውኑ እንዲያዙ ያደርጋል።'
    },
    {
      id: 13,
      question: 'በኢምፖርት ቢዝነስ ውስጥ "Pre-order (የቅድመ-ትዕዛዝ)" ስልት ዋነኛ ጥቅም ምንድን ነው?',
      options: [
        'የራስን ካፒታል ሳያወጡ ከደንበኞች የቅድመ ክፍያ ተቀብሎ እቃ በማስመጣት ያለ ስጋት መስራት',
        'እቃዎችን መጋዘን ውስጥ ለረጅም ጊዜ ማቆየት',
        'ለደንበኞች ነፃ እቃ መስጠት',
        'ምንም እቃ አለማስመጣት'
      ],
      correctIndex: 0,
      explanation: 'Pre-order አነስተኛ መነሻ ካፒታል ላላቸው ሰዎች ያለ ኪሳራ ስጋት ቢዝነሳቸውን እንዲጀምሩ ትልቅ እድል ይፈጥራል።'
    },
    {
      id: 14,
      question: 'ከደንበኛ ጋር በዋጋ ድርድር ወቅት ትርፋማነትን ሳያጡ ስምምነት ላይ ለመድረስ ምን ማድረግ ይቻላል?',
      options: [
        'ዋጋ ከመቀነስ ይልቅ ነፃ ማድረስ (Free Delivery) ወይም አነስተኛ ተጨማሪ ስጦታ መስጠት',
        'እቃውን በኪሳራ መሸጥ',
        'ደንበኛውን ማባረር',
        'ምንም አይነት አማራጭ አለመስጠት'
      ],
      correctIndex: 0,
      explanation: 'ተጨማሪ እሴት (ለምሳሌ ነፃ ማድረስ) መስጠት የምርቱን ዋጋ ሳይቀንሱ ደንበኛውን ለማስደሰት ምርጥ ዘዴ ነው።'
    },
    {
      id: 15,
      question: 'በአዲስ አበባ ውስጥ እቃዎችን ለደንበኛ በሰዓቱ ለማድረስ የትኛው አጋር ይመረጣል?',
      options: [
        'አስተማማኝ የሞተር ሳይክል ዴሊቨሪ ድርጅቶች ወይም የራስ አስተላላፊ',
        'በፖስታ ቤት ብቻ መላክ',
        'ደንበኛው እራሱ እንዲመጣ ብቻ ማስገደድ',
        'በዘፈቀደ መንገድ አላፊ መላክ'
      ],
      correctIndex: 0,
      explanation: 'ፈጣን የሞተር ዴሊቨሪ ደንበኛው በደቂቃዎች ውስጥ እቃውን ተቀብሎ ክፍያውን እንዲፈጽም ያስችላል።'
    },
    {
      id: 16,
      question: 'የኢምፖርት ቢዝነስን በዘላቂነት ለማሳደግ (Scale ለማድረግ) የትኛው ወሳኝ ነው?',
      options: [
        'የተገኘውን ትርፍ መልሶ በቢዝነሱ ላይ ማፍሰስ (Reinvesting) እና የእቃ ብዛትን በሂደት ማሳደግ',
        'የመጀመሪያውን ወር ትርፍ ሙሉ በሙሉ ለግል ወጪ ማዋል',
        'ማስታወቂያዎችን ማቆም',
        'አንድ እቃ ብቻ ይዞ መቅረት'
      ],
      correctIndex: 0,
      explanation: 'ትርፍን መልሶ በማፍሰስና ምርቶችን በማብዛት አነስተኛ ንግድን ወደ ትልቅ ድርጅት መቀየር ይቻላል።'
    },
    {
      id: 17,
      question: 'የደንበኛ ተመላሽ (Return / Exchange) ሲያጋጥም ቢዝነሱ ምን አይነት ፖሊሲ ሊኖረው ይገባል?',
      options: [
        'ግልጽ፣ ፍትሃዊና ፈጣን የመቀያየሪያ ስርአት በመዘርጋት የደንበኛውን ቅሬታ ወደ ዘላቂ ታማኝነት መቀየር',
        'ስልክ ማጥፋት',
        'ደንበኛውን መክሰስ',
        'እቃ አይመለስም ብሎ መዝጋት'
      ],
      correctIndex: 0,
      explanation: 'ችግሮችን በቅንነት መፍታት ደንበኛው ለሌሎች ጓደኞቹ እንዲመክራችሁ እና ሁልጊዜ ከእናንተ ብቻ እንዲገዛ ያደርጋል።'
    },
    {
      id: 18,
      question: 'በሼን ወይም በቻይና ሳይቶች ላይ "Flash Sale" መቼ ነው የሚካሄደው?',
      options: [
        'በተወሰኑ ውስን ሰዓታት ውስጥ እጅግ ከፍተኛ የዋጋ ቅናሽ በሚደረግባቸው ወቅቶች',
        'በአመት አንድ ቀን ብቻ',
        'በጭራሽ አይደረግም',
        'እቃ ሲያልቅ ብቻ'
      ],
      correctIndex: 0,
      explanation: 'የ Flash Sale ሰዓቶችን ጠብቆ ማዘዝ እቃዎችን በግማሽ ዋጋ በማግኘት ከፍተኛ ትርፍ ለማስላት ይረዳል።'
    },
    {
      id: 19,
      question: 'በኢምፖርት ውስጥ የትርፍ ህዳግ (Profit Margin) በትንሹ ምን ያህል ቢሆን ይመረጣል?',
      options: [
        'ከ 30% እስከ 100%+ የተጣራ ትርፍ',
        '1% ብቻ',
        '0% ትርፍ',
        'ኪሳራ ብቻ'
      ],
      correctIndex: 0,
      explanation: 'የማስታወቂያ፣ የዴሊቨሪ እና የተጓዳኝ ወጪዎችን ከሸፈነ በኋላ ጥሩ የተጣራ ትርፍ ሊያስቀር የሚችል ምርት መምረጥ ያስፈልጋል።'
    },
    {
      id: 20,
      question: 'በኢ-ኮሜርስ ሽያጭ ላይ የቲክቶክ ቪዲዮዎችን ውጤታማ የሚያደርገው ዋናው ነገር ምንድን ነው?',
      options: [
        'እቃው በህይወት ውስጥ የሚፈታውን ችግር በተግባር የሚያሳይ እውነተኛ እና ሳቢ ቪዲዮ (Problem Solving)',
        'የእቃውን ፎቶ ብቻ ማስቀመጥ',
        'ያለ ድምጽ ማሳየት',
        'የድሮ ማስታወቂያዎችን መቅዳት'
      ],
      correctIndex: 0,
      explanation: 'የምርቱን ጥቅም እና አጠቃቀም በተግባር የሚያሳዩ ቪዲዮዎች በቲክቶክ ላይ በሰፊው ተሰራጭተው (Viral ሆነው) ከፍተኛ ሽያጭ ያመጣሉ።'
    }
  ],

  youtube: [
    {
      id: 1,
      question: 'በዩቲዩብ ላይ ሰዎች ቪዲዮዎን እንዲነኩ (Click እንዲያደርጉ) በጣም ወሳኙ ነገር ምንድን ነው?',
      options: [
        'ሳቢ የሆነ Thumbnail (የፊት ገጽ ምስል) እና ማራኪ Title (ርዕስ)',
        'የቪዲዮው ፋይል መጠን',
        'የተጫነበት ሰዓት ብቻ',
        'የኮምፒውተሩ አይነት'
      ],
      correctIndex: 0,
      explanation: 'Thumbnail እና ርዕስ (Title) ተመልካቹ ቪዲዮዎን ለመክፈት የሚወስንበት ዋነኛ ምክንያት ነው።'
    },
    {
      id: 2,
      question: '"Watch Time (የእይታ ጊዜ)" በዩቲዩብ አልጎሪዝም ውስጥ ያለው ፋይዳ ምንድን ነው?',
      options: [
        'ሰዎች ቪዲዮዎን በቆዩ ቁጥር ዩቲዩብ ለብዙ አዳዲስ ሰዎች ይመክረዋል (Recommend ያደርጋል)',
        'ምንም ጥቅም የለውም',
        'የድምጽ መጠን ብቻ ይጨምራል',
        'ቪዲዮውን ያጠረዋል'
      ],
      correctIndex: 0,
      explanation: 'ረጅም Watch Time ያለው ቪዲዮ ተመልካችን የማቆየት አቅሙ ከፍተኛ በመሆኑ ዩቲዩብ በስፋት እንዲታይ ያደርገዋል።'
    },
    {
      id: 3,
      question: 'የዩቲዩብ የገቢ ማግኛ (Monetization - YPP) መመዘኛ መስፈርቶች ምንድን ናቸው?',
      options: [
        '1,000 ሰብስክራይበር እና 4,000 የሰዓት እይታ (Watch Hours)',
        '100 ቪዲዮ መጫን ብቻ',
        '10 ሺህ ላይክ',
        '1 ወር መቆየት ብቻ'
      ],
      correctIndex: 0,
      explanation: 'የዩቲዩብ ፓርትነር ፕሮግራም 1,000 Subscribers እና 4,000 Public Watch Hours (ወይም 10M Shorts views) ይጠይቃል።'
    },
    {
      id: 4,
      question: 'የቪዲዮ መጀመሪያ (Hook) ለምን አስፈላጊ ነው?',
      options: [
        'በመጀመሪያዎቹ 15-30 ሰከንዶች ውስጥ የተመልካቹን ትኩረት ለመሳብና እንዳይወጡ ለማድረግ',
        'ሙዚቃ ብቻ ለማሰማት',
        'ሰብስክራይብ እንዲያደርጉ ለመለመን ብቻ',
        'ቪዲዮውን ለማዘግየት'
      ],
      correctIndex: 0,
      explanation: 'የመጀመሪያዎቹ ሰከንዶች ተመልካቹ ቪዲዮውን መቀጠል ወይም ማቆሙን የሚወስንበት ወሳኝ ክፍል ነው።'
    },
    {
      id: 5,
      question: 'በዩቲዩብ ላይ ዘላቂ ስኬት ለማምጣት የቱ ይመረጣል?',
      options: [
        'ተከታታይነት (Consistency)፣ ጥራት ያለው ይዘት እና ለተመልካች ጠቃሚ መረጃ መስጠት',
        'በወር አንድ ጊዜ ብቻ መጫን',
        'የሌሎች ሰዎችን ቪዲዮ ኮፒ ማድረግ',
        'ርዕስ ብቻ መቀያየር'
      ],
      correctIndex: 0,
      explanation: 'በቋሚነት ዋጋ የሚሰጡ እና ጥራት ያላቸውን ይዘቶች ማቅረብ ታማኝ ተከታዮችን ለመገንባት ቁልፍ ነው።'
    },
    {
      id: 6,
      question: 'በዩቲዩብ ውስጥ "Click-Through Rate (CTR)" ተቀባይነት ያለው ጥሩ መጠን ስንት ነው?',
      options: [
        'ከ 4% እስከ 10%+ እና ከዚያ በላይ',
        '0.1%',
        '100% ሁልጊዜ',
        'ምንም ጠቅ አለመደረግ'
      ],
      correctIndex: 0,
      explanation: 'ጥሩ Thumbnail እና Title ያለው ቪዲዮ በአማካይ ከ 4% እስከ 10%+ CTR ያስመዘግባል።'
    },
    {
      id: 7,
      question: 'የ YouTube SEO (Search Engine Optimization) ዋና ዋና ክፍሎች የትኞቹ ናቸው?',
      options: [
        'በ Title፣ Description እና Tags ውስጥ ቁልፍ ቃላትን (Keywords) በአግባቡ ማካተት',
        'የቪዲዮውን ቀለም መቀየር ብቻ',
        'ምንም መግለጫ አለመጻፍ',
        'የዘፈን ስም ብቻ መጻፍ'
      ],
      correctIndex: 0,
      explanation: 'ትክክለኛ የ SEO ቃላት ሰዎች ዩቲዩብ ላይ ሲፈልጉ የእርስዎ ቪዲዮ በቀዳሚነት እንዲወጣ ያደርጋሉ።'
    },
    {
      id: 8,
      question: 'የ "YouTube Shorts" አልጎሪዝም ዋና መለኪያ ምንድን ነው?',
      options: [
        'Viewed vs Swiped Away በመቶኛ እና አማካይ የእይታ ቆይታ (Average Percentage Viewed)',
        'የቪዲዮው ፋይል ስም',
        'የተጫነበት ቀን',
        'ምንም መለኪያ የለውም'
      ],
      correctIndex: 0,
      explanation: 'ሰዎች ሾርትስ ቪዲዮውን ሳይዘሉ ሙሉውን ሲያዩት ዩቲዩብ ለሚሊዮኖች እንዲደርስ ያደርገዋል።'
    },
    {
      id: 9,
      question: '"End Screens" እና "Cards" በዩቲዩብ ቪዲዮ መጨረሻ ላይ ለምን ይጠቅማሉ?',
      options: [
        'ተመልካቹ የእርስዎን ቀጣይ ቪዲዮ እንዲመለከት ወይም ሰብስክራይብ እንዲያደርግ ለመምራት',
        'ስክሪኑን ለማጨለም',
        'ቪዲዮውን ለማቆም',
        'ማስታወቂያዎችን ለመዝጋት'
      ],
      correctIndex: 0,
      explanation: 'ተመልካችን በእርስዎ ቻናል ውስጥ በማቆየት ተጨማሪ እይታና ሰብስክራይበር ለማግኘት ይረዳሉ።'
    },
    {
      id: 10,
      question: 'የ "Copyright Strike" እና "Copyright Claim" ልዩነት ምንድን ነው?',
      options: [
        'Strike የቻናሉን ጤንነት የሚጎዳና ከ 3 Strike በኋላ ቻናል የሚያዘጋ ሲሆን Claim የገቢ ክፍፍልን የሚመለከት ነው',
        'ሁለቱም ምንም ጉዳት የላቸውም',
        'Strike ሰብስክራይበር ይጨምራል',
        'ምንም አይነት ልዩነት የለም'
      ],
      correctIndex: 0,
      explanation: 'የሌሎችን የቅጂ መብት የተጠበቀበትን ይዘት አለመጠቀም የቻናልን ደህንነት ይጠብቃል።'
    },
    {
      id: 11,
      question: 'በዩቲዩብ ላይ "Audience Retention Graph" ምን ያሳያል?',
      options: [
        'ተመልካቾች በቪዲዮው በየትኛው ሰከንድ ላይ እንደተሰላቹና እንደወጡ ወይም የትኛውን ክፍል ደጋግመው እንዳዩ',
        'የተመልካቾችን ስም ዝርዝር',
        'የባንክ አካውንት ቁጥር',
        'የኮምፒውተር ሙቀት'
      ],
      correctIndex: 0,
      explanation: 'Retention ግራፍን በመመልከት ለቀጣይ ቪዲዮዎች አሰልቺ ክፍሎችን በማስወገድ ጥራትን ማሻሻል ይቻላል።'
    },
    {
      id: 12,
      question: '"Community Tab" በዩቲዩብ ቻናል ላይ ለምን ይጠቅማል?',
      options: [
        'ከቪዲዮ ውጭ በፎቶ፣ በጽሁፍና በምርጫ (Poll) ከተከታዮች ጋር ቀጥተኛ ግንኙነት ለመፍጠር',
        'ቪዲዮዎችን ለመሰረዝ',
        'ቻናሉን ለመዝጋት',
        'ምንም ጥቅም የለውም'
      ],
      correctIndex: 0,
      explanation: 'Community Tab ከተከታዮች ጋር ጠንካራ ትስስር በመፍጠር የቻናል ተሳትፎን ከፍ ያደርጋል።'
    },
    {
      id: 13,
      question: 'ከ AdSense በተጨማሪ በዩቲዩብ ቻናል ከፍተኛ ገቢ የሚያስገኙ መንገዶች የትኞቹ ናቸው?',
      options: [
        'የድርጅቶች ስፖንሰርሺፕ (Brand Deals)፣ የራስ ምርቶችን/ስልጠናዎችን መሸጥ እና አፊሊየት ማርኬቲንግ',
        'ምንም ተጨማሪ ገቢ የለም',
        'የሰዎችን ቪዲዮ ማውረድ',
        'ሰብስክራይበር መሸጥ'
      ],
      correctIndex: 0,
      explanation: 'ትላልቅ ዩቲዩበሮች አብዛኛውን ገቢ የሚያገኙት ከስፖንሰርሺፕ እና የራሳቸውን ምርቶች በማስተዋወቅ ነው።'
    },
    {
      id: 14,
      question: '"Evergreen Content" በዩቲዩብ ምን አይነት ይዘት ነው?',
      options: [
        'ለብዙ አመታት ሳይታክት ሁልጊዜ ተፈላጊና ጠቃሚ ሆኖ የሚቆይ ዘላቂ ይዘት (ለምሳሌ How-to / Tutorial)',
        'የዛሬ ዜና ብቻ',
        'በአንድ ሰዓት ውስጥ የሚረሳ',
        'ምንም የማይፈለግ'
      ],
      correctIndex: 0,
      explanation: 'Evergreen ቪዲዮዎች ለወራትና ለአመታት ቋሚ እይታና ገቢ የማመንጨት አቅም አላቸው።'
    },
    {
      id: 15,
      question: 'አዲስ የዩቲዩብ ቻናል ሲጀምሩ "Niche (የይዘት ዘርፍ)" መምረጥ ለምን አስፈላጊ ነው?',
      options: [
        'አልጎሪዝሙ ቻናልዎን ለትክክለኛዎቹ ፍላጎት ላላቸው ሰዎች እንዲመክርና ታማኝ ተመልካች ለማፍራት',
        'ሁሉንም አይነት ቪዲዮ በአንድ ላይ ለመጫን',
        'ስም ለማሳመር ብቻ',
        'ምንም ጥቅም ስለሌለው'
      ],
      correctIndex: 0,
      explanation: 'በአንድ የተወሰነ ርዕስ ላይ ማተኮር ዩቲዩብ የእርስዎን ታዳሚ በፍጥነት እንዲለይ ያግዘዋል።'
    },
    {
      id: 16,
      question: 'በቪዲዮ ጥራት ውስጥ ከምስል (Video) እና ከድምጽ (Audio) የትኛው ለተመልካች የበለጠ ወሳኝ ነው?',
      options: [
        'ድምጽ (Clear Audio)፤ ምክንያቱም ምስሉ ጥሩ ሆኖ ድምጹ ከተበላሸ ተመልካች ወዲያውኑ ይወጣል',
        'ሁልጊዜ 4K ካሜራ ብቻ',
        'የጀርባ ጫጫታ ያለው ድምጽ',
        'ድምጽ ምንም ጥቅም የለውም'
      ],
      correctIndex: 0,
      explanation: 'ጥራት ያለውና ጥርት ያለ ድምጽ ተመልካች ቪዲዮዎን ረጅም ሰዓት እንዲያዳምጥ ዋነኛው ምክንያት ነው።'
    },
    {
      id: 17,
      question: '"Playlists" ማዘጋጀት በቻናል ላይ ምን ጥቅም ይሰጣል?',
      options: [
        'ተዛማጅ ቪዲዮዎችን በቅደም ተከተል በማቀናጀት ተመልካች አንዱን አይቶ ወደ ቀጣዩ እንዲሸጋገር በማድረግ የእይታ ሰዓትን ያሳድጋል',
        'ቪዲዮዎችን ያጠፋል',
        'ምንም ጥቅም የለውም',
        'የቻናሉን ፍጥነት ይቀንሳል'
      ],
      correctIndex: 0,
      explanation: 'Playlists የ Watch Time ሰዓትን በከፍተኛ ሁኔታ በማሳደግ ለቻናል እድገት ጉልህ ሚና ይጫወታሉ።'
    },
    {
      id: 18,
      question: 'በ Thumbnail ላይ ጽሁፍ ሲጻፍ ምን አይነት መሆን አለበት?',
      options: [
        'አጭር (ከ 3-5 ቃላት ያልበለጠ)፣ ግልጽና በቀላሉ በሞባይል ስክሪን የሚነበብ ትልቅ ፎንት',
        'ሙሉ አንቀጽ መጻፍ',
        'በጣም ደቃቅ ፊደላት',
        'ምንም ፎቶ አለመጠቀም'
      ],
      correctIndex: 0,
      explanation: 'አጫጭርና ማራኪ ቃላት ተመልካቹ በቅጽበት መልዕክቱን ተረድቶ ቪዲዮውን እንዲከፍት ያደርጋሉ።'
    },
    {
      id: 19,
      question: 'በቪዲዮ ውስጥ "Call To Action (ሰብስክራይብ እንዲያደርጉ መጋበዝ)" መቼ ቢሆን ይመረጣል?',
      options: [
        'ለተመልካቹ ጠቃሚ መረጃ ከሰጡ በኋላ በተፈጥሯዊ መንገድ በቪዲዮው መሀል ወይም መጨረሻ ላይ',
        'ቪዲዮው ከመጀመሩ በፊት ለ 2 ደቂቃ መለመን',
        'በጭራሽ አለመናገር',
        'በየሰከንዱ መጮህ'
      ],
      correctIndex: 0,
      explanation: 'ተመልካቹ ዋጋ ካገኘ በኋላ በትህትና መጠየቅ ለሰብስክራይብ ከፍተኛ ምላሽ ያስገኛል።'
    },
    {
      id: 20,
      question: 'የዩቲዩብ ገቢን ወደ ኢትዮጵያ በህጋዊ መንገድ ለመቀበል የትኛው መንገድ ጥቅም ላይ ይውላል?',
      options: [
        'Google AdSense አካውንትን ከኢትዮጵያ ባንክ (Wire Transfer) ወይም ህጋዊ የውጭ ባንክ ጋር ማገናኘት',
        'በቴሌግራም ቦት መቀበል',
        'ክፍያ አይቻልም',
        'በኢሜል ገንዘብ መላክ'
      ],
      correctIndex: 0,
      explanation: 'Google AdSense በየወሩ ከ 21-26 ባሉት ቀናት ገቢዎን በቀጥታ ወደ ባንክ አካውንትዎ ያስተላልፋል።'
    }
  ],

  general: [
    {
      id: 1,
      question: 'በኦንላይን ስራዎች እና ቢዝነስ ውስጥ ለዘላቂ ስኬት ወሳኙ ነገር ምንድን ነው?',
      options: [
        'የተግባር ልምምድ፣ ተከታታይ ጥረት እና የደንበኛ እርካታን ማስቀደም',
        'በአንድ ቀን ሚሊየነር መሆንን መጠበቅ',
        'ምንም እውቀት ሳይኖራቸው መጀመር',
        'ተስፋ በፍጥነት መቁረጥ'
      ],
      correctIndex: 0,
      explanation: 'ዘላቂ የኦንላይን ገቢ የሚገኘው በተግባር በመስራት፣ ክህሎትን በማሳደግ እና አስተማማኝ አገልግሎት በመስጠት ነው።'
    },
    {
      id: 2,
      question: 'በዲጂታል ክፍያዎች እና ግብይቶች ውስጥ የደንበኞችን እምነት ለመገንባት ምን ያስፈልጋል?',
      options: [
        'ግልጽ መረጃ፣ ፈጣን ምላሽ እና ጥራት ያለው አገልግሎት መስጠት',
        'ዋጋን መደበቅ',
        'ለደንበኞች ምላሽ አለመስጠት',
        'ያልተረጋገጠ መረጃ መናገር'
      ],
      correctIndex: 0,
      explanation: 'ግልጽነት እና ታማኝነት በዲጂታል አለም ውስጥ የደንበኛ እምነትን ለመገንባት ቁልፍ ናቸው።'
    },
    {
      id: 3,
      question: '"Portfolio (የስራ ማሳያ)" ለምን ይጠቅማል?',
      options: [
        'ቀደም ሲል የሰራናቸውን ስራዎች በማሳየት አዳዲስ ደንበኞችን ለማሳመን',
        'ለቤተሰብ ለማሳየት ብቻ',
        'የኮምፒውተር ማስታወሻ ለመሙላት',
        'ምንም ጥቅም የለውም'
      ],
      correctIndex: 0,
      explanation: 'Portfolio ችሎታዎን በተግባር ለደንበኞች የሚያረጋግጡበት ምርጥ የስራ ማሳያ ነው።'
    },
    {
      id: 4,
      question: 'የጊዜ አጠቃቀምን (Time Management) ለማሻሻል የትኛው ስልት ይመረጣል?',
      options: [
        'ዋና ዋና ስራዎችን በቅድሚያ ማቀድና ማከናወን (Prioritization)',
        'ሁሉንም በአንድ ጊዜ ለመስራት መሞከር',
        'ስራዎችን ማዘግየት',
        'እቅድ አለማውጣት'
      ],
      correctIndex: 0,
      explanation: 'ስራዎችን በቅደም ተከተል ማቀድ ውጤታማነትን በእጥፍ ይጨምራል።'
    },
    {
      id: 5,
      question: 'በፀሐይ ካምፓስ የተማሩትን ትምህርት በተግባር ለመተርጎም የተሻለው መንገድ የቱ ነው?',
      options: [
        'የተማሩትን ወዲያውኑ በራስዎ ፕሮጀክት ወይም ስራ ላይ በመተግበር ገቢ መፍጠር መጀመር',
        'ማስታወሻ ብቻ ይዞ መቀመጥ',
        'ሳያለማምዱ መተው',
        'ቪዲዮውን ብቻ አይቶ መርሳት'
      ],
      correctIndex: 0,
      explanation: 'እውነተኛ ውጤት የሚመጣው የተማሩትን ወደ ተግባር ሲቀይሩ ነው።'
    },
    {
      id: 6,
      question: 'ከደንበኛ ጋር በስራ ድርድር (Negotiation) ወቅት ሁለቱንም ወገን አሸናፊ (Win-Win) የሚያደርገው ምንድን ነው?',
      options: [
        'የደንበኛውን ትክክለኛ ፍላጎት ማዳመጥ እና ለሁለቱም ወገን ሚዛናዊ የሆነ ዋጋና ጥራት ማቅረብ',
        'የራስን ጥቅም ብቻ ማሳደድ',
        'ደንበኛውን መጫን',
        'ያልተገባ ቃል መግባት'
      ],
      correctIndex: 0,
      explanation: 'Win-Win ድርድር የደንበኛውን እምነት በማትረፍ ለረጅም ጊዜ አብሮ ለመስራት በር ይከፍታል።'
    },
    {
      id: 7,
      question: 'የአገልግሎት ዋጋን (Pricing) ሲወስኑ ምን አይነት መስፈርቶች ግምት ውስጥ መግባት አለባቸው?',
      options: [
        'የፈጀው ሰዓት፣ ክህሎት፣ የገበያው አማካይ ዋጋ እና ለደንበኛው የሚሰጠው ትልቅ ጥቅም',
        'በዘፈቀደ ዋጋ መናገር',
        'በጣም ርካሽ ብቻ ማድረግ',
        'የደንበኛውን ስም ማየት'
      ],
      correctIndex: 0,
      explanation: 'ትክክለኛ የዋጋ አተማመን ለስራዎ ተገቢውን ክብርና ገቢ ያስገኛል።'
    },
    {
      id: 8,
      question: 'በኦንላይን ፍሪላንሲንግ ስራዎች ላይ "Deadline (ቀነ-ገደብ)" ማክበር ለምን ወሳኝ ነው?',
      options: [
        'የስራ ፕሮፌሽናሊዝምን በማሳየት ደንበኛው ሁልጊዜ ተጨማሪ ስራዎችን ለእርስዎ እንዲሰጥ ስለሚያደርግ',
        'ምንም ጥቅም የለውም',
        'ስራውን ለማበላሸት',
        'ክፍያ ለማዘግየት'
      ],
      correctIndex: 0,
      explanation: 'ቀጠሮን ማክበር በዲጂታል ገበያ ላይ የመተማመኛ ትልቁ መለያ ነው።'
    },
    {
      id: 9,
      question: 'የ "Active Listening (ጥሞና ማዳመጥ)" ክህሎት በደንበኛ አያያዝ ውስጥ ያለው ሚና ምንድን ነው?',
      options: [
        'ደንበኛው የሚፈልገውን ትክክለኛ ችግር በመረዳት ያልተሳሳተ ፍቱን መፍትሄ ለመስጠት',
        'ዝም ብሎ መስማት',
        'ንግግር ማቋረጥ',
        'ስልክ ላይ ማተኮር'
      ],
      correctIndex: 0,
      explanation: 'ደንበኛን በትክክል ማዳመጥ ያልተፈለጉ ስህተቶችንና ድጋሚ ስራዎችን ያስቀራል።'
    },
    {
      id: 10,
      question: 'በግል ቢዝነስ ውስጥ የፋይናንስ አስተዳደር ቁልፍ ህግ ምንድን ነው?',
      options: [
        'የቢዝነስ ገንዘብን እና የግል ወጪን ፍጹም ለይቶ ማስተዳደር',
        'ሁሉንም ገንዘብ በአንድ ላይ መቀላቀል',
        'ምንም አይነት ሂሳብ አለመመዝገብ',
        'ትርፍን ሳያውቁ ማውጣት'
      ],
      correctIndex: 0,
      explanation: 'የቢዝነስ ሂሳብን ከግል ወጪ መለየት የቢዝነሱን ትክክለኛ እድገት ለመቆጣጠር ይረዳል።'
    },
    {
      id: 11,
      question: '"Upselling" እና "Cross-selling" በሽያጭ ወቅት ምን ማለት ናቸው?',
      options: [
        'ለደንበኛው የተሻለ ጥራት ያለውን ምርት ወይም ተጓዳኝ ተጨማሪ እቃዎችን ማቅረብ',
        'ዋጋ በእጥፍ መጨመር',
        'የተበላሸ እቃ መሸጥ',
        'ምንም አለማቅረብ'
      ],
      correctIndex: 0,
      explanation: 'ተጓዳኝ ጠቃሚ እቃዎችን ማቅረብ የደንበኛውን እርካታና የሽያጭ ገቢን በአንድ ጊዜ ያሳድጋል።'
    },
    {
      id: 12,
      question: 'በማህበራዊ ሚዲያ ላይ "Personal Brand (የግል ብራንድ)" መገንባት ምን ጥቅም አለው?',
      options: [
        'በዘርፉ እውቀት እንዳለዎት በማሳየት ደንበኞች እራሳቸው ፈልገው እንዲመጡ ለማድረግ',
        'ተከታይ ለማብዛት ብቻ',
        'ምንም ጥቅም የለውም',
        'የሰዎችን ስራ ለመተቸት'
      ],
      correctIndex: 0,
      explanation: 'ጠንካራ የግል ብራንድ ያላቸው ባለሙያዎች ከፍተኛ ዋጋ በማስከፈል በቀላሉ ተፈላጊ ይሆናሉ።'
    },
    {
      id: 13,
      question: 'በኢትዮጵያ ውስጥ በዲጂታል ክፍያዎች (Telebirr, CBE Birr) መጠቀም ለቢዝነስ ምን ጥቅም ይሰጣል?',
      options: [
        'ፈጣን፣ አስተማማኝ እና ከየትኛውም ቦታ ክፍያዎችን ያለምንም መጉላላት ለመቀበል',
        'ክፍያን ለማዘግየት',
        'ገንዘብ ለማጥፋት',
        'ምንም ጥቅም የለውም'
      ],
      correctIndex: 0,
      explanation: 'ዲጂታል ክፍያዎች የግብይት ፍጥነትን በማሳደግ የሽያጭ እንቅፋቶችን ያስወግዳሉ።'
    },
    {
      id: 14,
      question: 'በስራ ወቅት ስህተት ሲፈጠር ምርጡ የባለሙያ እርምጃ የቱ ነው?',
      options: [
        'ስህተቱን በቅንነት አምኖ በፍጥነት ማረም እና ደንበኛው እንዳይጎዳ ካሳ/ማካካሻ መስጠት',
        'ስህተትን በደንበኛው ላይ ማላከክ',
        'መጥፋት',
        'ምንም አለማድረግ'
      ],
      correctIndex: 0,
      explanation: 'ኃላፊነት መውሰድ የደንበኛን እምነት በእጥፍ ያጠነክራል።'
    },
    {
      id: 15,
      question: 'በስራ ውስጥ "Networking (ሙያዊ ትስስር)" ለምን ይጠቅማል?',
      options: [
        'ከተመሳሳይ ባለሙያዎች እና የቢዝነስ ባለቤቶች ጋር በመተዋወቅ አዳዲስ የስራ እድሎችን ለማግኘት',
        'ጊዜ ለማሳለፍ ብቻ',
        'ሰዎችን ለማስቀናት',
        'ምንም ፋይዳ የለውም'
      ],
      correctIndex: 0,
      explanation: 'ሰፊ ትስስር መፍጠር ወደ ትላልቅ ፕሮጀክቶች እና አጋርነቶች ለመድረስ ወሳኝ ድልድይ ነው።'
    },
    {
      id: 16,
      question: 'የ "Continuous Learning (ያለማቋረጥ የመማር)" ባህሪ ለምን ያስፈልጋል?',
      options: [
        'የዲጂታል አለም እና ቴክኖሎጂ በየጊዜው ስለሚቀያየር ሁልጊዜ ተፈላጊና ወቅታዊ ሆኖ ለመቆየት',
        'አንዴ ከተማሩ በኋላ ማቆም ስለሚገባ',
        'ሰርተፍኬት ለመሰብሰብ ብቻ',
        'ምንም ጥቅም የለውም'
      ],
      correctIndex: 0,
      explanation: 'ሁልጊዜ ራስን ማሻሻል በገበያው ውስጥ ተወዳዳሪና ግንባር ቀደም ያደርጋል።'
    },
    {
      id: 17,
      question: 'የስራ ጥራትን (Quality Assurance) ለመጠበቅ ምን ማድረግ ያስፈልጋል?',
      options: [
        'ስራውን ለደንበኛ ከማስረከብ በፊት ደጋግሞ መፈተሽና ደረጃውን የጠበቀ መሆኑን ማረጋገጥ',
        'ሳይፈትሹ መላክ',
        'በግዴለሽነት መስራት',
        'ምንም አይነት ፍተሻ አለማድረግ'
      ],
      correctIndex: 0,
      explanation: 'ከፍተኛ ጥራት ያለው ስራ የደንበኞችን ቋሚ አድናቆትና ድጋሚ ስራዎችን ያረጋግጣል።'
    },
    {
      id: 18,
      question: 'በዲጂታል ስራዎች ውስጥ የ "Cybersecurity (የደህንነት)" ጥንቃቄ ለምን ወሳኝ ነው?',
      options: [
        'የይለፍ ቃላትን እና 2FA በመጠበቅ አካውንቶችን እና የደንበኛ መረጃዎችን ከስርቆት ለመከላከል',
        'የይለፍ ቃል ለማንም ማጋራት',
        'ቀላል 123456 መጠቀም',
        'ምንም ደህንነት አለመጠበቅ'
      ],
      correctIndex: 0,
      explanation: 'የደህንነት ጥንቃቄ የቢዝነስዎን ንብረት እና የደንበኞችን ሚስጥር ከአደጋ ይጠብቃል።'
    },
    {
      id: 19,
      question: 'ቢዝነስን ወደ ድርጅት ለማሳደግ (Scaling) የመጀመሪያው እርምጃ ምንድን ነው?',
      options: [
        'የስራ ሂደቶችን ስርዓት (System) ማስያዝ እና የተወሰኑ ስራዎችን ለሌሎች ማካፈል (Delegation)',
        'ሁሉንም ነገር ብቻዎን ለመስራት መሞከር',
        'ስራዎችን መቀነስ',
        'ምንም እቅድ አለማውጣት'
      ],
      correctIndex: 0,
      explanation: 'ስርዓት መዘርጋት ቢዝነሱ ያለ እርስዎ ቀጥተኛ ተሳትፎም ጭምር በስኬት እንዲያድግ ያስችላል።'
    },
    {
      id: 20,
      question: 'በፀሐይ ካምፓስ የሚሰጠው እውቅና ያለው ዲጂታል ሰርተፍኬት ዋና ጥቅም ምንድን ነው?',
      options: [
        'ክህሎትዎን በተግባር ያረጋገጡ መሆኑን ለቀጣሪዎች፣ ለደንበኞች እና ለሲቪ (CV) ማረጋገጫ ለመስጠት',
        'ለጌጥ ብቻ ማስቀመጥ',
        'ምንም ዋጋ የለውም',
        'ማንም ሊያየው አይችልም'
      ],
      correctIndex: 0,
      explanation: 'ሰርተፍኬቱ በካምፓሱ የተረጋገጠ የክህሎት ማረጋገጫ ሆኖ ለስራ እድሎች በር ይከፍታል።'
    }
  ]
};

function getCourseQuestions(course: any): QuizQuestion[] {
  if (!course) return QUESTION_BANKS.general;
  const title = (course.title || '').toLowerCase();
  const category = (course.category || '').toLowerCase();
  const desc = (course.desc || '').toLowerCase();
  const text = `${title} ${category} ${desc}`;

  if (text.includes('shein') || text.includes('ቻይና') || text.includes('ኢምፖርት') || text.includes('import') || text.includes('china') || text.includes('commerce') || text.includes('ኢ-ኮሜርስ')) {
    return QUESTION_BANKS.shein_import;
  }
  if (text.includes('youtube') || text.includes('ዩቲዩብ') || text.includes('ዩቱብ')) {
    return QUESTION_BANKS.youtube;
  }
  if (text.includes('market') || text.includes('ማርኬቲንግ') || text.includes('digital') || text.includes('ዲጂታል') || text.includes('facebook') || text.includes('meta')) {
    return QUESTION_BANKS.marketing;
  }
  return QUESTION_BANKS.general;
}

interface CourseQuizProps {
  course: any;
  user: any;
  onPass: (score: number) => void;
  onViewCertificate: () => void;
}

export default function CourseQuiz({ course, user, onPass, onViewCertificate }: CourseQuizProps) {
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, number>>({});
  const [quizState, setQuizState] = useState<'intro' | 'active' | 'result'>('intro');
  const [score, setScore] = useState<number>(0);
  const [correctCount, setCorrectCount] = useState<number>(0);
  const [isPassed, setIsPassed] = useState<boolean>(false);
  const [showReview, setShowReview] = useState<boolean>(false);

  useEffect(() => {
    const qList = getCourseQuestions(course);
    setQuestions(qList);

    // Check if already passed in local storage (>= 50% or >= 10/20)
    if (course?.id) {
      try {
        const savedResult = localStorage.getItem(`tsehay_quiz_result_${course.id}`);
        if (savedResult) {
          const parsed = JSON.parse(savedResult);
          if (parsed.score >= 50 || parsed.correctCount >= 10) {
            setScore(parsed.score);
            setCorrectCount(parsed.correctCount || Math.round((parsed.score / 100) * 20));
            setIsPassed(true);
          }
        }
      } catch (e) {}
    }
  }, [course]);

  const handleStartExam = () => {
    setSelectedAnswers({});
    setCurrentIndex(0);
    setShowReview(false);
    setQuizState('active');
  };

  const handleSelectOption = (optionIndex: number) => {
    setSelectedAnswers(prev => ({
      ...prev,
      [currentIndex]: optionIndex
    }));
  };

  const handleSubmitExam = () => {
    let correct = 0;
    questions.forEach((q, idx) => {
      if (selectedAnswers[idx] === q.correctIndex) {
        correct++;
      }
    });

    const total = questions.length || 20;
    const calculatedPercentage = Math.round((correct / total) * 100);
    setCorrectCount(correct);
    setScore(calculatedPercentage);

    // Passing criteria: > 10 out of 20 (>= 10 or >= 50%)
    const passed = correct >= 10;
    setIsPassed(passed);
    setQuizState('result');

    if (course?.id) {
      try {
        localStorage.setItem(`tsehay_quiz_result_${course.id}`, JSON.stringify({
          score: calculatedPercentage,
          correctCount: correct,
          totalQuestions: total,
          passed,
          date: new Date().toISOString()
        }));
      } catch (e) {}
    }

    if (passed) {
      onPass(calculatedPercentage);
    }
  };

  const currentQ = questions[currentIndex];
  const progressPercent = questions.length > 0 ? Math.round(((currentIndex + 1) / questions.length) * 100) : 0;
  const answeredCount = Object.keys(selectedAnswers).length;

  // 1. INTRO SCREEN
  if (quizState === 'intro') {
    return (
      <div className="bg-slate-900/90 border border-slate-800 text-white rounded-3xl p-6 sm:p-10 shadow-2xl backdrop-blur-xl max-w-3xl mx-auto">
        <div className="text-center max-w-xl mx-auto space-y-6">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-gradient-to-tr from-amber-500 to-yellow-300 text-dark text-3xl font-black shadow-xl shadow-amber-500/20 animate-bounce">
            <i className="fa-solid fa-graduation-cap"></i>
          </div>

          <div className="space-y-2">
            <span className="text-xs font-black uppercase tracking-widest text-amber-400 bg-amber-400/10 px-3 py-1 rounded-full border border-amber-400/20">
              የኮርስ ማጠናቀቂያ ፈተና (20 ጥያቄዎች)
            </span>
            <h2 className="text-2xl sm:text-3xl font-black font-heading tracking-tight text-white">
              {course?.title || 'የፀሐይ ካምፓስ ፈተና'}
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 leading-relaxed font-body">
              ይህ ፈተና <strong>20 ተግባራዊ ጥያቄዎችን</strong> የያዘ ሲሆን፤ <strong>ከ 10 በላይ (50%+)</strong> በማምጣት እውቅና ያለው ዲጂታል ሰርተፍኬትዎን በስምዎ ማግኘት ይችላሉ!
            </p>
          </div>

          {/* Rules & Requirements Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-left pt-2">
            <div className="bg-slate-800/70 border border-slate-700/60 rounded-2xl p-3.5 space-y-1">
              <div className="flex items-center gap-2 text-amber-400 text-sm">
                <i className="fa-solid fa-list-check"></i>
                <span className="text-xs font-bold text-slate-300">የጥያቄዎች ብዛት</span>
              </div>
              <p className="text-lg font-black text-white">{questions.length || 20} ጥያቄዎች</p>
            </div>

            <div className="bg-slate-800/70 border border-slate-700/60 rounded-2xl p-3.5 space-y-1">
              <div className="flex items-center gap-2 text-emerald-400 text-sm">
                <i className="fa-solid fa-bullseye"></i>
                <span className="text-xs font-bold text-slate-300">የማለፊያ ነጥብ</span>
              </div>
              <p className="text-lg font-black text-emerald-400">10 / 20 (50%+)</p>
            </div>

            <div className="col-span-2 sm:col-span-1 bg-slate-800/70 border border-slate-700/60 rounded-2xl p-3.5 space-y-1">
              <div className="flex items-center gap-2 text-primary text-sm">
                <i className="fa-solid fa-award"></i>
                <span className="text-xs font-bold text-slate-300">ሽልማት</span>
              </div>
              <p className="text-lg font-black text-primary">ዲጂታል ሰርተፍኬት</p>
            </div>
          </div>

          {/* AI Notice Banner */}
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-3 text-left text-xs text-amber-300 flex items-center gap-3">
            <span className="w-8 h-8 rounded-xl bg-amber-400/20 text-amber-400 flex items-center justify-center shrink-0 text-sm">
              <i className="fa-solid fa-robot"></i>
            </span>
            <div className="space-y-0.5">
              <p className="font-black text-white text-xs">🔒 የፈተና ደንብ ማሳሰቢያ፦</p>
              <p className="text-[11px] text-amber-200/90 leading-relaxed">
                ፈተናውን ከመጀመርዎ በፊት በ <strong>Tsehay AI</strong> ማጥናት ይችላሉ። በፈተና ወቅት ግን የራስዎን እውነተኛ ክህሎት ለመፈተሽ Tsehay AI ይዘጋል።
              </p>
            </div>
          </div>

          {/* Start Button */}
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              onClick={handleStartExam}
              className="w-full sm:w-auto px-8 py-4 bg-gradient-to-r from-amber-400 via-primary to-yellow-400 hover:from-amber-300 hover:to-yellow-300 text-dark font-black text-base rounded-2xl shadow-xl shadow-amber-400/25 hover:scale-105 transition-all duration-300 flex items-center justify-center gap-3 cursor-pointer active:scale-95"
            >
              <span>🚀 ፈተናውን ጀምር (Start 20-Question Exam)</span>
              <i className="fa-solid fa-arrow-right"></i>
            </button>
            {isPassed && (
              <button
                onClick={onViewCertificate}
                className="w-full sm:w-auto px-6 py-4 bg-slate-800 hover:bg-slate-700 text-emerald-400 border border-emerald-500/30 font-bold text-sm rounded-2xl transition flex items-center justify-center gap-2 cursor-pointer"
              >
                <i className="fa-solid fa-award"></i>
                <span>ሰርተፍኬቱን ይመልከቱ</span>
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // 2. ACTIVE EXAM SCREEN
  if (quizState === 'active' && currentQ) {
    const isSelected = (idx: number) => selectedAnswers[currentIndex] === idx;
    const isLastQuestion = currentIndex === questions.length - 1;

    return (
      <div className="bg-slate-900/95 border border-slate-800 text-white rounded-3xl p-5 sm:p-8 shadow-2xl backdrop-blur-xl max-w-3xl mx-auto space-y-6">
        
        {/* Top Header & AI Locked Badge */}
        <div className="space-y-3 border-b border-slate-800 pb-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <span className="w-8 h-8 rounded-xl bg-amber-400 text-slate-950 flex items-center justify-center text-sm font-black shadow-md">
                {currentIndex + 1}
              </span>
              <div>
                <span className="text-xs text-slate-400 font-bold">ጥያቄ {currentIndex + 1} ከ {questions.length}</span>
                <p className="text-[11px] text-amber-400 font-bold">የተመለሱ፡ {answeredCount}/{questions.length}</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30 px-2.5 py-1 rounded-full flex items-center gap-1.5 shadow-sm">
                <i className="fa-solid fa-lock text-[10px]"></i> Tsehay AI ተዘግቷል
              </span>
              <span className="text-xs font-black bg-slate-800 text-emerald-400 px-3 py-1 rounded-full border border-slate-700">
                🎯 ማለፊያ: 10/20
              </span>
            </div>
          </div>

          {/* Interactive 20-Question Step Grid */}
          <div className="flex flex-wrap gap-1.5 pt-1">
            {questions.map((_, qIdx) => {
              const isCurrent = qIdx === currentIndex;
              const hasAnswered = selectedAnswers[qIdx] !== undefined;

              return (
                <button
                  key={qIdx}
                  type="button"
                  onClick={() => setCurrentIndex(qIdx)}
                  className={`w-6 h-6 sm:w-7 sm:h-7 rounded-lg text-[11px] font-black transition-all cursor-pointer flex items-center justify-center ${
                    isCurrent
                      ? 'bg-amber-400 text-slate-950 ring-2 ring-amber-300 scale-110 shadow-md'
                      : hasAnswered
                      ? 'bg-emerald-500/30 text-emerald-300 border border-emerald-500/50'
                      : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                  }`}
                  title={`ጥያቄ ${qIdx + 1}`}
                >
                  {qIdx + 1}
                </button>
              );
            })}
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
            <div
              className="bg-gradient-to-r from-amber-400 via-primary to-yellow-300 h-2 rounded-full transition-all duration-300 shadow-sm"
              style={{ width: `${progressPercent}%` }}
            ></div>
          </div>
        </div>

        {/* Question Text */}
        <div className="space-y-4">
          <h3 className="text-lg sm:text-xl font-black text-white leading-relaxed font-heading">
            {currentQ.question}
          </h3>

          {/* Options Grid */}
          <div className="space-y-3 pt-2">
            {currentQ.options.map((opt, oIdx) => {
              const letter = String.fromCharCode(65 + oIdx); // A, B, C, D
              const selected = isSelected(oIdx);

              return (
                <button
                  key={oIdx}
                  onClick={() => handleSelectOption(oIdx)}
                  className={`w-full text-left p-4 rounded-2xl border transition-all duration-200 flex items-center gap-3.5 cursor-pointer ${
                    selected
                      ? 'bg-amber-400/15 border-amber-400 text-white shadow-lg shadow-amber-400/10 scale-[1.01]'
                      : 'bg-slate-800/60 border-slate-700/80 text-slate-200 hover:bg-slate-800 hover:border-slate-600'
                  }`}
                >
                  <span
                    className={`w-8 h-8 rounded-xl flex items-center justify-center font-black text-xs shrink-0 transition-colors ${
                      selected
                        ? 'bg-amber-400 text-slate-950 shadow-md'
                        : 'bg-slate-700 text-slate-300'
                    }`}
                  >
                    {letter}
                  </span>
                  <span className="text-xs sm:text-sm font-medium leading-normal flex-1">
                    {opt}
                  </span>
                  {selected && (
                    <i className="fa-solid fa-circle-check text-amber-400 text-base shrink-0"></i>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Navigation Buttons */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-800 gap-3">
          <button
            onClick={() => setCurrentIndex(prev => Math.max(0, prev - 1))}
            disabled={currentIndex === 0}
            className="px-5 py-2.5 rounded-xl border border-slate-700 text-slate-300 text-xs sm:text-sm font-bold hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed transition flex items-center gap-2 cursor-pointer"
          >
            <i className="fa-solid fa-chevron-left text-xs"></i>
            <span>የቀደመው</span>
          </button>

          {isLastQuestion ? (
            <button
              onClick={handleSubmitExam}
              disabled={answeredCount < questions.length}
              className="px-7 py-3 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white text-xs sm:text-sm font-black rounded-xl shadow-lg shadow-emerald-500/25 transition disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2 cursor-pointer active:scale-95"
            >
              <span>🏁 ፈተናውን አስረክብ ({answeredCount}/{questions.length})</span>
              <i className="fa-solid fa-check"></i>
            </button>
          ) : (
            <button
              onClick={() => setCurrentIndex(prev => Math.min(questions.length - 1, prev + 1))}
              className="px-6 py-2.5 bg-gradient-to-r from-amber-400 to-yellow-400 text-dark text-xs sm:text-sm font-black rounded-xl hover:from-amber-300 hover:to-yellow-300 transition shadow-md flex items-center gap-2 cursor-pointer active:scale-95"
            >
              <span>ቀጣይ ጥያቄ</span>
              <i className="fa-solid fa-chevron-right text-xs"></i>
            </button>
          )}
        </div>
      </div>
    );
  }

  // 3. RESULTS & REVIEW SCREEN
  return (
    <div className="bg-slate-900/95 border border-slate-800 text-white rounded-3xl p-6 sm:p-10 shadow-2xl backdrop-blur-xl max-w-3xl mx-auto space-y-6">
      
      {/* Score Header Card */}
      <div className="text-center space-y-4 max-w-md mx-auto">
        <div
          className={`w-24 h-24 rounded-3xl mx-auto flex items-center justify-center text-4xl shadow-xl transition-transform duration-500 ${
            isPassed
              ? 'bg-gradient-to-tr from-emerald-500 to-teal-400 text-white shadow-emerald-500/30 animate-pulse'
              : 'bg-gradient-to-tr from-red-500 to-amber-500 text-white shadow-red-500/30'
          }`}
        >
          <i className={`fa-solid ${isPassed ? 'fa-award' : 'fa-triangle-exclamation'}`}></i>
        </div>

        <div className="space-y-1">
          <span
            className={`text-xs font-black uppercase tracking-wider px-3 py-1 rounded-full border ${
              isPassed
                ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400'
                : 'bg-red-500/15 border-red-500/30 text-red-400'
            }`}
          >
            {isPassed ? '🎉 ፈተናውን በስኬት አልፈዋል!' : '⚠️ ፈተናውን አላለፉም'}
          </span>
          <h2 className="text-3xl sm:text-4xl font-black font-heading text-white">
            ውጤትዎ፡ {correctCount} / 20 ({score}%)
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 font-body leading-relaxed">
            {isPassed
              ? `እንኳን ደስ አሎት! ከ 10 በላይ (${correctCount}/20) ስላመጡ የኮርስ ማጠናቀቂያ ሰርተፍኬትዎ ወዲያውኑ ተከፍቷል።`
              : `ሰርተፍኬት ለማግኘት ቢያንስ 10/20 (50%) ማምጣት ያስፈልጋል። የእርስዎ ውጤት ${correctCount}/20 ነው። ትምህርቶቹን በ Tsehay AI ከልሰው ፈተናውን በድጋሚ መውሰድ ይችላሉ።`}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
          {isPassed ? (
            <>
              <button
                onClick={onViewCertificate}
                className="w-full sm:w-auto px-8 py-3.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white font-black text-sm rounded-2xl shadow-xl shadow-emerald-500/30 hover:scale-105 transition flex items-center justify-center gap-2 cursor-pointer"
              >
                <i className="fa-solid fa-award text-base"></i>
                <span>🎓 ሰርተፍኬትዎን ይመልከቱ / ያውርዱ</span>
              </button>
              <button
                onClick={() => setShowReview(!showReview)}
                className="w-full sm:w-auto px-5 py-3.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-2xl border border-slate-700 transition flex items-center justify-center gap-2 cursor-pointer"
              >
                <i className="fa-solid fa-list-check"></i>
                <span>{showReview ? 'ማብራሪያ ደብቅ' : 'የ 20 ቱን ጥያቄዎች ማብራሪያ'}</span>
              </button>
            </>
          ) : (
            <>
              <button
                onClick={handleStartExam}
                className="w-full sm:w-auto px-8 py-3.5 bg-gradient-to-r from-amber-400 via-primary to-yellow-400 hover:from-amber-300 hover:to-yellow-300 text-dark font-black text-sm rounded-2xl shadow-xl shadow-amber-400/25 hover:scale-105 transition flex items-center justify-center gap-2 cursor-pointer"
              >
                <i className="fa-solid fa-rotate-right"></i>
                <span>🔄 ፈተናውን እንደገና ይውሰዱ (Retake)</span>
              </button>
              <button
                onClick={() => setShowReview(!showReview)}
                className="w-full sm:w-auto px-5 py-3.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-2xl border border-slate-700 transition flex items-center justify-center gap-2 cursor-pointer"
              >
                <i className="fa-solid fa-list-check"></i>
                <span>{showReview ? 'ማብራሪያ ደብቅ' : 'ትክክለኛ መልሶችና ማብራሪያ'}</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Answer Review Accordion for All 20 Questions */}
      {showReview && (
        <div className="space-y-4 pt-4 border-t border-slate-800">
          <h4 className="font-heading font-black text-sm sm:text-base text-amber-400 flex items-center gap-2">
            <i className="fa-solid fa-circle-info"></i>
            <span>የ 20 ቱ ጥያቄዎች ዝርዝር እና ትክክለኛ መልሶች ማብራሪያ፦</span>
          </h4>

          <div className="space-y-3">
            {questions.map((q, idx) => {
              const userPick = selectedAnswers[idx];
              const isCorrect = userPick === q.correctIndex;

              return (
                <div
                  key={q.id}
                  className={`p-4 rounded-2xl border transition-all ${
                    isCorrect
                      ? 'bg-emerald-950/20 border-emerald-500/30'
                      : 'bg-red-950/20 border-red-500/30'
                  }`}
                >
                  <div className="flex items-start gap-2.5">
                    <span
                      className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-black shrink-0 mt-0.5 ${
                        isCorrect ? 'bg-emerald-500 text-slate-950' : 'bg-red-500 text-white'
                      }`}
                    >
                      {isCorrect ? '✓' : '✕'}
                    </span>
                    <div className="space-y-1.5 flex-1">
                      <p className="text-xs sm:text-sm font-bold text-white leading-snug">
                        {idx + 1}. {q.question}
                      </p>
                      
                      <div className="text-xs space-y-1 text-slate-300">
                        <p>
                          <span className="text-slate-400">የመረጡት መልስ፡ </span>
                          <span className={isCorrect ? 'text-emerald-400 font-bold' : 'text-red-400 font-bold'}>
                            {userPick !== undefined ? q.options[userPick] : 'አልተመለሰም'}
                          </span>
                        </p>
                        {!isCorrect && (
                          <p>
                            <span className="text-slate-400">ትክክለኛ መልስ፡ </span>
                            <span className="text-emerald-400 font-bold">{q.options[q.correctIndex]}</span>
                          </p>
                        )}
                        <p className="text-[11px] text-slate-400 bg-slate-800/80 p-2 rounded-xl mt-1.5 border border-slate-700">
                          💡 <span className="text-amber-300 font-bold">ማብራሪያ፡</span> {q.explanation}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
