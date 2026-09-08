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

  if (!formattedApiKey || (!pubKey && !rawApiKey)) {
    return {
      success: false,
      reference: params.reference,
      error: 'የLakiPay ሂሳብ ቁልፎች (LAKIPAY_PUBLIC_KEY / LAKIPAY_SECRET_KEY) በ Vercel Environment Variables ውስጥ አልተገኙም።'
    };
  }

  const formattedPhone = params.phoneNumber ? formatEthiopianPhone(params.phoneNumber) : '';
  if (!formattedPhone) {
    return {
      success: false,
      reference: params.reference,
      error: 'ትክክለኛ የኢትዮጵያ ስልክ ቁጥር ያስፈልጋል (ለምሳሌ 0911223344 ወይም 0711223344)።'
    };
  }

  // Base payload: LakiPay Hosted Checkout v2 requires phone_number and accepts supported_mediums
  const dynamicPayload = {
    amount: Number(params.amount),
    currency: params.currency || 'ETB',
    phone_number: formattedPhone,
    reference: params.reference,
    title: String(params.title || 'Tsehay Campus'),
    description: params.description || 'Tsehay Campus Education & Events',
    email: params.email,
    first_name: params.firstName || (params.email ? params.email.split('@')[0] : 'Student'),
    last_name: params.lastName || 'Campus',
    supported_mediums: ["TELEBIRR", "CBE", "MPESA", "ETHSWITCH", "OROMIA_BANK", "AWASH"],
    callback_url: params.callbackUrl,
    callbackUrl: params.callbackUrl,
    return_url: params.successUrl,
    returnUrl: params.successUrl,
    redirects: {
      success: params.successUrl,
      failed: params.failedUrl
    }
  };

  // Endpoint sequence: Primary official v2 checkout -> fallback v1 initialize
  const endpoints = Array.from(new Set([
    process.env.LAKIPAY_ENDPOINT,
    'https://api.lakipay.co/api/v2/payment/checkout',
    'https://api.lakipay.co/v2/payment/checkout',
    'https://api.lakipay.co/api/v1/payment/initialize'
  ].filter(Boolean))) as string[];

  let lastError: string | null = null;

  for (const endpoint of endpoints) {
    try {
      console.log(`[LakiPay Checkout] Requesting session from ${endpoint} for ref: ${params.reference}, phone: ${formattedPhone}`);
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': formattedApiKey
        },
        body: JSON.stringify(dynamicPayload)
      });

      const resData = await response.json().catch(() => null);
      console.log(`[LakiPay Checkout] Response status [${response.status}] from ${endpoint}:`, resData);

      if (resData) {
        const returnedRef = resData.data?.reference || resData.reference || resData.data?.transaction_id || resData.transaction_id || params.reference;
        
        // Extract checkoutUrl / paymentUrl across standard LakiPay response schema variations
        const targetUrl = 
          resData.data?.checkout_url ||
          resData.checkout_url ||
          resData.data?.payment_url ||
          resData.payment_url ||
          resData.data?.checkoutUrl ||
          resData.checkoutUrl ||
          resData.data?.paymentUrl ||
          resData.paymentUrl ||
          resData.data?.url ||
          resData.url ||
          resData.data?.redirect_url ||
          resData.redirect_url;

        if (targetUrl && typeof targetUrl === 'string' && targetUrl.startsWith('http')) {
          return {
            success: true,
            paymentUrl: targetUrl,
            checkoutUrl: targetUrl,
            reference: returnedRef
          };
        }

        // If the API explicitly complains about supported_mediums, retry without it
        if (resData.error?.includes?.('supported_mediums') || resData.message?.includes?.('supported_mediums')) {
          const fallbackPayload: any = { ...dynamicPayload };
          delete fallbackPayload.supported_mediums;

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
            retryData?.data?.checkout_url ||
            retryData?.checkout_url ||
            retryData?.data?.payment_url ||
            retryData?.payment_url ||
            retryData?.data?.paymentUrl ||
            retryData?.paymentUrl ||
            retryData?.data?.checkoutUrl ||
            retryData?.checkoutUrl ||
            retryData?.data?.url ||
            retryData?.url;

          if (retryUrl && typeof retryUrl === 'string' && retryUrl.startsWith('http')) {
            return {
              success: true,
              paymentUrl: retryUrl,
              checkoutUrl: retryUrl,
              reference: retryData.data?.reference || retryData.reference || returnedRef
            };
          }
        }

        lastError = resData.data?.message || resData.message || resData.error?.message || resData.error || resData.detail;
      }
    } catch (err: any) {
      console.warn(`LakiPay initialization warning on ${endpoint}:`, err?.message || err);
      lastError = err?.message || 'Connection failed';
    }
  }

  // NOTE: checkout.lakipay.co does NOT support query checkouts (/pay?amount=...) and returns 404.
  // We strictly avoid redirecting users to broken query URLs.
  const customDirectUrl = (process.env.LAKIPAY_DIRECT_URL || '').trim();
  if (customDirectUrl && customDirectUrl.startsWith('http') && !customDirectUrl.includes('lakipay.co')) {
    const separator = customDirectUrl.includes('?') ? '&' : '?';
    const finalUrl = `${customDirectUrl}${separator}amount=${params.amount}&reference=${params.reference}&title=${encodeURIComponent(params.title)}`;
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
    error: lastError ? (typeof lastError === 'string' ? lastError : JSON.stringify(lastError)) : 'የLakiPay ክፍያ ማስጀመር አልተሳካም። እባክዎ የስልክ ቁጥርዎን እና የኢንተርኔት ግንኙነትዎን ያረጋግጡ።'
  };
}
