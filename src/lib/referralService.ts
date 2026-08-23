import { db } from '@/lib/firebase/config';
import { doc, getDoc, setDoc, serverTimestamp, increment } from 'firebase/firestore';

export interface PromoCode {
  id?: string;
  code: string;
  discountPercent: number; // e.g. 10 (for 10% off), 50 (for 50% off), 100 (for 100% free)
  targetCourseId: string; // 'all' or specific courseId (e.g. 'shein', 'youtube')
  description?: string;
  isActive: boolean;
  usageCount?: number;
  createdAt?: any;
}

export type ReferralCodeData = PromoCode;

/**
 * Validate a Promo / Referral code against Firestore and return discount details
 */
export async function validateReferralCode(
  inputCode: string, 
  courseId?: string
): Promise<{ isValid: boolean; discountPercent: number; isFree: boolean; message: string; data?: PromoCode }> {
  if (!inputCode || !inputCode.trim()) {
    return { isValid: false, discountPercent: 0, isFree: false, message: '' };
  }

  const cleanCode = inputCode.trim().toUpperCase();

  try {
    let data: PromoCode | null = null;
    let foundId = cleanCode;

    // 1. Attempt direct client Firestore read
    try {
      const codeRef = doc(db, 'artifacts', 'tsehaycampus-e1a6d', 'public', 'data', 'referral_codes', cleanCode);
      const codeSnap = await getDoc(codeRef);
      if (codeSnap.exists()) {
        data = codeSnap.data() as PromoCode;
        foundId = codeSnap.id;
      }
    } catch (clientErr) {
      console.warn("Client referral code check fallback to API:", clientErr);
    }

    // 2. Fallback to Server API if client read was blocked or not found
    if (!data) {
      try {
        const res = await fetch('/api/admin/referral-codes');
        if (res.ok) {
          const json = await res.json();
          if (json.codes && Array.isArray(json.codes)) {
            const match = json.codes.find((c: any) => c.code?.toUpperCase() === cleanCode || c.id?.toUpperCase() === cleanCode);
            if (match) {
              data = match;
              foundId = match.id || cleanCode;
            }
          }
        }
      } catch (apiErr) {
        console.warn("API referral codes validation fetch fallback:", apiErr);
      }
    }

    if (!data) {
      return { 
        isValid: false, 
        discountPercent: 0, 
        isFree: false, 
        message: 'ትክክል ያልሆነ ኮድ' 
      };
    }

    if (!data.isActive) {
      return { 
        isValid: false, 
        discountPercent: 0, 
        isFree: false, 
        message: 'ትክክል ያልሆነ ኮድ (ጊዜው አልፏል)' 
      };
    }

    // Check course applicability
    if (courseId && data.targetCourseId && data.targetCourseId !== 'all' && data.targetCourseId !== courseId) {
      return { 
        isValid: false, 
        discountPercent: 0, 
        isFree: false, 
        message: 'ትክክል ያልሆነ ኮድ (ለዚህ ኮርስ አይሰራም)' 
      };
    }

    const discountPercent = Number(data.discountPercent) || 0;
    const isFree = discountPercent >= 100;

    return {
      isValid: true,
      discountPercent: discountPercent,
      isFree: isFree,
      message: isFree 
        ? '100% ነፃ መመዝገቢያ ቅናሽ ተደርጓል! 🎉' 
        : `${discountPercent}% ቅናሽ ተደርጓል! 🎉`,
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
    const codeRef = doc(db, 'artifacts', 'tsehaycampus-e1a6d', 'public', 'data', 'referral_codes', cleanCode);
    await setDoc(codeRef, {
      usageCount: increment(1),
      lastUsedAt: serverTimestamp()
    }, { merge: true });
  } catch (e) {
    console.warn("Could not record promo code usage:", e);
  }
}
