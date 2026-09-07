import { supabase } from '@/lib/supabase/client';

export interface CommunityPost {
  id: string;
  authorId: string;
  authorName: string;
  authorEmail: string;
  authorPhoto: string;
  authorRole?: string;
  isAdmin: boolean;
  isPro: boolean;
  content: string;
  codeSnippet?: {
    code: string;
    language: string;
  } | null;
  imageUrl?: string | null;
  category: 'general' | 'questions' | 'success' | 'tech' | 'business';
  tags?: string[];
  likes: string[]; // array of user UIDs
  commentsCount: number;
  isPinned?: boolean;
  isFeatured?: boolean;
  createdAt: any;
  updatedAt?: any;
}

export interface CommunityComment {
  id: string;
  postId: string;
  authorId: string;
  authorName: string;
  authorEmail: string;
  authorPhoto: string;
  isAdmin: boolean;
  isPro: boolean;
  content: string;
  createdAt: any;
}

export interface DirectMessage {
  id: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  senderPhoto: string;
  senderEmail: string;
  receiverId: string;
  receiverName?: string;
  receiverPhoto?: string;
  receiverEmail?: string;
  content: string;
  imageUrl?: string | null;
  createdAt: any;
  updatedAt?: any;
  isRead: boolean;
  status?: 'sent' | 'delivered' | 'read';
  readAt?: any;
  isEdited?: boolean;
  editedAt?: any;
  isDeleted?: boolean;
}

export interface ParticipantDetail {
  name: string;
  photo: string;
  email: string;
  isAdmin?: boolean;
  isPro?: boolean;
}

export interface Conversation {
  id: string;
  participants: string[];
  participantDetails: { [uid: string]: ParticipantDetail };
  lastMessage: string;
  lastMessageSenderId: string;
  lastMessageTime: any;
  unreadCount?: { [uid: string]: number };
}

// 🌟 DEFAULT SAMPLE POSTS FOR INSTANT ZERO-LATENCY FALLBACK & DEMO
export const INITIAL_COMMUNITY_POSTS: CommunityPost[] = [
  {
    id: 'sample-admin-welcome',
    authorId: 'admin-tsehay',
    authorName: 'Tsehay Campus Admin',
    authorEmail: 'admin@tsehaycampus.com',
    authorPhoto: '/tc-logo.jpg',
    isAdmin: true,
    isPro: true,
    content: '🎉 እንኳን ወደ Tsehay Campus የተማሪዎች ማህበረሰብ (Student Community & Social Network) በደህና መጡ! \n\nእዚህ ክፍል ውስጥ የኮርስ ጥያቄዎችዎን መጠየቅ፣ ያገኛችሁትን የስራ እና የቢዝነስ ስኬት ማጋራት፣ እንዲሁም ከአስተማሪዎች እና ከተማሪ ጓደኞቻችሁ ጋር ቀጥታ መወያየት ትችላላችሁ። መልካም የመማር እና የማደግ ጊዜ ይሁንልን! 🚀',
    category: 'general',
    tags: ['አጠቃላይ', 'ማስታወቂያ', 'እንኳን_ደህና_መጡ'],
    likes: ['user-sample-1', 'user-sample-2', 'user-sample-3'],
    commentsCount: 2,
    isPinned: true,
    isFeatured: true,
    createdAt: new Date(Date.now() - 3600000 * 2).toISOString(),
  },
  {
    id: 'sample-student-success',
    authorId: 'student-yosef',
    authorName: 'ዮሴፍ ተስፋዬ',
    authorEmail: 'yosef.tesfaye@gmail.com',
    authorPhoto: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=200&auto=format&fit=crop&q=80',
    isAdmin: false,
    isPro: true,
    content: '🔥 የፌስቡክ ማስታወቂያ (Meta Ads) ኮርሱን ጨርሼ የመጀመሪያ የደንበኛ ዘመቻዬን (Campaign) ጀምሬ ነበር። በ 3 ቀናት ውስጥ ብቻ ከ 45 በላይ ደንበኞች በቴሌግራም ደውለው እቃውን ገዝተውኛል! ኮርሱ በእውነት ዓይን ከፋች ነው። ለተዘጋጀው እጅግ አመሰግናለሁ!',
    imageUrl: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&auto=format&fit=crop&q=80',
    category: 'success',
    tags: ['ስኬት', 'ማርኬቲንግ', 'ፌስቡክ_ማስታወቂያ'],
    likes: ['user-sample-1', 'admin-tsehay', 'user-sample-4', 'user-sample-5'],
    commentsCount: 3,
    isPinned: false,
    isFeatured: true,
    createdAt: new Date(Date.now() - 3600000 * 5).toISOString(),
  },
  {
    id: 'sample-tech-question',
    authorId: 'student-selam',
    authorName: 'ሰላም አበበ',
    authorEmail: 'selam.abebe@gmail.com',
    authorPhoto: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80',
    isAdmin: false,
    isPro: true,
    content: 'ጥያቄ ነበረኝ፤ በ Shein እና 1688 እቃዎችን አስመጥተን በካርጎ ስናስገባ የጉምሩክ ቀረጥ ስሌት እንዴት ነው የሚሰራው? ልምድ ያላችሁ ተማሪዎች ወይም መምህራን ብታጋሩኝ ደስ ይለኛል። 🙏',
    category: 'questions',
    tags: ['ጥያቄ', 'ሼን_ኢምፖርት', 'ካርጎ'],
    likes: ['user-sample-2'],
    commentsCount: 1,
    isPinned: false,
    isFeatured: false,
    createdAt: new Date(Date.now() - 3600000 * 12).toISOString(),
  }
];

