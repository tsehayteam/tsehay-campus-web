import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { INITIAL_COMMUNITY_POSTS } from '@/lib/communityService';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const category = searchParams.get('category');
    const postId = searchParams.get('id') || searchParams.get('postId');

    if (!adminDb) {
      return NextResponse.json({
        success: true,
        posts: INITIAL_COMMUNITY_POSTS
      });
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
        });
      }

      const match = INITIAL_COMMUNITY_POSTS.find(p => p.id === postId);
      if (match) {
        return NextResponse.json({ success: true, post: match });
      }

      return NextResponse.json({ success: false, error: 'Post not found' }, { status: 404 });
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

    // If completely empty, seed with initial posts
    if (postsList.length === 0) {
      postsList = INITIAL_COMMUNITY_POSTS;
      try {
        for (const post of INITIAL_COMMUNITY_POSTS) {
          await adminDb
            .collection('artifacts')
            .doc('tsehaycampus-e1a6d')
            .collection('community_posts')
            .doc(post.id)
            .set(post, { merge: true });
        }
      } catch (e) {}
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
    });
  } catch (error: any) {
    console.error('Error in GET /api/admin/community:', error);
    return NextResponse.json({
      success: true,
      posts: INITIAL_COMMUNITY_POSTS,
      error: error.message
    });
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

    const postId = `post_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const postPayload = {
      id: postId,
      authorId: body.authorId || 'admin_eyoub',
      authorName: authorName || 'Eyoub Sahle (Admin)',
      authorEmail: authorEmail || 'eyoubsahle@gmail.com',
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
      isAdmin: true,
      isPro: true,
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

    return NextResponse.json({
      success: true,
      message: 'ፖስቱ በተሳካ ሁኔታ ተለጠፈ (Post created successfully)',
      post: postPayload
    });
  } catch (error: any) {
    console.error('Error in POST /api/admin/community:', error);
    return NextResponse.json({ success: false, error: error.message || 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    let body: any = {};
    try {
      body = await req.json();
    } catch (e) {
      body = {};
    }

    const { searchParams } = new URL(req.url);
    const postId = searchParams.get('id') || searchParams.get('postId') || body.id || body.postId;

    if (!postId) {
      return NextResponse.json({ success: false, error: 'Missing postId' }, { status: 400 });
    }

    const updateFields: any = {
      updatedAt: new Date().toISOString()
    };

    if (typeof body.isPinned === 'boolean') updateFields.isPinned = body.isPinned;
    if (typeof body.isFeatured === 'boolean') updateFields.isFeatured = body.isFeatured;
    if (body.category) updateFields.category = body.category;
    if (body.content) updateFields.content = body.content;

    if (adminDb) {
      try {
        await adminDb
          .collection('artifacts')
          .doc('tsehaycampus-e1a6d')
          .collection('community_posts')
          .doc(postId)
          .set(updateFields, { merge: true });
      } catch (e) {}

      try {
        await adminDb.collection('community_posts').doc(postId).set(updateFields, { merge: true });
      } catch (e) {}
    }

    return NextResponse.json({
      success: true,
      message: 'የፖስቱ ሁኔታ ተስተካክሏል (Post updated successfully)',
      postId,
      updates: updateFields
    });
  } catch (error: any) {
    console.error('Error in PATCH /api/admin/community:', error);
    return NextResponse.json({ success: false, error: error.message || 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  return PATCH(req);
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    let postId = searchParams.get('id') || searchParams.get('postId');

    if (!postId) {
      try {
        const body = await req.json();
        postId = body?.id || body?.postId;
      } catch (e) {}
    }

    if (!postId) {
      return NextResponse.json({ success: false, error: 'Missing postId' }, { status: 400 });
    }

    if (adminDb) {
      // 1. Delete from artifacts collection
      try {
        await adminDb
          .collection('artifacts')
          .doc('tsehaycampus-e1a6d')
          .collection('community_posts')
          .doc(postId)
          .delete();
      } catch (e) {}

      // 2. Delete from root collection
      try {
        await adminDb.collection('community_posts').doc(postId).delete();
      } catch (e) {}
    }

    return NextResponse.json({
      success: true,
      message: 'ፖስቱ በተሳካ ሁኔታ ተሰርዟል! (Post deleted successfully)',
      postId
    });
  } catch (error: any) {
    console.error('Error in DELETE /api/admin/community:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Internal server error'
    }, { status: 500 });
  }
}
