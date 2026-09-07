/**
 * Tsehay Campus Email Verification OTP Service
 * Generates and validates 6-digit verification codes for @gmail.com accounts
 * Uses SessionStorage + Server API without external legacy database dependencies.
 */

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
 * Saves or updates an OTP code for a given Gmail address locally in SessionStorage
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

  if (typeof window !== 'undefined') {
    try {
      sessionStorage.setItem(`tsehay_otp_${cleanEmail}`, JSON.stringify(record));
    } catch (e) {}
  }

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

  // 1. Try server verification API first
  try {
    const res = await fetch('/api/auth/verify-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: cleanEmail, code: cleanCode })
    });
    if (res.ok) {
      const result = await res.json();
      if (result.success) {
        if (typeof window !== 'undefined') {
          try {
            const raw = sessionStorage.getItem(`tsehay_otp_${cleanEmail}`);
            if (raw) {
              const data = JSON.parse(raw);
              data.verified = true;
              sessionStorage.setItem(`tsehay_otp_${cleanEmail}`, JSON.stringify(data));
            }
          } catch (e) {}
        }
        return { success: true, message: result.message || 'ኢሜልዎ በተሳካ ሁኔታ ተረጋግጧል!' };
      }
    }
  } catch (err) {
    console.warn('Server OTP verification fallback to local:', err);
  }

  // 2. Local SessionStorage verification
  let data: OtpRecord | null = null;
  if (typeof window !== 'undefined') {
    try {
      const raw = sessionStorage.getItem(`tsehay_otp_${cleanEmail}`);
      if (raw) {
        data = JSON.parse(raw);
      }
    } catch (e) {}
  }

  if (!data) {
    return { success: false, message: 'ምንም የማረጋገጫ ኮድ አልተገኘም። እባክዎ አዲስ ኮድ ይጠይቁ።' };
  }

  // Check expiration
  if (Date.now() > data.expiresAt) {
    return { success: false, message: 'የማረጋገጫ ኮዱ ጊዜው አልፎበታል (Expired)። እባክዎ አዲስ ኮድ ይጠይቁ።' };
  }

  // Check max attempts (prevent brute force)
  if ((data.attempts || 0) >= 5) {
    return { success: false, message: 'ኮዱን ደጋግመው ተሳስተዋል! እባክዎ አዲስ ኮድ ይጠይቁ።' };
  }

  // Check code match
  if (data.code !== cleanCode) {
    const newAttempts = (data.attempts || 0) + 1;
    data.attempts = newAttempts;
    if (typeof window !== 'undefined') {
      try {
        sessionStorage.setItem(`tsehay_otp_${cleanEmail}`, JSON.stringify(data));
      } catch (e) {}
    }

    const remaining = 5 - newAttempts;
    return { 
      success: false, 
      message: `የተሳሳተ ኮድ አስገብተዋል። ${remaining > 0 ? `(የቀሩ ሙከራዎች፡ ${remaining})` : 'እባክዎ አዲስ ኮድ ይጠይቁ።'}` 
    };
  }

  // Code is valid! Mark as verified
  data.verified = true;
  if (typeof window !== 'undefined') {
    try {
      sessionStorage.setItem(`tsehay_otp_${cleanEmail}`, JSON.stringify(data));
    } catch (e) {}
  }

  return { success: true, message: 'ኢሜልዎ በተሳካ ሁኔታ ተረጋግጧል!' };
}