// Helper to check if email is admin
export const isUserAdmin = (email?: string | null, role?: string): boolean => {
  if (role === 'admin' || role === 'instructor') return true;
  if (!email) return false;
  const adminEmails = [
    'eyobsahle@gmail.com'
  ];
  return adminEmails.includes(email.trim().toLowerCase());
};

// Helper to get instantly cached community posts
export const getCachedCommunityPosts = (): CommunityPost[] => {
  if (typeof window === 'undefined') return INITIAL_COMMUNITY_POSTS;
  try {
    const deletedIds = JSON.parse(localStorage.getItem('tsehay_deleted_community_posts') || '[]');
    const cached = localStorage.getItem('tsehay_cached_community_posts');
    if (cached) {
      const parsed = JSON.parse(cached);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.filter((p: any) => !deletedIds.includes(p.id));
      }
    }
  } catch (e) {}
  return INITIAL_COMMUNITY_POSTS;
};

// 1. Subscribe to Live Community Posts (Supabase Realtime + BroadcastChannel + API)
export const subscribeCommunityPosts = (
  onPostsUpdate: (posts: CommunityPost[]) => void,
  categoryFilter: string = 'all'
) => {
  const getDeletedIds = (): string[] => {
    if (typeof window === 'undefined') return [];
    try {
      const deleted = localStorage.getItem('tsehay_deleted_community_posts');
      return deleted ? JSON.parse(deleted) : [];
    } catch (e) {
      return [];
    }
  };

  const postMap = new Map<string, CommunityPost>();

  // Hydrate from localStorage or sample posts immediately
  getCachedCommunityPosts().forEach(p => postMap.set(p.id, p));

  const publishPosts = () => {
    const deletedIds = getDeletedIds();
    const allPosts = Array.from(postMap.values()).filter(p => !deletedIds.includes(p.id));
    
    // Sort: Pinned posts first, then chronological newest to oldest
    allPosts.sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      const timeA = new Date(a.createdAt || 0).getTime();
      const timeB = new Date(b.createdAt || 0).getTime();
      return timeB - timeA;
    });

    const filtered = categoryFilter === 'all' 
      ? allPosts 
      : (categoryFilter === 'pinned' ? allPosts.filter(p => p.isPinned) : allPosts.filter(p => p.category === categoryFilter));

    onPostsUpdate(filtered);
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('tsehay_cached_community_posts', JSON.stringify(allPosts));
      } catch (e) {}
    }
  };

  const applyPostList = (posts: any[]) => {
    if (!Array.isArray(posts)) return;
    const deletedIds = getDeletedIds();
    posts.forEach((data: any) => {
      if (!data || !data.id || deletedIds.includes(data.id)) return;
      postMap.set(data.id, {
        id: data.id,
        authorId: data.authorId || '',
        authorName: data.authorName || 'ተማሪ',
        authorEmail: data.authorEmail || '',
        authorPhoto: data.authorPhoto || `https://ui-avatars.com/api/?name=${encodeURIComponent(data.authorName || 'User')}&background=f9b03c&color=111827&bold=true`,
        authorRole: data.authorRole,
        isAdmin: Boolean(data.isAdmin || isUserAdmin(data.authorEmail, data.authorRole)),
        isPro: Boolean(data.isPro),
        content: data.content || '',
        codeSnippet: data.codeSnippet || null,
        imageUrl: data.imageUrl || null,
        category: data.category || 'general',
        tags: Array.isArray(data.tags) ? data.tags : [],
        likes: Array.isArray(data.likes) ? data.likes : [],
        commentsCount: Number(data.commentsCount || 0),
        isPinned: Boolean(data.isPinned),
        isFeatured: Boolean(data.isFeatured),
        createdAt: data.createdAt || new Date().toISOString(),
        updatedAt: data.updatedAt,
      });
    });
    publishPosts();
  };

  const fetchFreshPosts = async () => {
    try {
      const res = await fetch(`/api/community?t=${Date.now()}`, { cache: 'no-store' });
      if (res.ok) {
        const json = await res.json();
        if (json.success && Array.isArray(json.posts) && json.posts.length > 0) {
          applyPostList(json.posts);
        }
      }
    } catch (e) {
      console.warn('Fresh community posts fetch error:', e);
    }
  };

  // 1. Initial immediate trigger & parallel fetch
  publishPosts();
  fetchFreshPosts();

  // 2. Supabase Realtime WebSocket Subscription
  const channel = supabase
    .channel(`realtime_community_posts_${Date.now()}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'site_settings',
        filter: 'key=eq.community_posts'
      },
      (payload) => {
        const row = payload.new as any;
        if (row && row.data && Array.isArray(row.data)) {
          applyPostList(row.data);
        } else {
          fetchFreshPosts();
        }
      }
    )
    .subscribe();

  // 3. Cross-Tab 0ms BroadcastChannel
  let broadcastChan: BroadcastChannel | null = null;
  if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
    try {
      broadcastChan = new BroadcastChannel('tsehay_community_channel');
      broadcastChan.onmessage = (event) => {
        if (event.data?.type === 'post_deleted' && event.data.postId) {
          postMap.delete(event.data.postId);
          publishPosts();
        } else if (event.data?.type === 'post_created' && event.data.post) {
          postMap.set(event.data.post.id, event.data.post);
          publishPosts();
        } else {
          fetchFreshPosts();
        }
      };
    } catch (e) {}
  }

  // 4. Window Event & Focus Listeners
  const handleCustomEvent = () => fetchFreshPosts();
  const handleFocus = () => fetchFreshPosts();

  if (typeof window !== 'undefined') {
    window.addEventListener('tsehay_community_updated', handleCustomEvent);
    window.addEventListener('tsehay_community_post_deleted', handleCustomEvent);
    window.addEventListener('focus', handleFocus);
    window.addEventListener('visibilitychange', handleFocus);
  }

  return () => {
    supabase.removeChannel(channel);
    if (broadcastChan) broadcastChan.close();
    if (typeof window !== 'undefined') {
      window.removeEventListener('tsehay_community_updated', handleCustomEvent);
      window.removeEventListener('tsehay_community_post_deleted', handleCustomEvent);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('visibilitychange', handleFocus);
    }
  };
};

// 2. Create Community Post (Multi-Tier Robust Persistence)
export const createCommunityPost = async (post: Omit<CommunityPost, 'id' | 'likes' | 'commentsCount' | 'createdAt'>) => {
  let docId = `post_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const newPostData: CommunityPost = {
    ...post,
    id: docId,
    likes: [],
    commentsCount: 0,
    isPinned: Boolean(post.isPinned),
    isFeatured: Boolean(post.isFeatured),
    createdAt: new Date().toISOString(),
  };

  // 1. Update localStorage cache immediately
  if (typeof window !== 'undefined') {
    try {
      const cached = getCachedCommunityPosts();
      const updated = [newPostData, ...cached.filter(p => p.id !== docId)];
      localStorage.setItem('tsehay_cached_community_posts', JSON.stringify(updated));
    } catch (e) {}
  }

  // 2. Server API Persistence (writes to Supabase site_settings)
  try {
    const res = await fetch('/api/community', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newPostData)
    });
    if (res.ok) {
      const data = await res.json();
      if (data.post?.id) {
        docId = data.post.id;
      }
    }
  } catch (apiErr) {
    console.warn('Server create post API notice:', apiErr);
  }

  // 3. Cross-Tab & Intra-window Broadcast
  if (typeof window !== 'undefined') {
    try {
      if ('BroadcastChannel' in window) {
        const bc = new BroadcastChannel('tsehay_community_channel');
        bc.postMessage({ type: 'post_created', post: newPostData });
        setTimeout(() => bc.close(), 100);
      }
      window.dispatchEvent(new CustomEvent('tsehay_community_updated', { detail: { post: newPostData } }));
    } catch (e) {}
  }

  return docId;
};

