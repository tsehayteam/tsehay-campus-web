export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase/server';
import { DEFAULT_PROMO_CODES } from '@/lib/referralService';

const NO_CACHE_HEADERS = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
  'CDN-Cache-Control': 'no-store',
  'Vercel-CDN-Cache-Control': 'no-store',
  'Pragma': 'no-cache',
  'Expires': '0',
};

export async function GET() {
  try {
    let list: any[] = [];
    const { data: row, error: sbErr } = await supabaseServer
      .from('site_settings')
      .select('data')
      .eq('key', 'referral_codes')
      .maybeSingle();

    if (!sbErr && row?.data) {
      list = Array.isArray(row.data) ? row.data : Object.values(row.data);
    }

    // Merge DEFAULT_PROMO_CODES if not already present
    const merged = [...list];
    for (const def of DEFAULT_PROMO_CODES) {
      const defCode = def.code.toUpperCase();
      const defId = (def.id || def.code).toUpperCase();
      if (!merged.some((item: any) => item.code?.toUpperCase() === defCode || item.id?.toUpperCase() === defId)) {
        merged.unshift(def);
      }
    }

    return NextResponse.json({ success: true, codes: merged }, { headers: NO_CACHE_HEADERS });
  } catch (error: any) {
    console.error('Error fetching referral codes in API route:', error);
    return NextResponse.json({ success: true, codes: DEFAULT_PROMO_CODES }, { headers: NO_CACHE_HEADERS });
  }
}
