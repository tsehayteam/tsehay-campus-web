export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';

const NO_CACHE_HEADERS = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
  'CDN-Cache-Control': 'no-store',
  'Vercel-CDN-Cache-Control': 'no-store',
  'Pragma': 'no-cache',
  'Expires': '0',
};

export async function GET() {
  try {
    if (adminDb) {
      const snap = await adminDb
        .collection('artifacts')
        .doc('tsehaycampus-e1a6d')
        .collection('public')
        .doc('data')
        .collection('referral_codes')
        .get();

      const list: any[] = snap.docs.map(d => ({ id: d.id, ...(d.data() as any) }));

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

    return NextResponse.json({ success: true, codes: [] }, { headers: NO_CACHE_HEADERS });
  } catch (error: any) {
    console.error('Error fetching referral codes in API route:', error);
    return NextResponse.json({ success: true, codes: [] }, { headers: NO_CACHE_HEADERS });
  }
}
