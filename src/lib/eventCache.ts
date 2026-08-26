export interface TsehayEvent {
  id: string;
  slug: string; // e.g. "youtube-masterclass", "shein-ecommerce-seminar"
  title: string;
  titleEn?: string;
  description: string;
  date: string; // e.g. "2026-09-15" or "መስከረም 10, 2019"
  time: string; // e.g. "02:00 PM - 05:30 PM (ከቀኑ 8:00 - 11:30)"
  location: string; // e.g. "ቦሌ፣ አዲስ አበባ (Skylight Hotel)" or "Online Google Meet"
  isOnline: boolean;
  meetingLink?: string; // Google Meet URL (e.g. https://meet.google.com/tsehay-live)
  mapsUrl?: string; // Google Maps URL for in-person events
  capacity: number;
  registeredCount: number;
  price: number; // 0 for Free
  isFree?: boolean;
  speaker: string; // e.g. "ኢዮብ ሳህሌ (Eyoub Sahle)"
  speakerRole?: string; // e.g. "Founder & Lead Mentor"
  image: string;
  tags: string[];
  isFeatured?: boolean;
  status: 'upcoming' | 'ongoing' | 'completed' | 'sold_out';
  createdAt?: any;
}

export interface EventTicket {
  ticketId: string; // e.g. "TC-EVT-8F92-491A"
  eventId: string;
  eventSlug?: string;
  eventTitle: string;
  eventDate: string;
  eventTime: string;
  eventLocation: string;
  isOnline?: boolean;
  meetingLink?: string;
  mapsUrl?: string;
  attendeeName: string;
  attendeeEmail: string;
  attendeePhone?: string;
  userId: string;
  tier: 'VIP' | 'General Admission' | 'Free Pass' | 'VIP Pass';
  pricePaid: number;
  paymentMethod: string;
  qrCodeData: string;
  isUsed: boolean;
  usedAt?: string | null;
  issuedAt: string;
}

export function generateEventSlug(title: string, fallbackId?: string): string {
  if (!title) return fallbackId || `event-${Date.now().toString(36)}`;
  
  // Convert English parts or transliterated names
  let slug = title
    .toLowerCase()
    .replace(/[^\w\s-]/g, '') // remove special characters
    .trim()
    .replace(/\s+/g, '-'); // replace spaces with hyphens

  if (!slug || slug.length < 3) {
    slug = fallbackId ? fallbackId.replace(/^evt_/, '').replace(/_/g, '-') : `event-${Date.now().toString(36)}`;
  }
  return slug;
}

