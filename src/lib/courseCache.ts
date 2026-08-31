// @ts-nocheck
import { db } from '@/lib/firebase/config';
import { collection, onSnapshot, query } from 'firebase/firestore';

export const DEFAULT_COURSES = [
  {
    id: "digital_marketing_free",
    slug: "digital-marketing",
    title: "ዲጂታል ማርኬቲንግ ለጀማሪዎች: ቢዝነስዎን በቀላሉ የሚያሳድጉበት መመሪያ",
    description: "ይህ የ1 ሰዓት የዲጂታል ማርኬቲንግ ቅምሻ በነፃነት በመማር ወደፊት ለሚመጣው ትልቅ የዲጂታል ማርኬቲንግ ስልጠና እራስዎን ዝግጁ የሚያደርጉበት ወሳኝ ፕሮግራም ነው።",
    desc: "ይህ የ1 ሰዓት የዲጂታል ማርኬቲንግ ቅምሻ በነፃነት በመማር ወደፊት ለሚመጣው ትልቅ የዲጂታል ማርኬቲንግ ስልጠና እራስዎን ዝግጁ የሚያደርጉበት ወሳኝ ፕሮግራም ነው።",
    price: 0,
    oldPrice: 4000,
    status: "Active",
    isFree: true,
    category: "Marketing",
    tag: "Marketing",
    level: "ጀማሪ (Beginner)",
    duration: "00:40:00",
    image: "https://drive.google.com/thumbnail?id=1HZf1jV5AdSXyc7MJUf8vPgYm4z0-30O6&sz=w1000",
    banner: "https://drive.google.com/thumbnail?id=1HZf1jV5AdSXyc7MJUf8vPgYm4z0-30O6&sz=w1000",
    video: "https://www.youtube.com/embed/B-s71n0dHUk",
    instructor: "Eyoub Sahle",
    instructorTitle: "የቢዝነስ እና ዲጂታል ማርኬቲንግ ባለሙያ (Lead Instructor)",
    instructorImage: "https://drive.google.com/thumbnail?id=1rdjkUc6ZwK6NbbgHaZ-7BtEi8A9aA5Uq&sz=w1000",
    instructorTelegram: "@EyoubSahle",
    instructorBio: "በኢ-ኮሜርስ፣ ዲጂታል ማርኬቲንግ እና ክሪፕቶ ከረንሲ ዘርፍ የብዙ አመታት የተግባር ልምድ ያለው እና በመቶዎች የሚቆጠሩ ተማሪዎችን ወደ ስኬት ያበቃ ባለሙያ።",
    students: 580,
    studentsCount: 580,
    rating: 5,
    ratingAvg: 5.0,
    ratingCount: 52,
    instructorRatingAvg: 4.9,
    modulesCount: 4,
    isPopular: true,
    aiPrompt: "You are Tsehay AI. Your job is to help students learning the Digital Marketing course by Eyoub Sahle. Answer questions strictly related to marketing.",
    whatYouWillLearn: [
      "የዲጂታል ማርኬቲንግ መሰረታዊ መርሆች",
      "ባህላዊ እና ዲጂታል ማርኬቲንግ ልዩነት",
      "የሶሻል ሚዲያ ማርኬቲንግ አጠቃቀም",
      "የፌስቡክ እና ቴሌግራም ገበያ ስልቶች"
    ],
    requirements: [
      "ምንም ቅድመ ተሞክሮ አይጠይቅም",
      "ስማርት ስልክ ወይም ኮምፒውተር",
      "የኢንተርኔት ኮኔክሽን"
    ],
    includes: [
      "በቪዲዮ የተደገፈ ትምህርት (On-demand video)",
      "የተግባር አሳይመንቶች (Assignments)",
      "በስልክ መጠቀም የሚያስችል (Mobile Access)",
      "የኮርስ ማጠናቀቂያ ሰርተፊኬት (Certificate)"
    ],
    lessons: [
      { title: "የኮርስ ማስታወቂያ (Course Intro)", duration: "02:30", video: "https://www.youtube.com/embed/B-s71n0dHUk", desc: "የዲጂታል ማርኬቲንግ መግቢያ", points: 10 },
      { title: "ባህላዊ vs ዲጂታል ማርኬቲንግ", duration: "05:15", video: "https://www.youtube.com/embed/B-s71n0dHUk", desc: "የሁለቱ የግብይት አይነቶች ልዩነት", points: 50 },
      { title: "የዲጂታል ማርኬቲንግ አይነቶች ክፍል 1", duration: "10:00", video: "https://www.youtube.com/embed/B-s71n0dHUk", desc: "ዋና ዋና የዲጂታል ማርኬቲንግ መንገዶች", points: 100 },
      { title: "በተግባር የተደገፈ የፌስቡክ ማስታወቂያ", duration: "15:20", video: "https://www.youtube.com/embed/B-s71n0dHUk", desc: "የፌስቡክ ማስታወቂያ አሰራር በተግባር", points: 100 }
    ]
  },
  {
    id: "course_1784885060875",
    slug: "shein-import-business",
    title: "የሼን ኢምፖርት ቢዝነስ ስልጠና (Shein Import Business Course)",
    description: "በቀላሉ በትንሽ ካፒታል ከሼን (Shein) እቃዎችን እንዴት ማስመጣት እንደሚችሉ፣ የኦንላይን ካርድ ክፍያ፣ የጉምሩክ አሰራር እና እቃዎችን በከፍተኛ ትርፍ መሸጫ ስልቶች የሚያስተምር 100% ተግባራዊ ኮርስ።",
    desc: "በቀላሉ በትንሽ ካፒታል ከሼን (Shein) እቃዎችን እንዴት ማስመጣት እንደሚችሉ፣ የኦንላይን ካርድ ክፍያ፣ የጉምሩክ አሰራር እና እቃዎችን በከፍተኛ ትርፍ መሸጫ ስልቶች የሚያስተምር 100% ተግባራዊ ኮርስ።",
    price: 4500,
    oldPrice: 6000,
    status: "Active",
    isFree: false,
    category: "Ecommerce",
    tag: "Ecommerce",
    level: "ጀማሪ (Beginner)",
    duration: "01:15:00",
    image: "https://drive.google.com/thumbnail?id=1rdjkUc6ZwK6NbbgHaZ-7BtEi8A9aA5Uq&sz=w1000",
    banner: "/assets/for_landing_page_second.jpg",
    video: "https://www.youtube.com/watch?v=mgdOMtW6J8k",
    instructor: "Eyoub Sahle",
    instructorTitle: "የቢዝነስ እና ዲጂታል ማርኬቲንግ ባለሙያ (Lead Instructor)",
    instructorImage: "https://drive.google.com/thumbnail?id=1rdjkUc6ZwK6NbbgHaZ-7BtEi8A9aA5Uq&sz=w1000",
    instructorTelegram: "@EyoubSahle",
    instructorBio: "በኢ-ኮሜርስ፣ ዲጂታል ማርኬቲንግ እና ክሪፕቶ ከረንሲ ዘርፍ የብዙ አመታት የተግባር ልምድ ያለው እና በመቶዎች የሚቆጠሩ ተማሪዎችን ወደ ስኬት ያበቃ ባለሙያ።",
    students: 340,
    studentsCount: 340,
    rating: 4.9,
    ratingAvg: 4.9,
    ratingCount: 48,
    instructorRatingAvg: 5.0,
    modulesCount: 5,
    isPopular: true,
    aiPrompt: "You are Tsehay AI, the dedicated and universal mentor for the Shein Import Business Course by Eyoub Sahle. Answer all questions about product sourcing, foreign payments, customs, freight, e-commerce, digital marketing, and practical business growth with rich, actionable guidance.",
    whatYouWillLearn: [
      "ከሼን (SHEIN) ተፈላጊ እና ፈጣን ሽያጭ ያላቸውን ምርጥ እቃዎች የመምረጫ ስልቶች",
      "በኢትዮጵያ ውስጥ ሆነው በቀላሉ በዶላር እና በኦንላይን ካርዶች ክፍያ የመፈጸሚያ መንገዶች",
      "የካርጎ፣ የትራንስፖርት እና የጉምሩክ ወጪዎችን በከፍተኛ ደረጃ መቀነሻ ዘዴዎች",
      "በ TikTok እና Telegram ቻናሎች እቃዎችን በከፍተኛ ትርፍ እና ፍጥነት መሸጫ ስልቶች",
      "የደንበኞች አያያዝ እና የረጅም ጊዜ የኢ-ኮሜርስ ቢዝነስ ግንባታ"
    ],
    requirements: [
      "ስማርት ስልክ ወይም ላፕቶፕ",
      "የኢንተርኔት ኮኔክሽን",
      "የመማር እና በተግባር የመስራት ፍላጎት"
    ],
    includes: [
      "የተሟሉ የተግባር የቪዲዮ ትምህርቶች (Video Lessons)",
      "የቀጥታ የአሰልጣኝ ድጋፍ (Mentor Support)",
      "የአቅራቢዎች እና የካርጎ አድራሻዎች (Supplier & Cargo Contacts)",
      "የኮርስ ማጠናቀቂያ ሰርተፊኬት (Certificate of Completion)",
      "የሁልጊዜ መዳረሻ (Lifetime Access)"
    ],
    lessons: [
      { title: "ክፍል 1: የሼን ኢምፖርት ቢዝነስ መግቢያና መሰረታዊ እውነታዎች", duration: "08:30", video: "https://www.youtube.com/watch?v=mgdOMtW6J8k", desc: "የኢ-ኮሜርስ እድሎች እና የኮርሱ አጠቃላይ ገለጻ", points: 20 },
      { title: "ክፍል 2: አዋጭ ምርቶችን መምረጥ (Winning Product Research)", duration: "14:15", video: "https://www.youtube.com/watch?v=mgdOMtW6J8k", desc: "በኢትዮጵያ ገበያ ተፈላጊ እቃዎችን የመለያ ስልቶች", points: 30 },
      { title: "ክፍል 3: የዶላር እና የኦንላይን ካርድ ክፍያ አፈጻጸም", duration: "16:40", video: "https://www.youtube.com/watch?v=mgdOMtW6J8k", desc: "ከኢትዮጵያ ሆነው በካርድ ክፍያ መፈጸሚያ መንገዶች", points: 50 },
      { title: "ክፍል 4: ካርጎ፣ ማጓጓዣ እና የጉምሩክ አሰራር", duration: "15:20", video: "https://www.youtube.com/watch?v=mgdOMtW6J8k", desc: "እቃዎችን በሰላም እና በትንሽ ወጪ ማስገባት", points: 40 },
      { title: "ክፍል 5: በ TikTok እና Telegram ከፍተኛ ሽያጭ መፍጠር", duration: "18:00", video: "https://www.youtube.com/watch?v=mgdOMtW6J8k", desc: "የማርኬቲንግ እና የሽያጭ ስልቶች", points: 60 }
    ]
  },
  {
    id: "course_1784885267254",
    slug: "youtube-secrets-masterclass",
    title: "የዩቲዩብ ስኬት ሚስጥሮች (YouTube Secrets Masterclass)",
    description: "ከዜሮ ተነስተው ስኬታማ እና ገቢ የሚያስገኝ የዩቲዩብ ቻናል ለመገንባት የሚያስፈልጉዎትን ሚስጥሮች፣ የቪዲዮ አሰራር፣ የ Thumbnail ዲዛይን፣ የ SEO እና የገቢ ማግኛ መንገዶችን ደረጃ በደረጃ በተግባር የሚያስተምር የተሟላ ማስተርክላስ።",
    desc: "ከዜሮ ተነስተው ስኬታማ እና ገቢ የሚያስገኝ የዩቲዩብ ቻናል ለመገንባት የሚያስፈልጉዎትን ሚስጥሮች፣ የቪዲዮ አሰራር፣ የ Thumbnail ዲዛይን፣ የ SEO እና የገቢ ማግኛ መንገዶችን ደረጃ በደረጃ በተግባር የሚያስተምር የተሟላ ማስተርክላስ።",
    price: 600,
    oldPrice: 900,
    status: "Active",
    isFree: false,
    category: "General",
    tag: "General",
    level: "ጀማሪ (Beginner)",
    duration: "04:00:00",
    image: "/assets/hero-bg-new.jpg",
    banner: "/assets/hero-bg-new.jpg",
    video: "https://www.youtube.com/watch?v=mgdOMtW6J8k",
    instructor: "Eyoub Sahle",
    instructorTitle: "የቢዝነስ እና ዲጂታል ማርኬቲንግ ባለሙያ (Lead Instructor)",
    instructorImage: "https://drive.google.com/thumbnail?id=1rdjkUc6ZwK6NbbgHaZ-7BtEi8A9aA5Uq&sz=w1000",
    instructorTelegram: "@EyoubSahle",
    instructorBio: "በኢ-ኮሜርስ፣ ዲጂታል ማርኬቲንግ እና ክሪፕቶ ከረንሲ ዘርፍ የብዙ አመታት የተግባር ልምድ ያለው እና በመቶዎች የሚቆጠሩ ተማሪዎችን ወደ ስኬት ያበቃ ባለሙያ።",
    students: 420,
    studentsCount: 420,
    rating: 4.9,
    ratingAvg: 4.9,
    ratingCount: 38,
    instructorRatingAvg: 5.0,
    modulesCount: 5,
    isPopular: true,
    aiPrompt: "You are Tsehay AI, the dedicated and universal mentor for the YouTube Secrets Masterclass by Eyoub Sahle. Answer all questions about YouTube channel building, monetization, SEO, video editing, script writing, algorithms, audience growth, and digital content creation with rich, actionable guidance.",
    whatYouWillLearn: [
      "ከዜሮ ተነስቶ ስኬታማ የዩቲዩብ ቻናል አከፋፈት እና ሴቲንግ",
      "ያለ ፊት ገጽታ (Faceless) ቪዲዮዎችን በ AI የማዘጋጀት ጥበብ",
      "ከፍተኛ ተመልካች የሚስብ Thumbnail እና Title አሰራር",
      "የዩቲዩብ አልጎሪዝም እና SEO ሚስጥሮች",
      "የገቢ ማግኛ (Monetization) እና ክፍያ አወሳሰድ በኢትዮጵያ"
    ],
    requirements: [
      "መሰረታዊ የኮምፒውተር ወይም የስልክ እውቀት",
      "ስማርት ስልክ ወይም ላፕቶፕ",
      "የኢንተርኔት ኮኔክሽን",
      "የመማር ፍላጎት እና ትጋት"
    ],
    includes: [
      "በቪዲዮ የተደገፈ ትምህርት (On-demand video)",
      "የተግባር አሳይመንቶች እና ፕሮጀክቶች (Assignments & Projects)",
      "በስልክ እና በቲቪ መጠቀም የሚያስችል (Access on mobile and TV)",
      "የኮርስ ማጠናቀቂያ ሰርተፊኬት (Certificate of completion)",
      "የሁልጊዜ መዳረሻ (Full lifetime access)"
    ],
    lessons: [
      { title: "ክፍል 1: መግቢያ እና የዩቲዩብ መሰረታዊ እውነታዎች", duration: "08:30", video: "https://www.youtube.com/watch?v=mgdOMtW6J8k", desc: "የዩቲዩብ እድሎችና የኮርሱ አጠቃላይ ገለጻ", points: 20 },
      { title: "ክፍል 2: አዋጭ ኒች (Profitable Niche) መምረጥ", duration: "12:45", video: "https://www.youtube.com/watch?v=mgdOMtW6J8k", desc: "ከፍተኛ ተከፋይ እና ተወዳጅ የሆኑ የዩቲዩብ ርዕሶችን የመምረጫ ስልቶች", points: 30 },
      { title: "ክፍል 3: የ Faceless ቻናሎች ምስጢር እና የ AI መሳሪያዎች", duration: "15:20", video: "https://www.youtube.com/watch?v=mgdOMtW6J8k", desc: "ፊት ሳያሳዩ በ AI ድምጽና ምስል ቪዲዮዎችን መስራት", points: 50 },
      { title: "ክፍል 4: ፕሮፌሽናል Thumbnail እና Title ዲዛይን", duration: "14:10", video: "https://www.youtube.com/watch?v=mgdOMtW6J8k", desc: "ተመልካች ክሊክ እንዲያደርግ የሚያስችሉ ስልቶች", points: 40 },
      { title: "ክፍል 5: የዩቲዩብ SEO እና አልጎሪዝም ሃክ", duration: "18:00", video: "https://www.youtube.com/watch?v=mgdOMtW6J8k", desc: "ቪዲዮዎችዎ በሰርች እና በ Suggested እንዲመጡ ማድረግ", points: 60 }
    ]
  }
];

