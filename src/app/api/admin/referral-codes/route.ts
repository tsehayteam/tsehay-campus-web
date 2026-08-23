import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';

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

      await codeRef.set({
        code: cleanCode,
        discountPercent: Number(discountPercent) || 0,
        targetCourseId: targetCourseId || 'all',
        description: description?.trim() || '',
        isActive: isActive !== false,
        usageCount: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }, { merge: true });

      return NextResponse.json({ success: true, message: `Code ${cleanCode} saved successfully` });
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

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error updating referral code in API route:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