// 3. Toggle Like on a Post
export const toggleLikePost = async (
  postId: string, 
  userId: string, 
  isLiked: boolean,
  notificationMeta?: {
    postAuthorEmail?: string;
    postAuthorName?: string;
    postSnippet?: string;
    likerName?: string;
  }
) => {
  // 1. Update local cache
  if (typeof window !== 'undefined') {
    try {
      const cached = getCachedCommunityPosts();
      const updated = cached.map(p => {
        if (p.id === postId) {
          const likes = Array.isArray(p.likes) ? p.likes : [];
          return {
            ...p,
            likes: isLiked ? likes.filter(id => id !== userId) : [...likes, userId]
          };
        }
        return p;
      });
      localStorage.setItem('tsehay_cached_community_posts', JSON.stringify(updated));
      window.dispatchEvent(new CustomEvent('tsehay_community_updated', { detail: { postId, isLiked, userId } }));
      if ('BroadcastChannel' in window) {
        const bc = new BroadcastChannel('tsehay_community_channel');
        bc.postMessage({ type: 'post_liked', postId, isLiked, userId });
        setTimeout(() => bc.close(), 100);
      }
    } catch (e) {}
  }

  // 2. Server API Dispatch
  try {
    await fetch('/api/community/like', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ postId, userId, isLiked })
    });
  } catch (apiErr) {}

  // 3. Automated Email Notification on New Like
  if (!isLiked && notificationMeta?.postAuthorEmail && notificationMeta?.likerName) {
    try {
      fetch('/api/email/community-notification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'like',
          recipientEmail: notificationMeta.postAuthorEmail,
          recipientName: notificationMeta.postAuthorName || 'ተማሪ',
          senderName: notificationMeta.likerName,
          postTitleOrSnippet: notificationMeta.postSnippet,
          postId
        })
      }).catch(() => {});
    } catch (e) {}
  }
};

