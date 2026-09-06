export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase/server';
import { adminDb } from '@/lib/firebase/admin';
import { 
  loadPersistedCommunityPosts, 
  savePersistedCommunityPosts, 
  saveSingleCommunityPost, 
  deletePersistedCommunityPost 
} from '@/lib/memoryStore';
import { INITIAL_SERVER_COMMUNITY_POSTS } from '@/lib/serverCourses';

const NO_CACHE_HEADERS = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
  'CDN-Cache-Control': 'no-store',
  'Vercel-CDN-Cache-Control': 'no-store',
  'Pragma': 'no-cache',
  'Expires': '0',
};

async function getSupabaseCommunityPosts(): Promise<any[]> {
  try {
    const { data: row, error } = await supabaseServer
      .from('site_settings')
      .select('data')
      .eq('key', 'community_posts')
      .maybeSingle();

    if (!error && row?.data && Array.isArray(row.data) && row.data.length > 0) {
      savePersistedCommunityPosts(row.data);
      return row.data;
    }
  } catch (e) {
    console.warn('Supabase admin community_posts fetch warning:', e);
  }

  const inMem = loadPersistedCommunityPosts();
  if (inMem && inMem.length > 0) return inMem;

  return INITIAL_SERVER_COMMUNITY_POSTS;
}

async function saveSupabaseCommunityPosts(posts: any[]) {
  const nowIso = new Date().toISOString();
  savePersistedCommunityPosts(posts);

  try {
    const { error } = await supabaseServer
      .from('site_settings')
      .upsert({
        key: 'community_posts',
        data: posts,
        updated_at: nowIso
      });

    if (error) {
      console.warn('Supabase admin community_posts upsert warning:', error);
    }
  } catch (e) {
    console.warn('Supabase admin community_posts save exception:', e);
  }

  if (adminDb) {
    try {
      await adminDb.collection('site_settings').doc('community_posts').set({ posts, updatedAt: nowIso }, { merge: true });
    } catch (e) {}
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const category = searchParams.get('category');
    const postId = searchParams.get('id') || searchParams.get('postId');

    let postsList = await getSupabaseCommunityPosts();

    if (postId) {
      const match = postsList.find((p: any) => p.id === postId);
      if (match) {
        return NextResponse.json({ success: true, post: match }, { headers: NO_CACHE_HEADERS });
      }
      return NextResponse.json({ success: false, error: 'Post not found' }, { status: 404, headers: NO_CACHE_HEADERS });
    }

    if (category && category !== 'all') {
      if (category === 'pinned') {
        postsList = postsList.filter((p: any) => p.isPinned);
      } else {
        postsList = postsList.filter((p: any) => p.category === category);
      }
    }

    postsList.sort((a: any, b: any) => {
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      const timeA = new Date(a.createdAt || 0).getTime();
      const timeB = new Date(b.createdAt || 0).getTime();
      return timeB - timeA;
    });

    return NextResponse.json({
      success: true,
      count: postsList.length,
      posts: postsList
    }, { headers: NO_CACHE_HEADERS });
  } catch (error: any) {
    console.error('Error in GET /api/admin/community:', error);
    return NextResponse.json({
      success: true,
      posts: INITIAL_SERVER_COMMUNITY_POSTS,
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

    const { content, category, authorName, authorPhoto, authorEmail, authorRole, isPinned, isFeatured, imageUrl, codeSnippet, tags } = body;

    if (!content && !imageUrl && !codeSnippet) {
      return NextResponse.json({ success: false, error: 'Post content is required' }, { status: 400 });
    }

    const postId = body.id || `post_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const postPayload = {
      id: postId,
      authorId: body.authorId || 'admin_eyoub',
      authorName: authorName || 'Eyoub Sahle (Admin)',
      authorEmail: authorEmail || 'eyobsahle@gmail.com',
      authorPhoto: authorPhoto || '/assets/eyob_white.jpg',
      authorRole: authorRole || 'Admin',
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

    const currentPosts = await getSupabaseCommunityPosts();
    const updatedPosts = [postPayload, ...currentPosts.filter((p: any) => p.id !== postId)];

    await saveSupabaseCommunityPosts(updatedPosts);
    saveSingleCommunityPost(postPayload);

    return NextResponse.json({
      success: true,
      message: 'ፖስቱ በተሳካ ሁኔታ ተለጠፈ (Post created successfully)',
      post: postPayload
    }, { headers: NO_CACHE_HEADERS });
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

    const currentPosts = await getSupabaseCommunityPosts();
    let updatedPost: any = null;

    const updatedPosts = currentPosts.map((p: any) => {
      if (p.id === postId) {
        updatedPost = {
          ...p,
          ...body,
          updatedAt: new Date().toISOString()
        };
        return updatedPost;
      }
      return p;
    });

    if (updatedPost) {
      await saveSupabaseCommunityPosts(updatedPosts);
      saveSingleCommunityPost(updatedPost);
    }

    return NextResponse.json({
      success: true,
      message: 'የፖስቱ ሁኔታ ተስተካክሏል (Post updated successfully)',
      postId,
      post: updatedPost,
      updates: body
    }, { headers: NO_CACHE_HEADERS });
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

    const currentPosts = await getSupabaseCommunityPosts();
    const updatedPosts = currentPosts.filter((p: any) => p.id !== postId);

    await saveSupabaseCommunityPosts(updatedPosts);
    deletePersistedCommunityPost(postId);

    return NextResponse.json({
      success: true,
      message: 'ፖስቱ በተሳካ ሁኔታ ተሰርዟል! (Post deleted successfully)',
      postId
    }, { headers: NO_CACHE_HEADERS });
  } catch (error: any) {
    console.error('Error in DELETE /api/admin/community:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Internal server error'
    }, { status: 500 });
  }
}

