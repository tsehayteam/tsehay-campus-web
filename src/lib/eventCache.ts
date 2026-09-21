import { getMediaThumbnail } from './videoParser';

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
  seatCapacity?: number;
  registeredCount: number;
  registered_count?: number;
  availableSeats?: number;
  remainingSeats?: number;
  seatsLeft?: number;
  availableTickets?: number;
  price: number; // 0 for Free
  isFree?: boolean;
  speaker: string; // e.g. "ኢዮብ ሳህሌ (Eyoub Sahle)"
  speakerRole?: string; // e.g. "Founder & Lead Mentor"
  speakerBio?: string; // Short biography and career highlights
  speakerImage?: string; // Instructor photo URL / avatar
  image: string;
  eventImage?: string;
  videoUrl?: string;
  tags: string[];
  isFeatured?: boolean;
  status: 'upcoming' | 'ongoing' | 'completed' | 'sold_out' | 'active' | 'published' | 'inactive' | 'passed' | 'expired';
  createdAt?: any;
  updatedAt?: any;
}

export interface EventTicket {
  ticketId: string; // e.g. "TC-EVT-8F92-491A"
  id?: string;
  eventId: string;
  eventSlug?: string;
  eventTitle: string;
  eventImage?: string;
  image?: string;
  eventDate: string;
  eventTime: string;
  eventLocation: string;
  isOnline?: boolean;
  meetingLink?: string;
  mapsUrl?: string;
  attendeeName: string;
  attendeeEmail: string;
  attendeePhone?: string;
  name?: string;
  fullName?: string;
  email?: string;
  phone?: string;
  userId: string;
  tier: 'VIP' | 'General Admission' | 'Free Pass' | 'VIP Pass' | string;
  pricePaid: number;
  price?: number;
  paymentMethod: string;
  qrCodeData: string;
  isUsed: boolean;
  checkedIn?: boolean;
  usedAt?: string | null;
  issuedAt: string;
  createdAt?: any;
  status?: string;
  verifiedBy?: string | null;
  [key: string]: any;
}

export const DEFAULT_EVENT_BANNER = 'https://images.unsplash.com/photo-1515187029135-18ee286d815b?q=80&w=1200';

export function formatDriveImageUrl(url: any): string {
  if (!url || typeof url !== 'string') return '';
  const clean = url.trim();
  if (!clean) return '';
  if (clean.startsWith('data:image/') || clean.startsWith('blob:')) {
    return clean;
  }
  return getMediaThumbnail(clean, clean);
}

