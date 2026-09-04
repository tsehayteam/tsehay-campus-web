import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  orderBy, 
  where, 
  limit, 
  onSnapshot, 
  serverTimestamp, 
  arrayUnion, 
  arrayRemove,
  increment
} from 'firebase/firestore';
import { db } from './firebase/config';

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

// 1. Subscribe to Live Community Posts (Multi-Collection + API Real-Time Sync)
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
      const timeA = new Date(a.createdAt).getTime();
      const timeB = new Date(b.createdAt).getTime();
      return timeB - timeA;
    });

    const filtered = categoryFilter === 'all' 
      ? allPosts 
      : allPosts.filter(p => p.category === categoryFilter);

    onPostsUpdate(filtered);
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('tsehay_cached_community_posts', JSON.stringify(allPosts));
      } catch (e) {}
    }
  };

  const processDoc = (docSnap: any) => {
    const data = docSnap.data();
    const id = docSnap.id;
    const deletedIds = getDeletedIds();
    if (deletedIds.includes(id)) return;

    postMap.set(id, {
      id,
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
      createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : (data.createdAt || new Date().toISOString()),
      updatedAt: data.updatedAt,
    });
  };

  // 1. Listen on Root community_posts
  let unsubRoot = () => {};
  try {
    const rootRef = collection(db, 'community_posts');
    const handleSnapshot = (snapshot: any) => {
      if (!snapshot.empty) {
        snapshot.docChanges().forEach((change: any) => {
          if (change.type === 'removed') {
            postMap.delete(change.doc.id);
          } else {
            processDoc(change.doc);
          }
        });
        publishPosts();
      }
    };

    try {
      const qRoot = query(rootRef, orderBy('createdAt', 'desc'), limit(100));
      unsubRoot = onSnapshot(qRoot, handleSnapshot, (err) => {
        console.warn('Root community_posts orderBy index notice, falling back to direct collection listener:', err);
        try {
          unsubRoot = onSnapshot(query(rootRef, limit(100)), handleSnapshot, () => {});
        } catch (e2) {}
      });
    } catch (e) {
      unsubRoot = onSnapshot(query(rootRef, limit(100)), handleSnapshot, () => {});
    }
  } catch (e) {}

  // 2. Listen on Artifact community_posts
  let unsubArtifact = () => {};
  try {
    const artifactRef = collection(db, 'artifacts', 'tsehaycampus-e1a6d', 'community_posts');
    const handleArtifactSnapshot = (snapshot: any) => {
      if (!snapshot.empty) {
        snapshot.docChanges().forEach((change: any) => {
          if (change.type === 'removed') {
            postMap.delete(change.doc.id);
          } else {
            processDoc(change.doc);
          }
        });
        publishPosts();
      }
    };

    try {
      const qArtifact = query(artifactRef, orderBy('createdAt', 'desc'), limit(100));
      unsubArtifact = onSnapshot(qArtifact, handleArtifactSnapshot, (err) => {
        console.warn('Artifact community_posts index notice, falling back to direct collection listener:', err);
        try {
          unsubArtifact = onSnapshot(query(artifactRef, limit(100)), handleArtifactSnapshot, () => {});
        } catch (e2) {}
      });
    } catch (e) {
      unsubArtifact = onSnapshot(query(artifactRef, limit(100)), handleArtifactSnapshot, () => {});
    }
  } catch (e) {}

  // 3. Parallel Server API Fetch (Ensures fresh sync across servers)
  fetch(`/api/admin/community?t=${Date.now()}`)
    .then(res => res.json())
    .then(json => {
      if (json.success && Array.isArray(json.posts)) {
        json.posts.forEach((p: any) => {
          if (p && p.id) {
            postMap.set(p.id, {
              ...p,
              createdAt: p.createdAt || new Date().toISOString(),
              likes: Array.isArray(p.likes) ? p.likes : [],
              commentsCount: Number(p.commentsCount || 0)
            });
          }
        });
        publishPosts();
      }
    })
    .catch(e => console.warn('Community API load error:', e));

  // Initial trigger with current cached state
  publishPosts();

  return () => {
    unsubRoot();
    unsubArtifact();
  };
};

