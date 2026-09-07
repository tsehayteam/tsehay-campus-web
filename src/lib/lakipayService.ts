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

// 🌟 All 8 Merchant-Enabled LakiPay Payment Channels
export const SUPPORTED_PAYMENT_CHANNELS: BankOption[] = [
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
  {
    id: 'mpesa',
    nameAm: 'ኤም-ፔሳ (M-Pesa Safaricom)',
    nameEn: 'M-Pesa Ethiopia',
    shortCode: 'MPESA',
    type: 'wallet',
    icon: 'fa-money-bill-transfer',
    accentColor: '#00a859'
  },
  // 🏦 Direct Bank Transfers / Debits
  {
    id: 'awash_bank',
    nameAm: 'አዋሽ ባንክ (Awash Bank)',
    nameEn: 'Awash Bank',
    shortCode: 'AWASH',
    type: 'bank',
    icon: 'fa-landmark-flag',
    accentColor: '#0284c7'
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
    id: 'geda_bank',
    nameAm: 'ገዳ ባንክ (Geda Bank)',
    nameEn: 'Geda Bank',
    shortCode: 'GEDA',
    type: 'bank',
    icon: 'fa-building-columns',
    accentColor: '#b45309'
  },
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
    id: 'coop',
    nameAm: 'የኦሮሚያ ህብረት ስራ ባንክ (Coop Bank)',
    nameEn: 'Cooperative Bank of Oromia',
    shortCode: 'COOP',
    type: 'bank',
    icon: 'fa-handshake-angle',
    accentColor: '#0284c7'
  },
  // 💳 Debit / Credit Cards & Switch
  {
    id: 'ethswitch',
    nameAm: 'ኢትስዊች የሀገር ውስጥ ካርዶች (EthSwitch)',
    nameEn: 'EthSwitch Local Bank Cards',
    shortCode: 'ETHSWITCH',
    type: 'card',
    icon: 'fa-credit-card',
    accentColor: '#059669'
  },
  {
    id: 'cybersource',
    nameAm: 'ሳይበርሶርስ ዓለም አቀፍ ካርዶች (Cybersource / Visa / MasterCard)',
    nameEn: 'Cybersource Visa / MasterCard',
    shortCode: 'CYBERSOURCE',
    type: 'card',
    icon: 'fa-globe',
    accentColor: '#2563eb'
  }
];

