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
    }
  ],
  video_editing: [
    {
      id: 1,
      question: 'በቪዲዮ ኤዲቲንግ ውስጥ "B-Roll" ማለት ምን ማለት ነው?',
      options: [
        'ዋናውን ንግግር ወይም ታሪክ የሚያደምቁ ተጨማሪ ገላጭ ምስሎች/ቪዲዮዎች',
        'የቪዲዮው የመጨረሻ ስም',
        'የተበላሸ ቪዲዮ',
        'የካሜራ ባትሪ'
      ],
      correctIndex: 0,
      explanation: 'B-Roll ዋናውን ተናጋሪ ወይም ድርጊት የሚደግፉ እና ቪዲዮውን ሳቢ የሚያደርጉ ገላጭ ቪዲዮዎች ናቸው።'
    },
    {
      id: 2,
      question: 'በድምጽ ማስተካከያ (Audio Editing) ውስጥ የጀርባ ጫጫታን (Noise) ለማጥፋት የትኛው ቱል ይጠቅማል?',
      options: [
        'Noise Reduction / Denoise',
        'Color Grade',
        'Zoom In',
        'Speed Up'
      ],
      correctIndex: 0,
      explanation: 'Denoise ወይም Noise Reduction በድምጽ ዙሪያ ያሉ አላስፈላጊ ጫጫታዎችን ያስወግዳል።'
    },
    {
      id: 3,
      question: '"Keyframing" በቪዲዮ ሶፍትዌር ውስጥ ለምን ያገለግላል?',
      options: [
        'የምስል መጠን፣ ቦታ ወይም ግልጽነት በጊዜ ሂደት እንቅስቃሴ (Animation) እንዲፈጥር ለማድረግ',
        'ኮምፒውተሩን ለማጥፋት',
        'ቪዲዮውን ለመሰረዝ',
        'የሙዚቃ ድምጽ ሙሉ በሙሉ ለማጥፋት'
      ],
      correctIndex: 0,
      explanation: 'Keyframe በቪዲዮ ውስጥ ያሉ ነገሮችን ከአንዱ ቦታ ወደ ሌላው ለማንቀሳቀስ ወይም መጠንን ለመቀየር የሚያገለግል ቁልፍ መሳሪያ ነው።'
    },
    {
      id: 4,
      question: 'ለቲክቶክ፣ ሪልስ እና ዩቲዩብ ሾርትስ (Shorts) ተስማሚው የቪዲዮ አቀማመጥ (Aspect Ratio) የቱ ነው?',
      options: [
        '9:16 (Vertical)',
        '16:9 (Horizontal)',
        '4:3',
        '21:9'
      ],
      correctIndex: 0,
      explanation: 'ለሞባይል አጫጭር ቪዲዮዎች (Shorts/Reels/TikTok) መደበኛው ቅርጸት 9:16 ቁመት ነው።'
    },
    {
      id: 5,
      question: 'ቪዲዮን ከማስረከብ ወይም ከማውጣት (Export) በፊት ቀለምን ለማስተካከልና ህይወት ለመስጠት ምን ይባላል?',
      options: [
        'Color Correction & Color Grading',
        'Cutting',
        'Cropping',
        'Muting'
      ],
      correctIndex: 0,
      explanation: 'Color Correction እና Grading የምስሉን ቀለማት በማስተካከል ሲኒማቲክ እና ማራኪ እይታ እንዲኖረው ያደርጋሉ።'
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
    }
  ]
};