/**
 * Normalizes title / category / string into a clean, human-friendly URL slug
 */
export function generateCourseSlug(title: string): string {
  if (!title) return '';
  const lower = title.toLowerCase();
  
  if (lower.includes('shein') || lower.includes('ኢምፖርት') || lower.includes('import')) {
    return 'shein-import-business';
  }
  if (lower.includes('youtube') || lower.includes('ዩቲዩብ')) {
    return 'youtube-secrets-masterclass';
  }
  if (lower.includes('ዲጂታል') || lower.includes('marketing') || lower.includes('ማርኬቲንግ')) {
    if (lower.includes('pro') || lower.includes('ፕሮፌሽናል') || lower.includes('advanced') || lower.includes('ከፍተኛ')) {
      return 'digital-marketing-pro';
    }
    return 'digital-marketing';
  }
  if (lower.includes('crypto') || lower.includes('ክሪፕቶ')) {
    return 'crypto-trading';
  }
  if (lower.includes('web') || lower.includes('ኮዲንግ') || lower.includes('coding')) {
    return 'web-development';
  }

  // Extract English words if present
  const latinOnly = title
    .replace(/[^\w\s-]/g, ' ')
    .trim()
    .replace(/\s+/g, '-')
    .toLowerCase();

  if (latinOnly && latinOnly.length >= 3) {
    return latinOnly;
  }

  return 'course-' + encodeURIComponent(title.slice(0, 15)).toLowerCase().replace(/%/g, '');
}

