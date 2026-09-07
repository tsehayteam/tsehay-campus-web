export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase/server';

const NO_CACHE_HEADERS = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
  'CDN-Cache-Control': 'no-store',
  'Vercel-CDN-Cache-Control': 'no-store',
  'Pragma': 'no-cache',
  'Expires': '0',
};

export async function GET() {
  try {
    const { data: row, error: sbErr } = await supabaseServer
      .from('site_settings')
      .select('data')
      .eq('key', 'referral_codes')
      .maybeSingle();

    if (!sbErr && row?.data) {
      const list = Array.isArray(row.data) ? row.data : Object.values(row.data);
      return NextResponse.json({ success: true, codes: list }, { headers: NO_CACHE_HEADERS });
    }

    return NextResponse.json({ success: true, codes: [] }, { headers: NO_CACHE_HEADERS });
  } catch (error: any) {
    console.error('Error fetching referral codes in API route:', error);
    return NextResponse.json({ success: true, codes: [] }, { headers: NO_CACHE_HEADERS });
  }
}