// 4. Delete Community Post (Instant Multi-Tier Sync)
export const deleteCommunityPost = async (postId: string) => {
  // 1. Mark Deleted in Local Storage immediately
  if (typeof window !== 'undefined') {
    try {
      const deleted = JSON.parse(localStorage.getItem('tsehay_deleted_community_posts') || '[]');
      if (!deleted.includes(postId)) {
        deleted.push(postId);
        localStorage.setItem('tsehay_deleted_community_posts', JSON.stringify(deleted));
      }
      const cached = localStorage.getItem('tsehay_cached_community_posts');
      if (cached) {
        const parsed = JSON.parse(cached);
        const filtered = parsed.filter((p: any) => p.id !== postId);
        localStorage.setItem('tsehay_cached_community_posts', JSON.stringify(filtered));
      }
      window.dispatchEvent(new CustomEvent('tsehay_community_post_deleted', { detail: { postId } }));
      if ('BroadcastChannel' in window) {
        const bc = new BroadcastChannel('tsehay_community_channel');
        bc.postMessage({ type: 'post_deleted', postId });
        setTimeout(() => bc.close(), 100);
      }
    } catch (e) {}
  }

  // 2. Server API Deletion via Supabase API
  try {
    await fetch(`/api/community?id=${encodeURIComponent(postId)}`, {
      method: 'DELETE'
    });
  } catch (apiErr) {}

  return { success: true, postId };
};

