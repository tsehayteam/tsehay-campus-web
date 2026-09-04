import { supabase } from '@/lib/supabase/client';

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
 * Validate a Promo / Referral code against Supabase and return discount details
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

    // 1. Check Supabase referral_codes table
    try {
      const { data: sbPromo, error: sbPromoErr } = await supabase
        .from('referral_codes')
        .select('*')
        .or(`code.ilike.${cleanCode},id.ilike.${cleanCode}`)
        .maybeSingle();

      if (sbPromo && !sbPromoErr) {
        data = {
          id: sbPromo.id,
          code: sbPromo.code,
          discountPercent: Number(sbPromo.discount_percent) || 0,
          targetCourseId: sbPromo.target_course_id || 'all',
          description: sbPromo.description,
          isActive: sbPromo.is_active ?? true,
          usageCount: Number(sbPromo.usage_count) || 0,
          maxUsageLimit: Number(sbPromo.max_usage_limit) || 0
        };
        foundId = sbPromo.id || cleanCode;
      }
    } catch (e) {}

    // 2. Fallback to Server API
    if (!data) {
      try {
        let res = await fetch('/api/referral-codes');
        if (!res.ok) res = await fetch('/api/admin/referral-codes');
        if (res.ok) {
          const json = await res.json();
          if (json.codes && Array.isArray(json.codes)) {
            const match = json.codes.find((c: any) => 
              c.code?.trim().toUpperCase() === cleanCode || 
              c.id?.trim().toUpperCase() === cleanCode
            );
            if (match) {
              data = {
                id: match.id,
                code: match.code,
                discountPercent: Number(match.discountPercent || match.discount_percent) || 0,
                targetCourseId: match.targetCourseId || match.target_course_id || 'all',
                description: match.description,
                isActive: match.isActive ?? match.is_active ?? true,
                usageCount: Number(match.usageCount || match.usage_count) || 0,
                maxUsageLimit: Number(match.maxUsageLimit || match.max_usage_limit) || 0
              };
              foundId = match.id || cleanCode;
            }
          }
        }
      } catch (apiErr) {
        console.warn("API referral codes validation fallback:", apiErr);
      }
    }

    // 3. Local storage fallback cache
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

    if (!data) {
      return { 
        isValid: false, 
        discountPercent: 0, 
        isFree: false, 
        message: 'ይቅርታ፣ ያስገቡት የቅናሽ ኮድ አልተገኘም ወይም ልክ አይደለም።' 
      };
    }

    // Validate active status
    if (data.isActive === false) {
      return { 
        isValid: false, 
        discountPercent: 0, 
        isFree: false, 
        message: 'ይህ የቅናሽ ኮድ በአሁኑ ሰዓት አገልግሎት ላይ አይውልም።' 
      };
    }

    // Validate target course constraint
    const targetCourse = data.targetCourseId || 'all';
    if (targetCourse !== 'all' && courseId) {
      const matchCourse = 
        targetCourse.toLowerCase() === courseId.toLowerCase() ||
        courseId.toLowerCase().includes(targetCourse.toLowerCase()) ||
        targetCourse.toLowerCase().includes(courseId.toLowerCase());
      
      if (!matchCourse) {
        return { 
          isValid: false, 
          discountPercent: 0, 
          isFree: false, 
          message: `ይህ ኮድ ለዚህ ኮርስ አይሰራም። ለተመረጡ ኮርሶች ብቻ ነው የሚያገለግለው።` 
        };
      }
    }

    // Validate max usage limit
    const currentUsage = Number(data.usageCount) || 0;
    const maxLimit = Number(data.maxUsageLimit) || 0;
    if (maxLimit > 0 && currentUsage >= maxLimit) {
      return { 
        isValid: false, 
        discountPercent: 0, 
        isFree: false, 
        message: 'ይህ የቅናሽ ኮድ የተፈቀደለትን ከፍተኛ የመጠቀም ገደብ ጨርሷል።' 
      };
    }

    const discountPercent = Math.min(Math.max(Number(data.discountPercent) || 0, 0), 100);
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
    const { data: existing } = await supabase
      .from('referral_codes')
      .select('usage_count')
      .or(`code.ilike.${cleanCode},id.ilike.${cleanCode}`)
      .maybeSingle();

    if (existing) {
      await supabase
        .from('referral_codes')
        .update({
          usage_count: (Number(existing.usage_count) || 0) + 1,
          updated_at: new Date().toISOString()
        })
        .or(`code.ilike.${cleanCode},id.ilike.${cleanCode}`);
    }
  } catch (e) {
    console.warn("Could not record promo code usage via Supabase:", e);
  }
}