export function formatEventBannerUrl(url: any, fallback: string = DEFAULT_EVENT_BANNER): string {
  if (!url || typeof url !== 'string') return fallback;
  const clean = url.trim();
  if (!clean) return fallback;
  if (clean.startsWith('data:image/') || clean.startsWith('blob:')) {
    return clean;
  }
  const formatted = formatDriveImageUrl(clean);
  return formatted || fallback;
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

/**
 * Parses any event date & time string into a valid JavaScript Date object.
 * Handles:
 * - Dates with English in parentheses: "መስከረም 10, 2019 (Sept 20, 2026)"
 * - Standard Gregorian / ISO dates: "2026-09-20", "Sept 20, 2026"
 * - Amharic Ethiopian calendar dates: "መስከረም 10, 2019", "ጥቅምት 15, 2017"
 * - End time from time strings: "ከቀኑ 8:00 - 12:00 (02:00 PM - 06:00 PM)"
 */
export function parseEventDate(rawDate?: string, rawTime?: string): Date | null {
  if (!rawDate || typeof rawDate !== 'string') return null;
  const trimmedDate = rawDate.trim();
  if (!trimmedDate) return null;

  let parsed: Date | null = null;

  // 1. Check if there's an English date inside parentheses e.g. "(Sept 20, 2026)" or "(Oct 05, 2026)"
  const parenMatch = trimmedDate.match(/\(([^)]+)\)/);
  if (parenMatch && parenMatch[1]) {
    const candidate = parenMatch[1].trim();
    const d = new Date(candidate);
    if (!isNaN(d.getTime())) {
      parsed = d;
    }
  }

  // 2. Direct Date.parse for ISO or standard date formats
  if (!parsed) {
    const d = new Date(trimmedDate);
    if (!isNaN(d.getTime())) {
      parsed = d;
    }
  }

  // 3. Search for English month names within the string (e.g. "Sept 20, 2026" or "20 Sept 2026")
  if (!parsed) {
    const monthRegex = /(Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:t(?:ember)?)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+(\d{1,2})(?:st|nd|rd|th)?,?\s*(\d{4})/i;
    const match = trimmedDate.match(monthRegex);
    if (match) {
      const monthStr = match[1];
      const dayStr = match[2];
      const yearStr = match[3];
      const d = new Date(`${monthStr} ${dayStr}, ${yearStr}`);
      if (!isNaN(d.getTime())) {
        parsed = d;
      }
    }
  }

  // 4. Handle Amharic Ethiopian Calendar dates (e.g. "መስከረም 10, 2019" or "ጥቅምት 15, 2017")
  if (!parsed) {
    const amharicMonths: Record<string, { baseDay: number; baseMonth: number }> = {
      'መስከረም': { baseDay: 11, baseMonth: 8 },  // September
      'ጥቅምት': { baseDay: 11, baseMonth: 9 },   // October
      'ኅዳር': { baseDay: 10, baseMonth: 10 },   // November
      'ህዳር': { baseDay: 10, baseMonth: 10 },
      'ታኅሣሥ': { baseDay: 10, baseMonth: 11 }, // December
      'ታህሳስ': { baseDay: 10, baseMonth: 11 },
      'ጥር': { baseDay: 9, baseMonth: 0 },       // January
      'የካቲት': { baseDay: 8, baseMonth: 1 },    // February
      'መጋቢት': { baseDay: 10, baseMonth: 2 },   // March
      'ሚያዝያ': { baseDay: 9, baseMonth: 3 },     // April
      'ግንቦት': { baseDay: 9, baseMonth: 4 },     // May
      'ሰኔ': { baseDay: 8, baseMonth: 5 },       // June
      'ሐምሌ': { baseDay: 8, baseMonth: 6 },      // July
      'ሀምሌ': { baseDay: 8, baseMonth: 6 },
      'ነሐሴ': { baseDay: 7, baseMonth: 7 },      // August
      'ነሀሴ': { baseDay: 7, baseMonth: 7 },
      'ጳጉሜን': { baseDay: 6, baseMonth: 8 },    // September
      'ጳጉሜ': { baseDay: 6, baseMonth: 8 }
    };

    for (const [mName, mInfo] of Object.entries(amharicMonths)) {
      if (trimmedDate.includes(mName)) {
        const dayMatch = trimmedDate.match(new RegExp(`${mName}\\s*(\\d{1,2})`));
        const yearMatch = trimmedDate.match(/(\d{4})/);
        const day = dayMatch ? parseInt(dayMatch[1], 10) : 1;
        const ethYear = yearMatch ? parseInt(yearMatch[1], 10) : 2017;
        const gregYear = ethYear < 2020 ? (mInfo.baseMonth >= 8 ? ethYear + 7 : ethYear + 8) : ethYear;
        const approxDate = new Date(gregYear, mInfo.baseMonth, mInfo.baseDay + (day - 1));
        if (!isNaN(approxDate.getTime())) {
          parsed = approxDate;
          break;
        }
      }
    }
  }

  if (!parsed) return null;

  // Extract end time or start time if rawTime is available
  if (rawTime && typeof rawTime === 'string') {
    const timeClean = rawTime.trim();
    const times = Array.from(timeClean.matchAll(/(\d{1,2})(?::(\d{2}))?\s*(AM|PM)?/gi));
    if (times.length > 0) {
      // Pick last time in string (i.e. event end time) so event stays active until it concludes
      const targetMatch = times[times.length - 1];
      let hours = parseInt(targetMatch[1], 10);
      const minutes = targetMatch[2] ? parseInt(targetMatch[2], 10) : 0;
      const meridiem = targetMatch[3]?.toUpperCase();

      if (meridiem === 'PM' && hours < 12) hours += 12;
      if (meridiem === 'AM' && hours === 12) hours = 0;

      parsed.setHours(hours, minutes, 0, 0);
      return parsed;
    }
  }

  // If no specific time found, set to end of day (23:59:59) so the event is active during its day
  parsed.setHours(23, 59, 59, 999);
  return parsed;
}

/**
 * Automatically determines whether an event has passed by comparing eventDate & eventTime with new Date().
 */