// 5. Pin / Unpin Post
export const pinCommunityPost = async (postId: string, isPinned: boolean) => {
  if (typeof window !== 'undefined') {
    try {
      const cached = getCachedCommunityPosts();
      const updated = cached.map(p => p.id === postId ? { ...p, isPinned } : p);
      localStorage.setItem('tsehay_cached_community_posts', JSON.stringify(updated));
      window.dispatchEvent(new CustomEvent('tsehay_community_updated'));
      if ('BroadcastChannel' in window) {
        const bc = new BroadcastChannel('tsehay_community_channel');
        bc.postMessage({ type: 'post_pinned', postId, isPinned });
        setTimeout(() => bc.close(), 100);
      }
    } catch (e) {}
  }

  try {
    await fetch('/api/community/pin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ postId, isPinned })
    });
  } catch (e) {}
};

// 6. Feature Post
export const featureCommunityPost = async (postId: string, isFeatured: boolean) => {
  if (typeof window !== 'undefined') {
    try {
      const cached = getCachedCommunityPosts();
      const updated = cached.map(p => p.id === postId ? { ...p, isFeatured } : p);
      localStorage.setItem('tsehay_cached_community_posts', JSON.stringify(updated));
      window.dispatchEvent(new CustomEvent('tsehay_community_updated'));
      if ('BroadcastChannel' in window) {
        const bc = new BroadcastChannel('tsehay_community_channel');
        bc.postMessage({ type: 'post_featured', postId, isFeatured });
        setTimeout(() => bc.close(), 100);
      }
    } catch (e) {}
  }

  try {
    await fetch('/api/community', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: postId, isFeatured })
    });
  } catch (e) {}
};

// 7. Subscribe to Comments on a Post
export const subscribePostComments = (
  postId: string,
  onCommentsUpdate: (comments: CommunityComment[]) => void
) => {
  const commentMap = new Map<string, CommunityComment>();

  const publishComments = () => {
    const list = Array.from(commentMap.values());
    list.sort((a, b) => new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime());
    onCommentsUpdate(list);
  };

  const applyComments = (comments: any[]) => {
    if (!Array.isArray(comments)) return;
    comments.forEach(c => {
      if (c && c.id) {
        commentMap.set(c.id, {
          id: c.id,
          postId: c.postId || postId,
          authorId: c.authorId || '',
          authorName: c.authorName || 'ተጠቃሚ',
          authorEmail: c.authorEmail || '',
          authorPhoto: c.authorPhoto || `https://ui-avatars.com/api/?name=${encodeURIComponent(c.authorName || 'User')}&background=f9b03c&color=111827&bold=true`,
          isAdmin: Boolean(c.isAdmin || isUserAdmin(c.authorEmail)),
          isPro: Boolean(c.isPro),
          content: c.content || '',
          createdAt: c.createdAt || new Date().toISOString(),
        });
      }
    });
    publishComments();
  };

  const fetchComments = async () => {
    try {
      const res = await fetch(`/api/community/comment?postId=${encodeURIComponent(postId)}&t=${Date.now()}`, { cache: 'no-store' });
      if (res.ok) {
        const json = await res.json();
        if (json.success && Array.isArray(json.comments)) {
          applyComments(json.comments);
        }
      }
    } catch (e) {}
  };

  fetchComments();

  // Supabase Realtime channel for comments
  const channel = supabase
    .channel(`realtime_comments_${postId}_${Date.now()}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'site_settings',
        filter: 'key=eq.community_comments'
      },
      () => {
        fetchComments();
      }
    )
    .subscribe();

  let bc: BroadcastChannel | null = null;
  if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
    try {
      bc = new BroadcastChannel('tsehay_community_channel');
      bc.onmessage = (ev) => {
        if (ev.data?.postId === postId) {
          fetchComments();
        }
      };
    } catch (e) {}
  }

  const handleUpdate = () => fetchComments();
  if (typeof window !== 'undefined') {
    window.addEventListener(`tsehay_comment_updated_${postId}`, handleUpdate);
  }

  return () => {
    supabase.removeChannel(channel);
    if (bc) bc.close();
    if (typeof window !== 'undefined') {
      window.removeEventListener(`tsehay_comment_updated_${postId}`, handleUpdate);
    }
  };
};

// 8. Add Comment to Post
export const addCommentToPost = async (
  postId: string,
  commentData: {
    authorId: string;
    authorName: string;
    authorEmail: string;
    authorPhoto: string;
    isAdmin: boolean;
    isPro: boolean;
    content: string;
  },
  postAuthorMeta?: {
    authorEmail?: string;
    authorName?: string;
    postSnippet?: string;
  }
) => {
  const commentId = `comm_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const fullComment = {
    ...commentData,
    id: commentId,
    postId,
    createdAt: new Date().toISOString(),
  };

  // 1. Server API Dispatch (Persists in Supabase)
  try {
    await fetch('/api/community/comment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ postId, ...commentData, id: commentId })
    });
  } catch (apiErr) {}

  // 2. Broadcast across channels
  if (typeof window !== 'undefined') {
    try {
      window.dispatchEvent(new CustomEvent(`tsehay_comment_updated_${postId}`, { detail: fullComment }));
      window.dispatchEvent(new CustomEvent('tsehay_community_updated'));
      if ('BroadcastChannel' in window) {
        const bc = new BroadcastChannel('tsehay_community_channel');
        bc.postMessage({ type: 'comment_added', postId, comment: fullComment });
        setTimeout(() => bc.close(), 100);
      }
    } catch (e) {}
  }

  // 3. Automated Email Notification to Post Author
  if (postAuthorMeta?.authorEmail && postAuthorMeta.authorEmail !== commentData.authorEmail) {
    try {
      fetch('/api/email/community-notification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'comment',
          recipientEmail: postAuthorMeta.authorEmail,
          recipientName: postAuthorMeta.authorName || 'ተማሪ',
          senderName: commentData.authorName,
          commentSnippet: commentData.content,
          postTitleOrSnippet: postAuthorMeta.postSnippet,
          postId
        })
      }).catch(() => {});
    } catch (e) {}
  }
};

