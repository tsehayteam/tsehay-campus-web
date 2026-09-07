export interface PromoCode {
  id?: string;
  code: string;
  discountPercent: number; // e.g. 10 (for 10% off), 50 (for 50% off), 100 (for 100% free)
  targetCourseId: string; // 'all' or specific courseId (e.g. 'shein', 'youtube')
  description?: string;
  isActive: boolean;
  usageCount?: number;
  maxUsageLimit?: number; // 0 or undefined for Unlimited, or specific limit (e.g. 10)
  createdAt?: any;
}

export type ReferralCodeData = PromoCode;

/**
 * Validate a Promo / Referral code against Server API / Cache and return discount details
 */
export async function validateReferralCode(
  inputCode: string, 
  courseId?: string
): Promise<{ isValid: boolean; discountPercent: number; isFree: boolean; message: string; data?: PromoCode }> {
  if (!inputCode || !inputCode.trim()) {
    return { isValid: false, discountPercent: 0, isFree: false, message: 'እባክዎ የቅናሽ ኮድ ያስገቡ።' };
  }

  const cleanCode = inputCode.trim().toUpperCase();

  try {
    let data: PromoCode | null = null;
    let foundId = cleanCode;

    // 1. Fetch from Server API
    try {
      let res = await fetch('/api/referral-codes', { cache: 'no-store' });
      if (!res.ok) res = await fetch('/api/admin/referral-codes', { cache: 'no-store' });
      if (res.ok) {
        const json = await res.json();
        if (json.codes && Array.isArray(json.codes)) {
          const match = json.codes.find((c: any) => 
            c.code?.trim().toUpperCase() === cleanCode || 
            c.id?.trim().toUpperCase() === cleanCode
          );
          if (match) {
            data = match;
            foundId = match.id || cleanCode;
          }
        }
      }
    } catch (apiErr) {
      console.warn("API referral codes validation fallback:", apiErr);
    }

    // 2. Local storage fallback cache
    if (!data && typeof window !== 'undefined') {
      try {
        const cached = localStorage.getItem('tsehay_referral_codes_cache');
        if (cached) {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed)) {
            const match = parsed.find((c: any) => 
              c.code?.trim().toUpperCase() === cleanCode || 
              c.id?.trim().toUpperCase() === cleanCode
            );
            if (match) {
              data = match;
              foundId = match.id || cleanCode;
            }
          }
        }
      } catch (cacheErr) {}
    }

    // If still not found
    if (!data) {
      return { 
        isValid: false, 
        discountPercent: 0, 
        isFree: false, 
        message: 'ትክክል ያልሆነ ኮድ' 
      };
    }

    // Check if active
    if (data.isActive === false) {
      return { 
        isValid: false, 
        discountPercent: 0, 
        isFree: false, 
        message: 'ይህ የቅናሽ ኮድ ጊዜው አልፏል ወይም ተሰርዟል' 
      };
    }

    // 🌟 Check Max Usage Limit (የተጠቃሚ ብዛት ገደብ)
    const maxLimit = Number(data.maxUsageLimit) || 0;
    const currentUsage = Number(data.usageCount) || 0;
    if (maxLimit > 0 && currentUsage >= maxLimit) {
      return {
        isValid: false,
        discountPercent: 0,
        isFree: false,
        message: `ይቅርታ፣ የዚህ የቅናሽ ኮድ የተጠቃሚዎች ቁጥር ገደብ (${maxLimit} ሰው) ሞልቷል`
      };
    }

    // Check course applicability
    if (courseId && data.targetCourseId && data.targetCourseId !== 'all') {
      const normalizedTarget = data.targetCourseId.toLowerCase().trim();
      const normalizedCurrent = courseId.toLowerCase().trim();
      
      const isMatch = normalizedTarget === normalizedCurrent ||
        normalizedCurrent.includes(normalizedTarget) ||
        normalizedTarget.includes(normalizedCurrent);

      if (!isMatch) {
        return { 
          isValid: false, 
          discountPercent: 0, 
          isFree: false, 
          message: 'ይህ የቅናሽ ኮድ ለተመረጠው ኮርስ አይሰራም' 
        };
      }
    }

    const discountPercent = Math.min(100, Math.max(1, Number(data.discountPercent) || 10));
    const isFree = discountPercent >= 100;

    return {
      isValid: true,
      discountPercent: discountPercent,
      isFree: isFree,
      message: isFree 
        ? 'ኮዱ ተቀባይነት አግኝቷል! 100% ነፃ መመዝገቢያ ተሰጥቷል 🎉' 
        : `ኮዱ ተቀባይነት አግኝቷል! ${discountPercent}% ቅናሽ ተደርጓል 🎉`,
      data: { id: foundId, ...data }
    };
  } catch (error) {
    console.error("Promo code validation error:", error);
    return { 
      isValid: false, 
      discountPercent: 0, 
      isFree: false, 
      message: 'ትክክል ያልሆነ ኮድ' 
    };
  }
}

/**
 * Increment promo / referral code usage count
 */
export async function recordReferralUsage(code: string) {
  if (!code) return;
  const cleanCode = code.trim().toUpperCase();
  try {
    await fetch('/api/referrals/record', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: cleanCode })
    });
  } catch (e) {
    console.warn("Could not record promo code usage via API:", e);
  }
}

