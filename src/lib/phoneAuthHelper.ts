/**
 * Phone Number Formatting & Verification Helpers for Ethiopian (9XXXXXXXX) and LakiPay Mobile Numbers
 */

/**
 * Normalizes any pasted or typed Ethiopian phone input into the 9-digit local mobile format
 * starting directly with 9 (or 7), e.g., "912345678".
 * Automatically strips "+251", "251", and any accidental leading "0"s.
 */
export function normalizeEthiopianMobileInput(raw: string): string {
  if (!raw || typeof raw !== 'string') return '';
  let digits = raw.replace(/\D/g, '');
  if (!digits) return '';

  // Strip country code 251 if present at the start (e.g. 251912345678 or 2510912345678)
  if (digits.startsWith('251') && digits.length > 9) {
    digits = digits.slice(3);
  }

  // Strip any accidental leading 0s (e.g. 0912345678 -> 912345678)
  digits = digits.replace(/^0+/, '');

  return digits.slice(0, 9);
}

/**
 * Validates that the normalized phone number is a 9-digit Ethiopian mobile number starting with 9 (or 7).
 */
export function isValidNineDigitEthPhone(raw: string): boolean {
  const normalized = normalizeEthiopianMobileInput(raw);
  return /^[97]\d{8}$/.test(normalized);
}

/**
 * Formats phone for LakiPay API (2519XXXXXXXX)
 */
export function formatPhoneForLakiPay(raw: string): string {
  const normalized = normalizeEthiopianMobileInput(raw);
  if (/^[97]\d{8}$/.test(normalized)) {
    return `251${normalized}`;
  }
  return '251911223344';
}

export function formatPhoneNumberToE164(rawPhone: string): string {
  if (!rawPhone || typeof rawPhone !== 'string') return '';
  const normalized = normalizeEthiopianMobileInput(rawPhone);
  if (/^[97]\d{8}$/.test(normalized)) {
    return `+251${normalized}`;
  }

  let cleaned = rawPhone.trim().replace(/[\s\-()]/g, '');
  if (!cleaned) return '';

  if (cleaned.startsWith('+')) {
    return cleaned;
  }

  if (cleaned.startsWith('0')) {
    cleaned = cleaned.substring(1);
  }

  if (cleaned.length === 9) {
    return `+251${cleaned}`;
  }

  if (cleaned.startsWith('251')) {
    return `+${cleaned}`;
  }

  return `+251${cleaned}`;
}

export function isValidEthiopianOrIntlPhone(phone: string): boolean {
  if (isValidNineDigitEthPhone(phone)) return true;
  const formatted = formatPhoneNumberToE164(phone);
  const phoneRegex = /^\+[1-9]\d{8,14}$/;
  return phoneRegex.test(formatted);
}