// 2. Create Community Post (Multi-Tier Robust Persistence)
export const createCommunityPost = async (post: Omit<CommunityPost, 'id' | 'likes' | 'commentsCount' | 'createdAt'>) => {
  const newPostData = {
    ...post,
    likes: [],
    commentsCount: 0,
    isPinned: Boolean(post.isPinned),
    isFeatured: Boolean(post.isFeatured),
    createdAt: new Date().toISOString(),
  };

  let docId = `post_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

  // 1. Direct Firestore writes (Root + Artifact)
  try {
    const rootDocRef = doc(db, 'community_posts', docId);
    await setDoc(rootDocRef, { ...newPostData, id: docId });
  } catch (e) {
    console.warn('Direct root create post notice:', e);
  }

  try {
    const artifactDocRef = doc(db, 'artifacts', 'tsehaycampus-e1a6d', 'community_posts', docId);
    await setDoc(artifactDocRef, { ...newPostData, id: docId });
  } catch (e) {
    console.warn('Direct artifact create post notice:', e);
  }

  // 2. Server API Persistence
  try {
    const res = await fetch('/api/admin/community', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...post, id: docId })
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

  // 3. Update localStorage cache immediately
  if (typeof window !== 'undefined') {
    try {
      const cached = getCachedCommunityPosts();
      const newPost: CommunityPost = {
        id: docId,
        ...newPostData,
      };
      const updated = [newPost, ...cached.filter(p => p.id !== docId)];
      localStorage.setItem('tsehay_cached_community_posts', JSON.stringify(updated));
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
  // 1. Client Firestore Updates
  try {
    const postDocRef = doc(db, 'artifacts', 'tsehaycampus-e1a6d', 'community_posts', postId);
    await updateDoc(postDocRef, {
      likes: isLiked ? arrayRemove(userId) : arrayUnion(userId)
    });
  } catch (err) {}

  try {
    const rootDocRef = doc(db, 'community_posts', postId);
    await updateDoc(rootDocRef, {
      likes: isLiked ? arrayRemove(userId) : arrayUnion(userId)
    });
  } catch (err) {}

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
    } catch (e) {}
  }

  // 2. Client Firestore Deletions
  try {
    const postDocRef = doc(db, 'artifacts', 'tsehaycampus-e1a6d', 'community_posts', postId);
    await deleteDoc(postDocRef);
  } catch (e) {}

  try {
    const rootDocRef = doc(db, 'community_posts', postId);
    await deleteDoc(rootDocRef);
  } catch (e) {}

  // 3. Server API Deletion via Admin SDK
  try {
    await fetch(`/api/admin/community?id=${encodeURIComponent(postId)}`, {
      method: 'DELETE'
    });
  } catch (apiErr) {}

  return { success: true, postId };
};

// 5. Pin / Unpin Post
export const pinCommunityPost = async (postId: string, isPinned: boolean) => {
  try {
    const postDocRef = doc(db, 'artifacts', 'tsehaycampus-e1a6d', 'community_posts', postId);
    await updateDoc(postDocRef, { isPinned });
  } catch (e) {}

  try {
    await updateDoc(doc(db, 'community_posts', postId), { isPinned });
  } catch (e) {}

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
  try {
    const postDocRef = doc(db, 'artifacts', 'tsehaycampus-e1a6d', 'community_posts', postId);
    await updateDoc(postDocRef, { isFeatured });
  } catch (e) {}

  try {
    await updateDoc(doc(db, 'community_posts', postId), { isFeatured });
  } catch (e) {}

  try {
    await fetch('/api/admin/community', {
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
    list.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    onCommentsUpdate(list);
  };

  const processComment = (docSnap: any) => {
    const data = docSnap.data();
    commentMap.set(docSnap.id, {
      id: docSnap.id,
      postId,
      authorId: data.authorId || '',
      authorName: data.authorName || 'ተጠቃሚ',
      authorEmail: data.authorEmail || '',
      authorPhoto: data.authorPhoto || `https://ui-avatars.com/api/?name=${encodeURIComponent(data.authorName || 'User')}&background=f9b03c&color=111827&bold=true`,
      isAdmin: Boolean(data.isAdmin || isUserAdmin(data.authorEmail)),
      isPro: Boolean(data.isPro),
      content: data.content || '',
      createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : (data.createdAt || new Date().toISOString()),
    });
  };

  let unsubArtifact = () => {};
  try {
    const artifactRef = collection(db, 'artifacts', 'tsehaycampus-e1a6d', 'community_posts', postId, 'comments');
    const qArtifact = query(artifactRef, orderBy('createdAt', 'asc'), limit(100));
    unsubArtifact = onSnapshot(qArtifact, (snap) => {
      if (!snap.empty) {
        snap.forEach(processComment);
        publishComments();
      }
    }, () => {});
  } catch (e) {}

  let unsubRoot = () => {};
  try {
    const rootRef = collection(db, 'community_posts', postId, 'comments');
    const qRoot = query(rootRef, orderBy('createdAt', 'asc'), limit(100));
    unsubRoot = onSnapshot(qRoot, (snap) => {
      if (!snap.empty) {
        snap.forEach(processComment);
        publishComments();
      }
    }, () => {});
  } catch (e) {}

  return () => {
    unsubArtifact();
    unsubRoot();
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

  // 1. Client Firestore (Root + Artifact)
  try {
    const rootCommentsRef = doc(db, 'community_posts', postId, 'comments', commentId);
    const rootPostRef = doc(db, 'community_posts', postId);
    await setDoc(rootCommentsRef, fullComment);
    await updateDoc(rootPostRef, { commentsCount: increment(1) });
  } catch (e) {}

  try {
    const artCommentsRef = doc(db, 'artifacts', 'tsehaycampus-e1a6d', 'community_posts', postId, 'comments', commentId);
    const artPostRef = doc(db, 'artifacts', 'tsehaycampus-e1a6d', 'community_posts', postId);
    await setDoc(artCommentsRef, fullComment);
    await updateDoc(artPostRef, { commentsCount: increment(1) });
  } catch (e) {}

  // 2. Server API Dispatch
  try {
    await fetch('/api/community/comment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ postId, ...commentData, id: commentId })
    });
  } catch (apiErr) {}

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
    const commentDocRef = doc(db, 'artifacts', 'tsehaycampus-e1a6d', 'community_posts', postId, 'comments', commentId);
    const postDocRef = doc(db, 'artifacts', 'tsehaycampus-e1a6d', 'community_posts', postId);

    await deleteDoc(commentDocRef);
    await updateDoc(postDocRef, {
      commentsCount: increment(-1),
    });
  } catch (e) {}
};