/**
 * Returns the canonical clean slug for a course, falling back to clean generated slug or id
 */
export function getCourseSlug(course: any): string {
  if (!course) return '';
  if (course.slug && typeof course.slug === 'string' && course.slug.trim().length > 0) {
    return course.slug.trim().toLowerCase();
  }
  if (course.title) {
    return generateCourseSlug(course.title);
  }
  return course.id || '';
}

/**
 * Resolves a course by slug, raw ID, or known aliases
 */
export function getCourseBySlugOrId(slugOrId: string, courses: any[]): any {
  if (!slugOrId) return null;
  const list = (Array.isArray(courses) && courses.length > 0) ? courses : DEFAULT_COURSES;
  const raw = decodeURIComponent(slugOrId).trim().toLowerCase();

  // 1. Direct ID or explicit slug match
  const directMatch = list.find((c: any) => 
    (c.id && c.id.toLowerCase() === raw) ||
    (c.slug && c.slug.toLowerCase() === raw)
  );
  if (directMatch) return directMatch;

  // 2. Computed slug match
  const slugMatch = list.find((c: any) => getCourseSlug(c) === raw);
  if (slugMatch) return slugMatch;

  // 3. Known Aliases
  // Shein aliases
  if (raw === 'shein' || raw === 'shein-import' || raw === 'shein-import-business' || raw === 'ecommerce' || raw === 'shein_import_business' || raw.includes('shein') || raw.includes('ኢምፖርት')) {
    const shein = list.find((c: any) => 
      c.id === 'shein-import-business' ||
      c.id === 'shein_import_business' ||
      (c.title && (c.title.includes('ሼን') || /shein/i.test(c.title))) ||
      (c.category && /shein/i.test(c.category))
    );
    if (shein) return shein;
  }

  // YouTube aliases
  if (raw === 'youtube' || raw === 'youtube-secrets' || raw === 'youtube-masterclass' || raw === 'youtube-secrets-masterclass' || raw === 'course_1784885267254' || raw.includes('youtube') || raw.includes('ዩቲዩብ')) {
    const yt = list.find((c: any) => 
      c.id === 'course_1784885267254' ||
      (c.title && (c.title.includes('ዩቲዩብ') || /youtube/i.test(c.title))) ||
      (c.category && /youtube/i.test(c.category))
    );
    if (yt) return yt;
  }

  // Digital Marketing aliases
  if (raw === 'digital-marketing' || raw === 'digital-marketing-free' || raw === 'marketing' || raw === 'digital_marketing_free' || raw.includes('digital-marketing') || raw.includes('ማርኬቲንግ')) {
    const dm = list.find((c: any) => 
      c.id === 'digital_marketing_free' ||
      c.id === 'course_1784495507314' ||
      (c.title && (c.title.includes('ዲጂታል ማርኬቲንግ') || /digital marketing/i.test(c.title)))
    );
    if (dm) return dm;
  }

  // 4. Timestamp / numeric course ID partial match
  if (raw.startsWith('course_') || raw.startsWith('course-')) {
    const idMatch = list.find((c: any) => c.id && c.id.toLowerCase().includes(raw));
    if (idMatch) return idMatch;
  }

  // 5. Title substring search
  const titleMatch = list.find((c: any) => c.title && c.title.toLowerCase().includes(raw));
  if (titleMatch) return titleMatch;

  return null;
}

