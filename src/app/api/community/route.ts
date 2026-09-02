export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { INITIAL_COMMUNITY_POSTS } from '@/lib/communityService';

const NO_CACHE_HEADERS = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
  'CDN-Cache-Control': 'no-store',
  'Vercel-CDN-Cache-Control': 'no-store',
  'Pragma': 'no-cache',
  'Expires': '0',
};

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const category = searchParams.get('category');
    const postId = searchParams.get('id') || searchParams.get('postId');

    if (!adminDb) {
      return NextResponse.json({
        success: true,
        posts: INITIAL_COMMUNITY_POSTS
      }, { headers: NO_CACHE_HEADERS });
    }

    if (postId) {
      let snap = await adminDb
        .collection('artifacts')
        .doc('tsehaycampus-e1a6d')
        .collection('community_posts')
        .doc(postId)
        .get();

      if (!snap.exists) {
        snap = await adminDb.collection('community_posts').doc(postId).get();
      }

      if (snap.exists) {
        return NextResponse.json({
          success: true,
          post: { id: snap.id, ...snap.data() }
        }, { headers: NO_CACHE_HEADERS });
      }

      const match = INITIAL_COMMUNITY_POSTS.find(p => p.id === postId);
      if (match) {
        return NextResponse.json({ success: true, post: match }, { headers: NO_CACHE_HEADERS });
      }

      return NextResponse.json({ success: false, error: 'Post not found' }, { status: 404, headers: NO_CACHE_HEADERS });
    }

    // Fetch from artifacts collection
    let postsList: any[] = [];
    try {
      const snap = await adminDb
        .collection('artifacts')
        .doc('tsehaycampus-e1a6d')
        .collection('community_posts')
        .get();

      if (!snap.empty) {
        postsList = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      }
    } catch (e) {}

    // Fallback to root community_posts
    if (postsList.length === 0) {
      try {
        const rootSnap = await adminDb.collection('community_posts').get();
        if (!rootSnap.empty) {
          postsList = rootSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        }
      } catch (e) {}
    }

    // If completely empty, fallback to initial posts
    if (postsList.length === 0) {
      postsList = INITIAL_COMMUNITY_POSTS;
    }

    if (category && category !== 'all') {
      if (category === 'pinned') {
        postsList = postsList.filter(p => p.isPinned);
      } else {
        postsList = postsList.filter(p => p.category === category);
      }
    }

    // Sort pinned first, then newest
    postsList.sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      const timeA = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const timeB = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return timeB - timeA;
    });

    return NextResponse.json({
      success: true,
      count: postsList.length,
      posts: postsList
    }, { headers: NO_CACHE_HEADERS });
  } catch (error: any) {
    console.error('Error in GET /api/community:', error);
    return NextResponse.json({
      success: true,
      posts: INITIAL_COMMUNITY_POSTS,
      error: error.message
    }, { headers: NO_CACHE_HEADERS });
  }
}

export async function POST(req: NextRequest) {
  try {
    let body: any = {};
    try {
      body = await req.json();
    } catch (e) {
      body = {};
    }

    const { content, category, authorName, authorPhoto, authorEmail, isPinned, isFeatured, imageUrl, codeSnippet, tags } = body;

    if (!content && !imageUrl && !codeSnippet) {
      return NextResponse.json({ success: false, error: 'Post content is required' }, { status: 400 });
    }

    const postId = body.id || `post_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const postPayload = {
      id: postId,
      authorId: body.authorId || 'guest_user',
      authorName: authorName || 'ተማሪ',
      authorEmail: authorEmail || '',
      authorPhoto: authorPhoto || '/assets/eyob_white.jpg',
      content: content || '',
      category: category || 'general',
      tags: tags || [],
      imageUrl: imageUrl || null,
      codeSnippet: codeSnippet || null,
      likes: [],
      commentsCount: 0,
      isPinned: Boolean(isPinned),
      isFeatured: Boolean(isFeatured),
      isAdmin: Boolean(body.isAdmin),
      isPro: Boolean(body.isPro),
      createdAt: new Date().toISOString()
    };

    if (adminDb) {
      try {
        await adminDb
          .collection('artifacts')
          .doc('tsehaycampus-e1a6d')
          .collection('community_posts')
          .doc(postId)
          .set(postPayload, { merge: true });
      } catch (e) {}

      try {
        await adminDb.collection('community_posts').doc(postId).set(postPayload, { merge: true });
      } catch (e) {}
    }

    return NextResponse.json({ success: true, post: postPayload });
  } catch (error: any) {
    console.error('Error in POST /api/community:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
