import { NextRequest, NextResponse } from 'next/server';
import { adminDb, getAdminDb } from '@/lib/firebase/admin';

export interface PromoCodeItem {
  id: string;
  code?: string;
  discountPercent?: number;
  targetCourseId?: string;
  description?: string;
  isActive?: boolean;
  usageCount?: number;
  maxUsageLimit?: number; // 0 or undefined for Unlimited
  createdAt?: string;
  updatedAt?: string;
  [key: string]: any;
}

export async function GET() {
  try {
    const db = getAdminDb();
    if (db && typeof db.collection === 'function') {
      const snap = await db
        .collection('artifacts')
        .doc('tsehaycampus-e1a6d')
        .collection('public')
        .doc('data')
        .collection('referral_codes')
        .get();

      const list: PromoCodeItem[] = snap.docs.map(d => ({ id: d.id, ...(d.data() as any) }));

      // Also check root promo_codes collection if any exist
      try {
        const rootSnap = await db.collection('promo_codes').get();
        rootSnap.docs.forEach(d => {
          const docData = d.data() as any;
          const codeVal = docData?.code || d.id;
          if (!list.some(item => item.id === d.id || item.code === codeVal)) {
            list.push({ id: d.id, ...docData });
          }
        });
      } catch (e) {}

      return NextResponse.json({ success: true, codes: list });
    }

    return NextResponse.json({ success: true, codes: [] });
  } catch (error: any) {
    console.warn('Notice fetching referral codes in API route:', error);
    return NextResponse.json({ success: true, codes: [] });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { code, discountPercent, targetCourseId, description, isActive, maxUsageLimit } = body;

    if (!code) {
      return NextResponse.json({ error: 'Missing code' }, { status: 400 });
    }

    const cleanCode = code.trim().toUpperCase();

    if (adminDb) {
      const codeRef = adminDb
        .collection('artifacts')
        .doc('tsehaycampus-e1a6d')
        .collection('public')
        .doc('data')
        .collection('referral_codes')
        .doc(cleanCode);

      const codeData: PromoCodeItem = {
        id: cleanCode,
        code: cleanCode,
        discountPercent: Number(discountPercent) || 0,
        targetCourseId: targetCourseId || 'all',
        description: description?.trim() || '',
        isActive: isActive !== false,
        usageCount: Number(body.usageCount) || 0,
        maxUsageLimit: Number(maxUsageLimit) || 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      await codeRef.set(codeData, { merge: true });

      // Also mirror to root promo_codes
      try {
        await adminDb.collection('promo_codes').doc(cleanCode).set(codeData, { merge: true });
      } catch (e) {}

      return NextResponse.json({ success: true, message: `Code ${cleanCode} saved successfully`, data: codeData });
    }

    return NextResponse.json({ success: true, message: 'Saved via client sync' });
  } catch (error: any) {
    console.error('Error creating referral code in API route:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const codeId = searchParams.get('codeId');

    if (!codeId) {
      return NextResponse.json({ error: 'Missing codeId' }, { status: 400 });
    }

    const cleanCode = codeId.trim().toUpperCase();

    if (adminDb) {
      const codeRef = adminDb
        .collection('artifacts')
        .doc('tsehaycampus-e1a6d')
        .collection('public')
        .doc('data')
        .collection('referral_codes')
        .doc(cleanCode);

      await codeRef.delete();

      try {
        await adminDb.collection('promo_codes').doc(cleanCode).delete();
      } catch (e) {}

      return NextResponse.json({ success: true, message: `Code ${cleanCode} deleted successfully` });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting referral code in API route:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { codeId, isActive, maxUsageLimit } = body;

    if (!codeId) {
      return NextResponse.json({ error: 'Missing codeId' }, { status: 400 });
    }

    const cleanCode = codeId.trim().toUpperCase();

    if (adminDb) {
      const codeRef = adminDb
        .collection('artifacts')
        .doc('tsehaycampus-e1a6d')
        .collection('public')
        .doc('data')
        .collection('referral_codes')
        .doc(cleanCode);

      const updateData: any = {
        updatedAt: new Date().toISOString()
      };
      if (isActive !== undefined) updateData.isActive = Boolean(isActive);
      if (maxUsageLimit !== undefined) updateData.maxUsageLimit = Number(maxUsageLimit) || 0;

      await codeRef.set(updateData, { merge: true });

      try {
        await adminDb.collection('promo_codes').doc(cleanCode).set(updateData, { merge: true });
      } catch (e) {}

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error updating referral code in API route:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
