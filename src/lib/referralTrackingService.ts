/**
 * 🌟 ALX Africa-Style Affiliate & Referral Growth Engine Service
 * Tsehay Campus (ፀሐይ ካምፓስ)
 */

export interface ReferralRewardMilestone {
  requiredCount: number;
  titleAm: string;
  titleEn: string;
  descriptionAm: string;
  badge: string;
  type: 'free_course' | 'mentorship';
}

export const REFERRAL_MILESTONES: ReferralRewardMilestone[] = [
  {
    requiredCount: 5,
    titleAm: '1 ነፃ ኮርስ (1 Free Course)',
    titleEn: '1 Free Course',
    descriptionAm: '5 ጓደኞችዎን ሲጋብዙ የመረጡትን 1 ፕሪሚየም ኮርስ በነፃ ያገኛሉ!',
    badge: '🎁 5 Invites',
    type: 'free_course'
  },
  {
    requiredCount: 10,
    titleAm: 'ነፃ የግል ማማከር (Free 1-on-1 Mentorship)',
    titleEn: 'Free 1-on-1 Mentorship',
    descriptionAm: '10 ጓደኞችዎን ሲጋብዙ ከኢዮብ ሳህሌ ጋር የ 1 ሰዓት የግል የቢዝነስ እና የዩቲዩብ ማማከር ያገኛሉ!',
    badge: '🚀 10 Invites',
    type: 'mentorship'
  }
];

const REFERRER_STORAGE_KEY = 'tsehay_referred_by_uid';

/**
 * Capture referral query parameter from URL and store in local/session storage
 */
export function captureReferralParam(rawRef?: string | null): string | null {
  if (typeof window === 'undefined') return null;

  let refUid = rawRef;
  if (!refUid) {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      refUid = urlParams.get('ref') || urlParams.get('referrer') || urlParams.get('referral');
    } catch (e) {}
  }

  if (refUid && typeof refUid === 'string' && refUid.trim().length >= 3) {
    const cleanRef = refUid.trim();
    try {
      localStorage.setItem(REFERRER_STORAGE_KEY, cleanRef);
      sessionStorage.setItem(REFERRER_STORAGE_KEY, cleanRef);
    } catch (e) {}
    return cleanRef;
  }

  return getStoredReferrerUid();
}

/**
 * Get the stored referrer UID if any
 */
export function getStoredReferrerUid(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return sessionStorage.getItem(REFERRER_STORAGE_KEY) || localStorage.getItem(REFERRER_STORAGE_KEY) || null;
  } catch (e) {
    return null;
  }
}

/**
 * Clear stored referrer UID after successful registration credit
 */
export function clearStoredReferrerUid() {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.removeItem(REFERRER_STORAGE_KEY);
    localStorage.removeItem(REFERRER_STORAGE_KEY);
  } catch (e) {}
}

/**
 * Generate unique referral link for a user
 */
export function generateReferralLink(userUid: string): string {
  if (typeof window !== 'undefined' && window.location.origin) {
    return `${window.location.origin}?ref=${encodeURIComponent(userUid)}`;
  }
  return `https://www.tsehaycampus.com?ref=${encodeURIComponent(userUid)}`;
}

/**
 * Generate share message and quick social links
 */
export function getReferralShareData(userUid: string, userName?: string) {
  const link = generateReferralLink(userUid);
  const studentName = userName ? userName : 'እኔ';
  
  const title = 'Tsehay Campus - ፀሐይ ካምፓስ';
  const text = `👋 ሰላም! ${studentName} ነኝ። በፀሐይ ካምፓስ (Tsehay Campus) ምርጥ የቴክኖሎጂ፣ የዲጂታል ማርኬቲንግ እና የዩቲዩብ ስልጠናዎችን እየተማርኩ ነው። እርስዎም በዚህ ሊንክ ተመዝግበው የነፃ እና ፕሪሚየም ኮርሶችን ያግኙ👇\n${link}`;

  const encodedText = encodeURIComponent(text);
  const encodedUrl = encodeURIComponent(link);

  return {
    link,
    title,
    text,
    telegramUrl: `https://t.me/share/url?url=${encodedUrl}&text=${encodeURIComponent(`👋 ሰላም! በፀሐይ ካምፓስ (Tsehay Campus) ምርጥ የዲጂታል ክህሎቶችን ይማሩ። በዚህ ሊንክ አሁኑኑ ይመዝገቡ👇`)}`,
    whatsappUrl: `https://api.whatsapp.com/send?text=${encodedText}`,
    facebookUrl: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
    twitterUrl: `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodeURIComponent('በፀሐይ ካምፓስ ዘመናዊ የዲጂታል ክህሎቶችን ይማሩ!')}`,
    emailUrl: `mailto:?subject=${encodeURIComponent('የፀሐይ ካምፓስ (Tsehay Campus) ጥሪ')}&body=${encodedText}`
  };
}

/**
 * Trigger native Web Share API
 */
export async function shareReferralLinkNative(userUid: string, userName?: string): Promise<boolean> {
  if (typeof window === 'undefined') return false;
  const shareData = getReferralShareData(userUid, userName);

  if (typeof navigator !== 'undefined' && navigator.share) {
    try {
      await navigator.share({
        title: shareData.title,
        text: shareData.text,
        url: shareData.link
      });
      return true;
    } catch (err: any) {
      if (err?.name !== 'AbortError') {
        console.warn('Native share error:', err);
      }
      return false;
    }
  }
  return false;
}