// 9. Delete Comment
export const deleteCommentFromPost = async (postId: string, commentId: string) => {
  try {
    await fetch(`/api/community/comment?postId=${encodeURIComponent(postId)}&commentId=${encodeURIComponent(commentId)}`, {
      method: 'DELETE'
    });
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent(`tsehay_comment_updated_${postId}`));
      window.dispatchEvent(new CustomEvent('tsehay_community_updated'));
      if ('BroadcastChannel' in window) {
        const bc = new BroadcastChannel('tsehay_community_channel');
        bc.postMessage({ type: 'comment_deleted', postId, commentId });
        setTimeout(() => bc.close(), 100);
      }
    }
  } catch (e) {}
};


// ==========================================
// 💬 DIRECT MESSAGING & INBOX CHAT SYSTEM
// ==========================================

export const getConversationId = (uid1: string, uid2: string): string => {
  if (!uid1 || !uid2) return '';
  const clean1 = uid1.trim();
  const clean2 = uid2.trim();
  const sorted = [clean1, clean2].sort();
  return `${sorted[0]}_${sorted[1]}`;
};

export const getCachedConversationMessages = (conversationId: string): DirectMessage[] => {
  if (typeof window === 'undefined' || !conversationId) return [];
  try {
    const raw = localStorage.getItem(`tsehay_chat_messages_${conversationId}`);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) {}
  return [];
};

export const saveCachedConversationMessages = (conversationId: string, messages: DirectMessage[]): void => {
  if (typeof window === 'undefined' || !conversationId) return;
  try {
    localStorage.setItem(`tsehay_chat_messages_${conversationId}`, JSON.stringify(messages));
  } catch (e) {}
};

