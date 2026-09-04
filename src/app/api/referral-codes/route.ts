export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
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

    // 0. Primary Supabase Fetch
    try {
      const { data: sbCodes, error: sbErr } = await supabase.from('referral_codes').select('*');
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
    } catch (sbE) {}

    if (adminDb) {
      const snap = await adminDb
        .collection('artifacts')
        .doc('tsehaycampus-e1a6d')
        .collection('public')
        .doc('data')
        .collection('referral_codes')
        .get();

      snap.docs.forEach(d => {
        const item = { id: d.id, ...(d.data() as any) };
        if (!list.some(existing => existing.id === item.id || existing.code === item.code)) {
          list.push(item);
        }
      });

      // Also check root promo_codes collection
      try {
        const rootSnap = await adminDb.collection('promo_codes').get();
        rootSnap.docs.forEach(d => {
          const docData = d.data() as any;
          const codeVal = docData?.code || d.id;
          if (!list.some(item => item.id === d.id || item.code === codeVal)) {
            list.push({ id: d.id, ...docData });
          }
        });
      } catch (e) {}

      return NextResponse.json({ success: true, codes: list }, { headers: NO_CACHE_HEADERS });
    }

    return NextResponse.json({ success: true, codes: list }, { headers: NO_CACHE_HEADERS });
  } catch (error: any) {
    console.error('Error fetching referral codes in API route:', error);
    return NextResponse.json({ success: true, codes: [] }, { headers: NO_CACHE_HEADERS });
  }
}