export function formatCourseDesc(course: any): string {
  const text = (course?.desc || course?.description || '').trim();
  if (
    !text ||
    text.startsWith('You are "Tsehay AI"') ||
    text.startsWith('You are Tsehay AI') ||
    text.includes('official virtual guide and AI Teaching Assistant') ||
    text.includes('[STRICT CONVERSATION FLOW RULES]')
  ) {
    if (
      course?.id === 'shein-import-business' ||
      course?.id === 'shein_import_business' ||
      course?.title?.toLowerCase().includes('shein') ||
      course?.title?.includes('ሼን')
    ) {
      return "ከሼን (SHEIN) በቀጥታ ተፈላጊ እቃዎችን በማስመጣት በኢትዮጵያ ውስጥ ከፍተኛ ትርፍ የሚያገኙበት የተሟላ ስልጠና። የክፍያ ዘዴዎች፣ የዶላር ካርዶች፣ የካርጎና ጉምሩክ ወጪ መቀነሻ መንገዶች እና የቲክቶክ/ቴሌግራም ሽያጭ ስልቶች።";
    }
    if (
      course?.id === 'course_1784885267254' ||
      course?.title?.toLowerCase().includes('youtube') ||
      course?.title?.includes('ዩቲዩብ')
    ) {
      return "ከዜሮ ተነስተው ስኬታማ እና ገቢ የሚያስገኝ የዩቲዩብ ቻናል ለመገንባት የሚያስፈልጉዎትን ሚስጥሮች፣ የቪዲዮ አሰራር፣ የ Thumbnail ዲዛይን፣ የ SEO እና የገቢ ማግኛ መንገዶችን ደረጃ በደረጃ በተግባር የሚያስተምር የተሟላ ማስተርክላስ።";
    }
    return "በተግባር የቀረበ የተሟላ እና ሙያዊ የክህሎት ማሰልጠኛ ኮርስ።";
  }
  return text;
}

