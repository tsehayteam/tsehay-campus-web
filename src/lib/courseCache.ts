export const DEFAULT_COURSES = [
  {
    id: "shein-import-mastery",
    title: "የሺን ኢምፖርት ቢዝነስ ስልጠና (Shein Import Business)",
    description: "ከሺን እቃዎችን በአነስተኛ ካፒታል አስመጥተው በሀገር ውስጥ ትርፋማ የሚሆኑበት የተሟላ የተግባር ስልጠና።",
    price: 4500,
    category: "Paid",
    image: "https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=800&q=80",
    students: 1240,
    rating: 4.9,
    modulesCount: 8,
    isPopular: true
  },
  {
    id: "digital-marketing-pro",
    title: "የዲጂታል ማርኬቲንግ እና ሶሻል ሚዲያ ቢዝነስ",
    description: "በፌስቡክ፣ ቴሌግራም እና ቲክቶክ ምርቶችንና አገልግሎቶችን በማስተዋወቅ ከፍተኛ ገቢ የሚያገኙበት መንገድ።",
    price: 4500,
    category: "Paid",
    image: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=800&q=80",
    students: 980,
    rating: 4.8,
    modulesCount: 7,
    isPopular: true
  },
  {
    id: "web-development-bootcamp",
    title: "የዌብሳይት እና ሶፍትዌር ዴቨሎፕመንት (Full-Stack)",
    description: "ከዜሮ ተነስተው ዘመናዊ ዌብሳይቶችን እና አፕሊኬሽኖችን የመገንባት ሙያዊ ክህሎት።",
    price: 4500,
    category: "Paid",
    image: "https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=800&q=80",
    students: 850,
    rating: 4.9,
    modulesCount: 10
  },
  {
    id: "crypto-finance-mastery",
    title: "የክሪፕቶ ከረንሲ እና የፋይናንስ ኤክስፐርት ስልጠና",
    description: "በክሪፕቶ ማርኬት እና ዲጂታል አሴቶች ላይ በጥንቃቄና በዕውቀት ኢንቨስት የማድረግና የመነገድ መንገድ።",
    price: 4500,
    category: "Paid",
    image: "https://images.unsplash.com/photo-1621416894569-0f39ed31d247?auto=format&fit=crop&w=800&q=80",
    students: 760,
    rating: 4.7,
    modulesCount: 6
  },
  {
    id: "free-shein-starter",
    title: "የነፃ ሺን ቢዝነስ መግቢያ ስልጠና (Free Starter)",
    description: "የሺን ቢዝነስ እንዴት እንደሚሰራ አጠቃላይ መግቢያ እና የመጀመሪያ ደረጃ መመሪያዎች።",
    price: 0,
    isFree: true,
    category: "Free",
    image: "https://images.unsplash.com/photo-1472851294608-062f824d29cc?auto=format&fit=crop&w=800&q=80",
    students: 2350,
    rating: 4.9,
    modulesCount: 3
  }
];

export function getCachedCourses(): any[] {
  if (typeof window === 'undefined') return DEFAULT_COURSES;
  try {
    const cached = localStorage.getItem('tsehay_courses_cache');
    if (cached) {
      const parsed = JSON.parse(cached);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
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
    localStorage.setItem('tsehay_courses_cache', JSON.stringify(courses));
  } catch (err) {
    console.warn("Course cache save error:", err);
  }
}
