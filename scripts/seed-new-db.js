const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://jzxgmikliwilyfpixskm.supabase.co';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_ig2RLPUObPyPFDvO75IE2A_AHwlgzQU';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const COURSES = [
  {
    id: "shein-import-business",
    slug: "shein-import-business",
    title: "የሼን (Shein) እና ዓለም አቀፍ ንግድ ስልጠና",
    title_en: "Shein & Global Import Business Masterclass",
    desc: "ከሼን (Shein) እና ከቻይና በቀጥታ እቃዎችን በህጋዊ እና በአነስተኛ ወጪ አስመጥተው በኢትዮጵያ ውስጥ ከፍተኛ ትርፍ የሚያገኙበት የተሟላ የተግባር ስልጠና።",
    description: "ከሼን (Shein) እና ከቻይና በቀጥታ እቃዎችን በህጋዊ እና በአነስተኛ ወጪ አስመጥተው በኢትዮጵያ ውስጥ ከፍተኛ ትርፍ የሚያገኙበት የተሟላ የተግባር ስልጠና።",
    price: 4500,
    old_price: 9000,
    instructor: "Eyoub Sahle",
    instructor_name: "Eyoub Sahle",
    instructor_image: "/assets/eyob_new.png",
    image: "/assets/course_shein_business.jpg",
    banner: "/assets/course_shein_business.jpg",
    video: "https://www.youtube.com/watch?v=mgdOMtW6J8k",
    duration: "4 ሳምንት (16 ሰዓታት)",
    level: "የመጀመሪያ እና መካከለኛ ደረጃ",
    category: "Business",
    rating: 5.0,
    students_count: 850,
    status: "Active",
    is_published: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: "youtube-secrets-masterclass",
    slug: "youtube-secrets-masterclass",
    title: "የዩቲዩብ ሚስጥሮች ማስተርክላስ (YouTube Secrets Masterclass)",
    title_en: "YouTube Secrets Masterclass",
    desc: "ከዜሮ ተነስተው ስኬታማ የዩቲዩብ ቻናል በመክፈት በየወሩ በዶላር ተከፋይ የሚሆኑበትን ምስጢር ይማሩ። ያለ ፊት ገጽታ (Faceless) ቪዲዮዎችን በ AI የማዘጋጀት ጥበብ።",
    description: "ከዜሮ ተነስተው ስኬታማ የዩቲዩብ ቻናል በመክፈት በየወሩ በዶላር ተከፋይ የሚሆኑበትን ምስጢር ይማሩ። ያለ ፊት ገጽታ (Faceless) ቪዲዮዎችን በ AI የማዘጋጀት ጥበብ።",
    price: 600,
    old_price: 1500,
    instructor: "Eyoub Sahle",
    instructor_name: "Eyoub Sahle",
    instructor_image: "/assets/eyob_new.png",
    image: "/assets/course_youtube_secrets.jpg",
    banner: "/assets/course_youtube_secrets.jpg",
    video: "https://www.youtube.com/watch?v=mgdOMtW6J8k",
    duration: "3 ሳምንት (12 ሰዓታት)",
    level: "ለሁሉም ደረጃ የሚሆን",
    category: "Content Creation",
    rating: 4.9,
    students_count: 420,
    status: "Active",
    is_published: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: "free-digital-marketing",
    slug: "free-digital-marketing",
    title: "ዲጂታል ማርኬቲንግ ለጀማሪዎች (Digital Marketing Masterclass)",
    title_en: "Digital Marketing for Beginners",
    desc: "የኦንላይን ንግድዎን ለማሳደግ እና ምርትና አገልግሎትዎን በሶሻል ሚዲያ በስፋት ለማስተዋወቅ የሚረዱ ዘመናዊ የዲጂታል ማርኬቲንግ ስልቶች።",
    description: "የኦንላይን ንግድዎን ለማሳደግ እና ምርትና አገልግሎትዎን በሶሻል ሚዲያ በስፋት ለማስተዋወቅ የሚረዱ ዘመናዊ የዲጂታል ማርኬቲንግ ስልቶች።",
    price: 0,
    old_price: null,
    instructor: "Eyoub Sahle",
    instructor_name: "Eyoub Sahle",
    instructor_image: "/assets/eyob_new.png",
    image: "/assets/course_digital_marketing.jpg",
    banner: "/assets/course_digital_marketing.jpg",
    video: "https://www.youtube.com/watch?v=mgdOMtW6J8k",
    duration: "2 ሳምንት (8 ሰዓታት)",
    level: "የመጀመሪያ ደረጃ",
    category: "Marketing",
    rating: 4.8,
    students_count: 1200,
    status: "Active",
    is_published: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }
];

async function seed() {
  console.log(`Connecting to ${SUPABASE_URL}...`);
  for (const course of COURSES) {
    const { error } = await supabase.from('courses').upsert(course);
    if (error) {
      console.error(`Error saving ${course.id}:`, error.message);
    } else {
      console.log(`✓ Seeded: ${course.title} (${course.price} ETB)`);
    }
  }
  console.log('Seeding completed!');
}

seed();