function getCourseQuestions(course: any): QuizQuestion[] {
  if (!course) return QUESTION_BANKS.general;
  const title = (course.title || '').toLowerCase();
  const category = (course.category || '').toLowerCase();
  const desc = (course.desc || '').toLowerCase();
  const text = `${title} ${category} ${desc}`;

  if (text.includes('shein') || text.includes('ቻይና') || text.includes('ኢምፖርት') || text.includes('import') || text.includes('china')) {
    return QUESTION_BANKS.shein_import;
  }
  if (text.includes('youtube') || text.includes('ዩቲዩብ') || text.includes('ዩቱብ')) {
    return QUESTION_BANKS.youtube;
  }
  if (text.includes('video') || text.includes('ቪዲዮ') || text.includes('editing') || text.includes('capcut') || text.includes('premiere')) {
    return QUESTION_BANKS.video_editing;
  }
  if (text.includes('market') || text.includes('ማርኬቲንግ') || text.includes('digital') || text.includes('ዲጂታል')) {
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
  const [isPassed, setIsPassed] = useState<boolean>(false);
  const [showReview, setShowReview] = useState<boolean>(false);

  useEffect(() => {
    const qList = getCourseQuestions(course);
    setQuestions(qList);

    // Check if already passed in local storage
    if (course?.id) {
      try {
        const savedResult = localStorage.getItem(`tsehay_quiz_result_${course.id}`);
        if (savedResult) {
          const parsed = JSON.parse(savedResult);
          if (parsed.score >= 80) {
            setScore(parsed.score);
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

    const calculatedScore = Math.round((correct / questions.length) * 100);
    setScore(calculatedScore);
    const passed = calculatedScore >= 80;
    setIsPassed(passed);
    setQuizState('result');

    if (course?.id) {
      try {
        localStorage.setItem(`tsehay_quiz_result_${course.id}`, JSON.stringify({
          score: calculatedScore,
          passed,
          date: new Date().toISOString()
        }));
      } catch (e) {}
    }

    if (passed) {
      onPass(calculatedScore);
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
              የኮርስ ማጠናቀቂያ ፈተና
            </span>
            <h2 className="text-2xl sm:text-3xl font-black font-heading tracking-tight text-white">
              {course?.title || 'የፀሐይ ካምፓስ ፈተና'}
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 leading-relaxed font-body">
              ይህ ፈተና የኮርሱን ዋና ዋና ይዘቶች ምን ያህል እንደተረዱ የሚለካ ነው። ፈተናውን በስኬት በማጠናቀቅ እውቅና ያለው ዲጂታል ሰርተፍኬትዎን ይውሰዱ!
            </p>
          </div>

          {/* Rules & Requirements Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-left pt-2">
            <div className="bg-slate-800/70 border border-slate-700/60 rounded-2xl p-3.5 space-y-1">
              <div className="flex items-center gap-2 text-amber-400 text-sm">
                <i className="fa-solid fa-list-check"></i>
                <span className="text-xs font-bold text-slate-300">የጥያቄዎች ብዛት</span>
              </div>
              <p className="text-lg font-black text-white">{questions.length || 5} ጥያቄዎች</p>
            </div>

            <div className="bg-slate-800/70 border border-slate-700/60 rounded-2xl p-3.5 space-y-1">
              <div className="flex items-center gap-2 text-emerald-400 text-sm">
                <i className="fa-solid fa-bullseye"></i>
                <span className="text-xs font-bold text-slate-300">የማለፊያ ነጥብ</span>
              </div>
              <p className="text-lg font-black text-emerald-400">80% እና በላይ</p>
            </div>

            <div className="col-span-2 sm:col-span-1 bg-slate-800/70 border border-slate-700/60 rounded-2xl p-3.5 space-y-1">
              <div className="flex items-center gap-2 text-primary text-sm">
                <i className="fa-solid fa-award"></i>
                <span className="text-xs font-bold text-slate-300">ሽልማት</span>
              </div>
              <p className="text-lg font-black text-primary">ዲጂታል ሰርተፍኬት</p>
            </div>
          </div>

          {/* Start Button */}
          <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              onClick={handleStartExam}
              className="w-full sm:w-auto px-8 py-4 bg-gradient-to-r from-amber-400 via-primary to-yellow-400 hover:from-amber-300 hover:to-yellow-300 text-dark font-black text-base rounded-2xl shadow-xl shadow-amber-400/25 hover:scale-105 transition-all duration-300 flex items-center justify-center gap-3 cursor-pointer active:scale-95"
            >
              <span>🚀 ፈተናውን ጀምር (Start Exam)</span>
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
    const isAnswered = selectedAnswers[currentIndex] !== undefined;
    const isLastQuestion = currentIndex === questions.length - 1;

    return (
      <div className="bg-slate-900/95 border border-slate-800 text-white rounded-3xl p-5 sm:p-8 shadow-2xl backdrop-blur-xl max-w-3xl mx-auto space-y-6">
        
        {/* Top Header & Progress */}
        <div className="space-y-3 border-b border-slate-800 pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="w-8 h-8 rounded-xl bg-amber-400 text-slate-950 flex items-center justify-center text-sm font-black shadow-md">
                {currentIndex + 1}
              </span>
              <div>
                <span className="text-xs text-slate-400 font-bold">ጥያቄ {currentIndex + 1} ከ {questions.length}</span>
                <p className="text-[11px] text-amber-400 font-bold">የተመለሱ፡ {answeredCount}/{questions.length}</p>
              </div>
            </div>
            <span className="text-xs font-black bg-slate-800 text-slate-300 px-3 py-1 rounded-full border border-slate-700">
              🎯 ማለፊያ: 80%
            </span>
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
              <span>🏁 ፈተናውን አስረክብ (Submit)</span>
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
            የፈተና ውጤትዎ፡ {score}%
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 font-body leading-relaxed">
            {isPassed
              ? 'እንኳን ደስ አሎት! የማለፊያ ነጥብ (80%+) ስላመጡ የኮርስ ማጠናቀቂያ ሰርተፍኬትዎ ወዲያውኑ ተከፍቷል።'
              : 'ሰርተፍኬት ለማግኘት ቢያንስ 80% ማምጣት ያስፈልጋል። ትምህርቶቹን በመከለስ ፈተናውን በድጋሚ መውሰድ ይችላሉ።'}
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
                <span>{showReview ? 'ማብራሪያ ደብቅ' : 'የመልስ ማብራሪያ'}</span>
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

      {/* Answer Review Accordion */}
      {showReview && (
        <div className="space-y-4 pt-4 border-t border-slate-800">
          <h4 className="font-heading font-black text-sm sm:text-base text-amber-400 flex items-center gap-2">
            <i className="fa-solid fa-circle-info"></i>
            <span>የፈተናው ጥያቄዎችና ትክክለኛ መልሶች ማብራሪያ፦</span>
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
