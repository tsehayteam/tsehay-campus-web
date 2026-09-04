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

    const { postId, userId, isLiked } = body;

    if (!postId || !userId) {
      return NextResponse.json({ success: false, error: 'postId and userId are required' }, { status: 400 });
    }

    let updatedLikes: string[] = [];

    if (adminDb) {
      // 1. Root community_posts
      try {
        const docRef = adminDb.collection('community_posts').doc(postId);
        const docSnap = await docRef.get();
        if (docSnap.exists) {
          const currentLikes: string[] = docSnap.data()?.likes || [];
          if (isLiked) {
            updatedLikes = currentLikes.filter(id => id !== userId);
          } else {
            updatedLikes = currentLikes.includes(userId) ? currentLikes : [...currentLikes, userId];
          }
          await docRef.update({ likes: updatedLikes });
        }
      } catch (e) {}

      // 2. Artifact collection fallback
      try {
        const artDocRef = adminDb
          .collection('artifacts')
          .doc('tsehaycampus-e1a6d')
          .collection('public')
          .doc('data')
          .collection('community_posts')
          .doc(postId);
        const artDocSnap = await artDocRef.get();
        if (artDocSnap.exists) {
          const currentLikes: string[] = artDocSnap.data()?.likes || [];
          const newLikes = isLiked ? currentLikes.filter(id => id !== userId) : (currentLikes.includes(userId) ? currentLikes : [...currentLikes, userId]);
          await artDocRef.update({ likes: newLikes });
        }
      } catch (e) {}
    }

    return NextResponse.json({
      success: true,
      message: isLiked ? 'ላይክ ተነስቷል' : 'ወድደውታል! ❤️',
      likes: updatedLikes
    });
  } catch (error: any) {
    console.error('Error in POST /api/community/like:', error);
    return NextResponse.json({ success: false, error: error.message || 'Internal server error' }, { status: 500 });
  }
}
