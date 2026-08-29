import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    let body: any = {};
    try {
      body = await req.json();
    } catch (e) {
      body = {};
    }

    const { postId, isPinned } = body;

    if (!postId) {
      return NextResponse.json({ success: false, error: 'postId is required' }, { status: 400 });
    }

    const pinState = Boolean(isPinned);

    if (adminDb) {
      try {
        await adminDb.collection('community_posts').doc(postId).update({ isPinned: pinState });
      } catch (e) {}

      try {
        await adminDb
          .collection('artifacts')
          .doc('tsehaycampus-e1a6d')
          .collection('public')
          .doc('data')
          .collection('community_posts')
          .doc(postId)
          .update({ isPinned: pinState });
      } catch (e) {}
    }

    return NextResponse.json({
      success: true,
      message: pinState ? 'ፖስቱ ወደ ላይ ተሰክቷል 📌' : 'የተሰካው ፖስት ተነስቷል',
      isPinned: pinState
    });
  } catch (error: any) {
    console.error('Error in POST /api/community/pin:', error);
    return NextResponse.json({ success: false, error: error.message || 'Internal server error' }, { status: 500 });
  }
}
