export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase/server';
import { loadPersistedCommunityPosts, savePersistedCommunityPosts } from '@/lib/memoryStore';
import { INITIAL_SERVER_COMMUNITY_POSTS } from '@/lib/serverCourses';

const NO_CACHE_HEADERS = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
  'CDN-Cache-Control': 'no-store',
  'Vercel-CDN-Cache-Control': 'no-store',
  'Pragma': 'no-cache',
  'Expires': '0',
};

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

    // 1. Fetch current posts from Supabase
    let postsList: any[] = [];
    try {
      const { data: row, error } = await supabaseServer
        .from('site_settings')
        .select('data')
        .eq('key', 'community_posts')
        .maybeSingle();

      if (!error && row?.data && Array.isArray(row.data)) {
        postsList = row.data;
      }
    } catch (e) {}

    if (postsList.length === 0) {
      const inMem = loadPersistedCommunityPosts();
      postsList = inMem.length > 0 ? inMem : [...INITIAL_SERVER_COMMUNITY_POSTS];
    }

    postsList = postsList.map((p: any) => {
      if (p.id === postId) {
        return {
          ...p,
          isPinned: pinState,
          updatedAt: new Date().toISOString()
        };
      }
      return p;
    });

    savePersistedCommunityPosts(postsList);
    try {
      await supabaseServer
        .from('site_settings')
        .upsert({
          key: 'community_posts',
          data: postsList,
          updated_at: new Date().toISOString()
        });
    } catch (e) {}

    return NextResponse.json({
      success: true,
      message: pinState ? 'ፖስቱ ወደ ላይ ተሰክቷል 📌' : 'የተሰካው ፖስት ተነስቷል',
      isPinned: pinState
    }, { headers: NO_CACHE_HEADERS });
  } catch (error: any) {
    console.error('Error in POST /api/community/pin:', error);
    return NextResponse.json({ success: false, error: error.message || 'Internal server error' }, { status: 500 });
  }
}