export const DEFAULT_EVENTS: TsehayEvent[] = [
  {
    id: "evt_youtube_masterclass_live",
    slug: "youtube-masterclass",
    title: "የዩቲዩብ ስኬት እና AI የቀጥታ ልዩ ወርክሾፕ (Live YouTube & AI Masterclass)",
    titleEn: "Live YouTube Mastery & AI Creation Workshop",
    description: "በአካል በመገኘት ፊት ሳያሳዩ (Faceless) በ AI በመታገዝ በወር ከ $1,000+ በላይ የሚያስገኙ የዩቲዩብ ቻናሎችን የመገንባት፣ የሞኒታይዜሽን እና የዶላር ገቢ ማውጫ የቀጥታ ተግባራዊ ስልጠና።",
    date: "መስከረም 10, 2019 (Sept 20, 2026)",
    time: "ከቀኑ 8:00 - 12:00 (02:00 PM - 06:00 PM)",
    location: "ቦሌ፣ አዲስ አበባ (Bole, Skylight Hotel Conference Hall)",
    isOnline: false,
    mapsUrl: "https://maps.google.com/?q=Ethiopian+Skylight+Hotel+Addis+Ababa",
    capacity: 120,
    registeredCount: 84,
    price: 1500,
    isFree: false,
    speaker: "ኢዮብ ሳህሌ (Eyoub Sahle)",
    speakerRole: "የፀሐይ ካምፓስ መስራች እና የዩቲዩብ ስፔሻሊስት",
    image: "https://images.unsplash.com/photo-1515187029135-18ee286d815b?q=80&w=1200",
    tags: ["YouTube", "AI Tools", "Faceless", "Monetization"],
    isFeatured: true,
    status: "upcoming"
  },
  {
    id: "evt_ecommerce_shein_bootcamp",
    slug: "shein-ecommerce-seminar",
    title: "የሼን እና ዓለም አቀፍ ኢምፖርት ቢዝነስ ሴሚናር (E-Commerce & Shein Import)",
    titleEn: "Shein Import & E-Commerce Live Seminar",
    description: "ከሼን እና ከአሊባባ በቀጥታ እቃዎችን በማስመጣት በኢትዮጵያ ውስጥ በከፍተኛ ትርፍ የመሸጥ፣ የካርጎ፣ የጉምሩክ እና የኦንላይን ካርድ ክፍያ ተግባራዊ አሰራር።",
    date: "መስከረም 25, 2019 (Oct 05, 2026)",
    time: "ከቀኑ 8:30 - 11:30 (02:30 PM - 05:30 PM)",
    location: "ቦሌ ሩዋንዳ፣ አዲስ አበባ (Tsehay Campus Main Hall)",
    isOnline: false,
    mapsUrl: "https://maps.google.com/?q=Bole+Rwanda+Addis+Ababa",
    capacity: 80,
    registeredCount: 52,
    price: 1200,
    isFree: false,
    speaker: "ኢዮብ ሳህሌ & የኢምፖርት ባለሙያዎች",
    speakerRole: "E-Commerce Consultants",
    image: "https://images.unsplash.com/photo-1472851294608-062f824d29cc?q=80&w=1200",
    tags: ["Shein", "Import", "TikTok Sales", "Business"],
    isFeatured: true,
    status: "upcoming"
  },
  {
    id: "evt_digital_marketing_free_webinar",
    slug: "free-digital-marketing-webinar",
    title: "የዲጂታል ማርኬቲንግ እና የማህበራዊ ሚዲያ ሽያጭ የቀጥታ ዌቢናር (Free Live Webinar)",
    titleEn: "Digital Marketing & Social Media Sales Masterclass",
    description: "በ Meta Ads (Facebook & Instagram) ማስታወቂያዎች ደንበኞችን የማብዛት እና የኦንላይን ገበያን የመቆጣጠር ነፃ የቀጥታ ስልጠና እና የጥያቄና መልስ መድረክ።",
    date: "ጥቅምት 02, 2019 (Oct 12, 2026)",
    time: "ምሽት 2:00 - 4:00 (08:00 PM - 10:00 PM)",
    location: "Online Google Meet (የቀጥታ ስብሰባ)",
    isOnline: true,
    meetingLink: "https://meet.google.com/tsehay-live-marketing",
    capacity: 500,
    registeredCount: 395,
    price: 0,
    isFree: true,
    speaker: "ኢዮብ ሳህሌ (Eyoub Sahle)",
    speakerRole: "Digital Marketing Strategist",
    image: "https://images.unsplash.com/photo-1542744173-8e7e53415bb0?q=80&w=1200",
    tags: ["Digital Marketing", "Meta Ads", "Free Webinar", "Google Meet"],
    isFeatured: true,
    status: "upcoming"
  }
];

export const EVENTS_CACHE_KEY = 'tsehay_events_cache';

export function getCachedEvents(): TsehayEvent[] {
  if (typeof window === 'undefined') return DEFAULT_EVENTS;
  try {
    const cached = localStorage.getItem(EVENTS_CACHE_KEY);
    if (cached) {
      const parsed = JSON.parse(cached);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (e) {
    console.warn("Events cache load error:", e);
  }
  return DEFAULT_EVENTS;
}

export function saveCachedEvents(events: TsehayEvent[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(EVENTS_CACHE_KEY, JSON.stringify(events));
  } catch (e) {
    console.warn("Events cache save error:", e);
  }
}

export function getEventBySlugOrId(slugOrId: string, eventsList: TsehayEvent[] = DEFAULT_EVENTS): TsehayEvent | null {
  if (!slugOrId) return null;
  const cleanKey = slugOrId.toLowerCase().trim();

  // 1. Direct slug or id match
  let found = eventsList.find(e => 
    (e.slug && e.slug.toLowerCase() === cleanKey) || 
    (e.id && e.id.toLowerCase() === cleanKey)
  );

  // 2. Fallback search in DEFAULT_EVENTS
  if (!found && eventsList !== DEFAULT_EVENTS) {
    found = DEFAULT_EVENTS.find(e => 
      (e.slug && e.slug.toLowerCase() === cleanKey) || 
      (e.id && e.id.toLowerCase() === cleanKey)
    );
  }

  // 3. Fallback partial slug search
  if (!found) {
    found = eventsList.find(e => 
      (e.slug && e.slug.includes(cleanKey)) || 
      (e.id && e.id.includes(cleanKey))
    );
  }

  return found || null;
}

export function getRemainingSeats(event: TsehayEvent): number {
  const cap = Number(event.capacity) || 100;
  const reg = Number(event.registeredCount) || 0;
  return Math.max(0, cap - reg);
}
