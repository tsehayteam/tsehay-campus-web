import { db } from '@/lib/firebase/config';
import { doc, getDoc, collection, getDocs, setDoc, deleteDoc, serverTimestamp, increment } from 'firebase/firestore';

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
    const codeRef = doc(db, 'artifacts', 'tsehaycampus-e1a6d', 'public', 'data', 'referral_codes', cleanCode);
    const codeSnap = await getDoc(codeRef);

    if (!codeSnap.exists()) {
      return { 
        isValid: false, 
        discountPercent: 0, 
        isFree: false, 
        message: 'ትክክል ያልሆነ ኮድ' 
      };
    }

    const data = codeSnap.data() as PromoCode;

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
      data: { id: codeSnap.id, ...data }
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