// ==========================================
// 💬 DIRECT MESSAGING & INBOX CHAT SYSTEM
// ==========================================

// Helper to generate deterministic conversation ID for 1-on-1 chats
// Helper to generate deterministic conversation ID for 1-on-1 chats
export const getConversationId = (uid1: string, uid2: string): string => {
  if (!uid1 || !uid2) return '';
  const clean1 = uid1.trim();
  const clean2 = uid2.trim();
  const sorted = [clean1, clean2].sort();
  return `${sorted[0]}_${sorted[1]}`;
};

// Cache messages locally so they NEVER disappear upon refresh or component unmount
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

// Subscribe to User's Conversations with Dual-Collection Resilience
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

  const processDoc = (docSnap: any) => {
    const data = docSnap.data();
    const id = docSnap.id;
    const existing = convMap.get(id) || ({} as any);

    convMap.set(id, {
      id,
      participants: data.participants || existing.participants || [],
      participantDetails: {
        ...(existing.participantDetails || {}),
        ...(data.participantDetails || {})
      },
      lastMessage: data.lastMessage || existing.lastMessage || '',
      lastMessageSenderId: data.lastMessageSenderId || existing.lastMessageSenderId || '',
      lastMessageTime: data.lastMessageTime?.toDate
        ? data.lastMessageTime.toDate().toISOString()
        : (data.lastMessageTime || existing.lastMessageTime || new Date().toISOString()),
      unreadCount: {
        ...(existing.unreadCount || {}),
        ...(data.unreadCount || {})
      },
    });
  };

  // 1. Listen on Artifact collection
  let unsubArtifact = () => {};
  try {
    const convRefArt = collection(db, 'artifacts', 'tsehaycampus-e1a6d', 'community_conversations');
    const qArt = query(convRefArt, where('participants', 'array-contains', userId), limit(50));
    unsubArtifact = onSnapshot(qArt, (snapshot) => {
      snapshot.forEach(processDoc);
      publish();
    }, () => {});
  } catch (e) {}

  // 2. Listen on Root collection
  let unsubRoot = () => {};
  try {
    const convRefRoot = collection(db, 'community_conversations');
    const qRoot = query(convRefRoot, where('participants', 'array-contains', userId), limit(50));
    unsubRoot = onSnapshot(qRoot, (snapshot) => {
      snapshot.forEach(processDoc);
      publish();
    }, () => {});
  } catch (e) {}

  return () => {
    unsubArtifact();
    unsubRoot();
  };
};

