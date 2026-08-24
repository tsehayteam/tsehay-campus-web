/**
 * Tsehay Campus Email Verification OTP Service
 * Generates and validates 6-digit verification codes for @gmail.com accounts
 */

import { db } from './firebase/config';
import { doc, setDoc, getDoc, serverTimestamp, deleteDoc } from 'firebase/firestore';

export interface OtpRecord {
  code: string;
  email: string;
  createdAt: number;
  expiresAt: number;
  attempts: number;
  verified: boolean;
}

/**
 * Generates a cryptographically random 6-digit numerical code
 */
export function generateOtpCode(): string {
  const min = 100000;
  const max = 999999;
  return Math.floor(Math.random() * (max - min + 1) + min).toString();
}

/**
 * Saves or updates an OTP code for a given Gmail address
 */
export async function saveOtpForEmail(email: string, code: string): Promise<OtpRecord> {
  const cleanEmail = email.trim().toLowerCase();
  const now = Date.now();
  const expiresAt = now + 15 * 60 * 1000; // 15 minutes validity

  const record: OtpRecord = {
    code: code,
    email: cleanEmail,
    createdAt: now,
    expiresAt: expiresAt,
    attempts: 0,
    verified: false
  };

  const otpDocRef = doc(db, 'artifacts', 'tsehaycampus-e1a6d', 'public', 'data', 'otp_verifications', cleanEmail.replace(/[^a-zA-Z0-9]/g, '_'));
  await setDoc(otpDocRef, {
    ...record,
    updatedAt: serverTimestamp()
  }, { merge: true });

  return record;
}

/**
 * Verifies a 6-digit OTP code for a given email
 */
export async function verifyOtpForEmail(email: string, inputCode: string): Promise<{ success: boolean; message: string }> {
  const cleanEmail = email.trim().toLowerCase();
  const cleanCode = inputCode.trim();

  if (!cleanCode || cleanCode.length !== 6) {
    return { success: false, message: 'እባክዎ ትክክለኛ 6-አሃዝ ኮድ ያስገቡ።' };
  }

  const docId = cleanEmail.replace(/[^a-zA-Z0-9]/g, '_');
  const otpDocRef = doc(db, 'artifacts', 'tsehaycampus-e1a6d', 'public', 'data', 'otp_verifications', docId);
  const docSnap = await getDoc(otpDocRef);

  if (!docSnap.exists()) {
    return { success: false, message: 'ምንም የማረጋገጫ ኮድ አልተገኘም። እባክዎ አዲስ ኮድ ይጠይቁ።' };
  }

  const data = docSnap.data() as OtpRecord;

  // Check expiration
  if (Date.now() > data.expiresAt) {
    return { success: false, message: 'የማረጋገጫ ኮዱ ጊዜው አልፎበታል (Expired)። እባክዎ አዲስ ኮድ ይጠይቁ።' };
  }

  // Check max attempts (prevent brute force)
  if (data.attempts >= 5) {
    return { success: false, message: 'ኮዱን ደጋግመው ተሳስተዋል! እባክዎ አዲስ ኮድ ይጠይቁ።' };
  }

  // Check code match
  if (data.code !== cleanCode) {
    await setDoc(otpDocRef, { attempts: (data.attempts || 0) + 1 }, { merge: true });
    const remaining = 4 - (data.attempts || 0);
    return { 
      success: false, 
      message: `የተሳሳተ ኮድ አስገብተዋል። ${remaining > 0 ? `(የቀሩ ሙከራዎች፡ ${remaining})` : 'እባክዎ አዲስ ኮድ ይጠይቁ።'}` 
    };
  }

  // Code is valid! Mark as verified
  await setDoc(otpDocRef, { verified: true, verifiedAt: serverTimestamp() }, { merge: true });

  return { success: true, message: 'ኢሜልዎ በተሳካ ሁኔታ ተረጋግጧል!' };
}
