export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase/server';
import { adminDb } from '@/lib/firebase/admin';
import { 
  loadPersistedCommunityComments, 
  savePersistedCommunityComment, 
  deletePersistedCommunityComment,
  loadPersistedCommunityPosts,
  savePersistedCommunityPosts
} from '@/lib/memoryStore';
import { INITIAL_SERVER_COMMUNITY_POSTS } from '@/lib/serverCourses';

const NO_CACHE_HEADERS = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
  'CDN-Cache-Control': 'no-store',
  'Vercel-CDN-Cache-Control': 'no-store',
  'Pragma': 'no-cache',
  'Expires': '0',
};

async function getAllCommentsMap(): Promise<Record<string, any[]>> {
  try {
    const { data: row, error } = await supabaseServer
      .from('site_settings')
      .select('data')
      .eq('key', 'community_comments')
      .maybeSingle();

    if (!error && row?.data && typeof row.data === 'object') {
      return row.data as Record<string, any[]>;
    }
  } catch (e) {}

  return {};
}

async function saveAllCommentsMap(commentsMap: Record<string, any[]>) {
  try {
    await supabaseServer
      .from('site_settings')
      .upsert({
        key: 'community_comments',
        data: commentsMap,
        updated_at: new Date().toISOString()
      });
  } catch (e) {}
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const postId = searchParams.get('postId') || searchParams.get('id');

    if (!postId) {
      return NextResponse.json({ success: false, error: 'postId is required' }, { status: 400 });
    }

    const commentsMap = await getAllCommentsMap();
    let comments = commentsMap[postId] || [];

    if (comments.length === 0) {
      comments = loadPersistedCommunityComments(postId);
    }

    comments.sort((a: any, b: any) => new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime());

    return NextResponse.json({
      success: true,
      postId,
      count: comments.length,
      comments
    }, { headers: NO_CACHE_HEADERS });
  } catch (error: any) {
    console.error('Error in GET /api/community/comment:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
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

    const { postId, authorId, authorName, authorEmail, authorPhoto, authorRole, isAdmin, isPro, content } = body;

    if (!postId || !content || !content.trim()) {
      return NextResponse.json({ success: false, error: 'postId and content are required' }, { status: 400 });
    }

    const commentId = body.id || `comm_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const nowIso = new Date().toISOString();

    const commentPayload = {
      id: commentId,
      postId,
      authorId: authorId || 'guest_user',
      authorName: authorName || 'ተማሪ',
      authorEmail: authorEmail || '',
      authorPhoto: authorPhoto || `https://ui-avatars.com/api/?name=${encodeURIComponent(authorName || 'User')}&background=f9b03c&color=111827&bold=true`,
      authorRole: authorRole || (isAdmin ? 'Admin' : 'Student'),
      isAdmin: Boolean(isAdmin),
      isPro: Boolean(isPro),
      content: content.trim(),
      createdAt: nowIso,
    };

    // 1. Update comments map in Supabase
    const commentsMap = await getAllCommentsMap();
    const existing = commentsMap[postId] || [];
    const updatedComments = [...existing.filter((c: any) => c.id !== commentId), commentPayload];
    commentsMap[postId] = updatedComments;
    await saveAllCommentsMap(commentsMap);
    savePersistedCommunityComment(postId, commentPayload);

    // 2. Increment commentsCount on the post
    try {
      const { data: postsRow } = await supabaseServer
        .from('site_settings')
        .select('data')
        .eq('key', 'community_posts')
        .maybeSingle();

      let postsList: any[] = Array.isArray(postsRow?.data) ? postsRow.data : loadPersistedCommunityPosts();
      if (postsList.length === 0) postsList = [...INITIAL_SERVER_COMMUNITY_POSTS];

      postsList = postsList.map((p: any) => {
        if (p.id === postId) {
          return {
            ...p,
            commentsCount: (p.commentsCount || 0) + 1,
            updatedAt: nowIso
          };
        }
        return p;
      });

      savePersistedCommunityPosts(postsList);
      await supabaseServer
        .from('site_settings')
        .upsert({
          key: 'community_posts',
          data: postsList,
          updated_at: nowIso
        });
    } catch (e) {}

    return NextResponse.json({
      success: true,
      message: 'አስተያየትዎ በተሳካ ሁኔታ ተለጥፏል',
      comment: commentPayload
    }, { headers: NO_CACHE_HEADERS });
  } catch (error: any) {
    console.error('Error in POST /api/community/comment:', error);
    return NextResponse.json({ success: false, error: error.message || 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const postId = searchParams.get('postId');
    const commentId = searchParams.get('commentId') || searchParams.get('id');

    if (!postId || !commentId) {
      return NextResponse.json({ success: false, error: 'postId and commentId are required' }, { status: 400 });
    }

    const commentsMap = await getAllCommentsMap();
    const existing = commentsMap[postId] || [];
    commentsMap[postId] = existing.filter((c: any) => c.id !== commentId);
    await saveAllCommentsMap(commentsMap);
    deletePersistedCommunityComment(postId, commentId);

    // Decrement commentsCount on post
    try {
      const { data: postsRow } = await supabaseServer
        .from('site_settings')
        .select('data')
        .eq('key', 'community_posts')
        .maybeSingle();

      let postsList: any[] = Array.isArray(postsRow?.data) ? postsRow.data : loadPersistedCommunityPosts();
      if (postsList.length > 0) {
        postsList = postsList.map((p: any) => {
          if (p.id === postId) {
            return {
              ...p,
              commentsCount: Math.max(0, (p.commentsCount || 1) - 1),
              updatedAt: new Date().toISOString()
            };
          }
          return p;
        });
        savePersistedCommunityPosts(postsList);
        await supabaseServer
          .from('site_settings')
          .upsert({
            key: 'community_posts',
            data: postsList,
            updated_at: new Date().toISOString()
          });
      }
    } catch (e) {}

    return NextResponse.json({
      success: true,
      message: 'Comment deleted successfully',
      commentId
    }, { headers: NO_CACHE_HEADERS });
  } catch (error: any) {
    console.error('Error in DELETE /api/community/comment:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