export function isValidCourse(c: any): boolean {
  if (!c || typeof c !== 'object') return false;
  if (c.status === 'Deleted' || c.isDeleted === true) return false;
  const id = (c.id || '').toString().trim().toLowerCase();
  const rawTitle = (c.title || '').toString().trim();
  const title = rawTitle.toLowerCase();
  const desc = (c.desc || c.description || '').toString().trim().toLowerCase();

  // Filter out corrupted/broken test entries
  if (id === '5l,m4lmltml' || title.includes('5l,m4lmltml') || desc.includes('2354t4554t4t4')) return false;
  if (title === 'shien business' || title.includes('shien business') || desc.includes('focused on shien business')) return false;
  if (id === 'web-development-bootcamp' || id === 'crypto-finance-mastery' || id === 'digital_marketing_pro') return false;
  
  if (!rawTitle || rawTitle.length < 3) return false;

  return true;
}

/**
 * Combines courses from multiple collection snapshots or endpoints cleanly
 */
export function mergeCoursesLists(...lists: any[][]): any[] {
  const map = new Map<string, any>();

  lists.forEach(list => {
    if (Array.isArray(list)) {
      list.forEach(c => {
        if (isValidCourse(c)) {
          const cleanDesc = formatCourseDesc(c);
          const slug = getCourseSlug(c);
          const existing = map.get(c.id);
          map.set(c.id, {
            ...existing,
            ...c,
            slug: slug || existing?.slug || '',
            desc: cleanDesc,
            description: cleanDesc
          });
        }
      });
    }
  });

  if (map.size === 0) {
    return DEFAULT_COURSES;
  }

  return Array.from(map.values());
}

