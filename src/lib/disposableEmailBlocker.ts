/**
 * Comprehensive Disposable & Temporary Email Domain Blocker
 * Blocks throwaway email services (mailinator, temp-mail, 10minutemail, guerrillamail, etc.)
 */

const DISPOSABLE_DOMAINS = new Set([
  // Popular Disposable Email Providers
  'mailinator.com',
  'temp-mail.org',
  'tempmail.com',
  'tempmail.net',
  'tempmailo.com',
  '10minutemail.com',
  '10minutemail.net',
  '10minemail.com',
  'guerrillamail.com',
  'guerrillamail.net',
  'guerrillamail.biz',
  'guerrillamail.org',
  'guerrillamailblock.com',
  'sharklasers.com',
  'grr.la',
  'trashmail.com',
  'trashmail.net',
  'trashmail.org',
  'yopmail.com',
  'yopmail.net',
  'yopmail.fr',
  'dispostable.com',
  'getairmail.com',
  'throwawaymail.com',
  'fakeinbox.com',
  'generator.email',
  'dropmail.me',
  'mytempemail.com',
  'nada.ltd',
  'nada.email',
  'inboxkitten.com',
  'getnada.com',
  'mohmal.com',
  'crazymailing.com',
  'tempinbox.com',
  'maildrop.cc',
  'mintemail.com',
  'emailondeck.com',
  'burnermail.io',
  'fakemailgenerator.com',
  'disposablemail.com',
  'discard.email',
  'spambox.us',
  'trashmail.ws',
  'mytempmail.com',
  'temp-mails.com',
  '10minute-email.com',
  'zillamail.com',
  't-online.hu',
  'armyspy.com',
  'cuvox.de',
  'dayrep.com',
  'fleckens.hu',
  'gustr.com',
  'jourrapide.com',
  'rhyta.com',
  'superrito.com',
  'teleworm.us',
  'einrot.com',
  'generator.email',
  'mytrashmail.com',
  'mailcatch.com',
  'binkmail.com',
  'bobmail.info',
  'chammy.info',
  'devnullmail.com',
  'letthemeatspam.com',
  'mailin8r.com',
  'mailinator2.com',
  'notmailinator.com',
  'reallymymail.com',
  'reconmail.com',
  'safetymail.info',
  'sendspamhere.com',
  'sogetthis.com',
  'spambooger.com',
  'spamherelots.com',
  'spaminator.com',
  'suremail.info',
  'thisisnotmyrealemail.com',
  'veryrealemail.com',
  'zippymail.info',
  'trbvm.com',
  'tempr.email',
  'discardmail.com',
  'spambog.com',
  'spambog.de',
  'spambog.ru',
  'mytemp.email',
  'harakirimail.com',
  'mailpoof.com',
  'disposable.com',
  'luxusmail.org',
  'tempmail.ninja',
  'tempmailgen.com',
  'mail-temp.com',
  'fakemail.net',
  'quickemail.info',
  'emailfake.com',
  'generator.email',
  'inboxalias.com',
  'generator.email',
  'trashcanmail.com',
  'fakeemail.net',
  'anonaddy.com',
  'simplelogin.com'
]);

/**
 * Checks if an email uses a disposable / temporary domain.
 */
export function isDisposableEmail(email: string): boolean {
  if (!email || typeof email !== 'string') return false;
  const cleanEmail = email.trim().toLowerCase();
  const parts = cleanEmail.split('@');
  if (parts.length !== 2) return false;

  const domain = parts[1];

  // 1. Direct Set lookup
  if (DISPOSABLE_DOMAINS.has(domain)) {
    return true;
  }

  // 2. Pattern matching for generic temp mail domains
  if (
    domain.includes('tempmail') ||
    domain.includes('disposable') ||
    domain.includes('fakeinbox') ||
    domain.includes('throwaway') ||
    domain.includes('10minut') ||
    domain.includes('guerrillamail') ||
    domain.includes('trashmail') ||
    domain.includes('mailinator') ||
    domain.includes('yopmail') ||
    domain.includes('burnermail')
  ) {
    return true;
  }

  return false;
}

/**
 * Validates email strictly for signup.
 */
export function validateEmailForSignup(email: string): { isValid: boolean; errorMessage?: string } {
  if (!email || !email.trim()) {
    return { isValid: false, errorMessage: 'እባክዎ የኢሜል አድራሻዎን ያስገቡ።' };
  }

  const cleanEmail = email.trim().toLowerCase();

  // Basic structure check
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(cleanEmail)) {
    return { isValid: false, errorMessage: 'እባክዎ ትክክለኛ የኢሜል አድራሻ ያስገቡ።' };
  }

  // Disposable blocker check
  if (isDisposableEmail(cleanEmail)) {
    return {
      isValid: false,
      errorMessage: 'ይቅርታ! እባክዎ ትክክለኛ እና ቋሚ የኢሜይል አድራሻ (እንደ Gmail, Yahoo) ይጠቀሙ።'
    };
  }

  return { isValid: true };
}
