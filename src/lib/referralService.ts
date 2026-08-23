import { db } from '@/lib/firebase/config';
import { doc, getDoc, collection, getDocs, setDoc, deleteDoc, serverTimestamp, increment } from 'firebase/firestore';

export interface ReferralCodeData {
  id?: string;
  code: string;
  discountPercent: number; // e.g. 50 (for 50% off), 100 (for 100% free)
  targetCourseId: string; // 'all' or specific courseId
  description?: string;
  isActive: boolean;
  usageCount?: number;
  createdAt?: any;
}

/**
 * Validate a referral code against Firestore and return discount info
 */
export async function validateReferralCode(
  inputCode: string, 
  courseId?: string
): Promise<{ isValid: boolean; discountPercent: number; isFree: boolean; message: string; data?: ReferralCodeData }> {
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
        message: 'የተሳሳተ የሪፈራል ወይም የቅናሽ ኮድ ነው (Invalid code).' 
      };
    }

    const data = codeSnap.data() as ReferralCodeData;

    if (!data.isActive) {
      return { 
        isValid: false, 
        discountPercent: 0, 
        isFree: false, 
        message: 'ይህ የቅናሽ ኮድ በአሁኑ ወቅት አያገለግልም (Code expired/inactive).' 
      };
    }

    // Check course applicability
    if (courseId && data.targetCourseId && data.targetCourseId !== 'all' && data.targetCourseId !== courseId) {
      return { 
        isValid: false, 
        discountPercent: 0, 
        isFree: false, 
        message: 'ይህ የቅናሽ ኮድ ለዚህ ኮርስ አይሰራም (Code not valid for this course).' 
      };
    }

    const discountPercent = Number(data.discountPercent) || 0;
    const isFree = discountPercent >= 100;

    return {
      isValid: true,
      discountPercent: discountPercent,
      isFree: isFree,
      message: isFree 
        ? '🎉 100% ነፃ መመዝገቢያ ኮድ ተረጋግጧል! (100% FREE Access)' 
        : `🎉 ${discountPercent}% የቅናሽ ኮድ በተሳካ ሁኔታ ተረጋግጧል!`,
      data: { id: codeSnap.id, ...data }
    };
  } catch (error) {
    console.error("Referral validation error:", error);
    return { 
      isValid: false, 
      discountPercent: 0, 
      isFree: false, 
      message: 'ኮዱን ማረጋገጥ አልተቻለም። እባክዎ በድጋሚ ይሞክሩ።' 
    };
  }
}

/**
 * Increment referral code usage count
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
    console.warn("Could not record referral usage:", e);
  }
}
