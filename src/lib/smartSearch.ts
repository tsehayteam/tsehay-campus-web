// Smart & Semantic Search Engine for Tsehay Campus Courses

// Comprehensive Keyword Mapping Dictionary (English & Amharic)
const KEYWORD_MAP: Record<string, string[]> = {
  // Shein & E-commerce
  "shein": ["shein", "ecommerce", "import", "china", "ሼን", "ኢምፖርት", "የሼን"],
  "ሼን": ["shein", "ecommerce", "import", "china", "ሼን", "ኢምፖርት", "የሼን"],
  "import": ["shein", "ecommerce", "import", "china", "ኢምፖርት", "ሼን"],
  "ኢምፖርት": ["shein", "ecommerce", "import", "china", "ኢምፖርት", "ሼን"],
  "ecommerce": ["shein", "ecommerce", "online business", "ኢ-ኮሜርስ", "ሼን"],

  // YouTube & Video Creation
  "youtube": ["youtube", "video", "monetization", "faceless", "ዩቲዩብ", "ቪዲዮ"],
  "ዩቲዩብ": ["youtube", "video", "monetization", "faceless", "ዩቲዩብ", "ቪዲዮ"],
  "video": ["youtube", "video editing", "faceless", "ቪዲዮ"],

  // Digital Marketing & Social Media
  "social media": ["digital marketing", "facebook", "instagram", "tiktok", "telegram", "ዲጂታል ማርኬቲንግ", "ሶሻል ሚዲያ"],
  "social media marketing": ["digital marketing", "facebook", "instagram", "tiktok", "ዲጂታል ማርኬቲንግ", "ሶሻል ሚዲያ"],
  "facebook": ["digital marketing", "social media", "ads", "ዲጂታል ማርኬቲንግ", "ፌስቡክ"],
  "instagram": ["digital marketing", "social media", "ads", "ዲጂታል ማርኬቲንግ", "ኢንስታግራም"],
  "tiktok": ["digital marketing", "social media", "content", "ዲጂታል ማርኬቲንግ", "ቲክቶክ"],
  "marketing": ["digital marketing", "sales", "social media", "ማርኬቲንግ", "ዲጂታል ማርኬቲንግ"],
  "ads": ["digital marketing", "facebook", "google ads", "ማስታወቂያ"],
  "seo": ["digital marketing", "youtube", "google", "ዲጂታል ማርኬቲንግ"],
  "ማርኬቲንግ": ["digital marketing", "social media", "ዲጂታል ማርኬቲንግ"],
  "ሶሻል ሚዲያ": ["digital marketing", "social media", "ዲጂታል ማርኬቲንግ"],
  "ፌስቡክ": ["digital marketing", "facebook", "ዲጂታል ማርኬቲንግ"],
  "ኢንስታግራም": ["digital marketing", "instagram", "ዲጂታል ማርኬቲንግ"],

  // Web Development & Coding
  "web": ["web development", "full stack", "coding", "website", "ዌብሳይት", "ዌብ ዴቨሎፕመንት"],
  "website": ["web development", "full stack", "coding", "html", "css", "ዌብሳይት"],
  "web design": ["web development", "frontend", "html", "css", "ui", "ux", "ዌብሳይት"],
  "coding": ["web development", "programming", "full stack", "python", "javascript", "ኮዲንግ"],
  "programming": ["web development", "coding", "python", "javascript", "ፕሮግራሚንግ"],
  "html": ["web development", "frontend", "coding"],
  "css": ["web development", "frontend", "styling"],
  "javascript": ["web development", "js", "react", "coding"],
  "react": ["web development", "javascript", "frontend"],
  "python": ["programming", "coding", "data", "ፓይተን"],
  "ዌብሳይት": ["web development", "full stack", "coding", "ዌብ ዴቨሎፕመንት"],
  "ፕሮግራሚንግ": ["programming", "web development", "coding"],
  "ኮዲንግ": ["coding", "web development", "programming"],

  // Graphic Design & Creative
  "design": ["graphic design", "photoshop", "canva", "illustrator", "ዲዛይን", "ግራፊክስ"],
  "graphics": ["graphic design", "photoshop", "canva", "ግራፊክስ"],
  "photoshop": ["graphic design", "editing", "photos", "ፎቶሾፕ"],
  "canva": ["graphic design", "social media", "canva"],
  "logo": ["graphic design", "branding", "ሎጎ"],
  "ግራፊክስ": ["graphic design", "photoshop", "ግራፊክስ ዲዛይን"],
  "ፎቶሾፕ": ["photoshop", "graphic design"],
  "ዲዛይን": ["graphic design", "design"],

  // Excel & Data
  "excel": ["excel", "data analysis", "spreadsheet", "finance", "ኤክሰል"],
  "data": ["data analysis", "excel", "python", "ዳታ"],
  "accounting": ["excel", "finance", "accounting", "ሒሳብ"],
  "finance": ["excel", "accounting", "finance", "ፋይናንስ"],
  "ኤክሰል": ["excel", "data analysis", "ኤክሰል"],
  "ሒሳብ": ["accounting", "finance", "excel"],

  // AI & Tech
  "ai": ["ai", "chatgpt", "prompts", "technology", "ኤአይ"],
  "chatgpt": ["ai", "prompts", "automation", "ቻትጂፒቲ"],
  "ኤአይ": ["ai", "technology", "ቻትጂፒቲ"]
};

