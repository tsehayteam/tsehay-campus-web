/**
 * Phone Number Formatting & Verification Helpers for Ethiopian and International Mobile Numbers
 */

export function formatPhoneNumberToE164(rawPhone: string): string {
  if (!rawPhone || typeof rawPhone !== 'string') return '';
  let cleaned = rawPhone.trim().replace(/[\s\-()]/g, '');
  if (!cleaned) return '';

  if (cleaned.startsWith('+')) {
    return cleaned;
  }

  // If starts with leading zero (09... or 07...)
  if (cleaned.startsWith('0')) {
    cleaned = cleaned.substring(1);
  }

  // If 9 digits (standard Ethiopian mobile starting with 9 or 7)
  if (cleaned.length === 9) {
    return `+251${cleaned}`;
  }

  // If already starts with country code 251
  if (cleaned.startsWith('251')) {
    return `+${cleaned}`;
  }

  return `+251${cleaned}`;
}

export function isValidEthiopianOrIntlPhone(phone: string): boolean {
  const formatted = formatPhoneNumberToE164(phone);
  // Valid E.164 must start with + and have at least 10 digits
  const phoneRegex = /^\+[1-9]\d{8,14}$/;
  return phoneRegex.test(formatted);
}
