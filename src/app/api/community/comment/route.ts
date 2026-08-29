import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    let body: any = {};
    try {
      body = await req.json();
    } catch (e) {
      body = {};
    }

    const { postId, authorId, authorName, authorEmail, authorPhoto, isAdmin, isPro, content } = body;

    if (!postId || !content || !content.trim()) {
      return NextResponse.json({ success: false, error: 'postId and content are required' }, { status: 400 });
    }

    const commentId = `comm_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const nowIso = new Date().toISOString();

    const commentPayload = {
      id: commentId,
      postId,
      authorId: authorId || 'guest_user',
      authorName: authorName || 'ተማሪ',
      authorEmail: authorEmail || '',
      authorPhoto: authorPhoto || `https://ui-avatars.com/api/?name=${encodeURIComponent(authorName || 'User')}&background=f9b03c&color=111827&bold=true`,
      isAdmin: Boolean(isAdmin),
      isPro: Boolean(isPro),
      content: content.trim(),
      createdAt: nowIso,
    };

    if (adminDb) {
      // 1. Root community_posts/{postId}/comments
      try {
        await adminDb
          .collection('community_posts')
          .doc(postId)
          .collection('comments')
          .doc(commentId)
          .set(commentPayload, { merge: true });

        // Increment commentsCount
        await adminDb
          .collection('community_posts')
          .doc(postId)
          .update({
            commentsCount: FieldValue.increment(1)
          });
      } catch (e) {}

      // 2. Artifacts collection fallback
      try {
        await adminDb
          .collection('artifacts')
          .doc('tsehaycampus-e1a6d')
          .collection('public')
          .doc('data')
          .collection('community_posts')
          .doc(postId)
          .collection('comments')
          .doc(commentId)
          .set(commentPayload, { merge: true });

        await adminDb
          .collection('artifacts')
          .doc('tsehaycampus-e1a6d')
          .collection('public')
          .doc('data')
          .collection('community_posts')
          .doc(postId)
          .update({
            commentsCount: FieldValue.increment(1)
          });
      } catch (e) {}
    }

    return NextResponse.json({
      success: true,
      message: 'አስተያየትዎ በተሳካ ሁኔታ ተለጥፏል',
      comment: commentPayload
    });
  } catch (error: any) {
    console.error('Error in POST /api/community/comment:', error);
    return NextResponse.json({ success: false, error: error.message || 'Internal server error' }, { status: 500 });
  }
}
