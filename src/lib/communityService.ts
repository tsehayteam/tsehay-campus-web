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
  content: string;
  imageUrl?: string | null;
  createdAt: any;
  isRead: boolean;
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
  if (!email) return false;
  const adminEmails = ['admin@tsehaycampus.com', 'chadmin@tsehaycampus.com', 'admin@tsehay.com'];
  return adminEmails.includes(email.toLowerCase()) || role === 'admin';
};

// 1. Subscribe to Live Community Posts
export const subscribeCommunityPosts = (
  onPostsUpdate: (posts: CommunityPost[]) => void,
  categoryFilter: string = 'all'
) => {
  try {
    const getDeletedIds = (): string[] => {
      if (typeof window === 'undefined') return [];
      try {
        const deleted = localStorage.getItem('tsehay_deleted_community_posts');
        return deleted ? JSON.parse(deleted) : [];
      } catch (e) {
        return [];
      }
    };

    const postsRef = collection(db, 'artifacts', 'tsehaycampus-e1a6d', 'community_posts');
    const q = query(postsRef, orderBy('createdAt', 'desc'), limit(100));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const deletedIds = getDeletedIds();
        if (!snapshot.empty) {
          const livePosts: CommunityPost[] = [];
          snapshot.forEach((docSnap) => {
            if (deletedIds.includes(docSnap.id)) return;
            const data = docSnap.data();
            livePosts.push({
              id: docSnap.id,
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
              tags: data.tags || [],
              likes: Array.isArray(data.likes) ? data.likes : [],
              commentsCount: Number(data.commentsCount || 0),
              isPinned: Boolean(data.isPinned),
              isFeatured: Boolean(data.isFeatured),
              createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : (data.createdAt || new Date().toISOString()),
              updatedAt: data.updatedAt,
            });
          });

          // Sort: Pinned posts first, then chronological
          livePosts.sort((a, b) => {
            if (a.isPinned && !b.isPinned) return -1;
            if (!a.isPinned && b.isPinned) return 1;
            const timeA = new Date(a.createdAt).getTime();
            const timeB = new Date(b.createdAt).getTime();
            return timeB - timeA;
          });

          // Filter if category is specified
          const filtered = categoryFilter === 'all' 
            ? livePosts 
            : livePosts.filter(p => p.category === categoryFilter);

          onPostsUpdate(filtered);
          try {
            localStorage.setItem('tsehay_cached_community_posts', JSON.stringify(livePosts));
          } catch (e) {}
        } else {
          // If Firestore collection is empty, filter out any deleted sample posts
          const availableSamples = INITIAL_COMMUNITY_POSTS.filter(p => !deletedIds.includes(p.id));
          const filtered = categoryFilter === 'all' 
            ? availableSamples 
            : availableSamples.filter(p => p.category === categoryFilter);
          onPostsUpdate(filtered);
        }
      },
      (error) => {
        console.warn('Community posts snapshot error:', error);
        const deletedIds = getDeletedIds();
        try {
          const cached = localStorage.getItem('tsehay_cached_community_posts');
          if (cached) {
            const parsed = JSON.parse(cached);
            if (Array.isArray(parsed) && parsed.length > 0) {
              const cleaned = parsed.filter((p: any) => !deletedIds.includes(p.id));
              onPostsUpdate(categoryFilter === 'all' ? cleaned : cleaned.filter((p: any) => p.category === categoryFilter));
              return;
            }
          }
        } catch (e) {}
        const fallback = INITIAL_COMMUNITY_POSTS.filter(p => !deletedIds.includes(p.id));
        onPostsUpdate(categoryFilter === 'all' ? fallback : fallback.filter(p => p.category === categoryFilter));
      }
    );

    return unsubscribe;
  } catch (error) {
    console.error('Failed to setup posts listener:', error);
    onPostsUpdate(INITIAL_COMMUNITY_POSTS);
    return () => {};
  }
};

// 2. Create Community Post
export const createCommunityPost = async (post: Omit<CommunityPost, 'id' | 'likes' | 'commentsCount' | 'createdAt'>) => {
  const newPostData = {
    ...post,
    likes: [],
    commentsCount: 0,
    isPinned: Boolean(post.isPinned),
    isFeatured: Boolean(post.isFeatured),
    createdAt: serverTimestamp(),
  };

  let docId = '';
  try {
    const postsRef = collection(db, 'artifacts', 'tsehaycampus-e1a6d', 'community_posts');
    const docRef = await addDoc(postsRef, newPostData);
    docId = docRef.id;

    // Mirror to root community_posts
    try {
      await setDoc(doc(db, 'community_posts', docId), { ...newPostData, id: docId });
    } catch (e) {}
  } catch (clientErr) {
    console.warn('Client create post fallback to API:', clientErr);
    const res = await fetch('/api/admin/community', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(post)
    });
    if (res.ok) {
      const data = await res.json();
      docId = data.post?.id || `post_${Date.now()}`;
    }
  }

  return docId;
};