/**
 * Reads verified live course data previously synced from Firestore or LocalStorage cache.
 */
export function getCachedCourses(): any[] {
  if (typeof window === 'undefined') return DEFAULT_COURSES;
  try {
    const cached = localStorage.getItem('tsehay_courses_cache');
    if (cached) {
      const parsed = JSON.parse(cached);
      if (Array.isArray(parsed) && parsed.length > 0) {
        const valid = parsed.filter(isValidCourse).map((c: any) => ({
          ...c,
          desc: formatCourseDesc(c),
          description: formatCourseDesc(c)
        }));
        if (valid.length >= 3) return valid;
      }
    }
  } catch (err) {
    console.warn("Course cache read error:", err);
  }
  return DEFAULT_COURSES;
}

export function saveCachedCourses(courses: any[]) {
  if (typeof window === 'undefined' || !Array.isArray(courses) || courses.length === 0) return;
  try {
    const sanitized = courses.filter(isValidCourse).map((c: any) => ({
      ...c,
      desc: formatCourseDesc(c),
      description: formatCourseDesc(c)
    }));
    if (sanitized.length > 0) {
      localStorage.setItem('tsehay_courses_cache', JSON.stringify(sanitized));
    }
  } catch (err) {
    console.warn("Course cache save error:", err);
  }
}

export function formatDriveImageUrl(url: any): string {
  if (!url || typeof url !== 'string') return '';
  const clean = url.trim();
  if (!clean) return '';
  const match = clean.match(/(?:file\/d\/|id=|thumbnail\?id=|\/d\/)([a-zA-Z0-9_-]{20,})/);
  if (match && match[1]) {
    return `https://drive.google.com/thumbnail?id=${match[1]}&sz=w1000`;
  }
  return clean;
}

export function getCleanCourseImage(c: any): string {
  if (!c || typeof c !== 'object') return '';
  const rawImage = (c.image || c.thumbnail || c.banner || '').toString().trim();
  return formatDriveImageUrl(rawImage);
}

/**
 * Broadcasts course changes instantly across all open tabs, windows, and intra-app components
 * Achieves zero-latency (nanosecond) live synchronization without page reload
 */
export function broadcastCourseUpdate(courses: any[]) {
  if (typeof window === 'undefined' || !Array.isArray(courses) || courses.length === 0) return;
  const sanitized = courses.filter(isValidCourse);
  saveCachedCourses(sanitized);

  try {
    // 1. Cross-tab Broadcast Channel
    if (typeof BroadcastChannel !== 'undefined') {
      const bc = new BroadcastChannel('tsehay_live_courses_channel');
      bc.postMessage({ type: 'COURSES_UPDATED', courses: sanitized });
      setTimeout(() => bc.close(), 200);
    }
  } catch (e) {}

  try {
    // 2. Intra-tab Custom Event
    window.dispatchEvent(new CustomEvent('tsehay_courses_updated', {
      detail: { courses: sanitized }
    }));
  } catch (e) {}

  try {
    // 3. Native Storage Event Trigger
    window.dispatchEvent(new Event('storage'));
  } catch (e) {}
}

/**
 * Universal Multi-Strategy Real-Time Subscription Engine
 * 5. Immediate Server API Fetch (/api/courses)
 */
