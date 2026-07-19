'use client';
import React, { createContext, useContext, useState, useEffect } from 'react';

type Language = 'am' | 'en';

interface LanguageContextType {
  lang: Language;
  toggleLanguage: () => void;
  t: (key: string) => string;
}

const translations: Record<string, Record<Language, string>> = {
  // Navbar
  'about_us': { am: 'ስለ እኛ', en: 'About Us' },
  'all_courses': { am: 'ሁሉም ኮርሶች', en: 'All Courses' },
  'search_placeholder': { am: 'ኮርሶችን ይፈልጉ...', en: 'Search courses...' },
  'login': { am: 'ግባ (Login)', en: 'Login' },
  'register': { am: 'አዲስ ይመዝገቡ', en: 'Register Now' },
  
  // Hero
  'hero_badge': { am: 'የኢትዮጵያ #1 የኦንላይን መማሪያ ፕላትፎርም', en: 'Ethiopia\'s #1 Online Learning Platform' },
  'hero_title_1': { am: 'ክህሎትዎን ያሳድጉ፣', en: 'Improve your skills,' },
  'hero_title_2': { am: 'ቢዝነስዎን ይጀምሩ።', en: 'Start your business.' },
  'hero_desc': { 
    am: 'በ ኢትዮጵያ የኦንላይን ክህሎት ስልጠና ቀዳሚው ፕላትፎርም ነው። በተግባር እና በ AI የታገዘ ስልጠና ወስደው ቢዝነስዎን ዛሬውኑ ይጀምሩ።', 
    en: 'Managed under us, the leading online skills training platform in Ethiopia. Take practical and AI-assisted training and start your business today.' 
  },
  'explore_courses': { am: 'ኮርሶችን ያስሱ', en: 'Explore Courses' },
  'learn_about_us': { am: 'ስለ እኛ ይመልከቱ', en: 'Learn about us' },
  'recognized_cert': { am: 'እውቅና ያለው ሰርተፍኬት', en: 'ACCREDITED CERTIFICATE' },
  'recognized': { am: 'Recognized', en: 'Recognized' },
  'students': { am: 'ተማሪዎች', en: 'STUDENTS' },
  
  // Trust section
  'trusted_by': { am: 'ከ 500+ በላይ ተማሪዎች እና አለምአቀፍ ፕላትፎርሞች የታመነ', en: 'TRUSTED BY OVER 500+ STUDENTS AND INTERNATIONAL PLATFORMS' },

  // Features section
  'our': { am: 'የእኛ ', en: 'Our ' },
  'difference': { am: 'ልዩነት', en: 'Difference' },
  'difference_desc': { am: 'ከሌሎች የኦንላይን ስልጠናዎች በምን እንለያለን?', en: 'What makes us different from other online trainings?' },
  'practical_courses': { am: 'የተግባር ኮርሶች', en: 'Practical Courses' },
  'practical_courses_desc': { am: 'ወቅታዊ፣ በተግባር ላይ ያተኮሩ እና ልምድ ባላቸው ባለሙያዎች የተዘጋጁ ኮርሶች።', en: 'Up-to-date, practical courses prepared by experienced professionals.' },
  'ai_integration': { am: 'ትስስር', en: 'Integration' },
  'ai_integration_desc': { am: 'በእያንዳንዱ ኮርስ ውስጥ የተካተተ፣ ጥያቄ የሚመልስ እና የቢዝነስ ትንታኔ የሚሰጥ AI።', en: 'AI included in every course, answering questions and providing business analysis.' },
  'new_badge': { am: 'አዲስ', en: 'New' },
  'cert_title': { am: 'እውቅና ያለው ሰርተፍኬት', en: 'Accredited Certificate' },
  'cert_desc': { am: 'ትምህርትዎን እንዳጠናቀቁ፣ ክህሎትዎን የሚያረጋግጥ ዲጂታል ሰርተፍኬት ወዲያውኑ ያገኛሉ።', en: 'Get a digital certificate proving your skills immediately upon completing your course.' },

  // Courses section
  'popular_courses': { am: 'በብዛት የሚፈለጉ ኮርሶች', en: 'Popular Courses' },
  'popular_courses_desc': { am: 'ተማሪዎቻችን በአሁኑ ጊዜ በስፋት እየተከታተሉ ያሉ ስልጠናዎች', en: 'Trainings our students are widely following right now' },
  'loading_courses': { am: 'ኮርሶችን በማምጣት ላይ...', en: 'Loading courses...' },
  'no_course_found': { am: 'ይቅርታ፣ ኮርስ አልተገኘም።', en: 'Sorry, no courses found.' },

  // AI section
  'make_smart': { am: 'በመጠቀም ትምህርትዎን ስማርት ያድርጉ', en: 'Make your learning smart with' },
  'ai_section_desc': { am: 'የእኛ ፕላትፎርም ቪዲዮ በማየት ብቻ አያበቃም። የ AI ረዳቱ በእያንዳንዱ ኮርስ ውስጥ ተካቷል፤ እቃዎችን ይተነትናል፣ ማስታወቂያ ይፅፋል፣ እና 24/7 ከጎንዎ ቆሞ ያግዝዎታል።', en: 'Our platform doesn\'t end with watching videos. The AI assistant is included in every course; analyzes items, writes ads, and helps you 24/7.' },
  'ask_ai_tutor': { am: 'የ AI መምህርዎን ይጠይቁ', en: 'Ask your AI tutor' },
  'ai_assistant_demo': { am: 'ረዳት (ማሳያ)', en: 'Assistant (Demo)' },
  'ask_anything': { am: 'የፈለጉትን ይጠይቁ...', en: 'Ask anything...' },
  'send_btn': { am: 'ላክ', en: 'Send' },

  // FAQ section
  'faq_title': { am: 'ብዙ ጊዜ የሚነሱ ጥያቄዎች (FAQ)', en: 'Frequently Asked Questions (FAQ)' },
  'faq_desc': { am: 'ስለ Tsehay Campus ተጨማሪ ማወቅ ይፈልጋሉ? እነዚህን ጥያቄዎች ይመልከቱ', en: 'Want to know more about Tsehay Campus? Check these questions' },
  'faq_q1': { am: 'ይህንን ስልጠና ለመውሰድ ምን ያስፈልገኛል?', en: 'What do I need to take this training?' },
  'faq_a1': { am: 'ስማርት ስልክ፣ የኢንተርኔት ግንኙነት እና የቴሌግራም አካውንት ብቻ በቂ ነው። ለኮምፒውተርም ምቹ ነው።', en: 'A smartphone, internet connection, and Telegram account are all you need. It is also convenient for computers.' },
  'faq_q2': { am: 'የ AI ረዳቱን ለመጠቀም ተጨማሪ ክፍያ አለው?', en: 'Is there an additional fee to use the AI assistant?' },
  'faq_a2': { am: 'አይ፣ የለውም። የ AI ረዳቱ (የዕቃ ተንታኝ፣ ማስታወቂያ ፀሐፊ፣ ወዘተ) ከኮርሱ ክፍያ ጋር የተካተተ እና በነፃ የሚሰጥ ነው።', en: 'No, there isn\'t. The AI assistant (item analyzer, ad writer, etc.) is included with the course fee and provided for free.' },
  'faq_q3': { am: 'ትምህርቱን ስጨርስ ሰርተፍኬት አገኛለሁ?', en: 'Will I get a certificate when I finish the course?' },
  'faq_a3': { am: 'አዎ! ሁሉንም የትምህርት ክፍሎች እና ጥያቄዎች (Quiz) እንዳጠናቀቁ፣ ሲስተሙ ራሱ በስምዎ የተዘጋጀ ዲጂታል ሰርተፍኬት ያመነጭልዎታል።', en: 'Yes! Once you complete all lessons and quizzes, the system will automatically generate a digital certificate in your name.' },

  // CTA Section
  'cta_title_1': { am: 'የስኬት ጉዞዎን', en: 'Your success journey' },
  'cta_title_2': { am: 'ዛሬውኑ ይጀምሩ', en: 'Start today' },
  'cta_desc': { am: 'ከ 500 በላይ ተማሪዎችን በመቀላቀል ቢዝነስዎን ይጀምሩ። የምዝገባው ሂደት ከ1 ደቂቃ በታች ነው የሚፈጀው.', en: 'Join over 500 students and start your business. The registration process takes less than 1 minute.' },
  'cta_btn': { am: 'በነፃ አካውንት ይክፈቱ (Sign Up)', en: 'Create a free account (Sign Up)' },

  // Footer
  'footer_desc': { am: 'በ AI የታገዘ የኦንላይን ክህሎት ስልጠና በመስጠት ቀዳሚ ፕላትፎርም ነው.', en: 'The leading AI-powered online skills training platform in Ethiopia.' },
  'quick_links': { am: 'ፈጣን ማውጫ', en: 'Quick Links' },
  'contact_us': { am: 'ድጋፍ እና ህግ', en: 'Support & Legal' },
  'all_rights_reserved': { am: 'መብቱ በህግ የተጠበቀ ነው።', en: 'All rights reserved.' },
  'link_shein': { am: 'የ Shein ገቢ ንግድ', en: 'Shein Import Business' },
  'link_digital': { am: 'ዲጂታል ማርኬቲንግ', en: 'Digital Marketing' },
  'link_web': { am: 'ዌብ ዴቨሎፕመንት', en: 'Web Development' },
  'link_crypto': { am: 'የክሪፕቶ ግብይት', en: 'Crypto Trading' },
  'link_faq': { am: 'ተደጋጋሚ ጥያቄዎች (FAQ)', en: 'Frequently Asked Questions (FAQ)' },
  'link_terms': { am: 'የአጠቃቀም ህግ (Terms)', en: 'Terms of Use' },
  'link_privacy': { am: 'የግላዊነት ፖሊሲ (Privacy)', en: 'Privacy Policy' },
  'footer_secret_btn': { am: 'በዌብሳይታችን ላይ ያላጋራናቸውን የቢዝነስ ሚስጥሮች እዚህ ያግኙ', en: 'Find business secrets we haven\'t shared on our website here' },

  // Dashboard Sidebar
  'main_menu': { am: 'ዋና ሜኑ', en: 'MAIN MENU' },
  'back_to_home': { am: 'ወደ መነሻ ተመለስ', en: 'Back to Home' },
  'classroom': { am: 'መማሪያ ክፍል', en: 'Classroom' },
  'my_courses': { am: 'የኔ ኮርሶች', en: 'My Courses' },
  'messages': { am: 'መልእክቶች', en: 'Messages' },
  'tools': { am: 'መሳሪያዎች', en: 'TOOLS' },
  'sidebar_account': { am: 'አካውንት', en: 'Account' },
  'sidebar_settings': { am: 'ሴቲንግ', en: 'Settings' },

  // About Page
  'about_us_page': { am: 'ስለ እኛ', en: 'About Us' },
  'our_story_title': { am: 'የእኛ ታሪክ', en: 'Our Story' },
  'our_story_p1': { am: 'Tsehay Campus በ Tsehay Digital ስር የተመሰረተ ሲሆን፣ ዓላማችን ወጣቶችን አዳዲስ እና ተፈላጊ በሆኑ የዲጂታል ክህሎቶች በማብቃት የፋይናንስ ነፃነት እንዲያገኙ ማስቻል ነው።', en: 'Founded under Tsehay Digital, our goal is to empower youth with new and in-demand digital skills to achieve financial independence.' },
  'our_story_p2': { am: '"We do it, we teach it" በሚለው መርሀችን መሰረት፣ እኛ ራሳችን የምንሰራውን የኢ-ኮሜርስ፣ የማርኬቲንግ እና የክሪፕቶ ስራዎችን ነው በተግባር የምናስተምረው። በተጨማሪም ኮርሶቻችን ሙሉ በሙሉ በ Tsehay AI የታገዙ ናቸው።', en: 'Following our principle "We do it, we teach it", we practically teach the e-commerce, marketing, and crypto businesses that we do ourselves. Furthermore, our courses are fully supported by Tsehay AI.' },
  'stat_students': { am: 'ተማሪዎች', en: 'Students' },
  'stat_practical': { am: 'የተግባር ስራ', en: 'Practical Work' },
  'stat_ai': { am: 'የ AI ድጋፍ', en: 'AI Support' },
  'mission_title': { am: 'የእኛ ተልዕኮ', en: 'Our Mission' },
  'mission_desc': { am: 'ወጣቶችን አዳዲስ እና ተፈላጊ በሆኑ የዲጂታል ክህሎቶች በማብቃት የፋይናንስ ነፃነት እንዲያገኙ ማስቻል።', en: 'Empowering youth with new and in-demand digital skills to enable them to achieve financial independence.' },
  'what_we_do_title': { am: 'ምን እንሰራለን', en: 'What We Do' },
  'wwd_1_title': { am: 'ዲጂታል ክህሎት ማስተማር', en: 'Digital Skills Training' },
  'wwd_1_desc': { am: 'በተግባር የተፈተኑ 100% የቢዝነስ ኮርሶች', en: '100% practically tested business courses' },
  'wwd_2_title': { am: 'ማህበረሰብ መገንባት', en: 'Community Building' },
  'wwd_2_desc': { am: 'ጠንካራ እና እርስበርስ የሚደጋገፍ የትምህርት ማህበረሰብ', en: 'A strong and mutually supportive learning community' },
  'wwd_3_title': { am: 'AI Integration', en: 'AI Integration' },
  'wwd_3_desc': { am: 'በ AI የታገዘ የ 24 ሰዓት የግል ሞግዚት (Tutor)', en: '24/7 personal tutor supported by AI' },
  'our_team_title': { am: 'የእኛ ቡድን', en: 'Our Team' },

  // Courses Page
  'courses_badge': { am: 'ለርስዎ ስኬት የተዘጋጀ መድረክ', en: 'A platform prepared for your success' },
  'courses_title_1': { am: 'የ', en: '' },
  'courses_title_2': { am: 'ኮርሶች', en: 'Courses' },
  'courses_subtitle': { am: 'ክህሎትዎን የሚያሳድጉ እና ለስራ ገበያው የሚያዘጋጁ በጥንቃቄ የተመረጡ ኮርሶችን ያግኙ', en: 'Find carefully selected courses to enhance your skills and prepare you for the job market' },
  'search_placeholder_2': { am: 'የኮርስ ስም ወይም ቁልፍ ቃል ይፈልጉ...', en: 'Search for course name or keyword...' },
  'cat_all': { am: 'ሁሉም', en: 'All' },
  'cat_free': { am: 'ነፃ ኮርሶች', en: 'Free Courses' },
  'cat_paid': { am: 'ፕሪሚየም (ክፍያ)', en: 'Premium (Paid)' },
  'cat_ecommerce': { am: 'ኢ-ኮሜርስ', en: 'E-commerce' },
  'cat_marketing': { am: 'ማርኬቲንግ', en: 'Marketing' },
  'cat_crypto': { am: 'ክሪፕቶ', en: 'Crypto' },
  'cat_tech': { am: 'ቴክኖሎጂ', en: 'Technology' },
  'loading_courses_2': { am: 'ኮርሶችን በማዘጋጀት ላይ...', en: 'Preparing courses...' },
  'no_courses_found': { am: 'በመረጡት መስፈርት ኮርስ አልተገኘም!', en: 'No courses found with the selected criteria!' },
  'course_unknown': { am: 'ያልታወቀ ኮርስ', en: 'Unknown Course' },
  'course_desc_placeholder': { am: 'ይህ ኮርስ ስለ... አጠቃላይ ማብራሪያ ይዟል።', en: 'This course contains a general explanation about...' },
  'course_lessons': { am: 'ክፍሎች', en: 'Lessons' },
  'course_language': { am: 'አማርኛ', en: 'Amharic' },
  'course_free': { am: 'ነፃ (Free)', en: 'Free' },
  'course_currency': { am: 'ብር', en: 'ETB' },
  'btn_go_to_class': { am: 'ወደ ክፍል ሂድ', en: 'Go to Class' },
  'btn_buy_course': { am: 'ኮርሱን ግዛ', en: 'Buy Course' },

  'certificates': { am: 'ሰርተፍኬቶች', en: 'Certificates' },
  'settings': { am: 'ማስተካከያዎች', en: 'Settings' },
  'pro_member': { am: 'ፕሮ አባል', en: 'Pro Member' },
  'normal_student': { am: 'መደበኛ ተማሪ', en: 'Normal Student' },
  'logout': { am: 'ውጣ', en: 'Logout' },

  // Dashboard Header
  'courses': { am: 'ኮርሶች', en: 'Courses' },
  'loading': { am: 'በመጫን ላይ...', en: 'Loading...' },
  'more_courses': { am: 'ተጨማሪ ኮርሶች', en: 'More Courses' },

  // Dashboard Main Area
  'no_purchased_courses': { am: 'ምንም የተገዛ ኮርስ የለም', en: 'No purchased courses' },
  'visit_courses': { am: 'ኮርሶችን ይጎብኙ', en: 'Visit Courses' },
  'course_loading': { am: 'ኮርስ በመጫን ላይ...', en: 'Course loading...' },
  'please_wait': { am: 'እባክዎ ትንሽ ይጠብቁ', en: 'Please wait a moment' },
  'save': { am: 'ሴቭ', en: 'Save' },
  'completed': { am: 'ተጠናቋል', en: 'Completed' },
  'overview': { am: 'አጠቃላይ እይታ', en: 'Overview' },
  'notes': { am: 'ማስታወሻ', en: 'Notes' },
  'qa': { am: 'ጥያቄ እና መልስ', en: 'Q&A' },
  'quiz': { am: 'ፈተና', en: 'Quiz' },
  'certificate': { am: 'ሰርተፍኬት', en: 'Certificate' },
  'lead_instructor': { am: 'ዋና አሰልጣኝ', en: 'Lead Instructor' }
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLang] = useState<Language>('en');

  useEffect(() => {
    const saved = localStorage.getItem('lang') as Language;
    if (saved === 'am' || saved === 'en') {
      setLang(saved);
    } else {
      setLang('en');
    }
  }, []);

  const toggleLanguage = () => {
    const newLang = lang === 'am' ? 'en' : 'am';
    setLang(newLang);
    localStorage.setItem('lang', newLang);
  };

  const t = (key: string): string => {
    if (translations[key]) {
      return translations[key][lang];
    }
    return key;
  };

  return (
    <LanguageContext.Provider value={{ lang, toggleLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