export function isEventPassed(eventOrDate: any, rawTime?: string): boolean {
  if (!eventOrDate) return false;

  // If status is explicitly set to passed / completed / expired
  if (typeof eventOrDate === 'object') {
    const st = (eventOrDate.status || '').toLowerCase().trim();
    if (st === 'passed' || st === 'completed' || st === 'expired') {
      return true;
    }
  }

  const dateStr = typeof eventOrDate === 'string'
    ? eventOrDate
    : (eventOrDate.eventDate || eventOrDate.event_date || eventOrDate.date || '');

  const timeStr = rawTime || (typeof eventOrDate === 'object'
    ? (eventOrDate.eventTime || eventOrDate.event_time || eventOrDate.time || '')
    : '');

  const eventDateObj = parseEventDate(dateStr, timeStr);
  if (!eventDateObj) return false;

  return eventDateObj.getTime() < Date.now();
}

/**
 * Returns the effective status of the event ('passed' | 'sold_out' | 'upcoming' | etc.)
 */
export function getEventEffectiveStatus(event: TsehayEvent | any): string {
  if (!event) return 'upcoming';
  if (isEventPassed(event)) return 'passed';
  if (event.status === 'sold_out' || getRemainingSeats(event) <= 0) return 'sold_out';
  return event.status || 'upcoming';
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
    remainingSeats: 36,
    price: 1500,
    isFree: false,
    speaker: "ኢዮብ ሳህሌ (Eyoub Sahle)",
    speakerRole: "የፀሐይ ካምፓስ መስራች እና የዩቲዩብ ስፔሻሊስት",
    speakerBio: "ኢዮብ ሳህሌ በዲጂታል ማርኬቲንግ፣ በይዘት ፈጠራ እና በኦንላይን ንግድ ዘርፍ ከ 7+ ዓመታት በላይ ልምድ ያለው ሲሆን፤ በሺዎች የሚቆጠሩ ኢትዮጵያውያን ወጣቶችንና ድርጅቶችን በዩቲዩብ እና በ AI ቴክኖሎጂ ውጤታማ እንዲሆኑ ያሰለጠነ የዘርፉ ግንባር ቀደም አሰልጣኝ ነው።",
    speakerImage: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=600",
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
    remainingSeats: 28,
    price: 1200,
    isFree: false,
    speaker: "ኢዮብ ሳህሌ & የኢምፖርት ባለሙያዎች",
    speakerRole: "E-Commerce & Import Consultants",
    speakerBio: "የዓለም አቀፍ ግብይት እና የኢ-ኮሜርስ አማካሪዎች ቡድን፤ ከቻይና እና ከቱርክ በቀጥታ ወደ ኢትዮጵያ እቃዎችን በማስመጣት፣ በቴሌግራም እና በቲክቶክ ላይ በስፋት በመሸጥ ከፍተኛ የገበያ ተሞክሮ ያካበቱ ባለሙያዎች።",
    speakerImage: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=600",
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
    remainingSeats: 105,
    price: 0,
    isFree: true,
    speaker: "ኢዮብ ሳህሌ (Eyoub Sahle)",
    speakerRole: "Digital Marketer & Strategist",
    speakerBio: "በፌስቡክ እና ኢንስታግራም ማስታወቂያዎች (Meta Ads) ከፍተኛ ሽያጭ በማመንጨት እና ብራንዶችን በመገንባት የተካነ፤ ለተለያዩ ታዋቂ ድርጅቶች ዲጂታል ካምፔይኖችን የመራ የማርኬቲንግ ስትራቴጂስት።",
    speakerImage: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=600",
    image: "https://images.unsplash.com/photo-1542744173-8e7e53415bb0?q=80&w=1200",
    tags: ["Digital Marketing", "Meta Ads", "Free Webinar", "Google Meet"],
    isFeatured: true,
    status: "upcoming"
  }
];

export const EVENTS_CACHE_KEY = 'tsehay_events_cache';
export const DELETED_EVENTS_KEY = 'tsehay_deleted_events';

export function getDeletedEventIds(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(DELETED_EVENTS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed.map(s => String(s).trim().toLowerCase()).filter(Boolean);
      }
    }
  } catch (e) {}
  return [];
}

export function recordDeletedEventId(idOrSlug: string): void {
  if (typeof window === 'undefined' || !idOrSlug) return;
  try {
    const clean = idOrSlug.trim().toLowerCase();
    if (!clean) return;
    const current = getDeletedEventIds();
    if (!current.includes(clean)) {
      current.push(clean);
      localStorage.setItem(DELETED_EVENTS_KEY, JSON.stringify(current));
    }
  } catch (e) {}
}

