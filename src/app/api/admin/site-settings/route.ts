import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { settingKey, data } = body;

    if (!settingKey || !data) {
      return NextResponse.json({ error: 'Missing settingKey or data' }, { status: 400 });
    }

    // Write to artifacts/tsehaycampus-e1a6d/public/data/site_settings/${settingKey}
    if (adminDb) {
      const docRef = adminDb.collection('artifacts').doc('tsehaycampus-e1a6d').collection('public').doc('data').collection('site_settings').doc(settingKey);
      await docRef.set({
        ...data,
        updatedAt: new Date().toISOString()
      }, { merge: true });
      return NextResponse.json({ success: true, message: 'Settings saved via Admin SDK' });
    }

    return NextResponse.json({ success: true, message: 'Saved with client sync' });
  } catch (error: any) {
    console.error('Error saving site settings in API route:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
