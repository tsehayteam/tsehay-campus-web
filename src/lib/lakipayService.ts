export interface LakiPayPaymentRequest {
  amount: number;
  currency?: string;
  email: string;
  firstName?: string;
  lastName?: string;
  phoneNumber?: string;
  title: string;
  description?: string;
  reference?: string;
  courseId?: string;
  paymentMethod?: string;
  returnUrl?: string;
  callbackUrl?: string;
}

export interface BankOption {
  id: string;
  nameAm: string;
  nameEn: string;
  shortCode: string;
  type: 'bank' | 'wallet' | 'card';
  icon: string;
  accentColor: string;
}

export const SUPPORTED_PAYMENT_CHANNELS: BankOption[] = [
  // 🏦 Direct Bank Transfers / Debits
  {
    id: 'cbe',
    nameAm: 'የኢትዮጵያ ንግድ ባንክ (CBE)',
    nameEn: 'Commercial Bank of Ethiopia',
    shortCode: 'CBE',
    type: 'bank',
    icon: 'fa-building-columns',
    accentColor: '#8a2be2'
  },
  {
    id: 'siinqee',
    nameAm: 'ሲንቄ ባንክ (Siinqee Bank)',
    nameEn: 'Siinqee Bank',
    shortCode: 'SIINQEE',
    type: 'bank',
    icon: 'fa-landmark',
    accentColor: '#f9b03c'
  },
  {
    id: 'oromia_bank',
    nameAm: 'ኦሮሚያ ባንክ (Oromia Bank)',
    nameEn: 'Oromia Bank',
    shortCode: 'OROMIA',
    type: 'bank',
    icon: 'fa-vault',
    accentColor: '#dc2626'
  },
  {
    id: 'coop',
    nameAm: 'የኦሮሚያ ህብረት ስራ ባንክ (Coop Bank)',
    nameEn: 'Cooperative Bank of Oromia',
    shortCode: 'COOP',
    type: 'bank',
    icon: 'fa-handshake-angle',
    accentColor: '#0284c7'
  },
  // 📱 Mobile Wallets
  {
    id: 'telebirr',
    nameAm: 'ቴሌብር (Telebirr)',
    nameEn: 'Telebirr SuperApp',
    shortCode: 'TELEBIRR',
    type: 'wallet',
    icon: 'fa-mobile-screen-button',
    accentColor: '#00a4e4'
  },
  {
    id: 'cbebirr',
    nameAm: 'ሲቢኢ ብር (CBE Birr)',
    nameEn: 'CBE Birr',
    shortCode: 'CBE_BIRR',
    type: 'wallet',
    icon: 'fa-wallet',
    accentColor: '#9333ea'
  },
  // 💳 Debit / Credit Cards
  {
    id: 'cards',
    nameAm: 'የባንክ ካርዶች (Visa / Mastercard / EthSwitch)',
    nameEn: 'Local & Int Debit/Credit Cards',
    shortCode: 'CARDS',
    type: 'card',
    icon: 'fa-credit-card',
    accentColor: '#3268ba'
  }
];

export const LAKIPAY_ALL_SUPPORTED_MEDIUMS = [
  'TELEBIRR',
  'CBE',
  'SIINQEE',
  'OROMIA_BANK',
  'COOP',
  'MPESA',
  'ETHSWITCH',
  'CYBERSOURCE',
  'CARDS',
  'WALLETS'
];

/**
 * Format Ethiopian Phone Number to International Standard 2519... / 2517...
 */
export function formatEthiopianPhone(raw: string): string {
  let cleaned = String(raw || '').replace(/[^0-9]/g, '');
  if (cleaned.startsWith('0') && cleaned.length === 10) {
    return '251' + cleaned.slice(1);
  } else if (cleaned.length === 9 && (cleaned.startsWith('9') || cleaned.startsWith('7'))) {
    return '251' + cleaned;
  } else if (cleaned.length === 12 && cleaned.startsWith('251')) {
    return cleaned;
  }
  return '';
}

/**
 * Generate Unique Clean Transaction Reference ID
 */
export function generateTransactionReference(prefix: string = 'TC'): string {
  const timeHex = Date.now().toString(36).toUpperCase();
  const randHex = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${prefix}-${timeHex}-${randHex}`;
}
