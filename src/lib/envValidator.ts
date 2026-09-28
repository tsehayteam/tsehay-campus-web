/**
 * Startup Environment Validator
 *
 * Validates existence and basic structure of critical environment variables
 * to prevent runtime crashes, misconfigurations, and silent failures in production.
 *
 * Strictly NEVER logs secret values to standard out.
 */

let hasValidated = false;

export interface EnvValidationReport {
  isValid: boolean;
  missingRequired: string[];
  missingRecommended: string[];
}

export function validateServerEnv(): EnvValidationReport {
  if (hasValidated) {
    return { isValid: true, missingRequired: [], missingRecommended: [] };
  }

  const requiredVars: { key: string; description: string }[] = [
    { key: 'NEXT_PUBLIC_SUPABASE_URL', description: 'Supabase Project URL' },
    { key: 'NEXT_PUBLIC_SUPABASE_ANON_KEY', description: 'Supabase Anon Public Key' },
  ];

  const recommendedVars: { key: string; description: string }[] = [
    { key: 'SUPABASE_SERVICE_ROLE_KEY', description: 'Supabase Service Role Key for server-side admin ops' },
    { key: 'LAKIPAY_PUBLIC_KEY', description: 'LakiPay Payment Public Key' },
    { key: 'LAKIPAY_SECRET_KEY', description: 'LakiPay Payment Secret Key' },
    { key: 'RESEND_API_KEY', description: 'Resend API Key for automated transactional emails' },
  ];

  const missingRequired: string[] = [];
  const missingRecommended: string[] = [];

  for (const item of requiredVars) {
    const val = process.env[item.key];
    if (!val || val.trim() === '') {
      missingRequired.push(item.key);
    }
  }

  for (const item of recommendedVars) {
    const val = process.env[item.key];
    if (!val || val.trim() === '') {
      missingRecommended.push(item.key);
    }
  }

  const isValid = missingRequired.length === 0;

  if (!isValid) {
    console.error(
      `[ENV VALIDATION CRITICAL] Missing mandatory environment variables: ${missingRequired.join(', ')}. ` +
      `Some core features may not operate properly until these are set in Vercel or your .env.local file.`
    );
  } else if (missingRecommended.length > 0) {
    console.warn(
      `[ENV VALIDATION NOTICE] Recommended integration variables not detected: ${missingRecommended.join(', ')}. ` +
      `Corresponding third-party integrations (payments/email) will run in fallback or mock mode.`
    );
  } else {
    console.log('[ENV VALIDATION OK] All essential and integration environment variables are properly initialized.');
  }

  hasValidated = true;

  return {
    isValid,
    missingRequired,
    missingRecommended,
  };
}