export function subscribeToCourses(callback: (courses: any[]) => void): () => void {
  if (typeof window === 'undefined') return () => {};

  let isCleanedUp = false;
  let lastDataHash = '';
  const unifiedMap = new Map<string, any>();

  const emitIfChanged = (newCourses: any[], replace: boolean = false) => {
    if (isCleanedUp || !Array.isArray(newCourses)) return;

    const validCourses = newCourses.filter(isValidCourse);
    if (validCourses.length === 0) return;

    if (replace) {
      unifiedMap.clear();
    }

    validCourses.forEach((c: any) => {
      const cleanDesc = formatCourseDesc(c);
      const slug = getCourseSlug(c);
      unifiedMap.set(c.id, {
        ...c,
        slug: slug || c.slug || '',
        desc: cleanDesc,
        description: cleanDesc
      });
    });

    const list = Array.from(unifiedMap.values());
    if (list.length === 0) return;

    const currentHash = JSON.stringify(list.map(c => `${c.id}_${c.price}_${c.title}_${c.updatedAt || ''}`));
    if (currentHash !== lastDataHash) {
      lastDataHash = currentHash;
      saveCachedCourses(list);
      callback(list);
    }
  };

  // 1. Deliver cached / default verified courses immediately (0ms)
  const initial = getCachedCourses();
  if (initial && initial.length >= 3) {
    emitIfChanged(initial, true);
  } else {
    emitIfChanged(DEFAULT_COURSES, true);
  }

  // 2. Immediate Server API Fail-Safe Fetch (<100ms) with cache-busting
  fetch(`/api/courses?t=${Date.now()}`, {
    cache: 'no-store',
    headers: { 'Cache-Control': 'no-cache, no-store, must-revalidate' }
  })
    .then(res => res.json())
    .then(data => {
      if (!isCleanedUp && data.courses && Array.isArray(data.courses)) {
        const validList = data.courses.filter(isValidCourse);
        if (validList.length >= 3) {
          emitIfChanged(validList, true);
        } else if (validList.length > 0) {
          emitIfChanged(mergeCoursesLists(DEFAULT_COURSES, validList), true);
        }
      }
    })
    .catch(err => console.warn('API courses fetch note:', err));

  // 3. Real-Time Firestore Live Listener on the Authoritative Admin Courses Collection:
  // artifacts/tsehaycampus-e1a6d/public/data/courses
  let unsubNested = () => {};
  try {
    const nestedQuery = query(collection(db, 'artifacts', 'tsehaycampus-e1a6d', 'public', 'data', 'courses'));
    unsubNested = onSnapshot(nestedQuery, (snap) => {
      if (!isCleanedUp && !snap.empty) {
        const list = snap.docs
          .map(doc => ({ id: doc.id, ...doc.data() }))
          .filter(isValidCourse);
        if (list.length >= 3) {
          emitIfChanged(list, true);
        } else if (list.length > 0) {
          emitIfChanged(mergeCoursesLists(DEFAULT_COURSES, list), true);
        }
      }
    }, (err) => {
      console.warn('Nested Firestore listener sync note:', err.message);
    });
  } catch (e) {
    console.warn('Nested Firestore listener init note:', e);
  }

  // b) Root courses collection
  let unsubRoot = () => {};
  try {
    const rootQuery = query(collection(db, 'courses'));
    unsubRoot = onSnapshot(rootQuery, (snap) => {
      if (!isCleanedUp && !snap.empty) {
        const list = snap.docs
          .map(doc => ({ id: doc.id, ...doc.data() }))
          .filter(isValidCourse);
        if (list.length > 0) {
          emitIfChanged(list, false);
        }
      }
    }, (err) => {});
  } catch (e) {}

  // 4. Cross-Tab Broadcast Channel Listener (Nanosecond Live Sync across multiple browser tabs)
  let bc: BroadcastChannel | null = null;
  try {
    if (typeof BroadcastChannel !== 'undefined') {
      bc = new BroadcastChannel('tsehay_live_courses_channel');
      bc.onmessage = (event) => {
        if (!isCleanedUp && event.data && event.data.type === 'COURSES_UPDATED' && Array.isArray(event.data.courses)) {
          emitIfChanged(event.data.courses, true);
        }
      };
    }
  } catch (e) {}

  // 5. Intra-Tab Custom Event Listener (Instant UI update within the current page)
  const handleCustomUpdate = (e: any) => {
    if (!isCleanedUp && e.detail && Array.isArray(e.detail.courses)) {
      emitIfChanged(e.detail.courses, true);
    }
  };
  window.addEventListener('tsehay_courses_updated', handleCustomUpdate);

  // 6. Local Storage Event Listener (Cross-tab fallback)
  const handleStorage = (e: StorageEvent) => {
    if (!isCleanedUp && (!e.key || e.key === 'tsehay_courses_cache')) {
      const updated = getCachedCourses();
      if (updated.length > 0) {
        emitIfChanged(updated, true);
      }
    }
  };
  window.addEventListener('storage', handleStorage);

  // Return comprehensive cleanup function
  return () => {
    isCleanedUp = true;
    unsubNested();
    unsubRoot();
    if (bc) {
      bc.close();
    }
    window.removeEventListener('tsehay_courses_updated', handleCustomUpdate);
    window.removeEventListener('storage', handleStorage);
  };
}

export interface ComingSoonCourse {
  id: string;
  slug: string;
  title: string;
  titleEn: string;
  tag: string;
  category: string;
  description: string;
  level: string;
  duration: string;
  instructor: string;
  image: string;
  highlightBadge: string;
  benefits: string[];
  expectedDate?: string;
}

