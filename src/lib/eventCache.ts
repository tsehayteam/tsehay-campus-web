export interface TsehayEvent {
  id: string;
  title: string;
  titleEn?: string;
  description: string;
  date: string; // e.g. "2026-09-15" or "ጳጉሜን 1, 2018"
  time: string; // e.g. "02:00 PM - 05:30 PM (ከቀኑ 8:00 - 11:30)"
  location: string; // e.g. "ቦሌ፣ አዲስ አበባ (Skylight Hotel / Hall B)" or "Live Virtual Stream"
  isOnline: boolean;
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
  eventTitle: string;
  eventDate: string;
  eventTime: string;
  eventLocation: string;
  attendeeName: string;
  attendeeEmail: string;
  attendeePhone?: string;
  userId: string;
  tier: 'VIP' | 'General Admission' | 'Free Pass';
  pricePaid: number;
  paymentMethod: string;
  qrCodeData: string;
  isUsed: boolean;
  usedAt?: string | null;
  issuedAt: string;
}

export const DEFAULT_EVENTS: TsehayEvent[] = [
  {
    id: "evt_youtube_masterclass_live",
    title: "የዩቲዩብ ስኬት እና AI የቀጥታ ልዩ ወርክሾፕ (Live YouTube & AI Masterclass)",
    titleEn: "Live YouTube Mastery & AI Creation Workshop",
    description: "በአካል በመገኘት ፊት ሳያሳዩ (Faceless) በ AI በመታገዝ በወር ከ $1,000+ በላይ የሚያስገኙ የዩቲዩብ ቻናሎችን የመገንባት፣ የሞኒታይዜሽን እና የዶላር ገቢ ማውጫ የቀጥታ ተግባራዊ ስልጠና።",
    date: "መስከረም 10, 2019 (Sept 20, 2026)",
    time: "ከቀኑ 8:00 - 12:00 (02:00 PM - 06:00 PM)",
    location: "ቦሌ፣ አዲስ አበባ (Bole, Skylight Hotel Conference Hall)",
    isOnline: false,
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
    title: "የሼን እና ዓለም አቀፍ ኢምፖርት ቢዝነስ ሴሚናር (E-Commerce & Shein Import)",
    titleEn: "Shein Import & E-Commerce Live Seminar",
    description: "ከሼን እና ከአሊባባ በቀጥታ እቃዎችን በማስመጣት በኢትዮጵያ ውስጥ በከፍተኛ ትርፍ የመሸጥ፣ የካርጎ፣ የጉምሩክ እና የኦንላይን ካርድ ክፍያ ተግባራዊ አሰራር።",
    date: "መስከረም 25, 2019 (Oct 05, 2026)",
    time: "ከቀኑ 8:30 - 11:30 (02:30 PM - 05:30 PM)",
    location: "ቦሌ ሩዋንዳ፣ አዲስ አበባ (Tsehay Campus Main Hall)",
    isOnline: false,
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
    title: "የዲጂታል ማርኬቲንግ እና የማህበራዊ ሚዲያ ሽያጭ የቀጥታ ዌቢናር (Free Live Webinar)",
    titleEn: "Digital Marketing & Social Media Sales Masterclass",
    description: "በ Meta Ads (Facebook & Instagram) ማስታወቂያዎች ደንበኞችን የማብዛት እና የኦንላይን ገበያን የመቆጣጠር ነፃ የቀጥታ ስልጠና እና የጥያቄና መልስ መድረክ።",
    date: "ጥቅምት 02, 2019 (Oct 12, 2026)",
    time: "ምሽት 2:00 - 4:00 (08:00 PM - 10:00 PM)",
    location: "Live Virtual Stream (Zoom & Tsehay Campus Live)",
    isOnline: true,
    capacity: 500,
    registeredCount: 395,
    price: 0,
    isFree: true,
    speaker: "ኢዮብ ሳህሌ (Eyoub Sahle)",
    speakerRole: "Digital Marketing Strategist",
    image: "https://images.unsplash.com/photo-1542744173-8e7e53415bb0?q=80&w=1200",
    tags: ["Digital Marketing", "Meta Ads", "Free Webinar"],
    isFeatured: false,
    status: "upcoming"
  }
];

export function getCachedEvents(): TsehayEvent[] {
  if (typeof window === 'undefined') return DEFAULT_EVENTS;
  try {
    const cached = localStorage.getItem('tsehay_events_cache');
    if (cached) {
      const parsed = JSON.parse(cached);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (e) {}
  return DEFAULT_EVENTS;
}

export function saveCachedEvents(events: TsehayEvent[]) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem('tsehay_events_cache', JSON.stringify(events));
  } catch (e) {}
}

export function getRemainingSeats(event: TsehayEvent): number {
  return Math.max(0, (event.capacity || 100) - (event.registeredCount || 0));
}