// Subscribe to Messages in a Conversation with Real-Time Multi-Collection Sync
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

  const processMsg = (docSnap: any) => {
    const data = docSnap.data();
    const id = docSnap.id;
    const isRead = Boolean(data.isRead || data.read || data.status === 'read');
    const status: 'sent' | 'delivered' | 'read' = isRead
      ? 'read'
      : (data.status === 'delivered' ? 'delivered' : (data.status || 'delivered'));

    messageMap.set(id, {
      id,
      conversationId: data.conversationId || conversationId,
      senderId: data.senderId || '',
      senderName: data.senderName || 'ተማሪ',
      senderPhoto: data.senderPhoto || '',
      senderEmail: data.senderEmail || '',
      receiverId: data.receiverId || '',
      receiverName: data.receiverName || '',
      receiverPhoto: data.receiverPhoto || '',
      receiverEmail: data.receiverEmail || '',
      content: data.content || '',
      imageUrl: data.imageUrl || null,
      createdAt: data.createdAt?.toDate
        ? data.createdAt.toDate().toISOString()
        : (data.createdAt || new Date().toISOString()),
      updatedAt: data.updatedAt?.toDate
        ? data.updatedAt.toDate().toISOString()
        : (data.updatedAt || null),
      isRead,
      status,
      readAt: data.readAt || null,
      isEdited: Boolean(data.isEdited),
      isDeleted: Boolean(data.isDeleted),
    });
  };

  // Listeners across all potential subcollection locations
  const convIdVariations = [conversationId];
  if (!conversationId.startsWith('conv_')) {
    convIdVariations.push(`conv_${conversationId}`);
  } else {
    convIdVariations.push(conversationId.replace(/^conv_/, ''));
  }

  const unsubs: Array<() => void> = [];

  convIdVariations.forEach(cId => {
    // 1. Artifact subcollection
    try {
      const artRef = collection(db, 'artifacts', 'tsehaycampus-e1a6d', 'community_conversations', cId, 'messages');
      const qArt = query(artRef, orderBy('createdAt', 'asc'), limit(150));
      unsubs.push(onSnapshot(qArt, (snap) => {
        snap.forEach(processMsg);
        publish();
      }, () => {}));
    } catch (e) {}

    // 2. Root subcollection
    try {
      const rootRef = collection(db, 'community_conversations', cId, 'messages');
      const qRoot = query(rootRef, orderBy('createdAt', 'asc'), limit(150));
      unsubs.push(onSnapshot(qRoot, (snap) => {
        snap.forEach(processMsg);
        publish();
      }, () => {}));
    } catch (e) {}

    // 3. Root direct_messages collection (Directly queried by conversationId)
    try {
      const dmRef = collection(db, 'direct_messages');
      const qDm = query(dmRef, where('conversationId', '==', cId), limit(150));
      unsubs.push(onSnapshot(qDm, (snap) => {
        snap.forEach(processMsg);
        publish();
      }, (err) => {
        console.warn('direct_messages query notice:', err);
      }));
    } catch (e) {}
  });

  return () => {
    unsubs.forEach(u => {
      try { u(); } catch (e) {}
    });
  };
};