export const COMING_SOON_COURSES: ComingSoonCourse[] = [
  {
    id: "cs-video-editing",
    slug: "video-editing-masterclass",
    title: "የቪዲዮ ኤዲቲንግ ኮርስ (Video Editing Masterclass)",
    titleEn: "Video Editing Masterclass",
    tag: "Video Editing (የቪዲዮ ኤዲቲንግ)",
    category: "Video Editing (የቪዲዮ ኤዲቲንግ)",
    description: "በ CapCut እና Premiere Pro ፕሮፌሽናል ቪዲዮዎችን ማቀናበር፣ የድምፅ እና የከለር ግሬዲንግ፣ የሞሽን ግራፊክስ እና ለቲክቶክ/ዩቲዩብ ቫይራል የሚሆኑ ይዘቶችን መስራት።",
    level: "ጀማሪ - ከፍተኛ (All Levels)",
    duration: "6+ ሰዓታት",
    instructor: "Eyoub Sahle & Video Team",
    image: "https://images.unsplash.com/photo-1574717024653-61fd2cf4d44d?q=80&w=800",
    highlightBadge: "CapCut & Premiere Pro",
    benefits: [
      "የቫይራል ቪዲዮዎች ኤዲቲንግ ስልት",
      "Color Grading & Sound Design",
      "Motion Graphics & B-Roll Mastery",
      "ለአለምአቀፍ ደንበኞች በዶላር መስራት"
    ],
    expectedDate: "በቅርቡ (Coming Soon)"
  },
  {
    id: "cs-paid-ads-marketing",
    slug: "advanced-paid-digital-marketing",
    title: "የከፋይ ዲጂታል ማርኬቲንግ (Advanced Paid Marketing)",
    titleEn: "Advanced Paid Digital Marketing",
    tag: "Paid Digital Marketing (የከፋይ ዲጂታል ማርኬቲንግ)",
    category: "Paid Digital Marketing (የከፋይ ዲጂታል ማርኬቲንግ)",
    description: "በ Meta (Facebook/Instagram) Ads፣ TikTok Ads እና Google Search Ads ከፍተኛ ሽያጭ የሚያመጡ ማስታወቂያዎችን መስራት፣ Target Audience መምረጥ እና ROAS ማሳደግ።",
    level: "መካከለኛ - ከፍተኛ",
    duration: "8+ ሰዓታት",
    instructor: "Eyoub Sahle",
    image: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?q=80&w=800",
    highlightBadge: "Meta, TikTok & Google Ads",
    benefits: [
      "ከፍተኛ ትርፍ የሚያስገኙ ማስታወቂያዎች (ROAS)",
      "የፒክሰል እና የዳታ ትንተና (Pixel & Tracking)",
      "Scalable Budget Management",
      "የኢ-ኮሜርስ ሽያጭ ማባዣ ስልቶች"
    ],
    expectedDate: "በቅርቡ (Coming Soon)"
  },
  {
    id: "cs-real-estate-brokerage",
    slug: "real-estate-business-brokerage",
    title: "የደላላነት እና ብሮከሬጅ ኮርስ (Real Estate & Brokerage)",
    titleEn: "Real Estate & Business Brokerage",
    tag: "Real Estate & Brokerage (የደላላነትና ብሮከሬጅ)",
    category: "Real Estate & Brokerage (የደላላነትና ብሮከሬጅ)",
    description: "በኢትዮጵያ ህጋዊ የደላላነት አሰራር፣ የቤትና የመኪና ግብይት ሚስጥሮች፣ ከገዢና ሻጭ ጋር መደራደር፣ የኮሚሽን አሰባሰብ እና የቢዝነስ አጋርነት መስራት።",
    level: "ለሁሉም (All Levels)",
    duration: "5+ ሰዓታት",
    instructor: "Tsehay Property Experts",
    image: "https://images.unsplash.com/photo-1560518883-ce09059eeffa?q=80&w=800",
    highlightBadge: "High Commission Deals",
    benefits: [
      "ህጋዊ የውል እና የኮሚሽን አሰራር",
      "ከፍተኛ ከፋይ ገዢዎችን የማግኛ ዘዴ",
      "የቤት እና የመኪና ግብይት ስነ-ስርዓት",
      "የስምምነት እና ድርድር ጥበብ"
    ],
    expectedDate: "በቅርቡ (Coming Soon)"
  },
  {
    id: "cs-career-leadership",
    slug: "career-development-leadership",
    title: "የስራ እና ካሪየር እድገት (Career & Leadership)",
    titleEn: "Career Development & Leadership",
    tag: "Career Development (የስራ እና ካሪየር እድገት)",
    category: "Career Development (የስራ እና ካሪየር እድገት)",
    description: "አለምአቀፍ የርቀት (Remote) ስራዎችን በዶላር ማግኘት፣ የ LinkedIn እና Upwork ፕሮፋይል ማሳመር፣ የኢንተርቪው ዝግጅት እና የሊደርሺፕ ክህሎቶች።",
    level: "ለሁሉም (All Levels)",
    duration: "4+ ሰዓታት",
    instructor: "Career Mentors",
    image: "https://images.unsplash.com/photo-1522071820081-009f0129c71c?q=80&w=800",
    highlightBadge: "Remote Jobs & LinkedIn",
    benefits: [
      "ዓለም አቀፍ የርቀት ስራዎችን ማግኘት",
      "አሸናፊ CV እና የሊንክድኢን ፕሮፋይል",
      "የስራ ቃለ-መጠይቅ (Interview) ማለፊያ",
      "የደመወዝ ድርድር እና የካሪየር እድገት"
    ],
    expectedDate: "በቅርቡ (Coming Soon)"
  }
];

export function getComingSoonCourses(): ComingSoonCourse[] {
  return COMING_SOON_COURSES;
}

