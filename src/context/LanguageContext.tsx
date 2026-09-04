'use client';
import React, { createContext, useContext, useState, useEffect } from 'react';

type Language = 'am' | 'en';

interface LanguageContextType {
  lang: Language;
  toggleLanguage: () => void;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const translations: Record<string, Record<Language, string>> = {
  // Navbar
  'home': { am: 'መነሻ', en: 'Home' },
  'slide_menu': { am: 'ተንሸራታች ማውጫ', en: 'Slide Menu' },
  'about_us': { am: 'ስለ እኛ', en: 'About Us' },
  'all_courses': { am: 'ሁሉም ኮርሶች', en: 'All Courses' },
  'mentorship': { am: 'ማማከር', en: 'Mentorship' },
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
  'practical_learning_badge': { am: '🎓 ከተግባራዊ ትምህርት ጋር', en: '🎓 WITH PRACTICAL LEARNING' },
  'recognized_cert': { am: 'እውቅና ያለው ሰርተፍኬት', en: 'ACCREDITED CERTIFICATE' },
  'recognized': { am: 'Recognized', en: 'Recognized' },
  'students': { am: 'ተማሪዎች', en: 'STUDENTS' },
  'students_badge_count': { am: 'ሰልጣኞች', en: 'Students' },
  
  // Trust section
  'trusted_by': { am: 'ከ 500+ በላይ ተማሪዎች እና አለምአቀፍ ፕላትፎርሞች የታመነ', en: 'TRUSTED BY OVER 500+ STUDENTS AND INTERNATIONAL PLATFORMS' },

  // Features section
  'our': { am: 'የእኛ ', en: 'Our ' },
  'difference': { am: 'ልዩነት', en: 'Difference' },
  'difference_desc': { am: 'ከሌሎች የኦንላይን መማሪያ መድረኮች በምን እንለያለን?', en: 'What makes us different from other online learning platforms?' },
  'practical_title': { am: '100% የተግባር ስልጠና', en: '100% Practical Training' },
  'practical_desc': { am: 'በባዶ ቲዎሪ ሳይሆን፣ ገበያ ላይ ወዲያውኑ ገቢ የሚያስገኙ በተግባር የተፈተኑ ስልጠናዎች።', en: 'Not empty theory, but practically tested modern trainings that generate immediate income in the market.' },
  'practical_courses': { am: '100% የተግባር ስልጠና', en: '100% Practical Training' },
  'practical_courses_desc': { am: 'በባዶ ቲዎሪ ሳይሆን፣ ገበያ ላይ ወዲያውኑ ገቢ የሚያስገኙ በተግባር የተፈተኑ ስልጠናዎች።', en: 'Not empty theory, but practically tested modern trainings that generate immediate income in the market.' },
  'ai_tutor_card_title': { am: 'የ 24/7 የግል AI መምህር', en: '24/7 Personal AI Tutor' },
  'ai_integration': { am: 'ትስስር', en: 'Integration' },
  'ai_integration_desc': { am: 'በማንኛውም ሰዓት ከጎንዎ ሆኖ ጥያቄዎችዎን የሚመልስ፣ የቢዝነስ ሀሳቦችን የሚያመነጭ እና የሚያማክር ዘመናዊ የ AI ረዳት (Tsehay AI) በእያንዳንዱ ኮርስ ውስጥ ተካቷል።', en: 'A modern AI assistant (Tsehay AI) included in every course by your side 24/7 answering questions, generating business ideas, and consulting.' },
  'new_badge': { am: 'አዲስ', en: 'New' },
  'cert_title': { am: 'እውቅና ያለው ሰርተፍኬት', en: 'Accredited Certificate' },
  'cert_desc': { am: 'ትምህርትዎን እንዳጠናቀቁ፣ ክህሎትዎን የሚያረጋግጥ እና ለስራ ማመልከቻ የሚሆን ዲጂታል ሰርተፍኬት ወዲያውኑ ይደርስዎታል።', en: 'Get an instant verifiable digital certificate upon graduation to showcase on resumes, job applications, and professional networks.' },

  // Courses section
  'popular_courses': { am: 'በብዛት የሚፈለጉ ኮርሶች', en: 'Popular Courses' },
  'popular_courses_desc': { am: 'ተማሪዎቻችን በአሁኑ ጊዜ በስፋት እየተከታተሉ ያሉ ስልጠናዎች', en: 'Trainings our students are widely following right now' },
  'loading_courses': { am: 'ኮርሶችን በማምጣት ላይ...', en: 'Loading courses...' },
  'no_course_found': { am: 'ምንም ኮርስ አልተገኘም።', en: 'No courses found.' },

  // AI section
  'make_smart': { am: 'የካምፓስ ቆይታዎን የተሟላ ያድርጉ!', en: 'Make your campus stay complete!' },
  'ai_section_desc': { am: 'በፀሐይ ካምፓስ (Tsehay Campus) መማር ቪዲዮ ከማየትም በላይ ነው! ዘመናዊው የ AI ረዳታችን 24/7 ከጎንዎ ሆኖ ያገለግልዎታል። ስለ ኮርሶቻችን (ከዲጂታል ማርኬቲንግ እስከ ዌብሳይት ዴቨሎፕመንት)፣ ስለ ዌብሳይታችን አጠቃቀም፣ ስለ ክፍያ መንገዶች እና አጠቃላይ የካምፓስ መረጃዎች የፈለጉትን ይጠይቁት፤ ፈጣን ምላሽ ያገኛሉ!', en: 'Learning at Tsehay Campus is more than just watching videos! Our modern AI assistant is by your side 24/7. Ask anything about our courses (from digital marketing to website development), how to use our website, payment methods, and general campus information; you will get a quick response!' },
  'ask_ai_tutor': { am: 'Tsehay AI ን አሁኑኑ ይጠይቁ', en: 'Ask Tsehay AI right now' },
  'ai_assistant_demo': { am: 'ረዳት (ማሳያ)', en: 'Assistant (Demo)' },
  'ask_anything': { am: 'የፈለጉትን ይጠይቁ...', en: 'Ask anything...' },
  'send_btn': { am: 'ላክ', en: 'Send' },

  // FAQ section
  'faq_title': { am: 'ብዙ ጊዜ የሚነሱ ጥያቄዎች (FAQ)', en: 'Frequently Asked Questions (FAQ)' },
  'faq_desc': { am: 'ስለ Tsehay Campus ተጨማሪ ማወቅ ይፈልጋሉ? እነዚህን ጥያቄዎች ይመልከቱ', en: 'Want to know more about Tsehay Campus? Check these questions' },
  'faq_q1': { am: 'ስልጠናዎቹን በኦንላይን ነው ወይስ በአካል የምንከታተለው?', en: 'Are the trainings online or in-person?' },
  'faq_a1': { am: 'ስልጠናዎቻችንን በማንኛውም ሰዓት እና ቦታ መከታተል እንዲችሉ በዘመናዊ የኦንላይን ፕላትፎርማችን አዘጋጅተናል። ነገር ግን ፀሐይ ካምፓስ ከኦንላይን መድረክም በላይ ነው! ስልጠናዎቻችን የኦንላይን እና የተግባር (Online & Practical) የመማር መንገድን ይከተላሉ። ይህም ማለት ዋናውን ትምህርት በኦንላይን ይከታተላሉ፤ በተጨማሪም የማህበረሰባችን (Community) አባል በመሆን የፊት ለፊት እና የተግባር ስልጠናዎችን እያገኙ፣ ልምድ እየተለዋወጡ እና የገቢ ክህሎትዎን እያዳበሩ ከእኛ ጋር አብረው ያድጋሉ!', en: 'We have designed our courses so you can study anytime, anywhere on our modern online platform. But Tsehay Campus is more than just online! We combine online mastery with hands-on practical learning. You follow lessons online and join our community for in-person workshops, networking, and real-world skill building!' },
  'faq_q2': { am: 'ትምህርቱን ስጨርስ ሰርተፍኬት አገኛለሁ?', en: 'Will I receive a certificate when I finish the course?' },
  'faq_a2': { am: 'አዎ፣ በእርግጥ! እያንዳንዱን ኮርስ ሙሉ በሙሉ ተከታትለው እንዳጠናቀቁ በስምዎ የተዘጋጀ ዲጂታል ሰርተፍኬት (Certificate of Completion) ወዲያውኑ ይደርስዎታል። ይህንን ሰርተፍኬት በቀላሉ በማውረድ (Download በማድረግ) ለስራ ማመልከቻ፣ ለሲቪ (CV) ማሳመሪያ ወይም በሊንክድኢን (LinkedIn) ላይ ለፕሮፌሽናል ትስስር ማጋራት ይችላሉ።', en: 'Yes, absolutely! Once you completely finish each course, a digital Certificate of Completion in your name will be delivered to you immediately. You can easily download this certificate to use for job applications, enhancing your CV, or sharing on LinkedIn for professional networking.' },
  'faq_q3': { am: 'የ "Tsehay AI" ረዳቱን ለመጠቀም ተጨማሪ ክፍያ አለው?', en: 'Is there an additional fee to use the "Tsehay AI" assistant?' },
  'faq_a3': { am: 'በፍጹም! የ "Tsehay AI" ረዳት በካምፓሳችን ውስጥ ለሚገኙ ሁሉም ኮርሶች በነፃ የተካተተ ነው። አንዴ ኮርሱን ከጀመሩ በኋላ 24/7 ከጎንዎ ሆኖ ጥያቄዎችዎን ይመልሳል፣ ያልገባዎትን ያብራራል፣ እንዲሁም የቢዝነስ ሀሳቦችን ያመነጭልዎታል። ይህ የእርስዎ የግል ረዳት ለትምህርትዎ ስኬት ከፍተኛ አስተዋጽኦ ያደርጋል፤ ለዚህም ምንም አይነት ተጨማሪ ወርሃዊም ሆነ አመታዊ ክፍያ አይጠየቁም።', en: 'Absolutely not! The "Tsehay AI" assistant is included for free for all courses in our campus. Once you start the course, it will be by your side 24/7 to answer your questions, clarify anything unclear, and generate business ideas for you. This personal assistant contributes greatly to your success; there are no additional monthly or annual fees.' },
  'faq_q4': { am: 'የክፍያ አማራጮች ምንድን ናቸው?', en: 'What are the available payment options?' },
  'faq_a4': { am: 'በኢትዮጵያ ውስጥ በቴሌብር (Telebirr)፣ በኢትዮጵያ ንግድ ባንክ (CBE)፣ በአቢሲኒያ እና በሁሉም ባንኮች በቀላሉ መክፈል ይችላሉ። ከውጭ ሀገር ደግሞ በ PayPal፣ በቪዛ/ማስተርካርድ እንዲሁም በ Crypto (USDT) መክፈል ይችላሉ።', en: 'Within Ethiopia you can pay via Telebirr, CBE, Bank of Abyssinia, and all local banks. From abroad, you can easily pay via PayPal, Visa/Mastercard, and Crypto (USDT).' },

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
  'logout': { am: 'ውጣ (Logout)', en: 'Log Out' },
  'logging_out': { am: 'በመውጣት ላይ...', en: 'Logging out...' },
  'account_security': { am: 'የአካውንት ደህንነት እና መውጫ', en: 'Account Security & Sign Out' },

  // About Page
  'about_us_page': { am: 'ስለ እኛ', en: 'About Us' },
  'our_story_title': { am: 'የእኛ ታሪክ', en: 'Our Story' },
  'our_story_p1': { am: 'Tsehay Campus በ Tsehay Digital ስር የተመሰረተ ሲሆን፣ ዓላማችን ወጣቶችን አዳዲስ እና ተፈላጊ በሆኑ የዲጂታል ክህሎቶች በማብቃት የፋይናንስ ነፃነት እንዲያገኙ ማስቻል ነው።', en: 'Founded under Tsehay Digital, our goal is to empower youth with new and in-demand digital skills to achieve financial independence.' },
  'our_story_p2': { am: '"We do it, we teach it" በሚለው መርሀችን መሰረት፣ እኛ ራሳችን የምንሰራውን የኢ-ኮሜርስ፣ የማርኬቲንግ እና የክሪፕቶ ስራዎችን ነው በተግባር የምናስተምረው። በተጨማሪም ኮርሶቻችን ሙሉ በሙሉ በ Tsehay AI የታገዙ ናቸው።', en: 'Following our principle "We do it, we teach it", we practically teach the e-commerce, marketing, and crypto businesses that we do ourselves. Furthermore, our courses are fully supported by Tsehay AI.' },
  'stat_students': { am: 'ተማሪዎች', en: 'Students' },
  'stat_practical': { am: 'የተግባር ስራ', en: 'Practical Work' },
  'stat_ai': { am: 'የ AI ድጋፍ', en: 'AI Support' },
  'mission_title': { am: 'ተልእኳችን', en: 'Our Mission' },
  'mission_desc': { am: 'ወጣቶችን በዘመናዊ የዲጂታል እና የቢዝነስ ክህሎቶች በማስታጠቅ፣ የፋይናንስ ነፃነታቸውን እንዲያረጋግጡ ማስቻል።', en: 'Empowering youth with modern digital and business skills to enable them to achieve financial freedom.' },
  'what_we_do_title': { am: 'ለምን ፀሐይ ካምፓስ?', en: 'Why Tsehay Campus?' },
  'wwd_1_title': { am: '100% ተግባራዊ የቢዝነስ ክህሎቶች', en: '100% Practical Business Skills' },
  'wwd_1_desc': { am: 'በባዶ ቲዎሪ ሳይሆን፣ ገበያ ላይ ወዲያውኑ ገቢ የሚያስገኙ በተግባር የተፈተኑ ዘመናዊ ስልጠናዎች።', en: 'Not empty theory, but practically tested modern trainings that generate immediate income in the market.' },
  'wwd_2_title': { am: 'የተቀናጀ ማህበረሰብ እና የአካል ስልጠና', en: 'Integrated Community & In-Person Training' },
  'wwd_2_desc': { am: 'በኦንላይን ብቻ ሳይወሰኑ፣ በየጊዜው በአካል (Offline) እየተገናኙ ልምድ የሚለዋወጡበት ጠንካራ የኢንተርፕረነሮች ጥምረት።', en: 'Not limited to online, a strong alliance of entrepreneurs meeting periodically in-person (offline) to exchange experience.' },
  'wwd_3_title': { am: 'የ 24/7 የግል AI መምህር (Tsehay AI)', en: '24/7 Personal AI Tutor (Tsehay AI)' },
  'wwd_3_desc': { am: 'በማንኛውም ሰዓት ጥያቄዎን የሚመልስ፣ የቢዝነስ ሀሳቦችን የሚያመነጭ እና የሚያማክር ዘመናዊ የግል ረዳት።', en: 'A modern personal assistant that answers your questions at any time, generates business ideas, and provides consultation.' },
  'our_team_title': { am: 'የእኛ ቡድን', en: 'Our Team' },
  'about_reels_title': { am: 'የተማሪዎቻችን እና የካምፓሳችን አጫጭር ቪዲዮዎች', en: 'Our Students & Campus Short Videos' },

  // Courses Page
  'courses_badge': { am: 'ለርስዎ ስኬት የተዘጋጀ መድረክ', en: 'A platform prepared for your success' },
  'courses_title_1': { am: 'የ', en: '' },
  'courses_title_2': { am: 'ኮርሶች', en: 'Courses' },
  'courses_subtitle': { am: 'ክህሎትዎን የሚያሳድጉ እና ለስራ ገበያው የሚያዘጋጁ በጥንቃቄ የተመረጡ ኮርሶችን ያግኙ', en: 'Find carefully selected courses to enhance your skills and prepare you for the job market' },
  'search_placeholder_2': { am: 'የኮርስ ስም ወይም ቁልፍ ቃል ይፈልጉ...', en: 'Search for course name or keyword...' },
  'cat_all': { am: 'ሁሉም', en: 'All' },
  'cat_free': { am: 'ነፃ ኮርሶች', en: 'Free Courses' },
  'cat_paid': { am: 'ፕሪሚየም (ክፍያ)', en: 'Premium (Paid)' },
  'cat_ecommerce': { am: 'ኢ-ኮሜርስ', en: 'E-Commerce' },
  'cat_youtube': { am: 'ዩቲዩብ', en: 'YouTube' },
  'cat_content_creation': { am: 'ኮንተንት ክሬሽን', en: 'Content Creation' },
  'cat_marketing': { am: 'ማርኬቲንግ', en: 'Marketing' },
  'cat_brokerage': { am: 'ደላላነት (Brokerage)', en: 'Brokerage' },
  'cat_filmmaking': { am: 'ፊልም ሜኪንግ', en: 'Film Making' },
  'cat_career': { am: 'የስራ ዕድገት', en: 'Career Development' },
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
  const [lang, setLang] = useState<Language>('am');

  useEffect(() => {
    const saved = localStorage.getItem('lang') as Language;
    if (saved === 'am' || saved === 'en') {
      setLang(saved);
    } else {
      setLang('am');
    }
  }, []);

  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.lang = lang;
      document.documentElement.setAttribute('translate', 'no');
      document.documentElement.classList.add('notranslate');
    }
  }, [lang]);

  const toggleLanguage = () => {
    const newLang = lang === 'am' ? 'en' : 'am';
    setLang(newLang);
    localStorage.setItem('lang', newLang);
  };

  const setLanguage = (newLang: Language) => {
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
    <LanguageContext.Provider value={{ lang, toggleLanguage, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    return {
      lang: 'am' as Language,
      toggleLanguage: () => {},
      setLanguage: () => {},
      t: (key: string) => key
    };
  }
  return context;
}