export interface SmartSearchResult {
  course: any;
  score: number;
  matchedReason?: string;
}

export function searchCourses(courses: any[], queryStr: string): any[] {
  if (!queryStr || !queryStr.trim()) return courses;

  const rawQuery = queryStr.trim().toLowerCase();
  const queryTokens = rawQuery.split(/\s+/);

  // Expand query with keyword map
  const expandedTerms: string[] = [...queryTokens];
  queryTokens.forEach(token => {
    Object.keys(KEYWORD_MAP).forEach(key => {
      if (key.includes(token) || token.includes(key)) {
        expandedTerms.push(...KEYWORD_MAP[key]);
      }
    });
  });

  const scoredResults: SmartSearchResult[] = courses.map(course => {
    let score = 0;
    let matchedReason = "";

    const title = (course.title || "").toLowerCase();
    const desc = (course.desc || "").toLowerCase();
    const category = (course.category || "").toLowerCase();
    const tags = Array.isArray(course.tags) ? course.tags.join(" ").toLowerCase() : "";
    const whatYouWillLearn = (course.whatYouWillLearn || []).join(" ").toLowerCase();

    // 1. Direct Title Exact/Includes Match
    if (title.includes(rawQuery)) {
      score += 100;
      matchedReason = "Title match";
    }

    // 2. Category Match
    if (category.includes(rawQuery)) {
      score += 80;
      matchedReason = matchedReason || "Category match";
    }

    // 3. Expanded Token Semantic Match
    expandedTerms.forEach(term => {
      if (title.includes(term)) {
        score += 50;
        matchedReason = matchedReason || `Related topic: ${term}`;
      } else if (category.includes(term)) {
        score += 40;
        matchedReason = matchedReason || `Related category: ${term}`;
      } else if (tags.includes(term)) {
        score += 30;
        matchedReason = matchedReason || `Matched tag: ${term}`;
      } else if (whatYouWillLearn.includes(term)) {
        score += 25;
        matchedReason = matchedReason || `Learning outcome match: ${term}`;
      } else if (desc.includes(term)) {
        score += 20;
      }
    });

    return { course: { ...course, matchedReason }, score };
  });

  // Filter out non-matching (score = 0) and sort by relevance score descending
  return scoredResults
    .filter(res => res.score > 0)
    .sort((a, b) => b.score - a.score)
    .map(res => res.course);
}