// All active mediums recognized by LakiPay
export const LAKIPAY_ALL_SUPPORTED_MEDIUMS = [
  'TELEBIRR',
  'CBE',
  'MPESA',
  'AWASH',
  'AWASH_BANK',
  'OROMIA_BANK',
  'GEDA_BANK',
  'ETHSWITCH',
  'CYBERSOURCE',
  'SIINQEE',
  'COOP',
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

export interface LakiPayInitParams {
  amount: number;
  currency?: string;
  reference: string;
  title: string;
  description?: string;
  email: string;
  firstName?: string;
  lastName?: string;
  phoneNumber?: string;
  callbackUrl: string;
  successUrl: string;
  failedUrl: string;
}

export interface LakiPayInitResult {
  success: boolean;
  paymentUrl?: string;
  checkoutUrl?: string;
  reference: string;
  error?: string;
}

/**
 * Dynamic LakiPay Hosted Session Initializer
 * Calls official POST https://api.lakipay.co/api/v1/payment/initialize
 * without restricting supported_mediums, allowing LakiPay to dynamically serve
 * all 8 merchant-enabled options (TeleBirr, CBE, M-Pesa, Awash, Cybersource, EthSwitch, Oromia, Geda).
 */
export async function initializeLakiPaySession(params: LakiPayInitParams): Promise<LakiPayInitResult> {
  const pubKey = (process.env.LAKIPAY_PUBLIC_KEY || '').trim().replace(/^["']|["']$/g, '');
  const secKey = (process.env.LAKIPAY_SECRET_KEY || '').trim().replace(/^["']|["']$/g, '');
  const rawApiKey = (process.env.LAKIPAY_API_KEY || '').trim().replace(/^["']|["']$/g, '');

  const formattedApiKey = (pubKey && secKey) 
    ? `${pubKey}:${secKey}` 
    : (rawApiKey || `${pubKey}:${secKey}`);

  // Base dynamic payload: Omitting supported_mediums enables ALL merchant-configured channels
  const dynamicPayload = {
    amount: Number(params.amount),
    currency: params.currency || 'ETB',
    reference: params.reference,
    title: String(params.title || 'Tsehay Campus'),
    description: params.description || 'Tsehay Campus Education & Events',
    email: params.email,
    first_name: params.firstName || (params.email ? params.email.split('@')[0] : 'Student'),
    last_name: params.lastName || 'Campus',
    phone_number: params.phoneNumber ? formatEthiopianPhone(params.phoneNumber) : undefined,
    callback_url: params.callbackUrl,
    callbackUrl: params.callbackUrl,
    return_url: params.successUrl,
    returnUrl: params.successUrl,
    redirects: {
      success: params.successUrl,
      failed: params.failedUrl
    }
  };

  // Endpoint sequence: Primary official v1 initialize -> fallback v2 checkout
  const endpoints = Array.from(new Set([
    process.env.LAKIPAY_ENDPOINT,
    'https://api.lakipay.co/api/v1/payment/initialize',
    'https://api.lakipay.co/api/v2/payment/checkout',
    'https://api.lakipay.co/v2/payment/checkout'
  ].filter(Boolean))) as string[];

  let lastError: string | null = null;

  for (const endpoint of endpoints) {
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': formattedApiKey
        },
        body: JSON.stringify(dynamicPayload)
      });

      const resData = await response.json().catch(() => null);

      if (resData) {
        const returnedRef = resData.reference || resData.data?.reference || resData.transaction_id || resData.data?.transaction_id || params.reference;
        
        // Extract paymentUrl across all standard LakiPay response schema variations
        const targetUrl = 
          resData.paymentUrl ||
          resData.payment_url ||
          resData.data?.paymentUrl ||
          resData.data?.payment_url ||
          resData.checkoutUrl ||
          resData.checkout_url ||
          resData.data?.checkoutUrl ||
          resData.data?.checkout_url ||
          resData.url ||
          resData.data?.url ||
          resData.redirect_url ||
          resData.data?.redirect_url;

        if (targetUrl && typeof targetUrl === 'string' && targetUrl.startsWith('http')) {
          return {
            success: true,
            paymentUrl: targetUrl,
            checkoutUrl: targetUrl,
            reference: returnedRef
          };
        }

        // If the API explicitly requires supported_mediums, retry with full inclusive array
        if (resData.error?.includes?.('supported_mediums') || resData.message?.includes?.('supported_mediums')) {
          const fallbackPayload = {
            ...dynamicPayload,
            supported_mediums: LAKIPAY_ALL_SUPPORTED_MEDIUMS
          };

          const retryRes = await fetch(endpoint, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-API-Key': formattedApiKey
            },
            body: JSON.stringify(fallbackPayload)
          });

          const retryData = await retryRes.json().catch(() => null);
          const retryUrl = 
            retryData?.paymentUrl ||
            retryData?.payment_url ||
            retryData?.data?.paymentUrl ||
            retryData?.data?.payment_url ||
            retryData?.checkoutUrl ||
            retryData?.checkout_url ||
            retryData?.data?.checkoutUrl ||
            retryData?.data?.checkout_url ||
            retryData?.url ||
            retryData?.data?.url;

          if (retryUrl && typeof retryUrl === 'string' && retryUrl.startsWith('http')) {
            return {
              success: true,
              paymentUrl: retryUrl,
              checkoutUrl: retryUrl,
              reference: retryData.reference || returnedRef
            };
          }
        }

        lastError = resData.message || resData.error || resData.detail || resData.data?.message;
      }
    } catch (err: any) {
      console.warn(`LakiPay initialization warning on ${endpoint}:`, err?.message || err);
      lastError = err?.message || 'Connection failed';
    }
  }

  // Fallback: If merchant configured a direct checkout base URL in environment
  const lakipayDirectUrl = (process.env.LAKIPAY_DIRECT_URL || process.env.LAKIPAY_CHECKOUT_URL || '').trim();
  if (lakipayDirectUrl && lakipayDirectUrl.startsWith('http')) {
    let baseCheckoutUrl = lakipayDirectUrl;
    if (baseCheckoutUrl.match(/^https?:\/\/(www\.)?lakipay\.co\/?$/i)) {
      baseCheckoutUrl = `https://checkout.lakipay.co/pay/${params.reference}`;
    }
    const separator = baseCheckoutUrl.includes('?') ? '&' : '?';
    const finalUrl = `${baseCheckoutUrl}${separator}amount=${params.amount}&reference=${params.reference}&title=${encodeURIComponent(params.title)}`;
    return {
      success: true,
      paymentUrl: finalUrl,
      checkoutUrl: finalUrl,
      reference: params.reference
    };
  }

  return {
    success: false,
    reference: params.reference,
    error: lastError || 'LakiPay initialization failed'
  };
}