// Send a Direct Message with Multi-tier Resilience & WhatsApp-style Sent Status
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

  const convPayload = {
    id: conversationId,
    participants: [message.senderId, message.receiverId],
    participantDetails: {
      [message.senderId]: {
        name: message.senderName,
        photo: message.senderPhoto,
        email: message.senderEmail,
        isAdmin: isUserAdmin(message.senderEmail),
      },
      [message.receiverId]: {
        name: message.receiverName,
        photo: message.receiverPhoto,
        email: message.receiverEmail,
        isAdmin: isUserAdmin(message.receiverEmail),
      },
    },
    lastMessage: message.content || (message.imageUrl ? '📷 ምስል ተልኳል' : ''),
    lastMessageSenderId: message.senderId,
    lastMessageTime: nowIso,
    [`unreadCount.${message.receiverId}`]: increment(1),
  };

  // 1. Client Direct Writes (Root + Artifact + Direct collections)
  try {
    const writes: Promise<any>[] = [
      setDoc(doc(db, 'artifacts', 'tsehaycampus-e1a6d', 'community_conversations', conversationId, 'messages', messageId), msgPayload),
      setDoc(doc(db, 'community_conversations', conversationId, 'messages', messageId), msgPayload),
      setDoc(doc(db, 'direct_messages', messageId), msgPayload),
      setDoc(doc(db, 'artifacts', 'tsehaycampus-e1a6d', 'community_conversations', conversationId), convPayload, { merge: true }),
      setDoc(doc(db, 'community_conversations', conversationId), convPayload, { merge: true }),
    ];
    await Promise.allSettled(writes);
  } catch (clientErr) {
    console.warn('Client direct message write notice:', clientErr);
  }

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

// Mark Incoming Messages in a Conversation as Read (WhatsApp Blue Ticks)
export const markMessagesAsRead = async (conversationId: string, readerUid: string) => {
  if (!conversationId || !readerUid) return;

  const nowIso = new Date().toISOString();

  try {
    // 1. Mark in client cache
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

    // 2. Update via server API
    fetch('/api/messages', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'mark_read',
        conversationId,
        readerUid,
      })
    }).catch(() => {});

    // 3. Clear unread count on conversation
    try {
      const convRef1 = doc(db, 'artifacts', 'tsehaycampus-e1a6d', 'community_conversations', conversationId);
      const convRef2 = doc(db, 'community_conversations', conversationId);
      await Promise.allSettled([
        updateDoc(convRef1, { [`unreadCount.${readerUid}`]: 0 }),
        updateDoc(convRef2, { [`unreadCount.${readerUid}`]: 0 }),
      ]);
    } catch (e) {}
  } catch (e) {
    console.warn('markMessagesAsRead notice:', e);
  }
};

// Edit a Sent Message (Only allowed if status !== 'read')
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

  // WhatsApp-style restriction: If recipient has already read it, sender cannot edit!
  if (isRead && !isAdmin) {
    throw new Error('ተቀባዩ መልዕክቱን አንብቦታል፤ ስለዚህ ማስተካከል አይቻልም። (Message already read by recipient)');
  }

  const nowIso = new Date().toISOString();
  const updatePayload = {
    content: newContent.trim(),
    isEdited: true,
    updatedAt: nowIso,
  };

  // 1. Client Firestore
  try {
    const p1 = updateDoc(doc(db, 'artifacts', 'tsehaycampus-e1a6d', 'community_conversations', conversationId, 'messages', messageId), updatePayload);
    const p2 = updateDoc(doc(db, 'community_conversations', conversationId, 'messages', messageId), updatePayload);
    const p3 = updateDoc(doc(db, 'direct_messages', messageId), updatePayload);
    await Promise.allSettled([p1, p2, p3]);
  } catch (e) {}

  // 2. Server API Dispatch
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

// Delete a Sent Message (Only allowed if status !== 'read', or if user is Admin)
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

  // WhatsApp-style restriction: If recipient has already read it, normal sender cannot delete it!
  if (!isAdmin && isRead) {
    throw new Error('ተቀባዩ መልዕክቱን አንብቦታል፤ ስለዚህ መሰረዝ አይቻልም። (Message already read by recipient)');
  }

  const nowIso = new Date().toISOString();
  const deletePayload = {
    content: '🚫 ይህ መልእክት ተሰርዟል (This message was deleted)',
    imageUrl: null,
    isDeleted: true,
    updatedAt: nowIso,
  };

  // 1. Client Firestore Soft-Delete (WhatsApp Style)
  try {
    const p1 = updateDoc(doc(db, 'artifacts', 'tsehaycampus-e1a6d', 'community_conversations', conversationId, 'messages', messageId), deletePayload);
    const p2 = updateDoc(doc(db, 'community_conversations', conversationId, 'messages', messageId), deletePayload);
    const p3 = updateDoc(doc(db, 'direct_messages', messageId), deletePayload);
    await Promise.allSettled([p1, p2, p3]);
  } catch (e) {}

  // 2. Server API Dispatch
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
