export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';

const NO_CACHE_HEADERS = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
  'CDN-Cache-Control': 'no-store',
  'Vercel-CDN-Cache-Control': 'no-store',
  'Pragma': 'no-cache',
  'Expires': '0',
};

export async function GET() {
  try {
    const list: any[] = [];

    const { data: sbCodes, error: sbErr } = await supabase
      .from('referral_codes')
      .select('*')
      .order('created_at', { ascending: false });

    if (!sbErr && Array.isArray(sbCodes)) {
      sbCodes.forEach(c => {
        list.push({
          id: c.id,
          code: c.code,
          discountPercent: Number(c.discount_percent) || 0,
          targetCourseId: c.target_course_id || 'all',
          description: c.description,
          isActive: c.is_active ?? true,
          usageCount: Number(c.usage_count) || 0,
          maxUsageLimit: Number(c.max_usage_limit) || 0,
          createdAt: c.created_at
        });
      });
    }

    return NextResponse.json({ success: true, codes: list }, { headers: NO_CACHE_HEADERS });
  } catch (error: any) {
    console.error('Error fetching referral codes in API route:', error);
    return NextResponse.json({ success: true, codes: [] }, { headers: NO_CACHE_HEADERS });
  }
}