export function isEventDeleted(eventOrId: TsehayEvent | string): boolean {
  const deletedIds = getDeletedEventIds();
  if (deletedIds.length === 0) return false;

  if (typeof eventOrId === 'string') {
    const clean = eventOrId.trim().toLowerCase();
    return deletedIds.includes(clean);
  }

  const idMatch = eventOrId.id ? deletedIds.includes(eventOrId.id.trim().toLowerCase()) : false;
  const slugMatch = eventOrId.slug ? deletedIds.includes(eventOrId.slug.trim().toLowerCase()) : false;
  return idMatch || slugMatch;
}

export function getCachedEvents(): TsehayEvent[] {
  if (typeof window === 'undefined') return DEFAULT_EVENTS;
  const deletedIds = getDeletedEventIds();
  const isDeleted = (e: TsehayEvent) => {
    if (deletedIds.length === 0) return false;
    const cleanId = (e.id || '').trim().toLowerCase();
    const cleanSlug = (e.slug || '').trim().toLowerCase();
    return (cleanId && deletedIds.includes(cleanId)) || (cleanSlug && deletedIds.includes(cleanSlug));
  };

  try {
    const cached = localStorage.getItem(EVENTS_CACHE_KEY);
    if (cached !== null) {
      const parsed = JSON.parse(cached);
      if (Array.isArray(parsed)) {
        return parsed
          .filter(e => !isDeleted(e))
          .map((e: any) => ({
            ...e,
            image: formatDriveImageUrl(e.image) || e.image
          }));
      }
    }
  } catch (e) {
    console.warn("Events cache load error:", e);
  }
  return DEFAULT_EVENTS.filter(e => !isDeleted(e));
}

export function saveCachedEvents(events: TsehayEvent[]): void {
  if (typeof window === 'undefined') return;
  const deletedIds = getDeletedEventIds();
  const isDeleted = (e: TsehayEvent) => {
    if (deletedIds.length === 0) return false;
    const cleanId = (e.id || '').trim().toLowerCase();
    const cleanSlug = (e.slug || '').trim().toLowerCase();
    return (cleanId && deletedIds.includes(cleanId)) || (cleanSlug && deletedIds.includes(cleanSlug));
  };

  try {
    const sanitized = events
      .filter(e => !isDeleted(e))
      .map(e => ({
        ...e,
        image: formatDriveImageUrl(e.image) || e.image
      }));
    localStorage.setItem(EVENTS_CACHE_KEY, JSON.stringify(sanitized));
  } catch (e) {
    console.warn("Events cache save error:", e);
  }
}

export function getEventBySlugOrId(slugOrId: string, eventsList: TsehayEvent[] = DEFAULT_EVENTS): TsehayEvent | null {
  if (!slugOrId) return null;
  const cleanKey = slugOrId.toLowerCase().trim();

  // Check if target was permanently deleted
  const deletedIds = getDeletedEventIds();
  if (deletedIds.includes(cleanKey)) {
    return null;
  }

  const isDeleted = (e: TsehayEvent) => {
    if (deletedIds.length === 0) return false;
    const cleanId = (e.id || '').trim().toLowerCase();
    const cleanSlug = (e.slug || '').trim().toLowerCase();
    return (cleanId && deletedIds.includes(cleanId)) || (cleanSlug && deletedIds.includes(cleanSlug));
  };

  // 1. Direct slug or id match
  let found = eventsList.find(e => 
    !isDeleted(e) && (
      (e.slug && e.slug.toLowerCase() === cleanKey) || 
      (e.id && e.id.toLowerCase() === cleanKey)
    )
  );

  // 2. Fallback search in DEFAULT_EVENTS
  if (!found && eventsList !== DEFAULT_EVENTS) {
    found = DEFAULT_EVENTS.find(e => 
      !isDeleted(e) && (
        (e.slug && e.slug.toLowerCase() === cleanKey) || 
        (e.id && e.id.toLowerCase() === cleanKey)
      )
    );
  }

  // 3. Fallback partial slug search
  if (!found) {
    found = eventsList.find(e => 
      !isDeleted(e) && (
        (e.slug && e.slug.toLowerCase().includes(cleanKey)) || 
        (e.id && e.id.toLowerCase().includes(cleanKey))
      )
    );
  }

  return found || null;
}

export function getRemainingSeats(event: TsehayEvent): number {
  if (!event) return 0;
  if (event.remainingSeats !== undefined && typeof event.remainingSeats === 'number') {
    return Math.max(0, event.remainingSeats);
  }
  if (event.seatsLeft !== undefined && typeof event.seatsLeft === 'number') {
    return Math.max(0, event.seatsLeft);
  }
  if (event.availableTickets !== undefined && typeof event.availableTickets === 'number') {
    return Math.max(0, event.availableTickets);
  }
  const cap = Number(event.capacity) || 100;
  const reg = Number(event.registeredCount) || 0;
  return Math.max(0, cap - reg);
}