// Subscribe to User's Conversations
export const subscribeUserConversations = (
  userId: string,
  onConversationsUpdate: (conversations: Conversation[]) => void
) => {
  if (!userId) return () => {};

  const convMap = new Map<string, Conversation>();

  const publish = () => {
    const list = Array.from(convMap.values());
    list.sort((a, b) => {
      const tA = new Date(a.lastMessageTime || 0).getTime();
      const tB = new Date(b.lastMessageTime || 0).getTime();
      return tB - tA;
    });
    onConversationsUpdate(list);
  };

  const fetchConversations = async () => {
    try {
      const res = await fetch(`/api/messages?userId=${encodeURIComponent(userId)}&t=${Date.now()}`, { cache: 'no-store' });
      if (res.ok) {
        const json = await res.json();
        if (json.success && Array.isArray(json.conversations)) {
          json.conversations.forEach((c: any) => {
            if (c && c.id) convMap.set(c.id, c);
          });
          publish();
        }
      }
    } catch (e) {}
  };

  fetchConversations();

  // Supabase Realtime for conversations
  const channel = supabase
    .channel(`realtime_user_convs_${userId}_${Date.now()}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'site_settings',
        filter: 'key=eq.community_conversations'
      },
      () => {
        fetchConversations();
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
};

// Subscribe to Messages in a Conversation
export const subscribeConversationMessages = (
  conversationId: string,
  onMessagesUpdate: (messages: DirectMessage[]) => void
) => {
  if (!conversationId) return () => {};

  // Instant Hydration from LocalStorage Cache
  const cached = getCachedConversationMessages(conversationId);
  if (cached.length > 0) {
    onMessagesUpdate(cached);
  }

  const messageMap = new Map<string, DirectMessage>();
  cached.forEach(m => messageMap.set(m.id, m));

  const publish = () => {
    const list = Array.from(messageMap.values());
    list.sort((a, b) => {
      const tA = new Date(a.createdAt || 0).getTime();
      const tB = new Date(b.createdAt || 0).getTime();
      return tA - tB;
    });
    saveCachedConversationMessages(conversationId, list);
    onMessagesUpdate(list);
  };

  const fetchMessages = async () => {
    try {
      const res = await fetch(`/api/messages?conversationId=${encodeURIComponent(conversationId)}&t=${Date.now()}`, { cache: 'no-store' });
      if (res.ok) {
        const json = await res.json();
        if (json.success && Array.isArray(json.messages)) {
          json.messages.forEach((m: any) => {
            if (m && m.id) {
              messageMap.set(m.id, {
                id: m.id,
                conversationId: m.conversationId || conversationId,
                senderId: m.senderId || '',
                senderName: m.senderName || 'ተማሪ',
                senderPhoto: m.senderPhoto || '',
                senderEmail: m.senderEmail || '',
                receiverId: m.receiverId || '',
                receiverName: m.receiverName || '',
                receiverPhoto: m.receiverPhoto || '',
                receiverEmail: m.receiverEmail || '',
                content: m.content || '',
                imageUrl: m.imageUrl || null,
                createdAt: m.createdAt || new Date().toISOString(),
                updatedAt: m.updatedAt || null,
                isRead: Boolean(m.isRead),
                status: m.status || 'sent',
                readAt: m.readAt || null,
                isEdited: Boolean(m.isEdited),
                isDeleted: Boolean(m.isDeleted),
              });
            }
          });
          publish();
        }
      }
    } catch (e) {}
  };

  fetchMessages();

  // Supabase Realtime for Direct Messages
  const channel = supabase
    .channel(`realtime_conv_msgs_${conversationId}_${Date.now()}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'site_settings',
        filter: 'key=eq.direct_messages'
      },
      () => {
        fetchMessages();
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
};

// Send a Direct Message
export const sendDirectMessage = async (
  conversationId: string,
  message: {
    senderId: string;
    senderName: string;
    senderPhoto: string;
    senderEmail: string;
    receiverId: string;
    receiverName: string;
    receiverPhoto: string;
    receiverEmail: string;
    content: string;
    imageUrl?: string | null;
  }
) => {
  const messageId = `msg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const nowIso = new Date().toISOString();

  const msgPayload: DirectMessage = {
    id: messageId,
    conversationId,
    senderId: message.senderId,
    senderName: message.senderName,
    senderPhoto: message.senderPhoto,
    senderEmail: message.senderEmail,
    receiverId: message.receiverId,
    receiverName: message.receiverName,
    receiverPhoto: message.receiverPhoto,
    receiverEmail: message.receiverEmail,
    content: message.content,
    imageUrl: message.imageUrl || null,
    createdAt: nowIso,
    updatedAt: nowIso,
    isRead: false,
    status: 'sent',
    readAt: null,
    isEdited: false,
    isDeleted: false,
  };

  // 1. Client cache
  const cached = getCachedConversationMessages(conversationId);
  saveCachedConversationMessages(conversationId, [...cached.filter(m => m.id !== messageId), msgPayload]);

  // 2. Server API Dispatch
  try {
    await fetch('/api/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messageId,
        conversationId,
        ...message,
        status: 'sent',
        isRead: false
      })
    });
  } catch (apiErr) {}

  // 3. Automated Email Notification to Receiver
  if (message.receiverEmail && message.receiverEmail !== message.senderEmail) {
    try {
      fetch('/api/email/community-notification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'message',
          recipientEmail: message.receiverEmail,
          recipientName: message.receiverName || 'ተማሪ',
          senderName: message.senderName,
          senderPhoto: message.senderPhoto,
          messageSnippet: message.content || (message.imageUrl ? '📷 ምስል አያይዘዋል' : 'አዲስ መልዕክት'),
          conversationId
        })
      }).catch(() => {});
    } catch (e) {}
  }

  return { success: true, messageId, message: msgPayload };
};

// Mark Incoming Messages in a Conversation as Read
export const markMessagesAsRead = async (conversationId: string, readerUid: string) => {
  if (!conversationId || !readerUid) return;

  const nowIso = new Date().toISOString();

  try {
    const cached = getCachedConversationMessages(conversationId);
    let hasChanges = false;
    const updatedCached = cached.map(m => {
      if (m.receiverId === readerUid && m.status !== 'read') {
        hasChanges = true;
        return { ...m, isRead: true, status: 'read' as const, readAt: nowIso };
      }
      return m;
    });
    if (hasChanges) {
      saveCachedConversationMessages(conversationId, updatedCached);
    }

    fetch('/api/messages', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'mark_read',
        conversationId,
        readerUid,
      })
    }).catch(() => {});
  } catch (e) {
    console.warn('markMessagesAsRead notice:', e);
  }
};

// Edit a Sent Message
export const editDirectMessage = async (
  conversationId: string,
  messageId: string,
  newContent: string,
  senderUidOrIsSender: string | boolean,
  existingMessageOrIsRead?: DirectMessage | boolean,
  isAdmin: boolean = false
) => {
  if (!newContent.trim()) throw new Error('መልዕክቱ ባዶ መሆን አይችልም።');

  const isRead = typeof existingMessageOrIsRead === 'boolean'
    ? existingMessageOrIsRead
    : Boolean(existingMessageOrIsRead?.status === 'read' || existingMessageOrIsRead?.isRead);

  if (isRead && !isAdmin) {
    throw new Error('ተቀባዩ መልዕክቱን አንብቦታል፤ ስለዚህ ማስተካከል አይቻልም። (Message already read by recipient)');
  }

  try {
    await fetch('/api/messages', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'edit',
        conversationId,
        messageId,
        senderUid: typeof senderUidOrIsSender === 'string' ? senderUidOrIsSender : undefined,
        content: newContent.trim(),
      })
    });
  } catch (e) {}

  return { success: true };
};

// Delete a Sent Message
export const deleteDirectMessage = async (
  conversationId: string,
  messageId: string,
  senderUidOrIsSender: string | boolean,
  isAdminOrExistingMessage?: boolean | DirectMessage,
  isReadOrExistingMessage?: boolean | DirectMessage
) => {
  const isAdmin = typeof isAdminOrExistingMessage === 'boolean'
    ? isAdminOrExistingMessage
    : false;

  const isRead = typeof isReadOrExistingMessage === 'boolean'
    ? isReadOrExistingMessage
    : typeof isAdminOrExistingMessage === 'object' && isAdminOrExistingMessage
    ? Boolean(isAdminOrExistingMessage.status === 'read' || isAdminOrExistingMessage.isRead)
    : false;

  if (!isAdmin && isRead) {
    throw new Error('ተቀባዩ መልዕክቱን አንብቦታል፤ ስለዚህ መሰረዝ አይቻልም። (Message already read by recipient)');
  }

  try {
    await fetch('/api/messages', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        conversationId,
        messageId,
        senderUid: typeof senderUidOrIsSender === 'string' ? senderUidOrIsSender : undefined,
        isAdmin,
      })
    });
  } catch (e) {}

  return { success: true };
};
