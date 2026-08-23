import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';

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

      const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));

      // Also check root promo_codes collection if any exist
      try {
        const rootSnap = await adminDb.collection('promo_codes').get();
        rootSnap.docs.forEach(d => {
          if (!list.some(item => item.id === d.id || item.code === (d.data() as any).code)) {
            list.push({ id: d.id, ...d.data() });
          }
        });
      } catch (e) {}

      return NextResponse.json({ success: true, codes: list });
    }

    return NextResponse.json({ success: true, codes: [] });
  } catch (error: any) {
    console.error('Error fetching referral codes in API route:', error);
    return NextResponse.json({ error: error.message || 'Internal server error', codes: [] }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { code, discountPercent, targetCourseId, description, isActive } = body;

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

      const codeData = {
        id: cleanCode,
        code: cleanCode,
        discountPercent: Number(discountPercent) || 0,
        targetCourseId: targetCourseId || 'all',
        description: description?.trim() || '',
        isActive: isActive !== false,
        usageCount: 0,
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
    const { codeId, isActive } = body;

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

      await codeRef.set({
        isActive: Boolean(isActive),
        updatedAt: new Date().toISOString()
      }, { merge: true });

      try {
        await adminDb.collection('promo_codes').doc(cleanCode).set({
          isActive: Boolean(isActive),
          updatedAt: new Date().toISOString()
        }, { merge: true });
      } catch (e) {}

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error updating referral code in API route:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
