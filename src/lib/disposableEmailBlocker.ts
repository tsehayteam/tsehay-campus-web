/**
 * Strict Gmail-Only Validation Policy
 * Per Tsehay Campus policy, only genuine personal Google Gmail accounts (@gmail.com) are accepted.
 * All temporary emails, throwaways, and non-gmail domains are rejected.
 */

export function isGmailAddress(email: string): boolean {
  if (!email || typeof email !== 'string') return false;
  const cleanEmail = email.trim().toLowerCase();
  return cleanEmail.endsWith('@gmail.com') && cleanEmail.length > 10;
}

export function isDisposableEmail(email: string): boolean {
  if (!email || typeof email !== 'string') return false;
  const cleanEmail = email.trim().toLowerCase();
  return !isGmailAddress(cleanEmail);
}

/**
 * Validates email strictly for signup (Must be a valid @gmail.com address).
 */
export function validateEmailForSignup(email: string): { isValid: boolean; errorMessage?: string } {
  if (!email || !email.trim()) {
    return { isValid: false, errorMessage: 'እባክዎ የኢሜል አድራሻዎን ያስገቡ።' };
  }

  const cleanEmail = email.trim().toLowerCase();

  // Basic structure check
  const emailRegex = /^[a-zA-Z0-9._%+-]+@gmail\.com$/;
  if (!emailRegex.test(cleanEmail)) {
    return { 
      isValid: false, 
      errorMessage: 'ይቅርታ! የፀሐይ ካምፓስ የሚቀበለው ትክክለኛ የ Gmail (@gmail.com) አድራሻዎችን ብቻ ነው።' 
    };
  }

  if (cleanEmail.split('@')[0].length < 3) {
    return {
      isValid: false,
      errorMessage: 'የ Gmail አድራሻዎ ስም ቢያንስ 3 ፊደላት መሆን አለበት።'
    };
  }

  return { isValid: true };
}