// 3. Toggle Like on a Post
export const toggleLikePost = async (postId: string, userId: string, isLiked: boolean) => {
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
  try {
    const commentsRef = collection(db, 'artifacts', 'tsehaycampus-e1a6d', 'community_posts', postId, 'comments');
    const q = query(commentsRef, orderBy('createdAt', 'asc'), limit(50));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const liveComments: CommunityComment[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          liveComments.push({
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
        });
        onCommentsUpdate(liveComments);
      },
      (error) => {
        console.warn('Comments listener error:', error);
      }
    );

    return unsubscribe;
  } catch (e) {
    console.error('Error attaching comments listener:', e);
    return () => {};
  }
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
  }
) => {
  // 1. Client Firestore
  try {
    const commentsRef = collection(db, 'artifacts', 'tsehaycampus-e1a6d', 'community_posts', postId, 'comments');
    const postDocRef = doc(db, 'artifacts', 'tsehaycampus-e1a6d', 'community_posts', postId);

    await addDoc(commentsRef, {
      ...commentData,
      createdAt: serverTimestamp(),
    });

    await updateDoc(postDocRef, {
      commentsCount: increment(1),
    });
  } catch (e) {}

  // 2. Server API Dispatch
  try {
    await fetch('/api/community/comment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ postId, ...commentData })
    });
  } catch (apiErr) {}
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
export const getConversationId = (uid1: string, uid2: string): string => {
  return [uid1, uid2].sort().join('_');
};

// Subscribe to User's Conversations
export const subscribeUserConversations = (
  userId: string,
  onConversationsUpdate: (conversations: Conversation[]) => void
) => {
  try {
    const convRef = collection(db, 'artifacts', 'tsehaycampus-e1a6d', 'community_conversations');
    const q = query(
      convRef,
      where('participants', 'array-contains', userId),
      orderBy('lastMessageTime', 'desc'),
      limit(30)
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const convList: Conversation[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          convList.push({
            id: docSnap.id,
            participants: data.participants || [],
            participantDetails: data.participantDetails || {},
            lastMessage: data.lastMessage || '',
            lastMessageSenderId: data.lastMessageSenderId || '',
            lastMessageTime: data.lastMessageTime?.toDate ? data.lastMessageTime.toDate().toISOString() : (data.lastMessageTime || new Date().toISOString()),
            unreadCount: data.unreadCount || {},
          });
        });
        onConversationsUpdate(convList);
      },
      (err) => {
        console.warn('Conversation listener error:', err);
      }
    );

    return unsubscribe;
  } catch (e) {
    console.error('Error starting conversation listener:', e);
    return () => {};
  }
};

// Subscribe to Messages in a Conversation
export const subscribeConversationMessages = (
  conversationId: string,
  onMessagesUpdate: (messages: DirectMessage[]) => void
) => {
  try {
    const msgRef = collection(db, 'artifacts', 'tsehaycampus-e1a6d', 'community_conversations', conversationId, 'messages');
    const q = query(msgRef, orderBy('createdAt', 'asc'), limit(100));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const msgs: DirectMessage[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          msgs.push({
            id: docSnap.id,
            conversationId,
            senderId: data.senderId || '',
            senderName: data.senderName || '',
            senderPhoto: data.senderPhoto || '',
            senderEmail: data.senderEmail || '',
            receiverId: data.receiverId || '',
            content: data.content || '',
            imageUrl: data.imageUrl || null,
            createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : (data.createdAt || new Date().toISOString()),
            isRead: Boolean(data.isRead),
          });
        });
        onMessagesUpdate(msgs);
      },
      (err) => {
        console.warn('Messages listener error:', err);
      }
    );

    return unsubscribe;
  } catch (e) {
    console.error('Error starting messages listener:', e);
    return () => {};
  }
};

// Send a Direct Message with Multi-tier Resilience
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
  // 1. Client Firestore
  try {
    const convDocRef = doc(db, 'artifacts', 'tsehaycampus-e1a6d', 'community_conversations', conversationId);
    const msgCollRef = collection(db, 'artifacts', 'tsehaycampus-e1a6d', 'community_conversations', conversationId, 'messages');

    await addDoc(msgCollRef, {
      conversationId,
      senderId: message.senderId,
      senderName: message.senderName,
      senderPhoto: message.senderPhoto,
      senderEmail: message.senderEmail,
      receiverId: message.receiverId,
      content: message.content,
      imageUrl: message.imageUrl || null,
      createdAt: serverTimestamp(),
      isRead: false,
    });

    await setDoc(
      convDocRef,
      {
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
        lastMessageTime: serverTimestamp(),
        [`unreadCount.${message.receiverId}`]: increment(1),
      },
      { merge: true }
    );
  } catch (clientErr) {
    console.warn('Client direct message notice:', clientErr);
  }

  // 2. Server API Dispatch
  try {
    await fetch('/api/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        conversationId,
        ...message
      })
    });
  } catch (apiErr) {}

  return { success: true };
};