export const USER_TICKETS_CACHE_KEY = 'tsehay_user_event_tickets';

export function getUserTicketsCacheKey(userId?: string | null): string | null {
  if (!userId) return null;
  const clean = userId.trim();
  if (!clean || clean.startsWith('guest_') || clean.startsWith('anon_')) return null;
  return `${USER_TICKETS_CACHE_KEY}_${clean}`;
}

export function getCachedUserTickets(userId?: string | null): Record<string, EventTicket> {
  if (typeof window === 'undefined' || !userId) return {};
  const cacheKey = getUserTicketsCacheKey(userId);
  if (!cacheKey) return {};
  try {
    const raw = localStorage.getItem(cacheKey);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (e) {}
  return {};
}

export function saveCachedUserTicket(ticket: EventTicket, userId?: string | null): void {
  if (typeof window === 'undefined' || !ticket) return;
  const effectiveUserId = userId || ticket.userId;
  const cacheKey = getUserTicketsCacheKey(effectiveUserId);
  if (!cacheKey) return;
  try {
    const existing = getCachedUserTickets(effectiveUserId);
    const eventKey = ticket.eventId || ticket.eventSlug || ticket.ticketId;
    existing[eventKey] = ticket;
    if (ticket.eventId) existing[ticket.eventId] = ticket;
    if (ticket.eventSlug) existing[ticket.eventSlug] = ticket;
    localStorage.setItem(cacheKey, JSON.stringify(existing));
    window.dispatchEvent(new CustomEvent('tsehay_user_ticket_saved', { detail: { ticket, userId: effectiveUserId } }));
  } catch (e) {}
}

export function clearCachedUserTickets(userId?: string | null): void {
  if (typeof window === 'undefined') return;
  if (userId) {
    const key = getUserTicketsCacheKey(userId);
    if (key) localStorage.removeItem(key);
  }
  // Clear any legacy un-scoped key
  try {
    localStorage.removeItem(USER_TICKETS_CACHE_KEY);
  } catch (e) {}
}

/**
 * 🪑 Deduct Available Seats (በአካል የመጡ ተሳታፊዎችን መዝግብ / ክፍት መቀመጫ ቀንስ)
 * Deducting available seats increases registeredCount atomically:
 * availableSeats = Math.max(0, capacity - (currentRegistered + countToDeduct))
 */
export async function deductAvailableSeats(
  eventId: string, 
  countToDeduct: number, 
  options?: { mode?: 'deduct' | 'release'; note?: string }
): Promise<{ success: boolean; event?: any; error?: string; availableSeats?: number; newRegisteredCount?: number }> {
  try {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (typeof window !== 'undefined') {
      const token = sessionStorage.getItem('tc_admin_session') ||
                    sessionStorage.getItem('tsehay_admin_2fa_token') ||
                    localStorage.getItem('tc_admin_session') ||
                    '';
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
        headers['x-admin-token'] = token;
      }
    }

    const res = await fetch('/api/events/adjust-seats', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        eventId,
        countToDeduct,
        mode: options?.mode || 'deduct',
        note: options?.note || 'Admin manual offline seat deduction'
      })
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Failed to deduct seats');
    }

    if (typeof window !== 'undefined' && data.event) {
      try {
        const cached = localStorage.getItem('tsehay_events_cache');
        if (cached) {
          const list = JSON.parse(cached);
          if (Array.isArray(list)) {
            const updated = list.map((ev: any) => (ev.id === eventId || ev.slug === eventId) ? { ...ev, ...data.event } : ev);
            localStorage.setItem('tsehay_events_cache', JSON.stringify(updated));
          }
        }
        window.dispatchEvent(new CustomEvent('tsehay_events_updated', { detail: { event: data.event } }));
        if (typeof BroadcastChannel !== 'undefined') {
          const bc = new BroadcastChannel('tsehay_events_sync');
          bc.postMessage({ type: 'SEATS_ADJUSTED', eventId, event: data.event });
          setTimeout(() => bc.close(), 300);
        }
      } catch (e) {}
    }

    return { 
      success: true, 
      event: data.event, 
      availableSeats: data.availableSeats, 
      newRegisteredCount: data.newRegisteredCount || data.newCount 
    };
  } catch (error: any) {
    console.error('Failed to deduct seats:', error);
    return { success: false, error: error.message };
  }
}

