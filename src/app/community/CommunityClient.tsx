'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import RequireAuthModal from '@/components/RequireAuthModal';
import { useAuth } from '@/context/AuthContext';
import { auth, db } from '@/lib/firebase/config';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';

function getLocalCachedUser(): { uid: string; email?: string | null; displayName?: string | null; photoURL?: string | null } | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem('tsehay_auth_user_cache');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}
import { 
  CommunityPost, 
  CommunityComment,
  DirectMessage,
  Conversation,
  subscribeCommunityPosts, 
  createCommunityPost, 
  toggleLikePost, 
  deleteCommunityPost,
  pinCommunityPost,
  featureCommunityPost,
  subscribePostComments,
  addCommentToPost,
  deleteCommentFromPost,
  isUserAdmin,
  getCachedCommunityPosts,
  getConversationId,
  subscribeConversationMessages,
  sendDirectMessage,
  markMessagesAsRead,
  subscribeUserConversations
} from '@/lib/communityService';
import FormattedAiText from '@/components/FormattedAiText';

const CATEGORIES = [
  { id: 'all', label: 'ሁሉም (All)', icon: 'fa-globe' },
  { id: 'general', label: 'አጠቃላይ (General)', icon: 'fa-comments' },
  { id: 'questions', label: 'ጥያቄና መልስ (Q&A)', icon: 'fa-circle-question' },
  { id: 'success', label: 'የስኬት ታሪኮች (Wins)', icon: 'fa-trophy' },
  { id: 'business', label: 'ቢዝነስና ገበያ (Business)', icon: 'fa-chart-line' },
  { id: 'tech', label: 'ቴክኖሎጂና AI (Tech)', icon: 'fa-microchip' },
];

const TRENDING_TAGS = [
  '#YouTubeMastery',
  '#SheinBusiness',
  '#DigitalMarketing',
  '#EcommerceEthiopia',
  '#TsehayAI',
  '#Dropshipping'
];

export default function CommunityClient() {
  const router = useRouter();
  const { user: contextUser } = useAuth();
  const [currentUser, setCurrentUser] = useState<User | null>(() => auth.currentUser);
  const [userProfile, setUserProfile] = useState<{ displayName: string; photoURL: string; email: string; isPro: boolean; isAdmin: boolean } | null>(null);
  const [authLoading, setAuthLoading] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authModalTitle, setAuthModalTitle] = useState('ለመቀጠል እባክዎ አስቀድመው ይመዝገቡ');
  const [authModalDescription, setAuthModalDescription] = useState('በማህበረሰቡ ውስጥ ፖስት ለማድረግ፣ አስተያየት ለመስጠት እና መልዕክት ለመላክ መጀመሪያ መለያዎን ይክፈቱ።');

  // Compute effective user from Firebase auth, contextUser, or local cache
  const effectiveUser = useMemo(() => {
    if (currentUser) return currentUser;
    if (contextUser) return contextUser;
    if (auth.currentUser) return auth.currentUser;
    return getLocalCachedUser();
  }, [currentUser, contextUser]);

  // Compute effective profile with instant fallback so authenticated users never see logged-out state
  const effectiveProfile = useMemo(() => {
    if (userProfile) return userProfile;
    if (!effectiveUser) return null;
    const name = effectiveUser.displayName || effectiveUser.email?.split('@')[0] || 'ተማሪ';
    const photo = effectiveUser.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=f9b03c&color=111827&bold=true`;
    const isAdmin = isUserAdmin(effectiveUser.email);
    return {
      displayName: name,
      photoURL: photo,
      email: effectiveUser.email || '',
      isPro: false,
      isAdmin,
    };
  }, [userProfile, effectiveUser]);

  // Auto-dismiss auth modal when authenticated user is detected
  useEffect(() => {
    if (effectiveUser && showAuthModal) {
      setShowAuthModal(false);
    }
  }, [effectiveUser, showAuthModal]);

  // Posts State
  const [posts, setPosts] = useState<CommunityPost[]>(() => getCachedCommunityPosts());
  const [postsLoading, setPostsLoading] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Post Creator State
  const [postContent, setPostContent] = useState('');
  const [postCategory, setPostCategory] = useState<'general' | 'questions' | 'success' | 'tech' | 'business'>('general');
  const [attachedImage, setAttachedImage] = useState<string | null>(null);
  const [showCodeInput, setShowCodeInput] = useState(false);
  const [codeLanguage, setCodeLanguage] = useState('javascript');
  const [codeText, setCodeText] = useState('');
  const [isSubmittingPost, setIsSubmittingPost] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Comments & Lightbox State
  const [expandedComments, setExpandedComments] = useState<{ [postId: string]: boolean }>({});
  const [commentsByPost, setCommentsByPost] = useState<{ [postId: string]: CommunityComment[] }>({});
  const [commentInputs, setCommentInputs] = useState<{ [postId: string]: string }>({});
  const [submittingComment, setSubmittingComment] = useState<{ [postId: string]: boolean }>({});
  const [activeZoomImage, setActiveZoomImage] = useState<string | null>(null);
  const [copiedPostId, setCopiedPostId] = useState<string | null>(null);

  // Direct Messaging (DM) State
  const [activeDmUser, setActiveDmUser] = useState<{ id: string; name: string; photo: string; email: string; isPro?: boolean; isAdmin?: boolean } | null>(null);
  const [dmConversationId, setDmConversationId] = useState<string | null>(null);
  const [dmInput, setDmInput] = useState('');
  const [dmSubmitting, setDmSubmitting] = useState(false);
  const [dmList, setDmList] = useState<DirectMessage[]>([]);
  const [isRecordingVoice, setIsRecordingVoice] = useState(false);
  const [voiceDuration, setVoiceDuration] = useState(0);
  const dmMessagesEndRef = useRef<HTMLDivElement>(null);
  const voiceTimerRef = useRef<any>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // Auth Listener
  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setAuthLoading(false);
    });

    return () => unsubAuth();
  }, []);

  // Sync profile metadata & pro status when effective user is active
  useEffect(() => {
    if (!effectiveUser) {
      setUserProfile(null);
      return;
    }

    const activeUser = effectiveUser;
    let isMounted = true;
    async function syncProfile(user: { uid: string; email?: string | null; displayName?: string | null; photoURL?: string | null }) {
      let isPro = false;
      try {
        const userDoc = await getDoc(doc(db, 'artifacts', 'tsehaycampus-e1a6d', 'users', user.uid));
        if (userDoc.exists()) {
          const data = userDoc.data();
          isPro = Boolean(data?.enrolledCourses?.length > 0 || data?.isPro || data?.purchasedCourses?.length > 0);
        }
      } catch (e) {}

      if (typeof window !== 'undefined') {
        try {
          const cachedCourses = localStorage.getItem('tsehay_user_purchased_courses');
          if (cachedCourses && JSON.parse(cachedCourses)?.length > 0) {
            isPro = true;
          }
        } catch (e) {}
      }

      const isAdmin = isUserAdmin(user.email);
      if (isMounted) {
        setUserProfile({
          displayName: user.displayName || user.email?.split('@')[0] || 'ተማሪ',
          photoURL: user.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.displayName || 'User')}&background=f9b03c&color=111827&bold=true`,
          email: user.email || '',
          isPro,
          isAdmin,
        });
      }
    }

    syncProfile(activeUser);

    return () => {
      isMounted = false;
    };
  }, [effectiveUser?.uid, effectiveUser?.email]);

  // Real-time Posts Subscription
  useEffect(() => {
    setPostsLoading(true);
    const unsubPosts = subscribeCommunityPosts((livePosts) => {
      setPosts(livePosts);
      setPostsLoading(false);
    }, activeCategory);

    return () => {
      if (typeof unsubPosts === 'function') unsubPosts();
    };
  }, [activeCategory]);

  // Deep-link auto-scroll
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const urlParams = new URLSearchParams(window.location.search);
    const targetPostId = urlParams.get('post') || window.location.hash.replace('#post-', '');
    if (targetPostId && posts.length > 0) {
      setTimeout(() => {
        const el = document.getElementById(`post-${targetPostId}`);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          el.classList.add('ring-2', 'ring-[#f9b03c]', 'ring-offset-2', 'ring-offset-slate-950');
          setTimeout(() => {
            el.classList.remove('ring-2', 'ring-[#f9b03c]', 'ring-offset-2', 'ring-offset-slate-950');
          }, 3000);
        }
      }, 300);
    }
  }, [posts]);

  // Direct Message Real-time Listener
  useEffect(() => {
    if (!effectiveUser || !activeDmUser) {
      setDmConversationId(null);
      setDmList([]);
      return;
    }

    const currentUserId = effectiveUser.uid;
    const convId = getConversationId(currentUserId, activeDmUser.id);
    setDmConversationId(convId);

    const unsub = subscribeConversationMessages(convId, (msgs) => {
      setDmList(msgs);
      const hasUnread = msgs.some(m => m.receiverId === currentUserId && (!m.isRead || m.status !== 'read'));
      if (hasUnread) {
        markMessagesAsRead(convId, currentUserId);
      }
      setTimeout(() => {
        dmMessagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    });

    markMessagesAsRead(convId, currentUserId);

    return () => {
      if (typeof unsub === 'function') unsub();
    };
  }, [effectiveUser?.uid, activeDmUser]);

  // Handle Comments Toggle
  const toggleComments = (postId: string) => {
    setExpandedComments((prev) => {
      const nextState = !prev[postId];
      if (nextState && !commentsByPost[postId]) {
        subscribePostComments(postId, (comments) => {
          setCommentsByPost((cPrev) => ({ ...cPrev, [postId]: comments }));
        });
      }
      return { ...prev, [postId]: nextState };
    });
  };

  // Image upload handler
  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert('የምስሉ መጠን ከ 5MB በታች መሆን አለበት።');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setAttachedImage(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  // Handle Post Creation
  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!effectiveUser) {
      setAuthModalTitle('ፖስት ለማጋራት ይመዝገቡ');
      setAuthModalDescription('ጥያቄዎን ለመጠየቅ ወይም ሃሳብዎን ለማጋራት እባክዎ መጀመሪያ ይግቡ።');
      setShowAuthModal(true);
      return;
    }

    if (!postContent.trim() && !attachedImage && !codeText.trim()) {
      alert('እባክዎ ጽሑፍ፣ ኮድ ወይም ምስል ያስገቡ።');
      return;
    }

    setIsSubmittingPost(true);
    try {
      const newPostPayload = {
        authorId: effectiveUser.uid,
        authorName: effectiveProfile?.displayName || 'ተማሪ',
        authorEmail: effectiveUser.email || '',
        authorPhoto: effectiveProfile?.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(effectiveProfile?.displayName || 'User')}&background=f9b03c&color=111827&bold=true`,
        authorRole: (effectiveProfile?.isAdmin ? 'admin' : 'student') as 'admin' | 'student' | 'instructor',
        isAdmin: Boolean(effectiveProfile?.isAdmin),
        isPro: Boolean(effectiveProfile?.isPro),
        content: postContent.trim(),
        codeSnippet: showCodeInput && codeText.trim() ? { code: codeText.trim(), language: codeLanguage } : null,
        imageUrl: attachedImage,
        category: postCategory,
        tags: [],
        isPinned: false,
        isFeatured: false,
      };

      const docId = await createCommunityPost(newPostPayload);

      setPosts(prev => [{
        id: docId || `post_${Date.now()}`,
        ...newPostPayload,
        likes: [],
        commentsCount: 0,
        createdAt: new Date().toISOString()
      }, ...prev]);

      setPostContent('');
      setAttachedImage(null);
      setShowCodeInput(false);
      setCodeText('');
    } catch (err: any) {
      console.error('Error creating post:', err);
      alert('ፖስቱን ማጋራት አልተቻለም። እባክዎ እንደገና ይሞክሩ።');
    } finally {
      setIsSubmittingPost(false);
    }
  };

  // Handle Like Post
  const handleLike = async (post: CommunityPost) => {
    if (!effectiveUser) {
      setAuthModalTitle('ላይክ ለማድረግ ይመዝገቡ');
      setAuthModalDescription('ፖስቶችን ላይክ ለማድረግ እና ድጋፍዎን ለመግለጽ እባክዎ ይግቡ።');
      setShowAuthModal(true);
      return;
    }

    const isLiked = post.likes.includes(effectiveUser.uid);
    setPosts(prev => prev.map(p => {
      if (p.id === post.id) {
        return {
          ...p,
          likes: isLiked 
            ? p.likes.filter(id => id !== effectiveUser.uid) 
            : [...p.likes, effectiveUser.uid]
        };
      }
      return p;
    }));

    try {
      await toggleLikePost(post.id, effectiveUser.uid, isLiked, {
        postAuthorEmail: post.authorEmail,
        postAuthorName: post.authorName,
        postSnippet: post.content,
        likerName: effectiveProfile?.displayName || effectiveUser.displayName || 'አንድ ተማሪ'
      });
    } catch (e) {}
  };

  // Handle Toggle Pin
  const handleTogglePin = async (post: CommunityPost) => {
    const nextPinned = !post.isPinned;
    setPosts(prev => prev.map(p => p.id === post.id ? { ...p, isPinned: nextPinned } : p));
    try {
      await pinCommunityPost(post.id, nextPinned);
    } catch (e) {}
  };

  // Handle Share Post
  const handleSharePost = async (post: CommunityPost) => {
    const postUrl = `${window.location.origin}/community?post=${encodeURIComponent(post.id)}`;
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: 'Tsehay Campus Community',
          text: post.content.substring(0, 120),
          url: postUrl
        });
        return;
      } catch (e) {}
    }

    try {
      await navigator.clipboard.writeText(postUrl);
      setCopiedPostId(post.id);
      setTimeout(() => setCopiedPostId(null), 2500);
    } catch (e) {}
  };

  // Handle Submit Comment
  const handleAddComment = async (postId: string) => {
    if (!effectiveUser) {
      setAuthModalTitle('አስተያየት ለመጻፍ ይመዝገቡ');
      setAuthModalDescription('በውይይቱ ለመሳተፍ እና አስተያየት ለመስጠት እባክዎ ይግቡ።');
      setShowAuthModal(true);
      return;
    }

    const text = commentInputs[postId]?.trim();
    if (!text) return;

    const targetPost = posts.find(p => p.id === postId);

    setSubmittingComment((prev) => ({ ...prev, [postId]: true }));
    const tempCommentId = `comm_${Date.now()}`;
    const newCommentObj = {
      id: tempCommentId,
      postId,
      authorId: effectiveUser.uid,
      authorName: effectiveProfile?.displayName || 'ተማሪ',
      authorEmail: effectiveUser.email || '',
      authorPhoto: effectiveProfile?.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(effectiveProfile?.displayName || 'User')}&background=f9b03c&color=111827&bold=true`,
      isAdmin: Boolean(effectiveProfile?.isAdmin),
      isPro: Boolean(effectiveProfile?.isPro),
      content: text,
      createdAt: new Date().toISOString(),
    };

    setCommentsByPost((prev) => ({
      ...prev,
      [postId]: [...(prev[postId] || []), newCommentObj],
    }));

    setPosts((prev) =>
      prev.map((p) =>
        p.id === postId ? { ...p, commentsCount: (p.commentsCount || 0) + 1 } : p
      )
    );

    setCommentInputs((prev) => ({ ...prev, [postId]: '' }));

    try {
      await addCommentToPost(postId, newCommentObj, {
        authorEmail: targetPost?.authorEmail,
        authorName: targetPost?.authorName,
        postSnippet: targetPost?.content
      });
    } catch (err) {
      console.error('Error adding comment:', err);
    } finally {
      setSubmittingComment((prev) => ({ ...prev, [postId]: false }));
    }
  };

  // Handle Delete Post
  const handleDeletePost = async (postId: string) => {
    if (!confirm('ይህንን ፖስት መሰረዝ እንደሚፈልጉ እርግጠኛ ነዎት?')) return;
    setPosts((prev) => prev.filter((p) => p.id !== postId));
    try {
      await deleteCommunityPost(postId);
    } catch (e) {}
  };

  // Direct Message Sending
  const handleSendDm = async (e?: React.FormEvent, overrideAudio?: string) => {
    if (e) e.preventDefault();
    if (!effectiveUser || !activeDmUser || !dmConversationId) return;

    const messageText = overrideAudio ? '🎤 የድምፅ መልእክት (Voice Message)' : dmInput.trim();
    if (!messageText && !overrideAudio) return;

    setDmInput('');
    setDmSubmitting(true);

    const tempDm: DirectMessage = {
      id: `dm_${Date.now()}`,
      conversationId: dmConversationId,
      senderId: effectiveUser.uid,
      senderName: effectiveProfile?.displayName || 'ተማሪ',
      senderPhoto: effectiveProfile?.photoURL || '',
      senderEmail: effectiveUser.email || '',
      receiverId: activeDmUser.id,
      content: messageText,
      imageUrl: overrideAudio || null,
      createdAt: new Date().toISOString(),
      isRead: false
    };

    setDmList(prev => [...prev, tempDm]);

    try {
      await sendDirectMessage(dmConversationId, {
        senderId: effectiveUser.uid,
        senderName: effectiveProfile?.displayName || 'ተማሪ',
        senderPhoto: effectiveProfile?.photoURL || '',
        senderEmail: effectiveUser.email || '',
        receiverId: activeDmUser.id,
        receiverName: activeDmUser.name,
        receiverPhoto: activeDmUser.photo,
        receiverEmail: activeDmUser.email,
        content: messageText,
        imageUrl: overrideAudio || null
      });
    } catch (e) {
      console.error("Error sending direct message:", e);
    } finally {
      setDmSubmitting(false);
    }
  };

  // Voice recording for DM
  const startVoiceRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64Audio = reader.result as string;
          handleSendDm(undefined, base64Audio);
        };
        reader.readAsDataURL(audioBlob);
        stream.getTracks().forEach(t => t.stop());
      };

      mediaRecorder.start();
      setIsRecordingVoice(true);
      setVoiceDuration(0);
      voiceTimerRef.current = setInterval(() => setVoiceDuration(p => p + 1), 1000);
    } catch (err) {
      alert('የማይክሮፎን ፍቃድ አልተገኘም። እባክዎ በማይክሮፎን ለመጠቀም ፍቃድ ይስጡ።');
    }
  };

  const stopVoiceRecording = () => {
    if (mediaRecorderRef.current && isRecordingVoice) {
      mediaRecorderRef.current.stop();
    }
    if (voiceTimerRef.current) clearInterval(voiceTimerRef.current);
    setIsRecordingVoice(false);
    setVoiceDuration(0);
  };

  // Open Direct Message modal
  const openDmWithUser = (target: { id: string; name: string; photo: string; email: string; isPro?: boolean; isAdmin?: boolean }) => {
    if (!effectiveUser) {
      setAuthModalTitle('መልእክት ለመላክ ይመዝገቡ');
      setAuthModalDescription('ከተማሪዎች ጋር በግል ለመወያየት እና መልእክት ለመለዋወጥ እባክዎ ይግቡ።');
      setShowAuthModal(true);
      return;
    }
    if (target.id === effectiveUser.uid) {
      alert('ለራስዎ መልእክት መላክ አይችሉም።');
      return;
    }
    setActiveDmUser(target);
  };

  // Filtered Posts
  const filteredPosts = useMemo(() => {
    let result = posts;
    if (activeCategory !== 'all') {
      result = result.filter(p => p.category === activeCategory);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(p => 
        p.content.toLowerCase().includes(q) || 
        p.authorName.toLowerCase().includes(q) ||
        (p.tags && p.tags.some(t => t.toLowerCase().includes(q)))
      );
    }
    return result;
  }, [posts, activeCategory, searchQuery]);

  return (
    <div className="min-h-screen bg-[#030509] text-white flex flex-col selection:bg-[#f9b03c]/30 selection:text-[#f9b03c]">
      <Navbar />

      <div className="fixed top-20 left-1/4 w-[600px] h-[600px] bg-[#f9b03c]/10 rounded-full blur-[180px] pointer-events-none -z-10" />
      <div className="fixed bottom-10 right-1/4 w-[600px] h-[600px] bg-[#3268ba]/15 rounded-full blur-[180px] pointer-events-none -z-10" />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-28 sm:pt-32 pb-16">
        
        {/* Top Header Banner */}
        <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-slate-950/90 via-[#070d1a]/90 to-slate-950/90 border border-white/10 shadow-[0_0_40px_rgba(0,0,0,0.8)] backdrop-blur-2xl">
          <div>
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#f9b03c]/15 border border-[#f9b03c]/30 text-[#f9b03c] text-xs font-black mb-3">
              <span className="w-2 h-2 rounded-full bg-[#f9b03c] animate-ping" />
              <span>TSEHAY STUDENT COMMUNITY</span>
            </div>
            <h1 className="text-2xl sm:text-4xl font-black font-heading text-white tracking-tight">
              የተማሪዎች <span className="text-[#f9b03c]">ማህበረሰብ </span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-2xl font-normal">
              ከ 500+ በላይ ንቁ ተማሪዎች ጋር ይወያዩ፣ ጥያቄዎችን ይጠይቁ፣ የስኬት ታሪኮችዎን ያጋሩ እና እርስ በእርስ ይደጋገፉ።
            </p>
          </div>

          <div className="w-full md:w-80">
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="ውይይቶችን፣ ርዕሶችን ወይም ተማሪዎችን ይፈልጉ..."
                className="w-full bg-white/5 border border-white/10 focus:border-[#f9b03c] rounded-2xl px-4 py-3 pl-10 text-xs text-white placeholder-slate-500 focus:outline-none transition shadow-inner"
              />
              <svg className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
              </svg>
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3.5 top-3.5 text-slate-400 hover:text-white"
                >
                  <i className="fa-solid fa-xmark text-xs"></i>
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* LEFT SIDEBAR */}
          <aside className="lg:col-span-3 space-y-6 lg:sticky lg:top-32">
            <div className="p-5 rounded-3xl bg-slate-900/80 border border-white/10 backdrop-blur-2xl shadow-xl">
              {effectiveUser && effectiveProfile ? (
                <div className="text-center">
                  <div className="relative inline-block mb-3">
                    <img 
                      src={effectiveProfile.photoURL} 
                      alt={effectiveProfile.displayName} 
                      className="w-20 h-20 rounded-full object-cover ring-2 ring-[#f9b03c]/60 shadow-[0_0_20px_rgba(249,176,60,0.3)] mx-auto"
                    />
                    {effectiveProfile.isPro && (
                      <span className="absolute bottom-0 right-0 bg-[#f9b03c] text-slate-950 text-[10px] font-black px-2 py-0.5 rounded-full shadow-md border-2 border-slate-950">
                        PRO
                      </span>
                    )}
                  </div>
                  <h3 className="font-heading font-black text-base text-white">{effectiveProfile.displayName}</h3>
                  <p className="text-[11px] text-slate-400 truncate">{effectiveProfile.email}</p>
                  
                  <div className="mt-4 pt-4 border-t border-white/10 grid grid-cols-2 gap-2 text-center text-xs">
                    <div className="p-2 rounded-xl bg-white/[0.04]">
                      <span className="block font-black text-white">{posts.filter(p => p.authorId === effectiveUser.uid).length}</span>
                      <span className="text-[10px] text-slate-400 font-medium">የእኔ ፖስቶች</span>
                    </div>
                    <div className="p-2 rounded-xl bg-white/[0.04]">
                      <span className="block font-black text-[#f9b03c]">
                        {posts.filter(p => p.authorId === effectiveUser.uid).reduce((acc, p) => acc + (p.likes?.length || 0), 0)}
                      </span>
                      <span className="text-[10px] text-slate-400 font-medium">ላይኮች</span>
                    </div>
                  </div>

                  <Link
                    href="/dashboard"
                    className="mt-4 w-full block py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-200 hover:text-white font-bold text-xs border border-white/10 transition text-center"
                  >
                    ወደ መማሪያ ክፍል (Classroom)
                  </Link>
                </div>
              ) : (
                <div className="text-center py-4">
                  <div className="w-14 h-14 rounded-2xl bg-[#f9b03c]/20 text-[#f9b03c] flex items-center justify-center text-2xl mx-auto mb-3 shadow-[0_0_20px_rgba(249,176,60,0.3)]">
                    <i className="fa-solid fa-users"></i>
                  </div>
                  <h3 className="font-heading font-black text-base text-white">ይቀላቀሉን!</h3>
                  <p className="text-xs text-slate-400 mt-1 mb-4 leading-relaxed">
                    በውይይት ለመሳተፍ፣ ጥያቄ ለመጠየቅ እና መልእክት ለመላክ መለያ ይፍጠሩ።
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setAuthModalTitle('ወደ ማህበረሰቡ ይቀላቀሉ');
                      setAuthModalDescription('ከሌሎች ተማሪዎች ጋር ለመገናኘት እና ክህሎትዎን ለማሳደግ እባክዎ ይግቡ።');
                      setShowAuthModal(true);
                    }}
                    className="w-full py-2.5 rounded-xl bg-gradient-to-r from-[#f9b03c] via-amber-400 to-yellow-300 text-slate-950 font-black text-xs shadow-lg shadow-[#f9b03c]/30 hover:scale-105 transition cursor-pointer"
                  >
                    ይግቡ / ይመዝገቡ (Login)
                  </button>
                </div>
              )}
            </div>

            <div className="p-5 rounded-3xl bg-slate-900/80 border border-white/10 backdrop-blur-2xl shadow-xl space-y-2">
              <h4 className="text-xs font-black text-[#f9b03c] uppercase tracking-wider mb-3 flex items-center gap-2">
                <i className="fa-solid fa-layer-group text-xs"></i>
                <span>ምድቦች (Categories)</span>
              </h4>
              
              {CATEGORIES.map(cat => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setActiveCategory(cat.id)}
                  className={`w-full flex items-center justify-between p-3 rounded-2xl text-xs font-bold transition-all cursor-pointer ${
                    activeCategory === cat.id
                      ? 'bg-gradient-to-r from-[#3268ba] to-[#244f8e] text-white shadow-lg shadow-[#3268ba]/40 border border-white/20 scale-[1.02]'
                      : 'text-slate-300 hover:bg-white/5 hover:text-white border border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <i className={`fa-solid ${cat.icon} ${activeCategory === cat.id ? 'text-[#f9b03c]' : 'text-slate-400'}`}></i>
                    <span>{cat.label}</span>
                  </div>
                  <span className="text-[10px] bg-white/10 px-2 py-0.5 rounded-full font-mono">
                    {cat.id === 'all' ? posts.length : posts.filter(p => p.category === cat.id).length}
                  </span>
                </button>
              ))}
            </div>
          </aside>

          {/* CENTER FEED */}
          <section className="lg:col-span-6 space-y-6">
            <div className="p-5 sm:p-6 rounded-3xl bg-slate-900/85 border border-white/10 backdrop-blur-2xl shadow-2xl">
              <form onSubmit={handleCreatePost}>
                <div className="flex items-start gap-3 mb-4">
                  <img 
                    src={effectiveProfile?.photoURL || `https://ui-avatars.com/api/?name=User&background=f9b03c&color=111827&bold=true`} 
                    alt="User" 
                    className="w-10 h-10 rounded-full object-cover ring-2 ring-white/20 shrink-0 mt-0.5"
                  />
                  <div className="flex-1">
                    <textarea
                      value={postContent}
                      onChange={(e) => setPostContent(e.target.value)}
                      placeholder={effectiveUser ? `ሰላም ${effectiveProfile?.displayName}፣ ምን ሃሳብ ወይም ጥያቄ አለዎት?...` : "ለማህበረሰቡ ጥያቄዎን ወይም ሃሳብዎን እዚህ ይጻፉ..."}
                      rows={3}
                      className="w-full bg-white/[0.04] border border-white/10 focus:border-[#f9b03c] rounded-2xl p-3.5 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none transition resize-none leading-relaxed font-body"
                    />
                  </div>
                </div>

                {attachedImage && (
                  <div className="relative mb-4 rounded-2xl overflow-hidden border border-white/15 max-h-64 bg-black/50">
                    <img src={attachedImage} alt="Attachment" className="w-full h-full object-contain max-h-64" />
                    <button
                      type="button"
                      onClick={() => setAttachedImage(null)}
                      className="absolute top-3 right-3 w-8 h-8 rounded-full bg-red-500 hover:bg-red-600 text-white flex items-center justify-center text-xs shadow-lg transition cursor-pointer"
                      title="ምስሉን አስወግድ"
                    >
                      <i className="fa-solid fa-xmark"></i>
                    </button>
                  </div>
                )}

                {showCodeInput && (
                  <div className="mb-4 p-4 rounded-2xl bg-black/60 border border-white/15 space-y-3">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-[#f9b03c] flex items-center gap-1.5">
                        <i className="fa-solid fa-code"></i>
                        <span>የኮድ ይዘት (Code Snippet)</span>
                      </span>
                      <select
                        value={codeLanguage}
                        onChange={(e) => setCodeLanguage(e.target.value)}
                        className="bg-slate-900 border border-white/20 rounded-xl px-2.5 py-1 text-white text-xs font-mono"
                      >
                        <option value="javascript">JavaScript</option>
                        <option value="python">Python</option>
                        <option value="html">HTML / CSS</option>
                        <option value="json">JSON</option>
                      </select>
                    </div>
                    <textarea
                      value={codeText}
                      onChange={(e) => setCodeText(e.target.value)}
                      placeholder="// ኮድዎን እዚህ ይለጥፉ..."
                      rows={4}
                      className="w-full bg-black/80 font-mono text-xs text-amber-200 border border-white/10 rounded-xl p-3 focus:outline-none focus:border-[#f9b03c]"
                    />
                  </div>
                )}

                <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-white/10">
                  <div className="flex items-center gap-2 flex-wrap">
                    <input 
                      ref={fileInputRef} 
                      type="file" 
                      accept="image/*" 
                      onChange={handleImageSelect} 
                      className="hidden" 
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-[#f9b03c] border border-white/10 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
                    >
                      <i className="fa-solid fa-image text-emerald-400"></i>
                      <span>ፎቶ</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setShowCodeInput(!showCodeInput)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer border ${
                        showCodeInput 
                          ? 'bg-[#3268ba]/20 text-[#5a93e8] border-[#3268ba]/40' 
                          : 'bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border-white/10'
                      }`}
                    >
                      <i className="fa-solid fa-code text-[#3268ba]"></i>
                      <span>ኮድ</span>
                    </button>

                    <select
                      value={postCategory}
                      onChange={(e: any) => setPostCategory(e.target.value)}
                      className="bg-white/5 border border-white/10 text-slate-200 text-xs rounded-xl px-2.5 py-1.5 font-bold focus:outline-none focus:border-[#f9b03c] transition cursor-pointer"
                    >
                      <option value="general" className="bg-slate-900 text-white">አጠቃላይ (General)</option>
                      <option value="questions" className="bg-slate-900 text-white">ጥያቄና መልስ (Q&A)</option>
                      <option value="success" className="bg-slate-900 text-white">የስኬት ታሪክ (Wins)</option>
                      <option value="business" className="bg-slate-900 text-white">ቢዝነስ (Business)</option>
                      <option value="tech" className="bg-slate-900 text-white">ቴክኖሎጂ (Tech)</option>
                    </select>
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmittingPost || (!postContent.trim() && !attachedImage && !codeText.trim())}
                    className="px-5 py-2 rounded-xl bg-gradient-to-r from-[#f9b03c] via-amber-400 to-yellow-300 hover:brightness-110 active:scale-95 disabled:opacity-50 text-slate-950 font-black text-xs sm:text-sm flex items-center gap-2 shadow-[0_0_20px_rgba(249,176,60,0.35)] transition cursor-pointer"
                  >
                    {isSubmittingPost ? (
                      <>
                        <i className="fa-solid fa-spinner fa-spin"></i>
                        <span>በማጋራት ላይ...</span>
                      </>
                    ) : (
                      <>
                        <span>አጋራ (Post)</span>
                        <i className="fa-solid fa-paper-plane text-xs"></i>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>

            {filteredPosts.length === 0 ? (
              <div className="p-12 text-center rounded-3xl bg-slate-900/60 border border-white/10 backdrop-blur-xl">
                <div className="w-16 h-16 rounded-2xl bg-white/5 text-slate-400 flex items-center justify-center text-2xl mx-auto mb-3">
                  <i className="fa-solid fa-newspaper"></i>
                </div>
                <h3 className="font-heading font-black text-lg text-white">ምንም ፖስት አልተገኘም</h3>
                <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                  {searchQuery ? "በፍለጋዎ መሰረት የተገኘ ፖስት የለም።" : "በዚህ ምድብ የመጀመሪያውን ፖስት እርስዎ ያጋሩ!"}
                </p>
              </div>
            ) : (
              filteredPosts.map((post) => {
                const isLiked = effectiveUser ? post.likes?.includes(effectiveUser.uid) : false;
                const isPostAuthor = effectiveUser?.uid === post.authorId;
                const canDelete = isPostAuthor || effectiveProfile?.isAdmin;

                return (
                  <article
                    id={`post-${post.id}`}
                    key={post.id}
                    className="rounded-3xl bg-slate-900/85 border border-white/10 hover:border-white/20 backdrop-blur-2xl shadow-xl transition-all duration-300 p-5 sm:p-6 overflow-hidden space-y-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => openDmWithUser({
                            id: post.authorId,
                            name: post.authorName,
                            photo: post.authorPhoto,
                            email: post.authorEmail,
                            isPro: post.isPro,
                            isAdmin: post.isAdmin
                          })}
                          className="relative group cursor-pointer"
                          title="መልእክት ለመላክ ይጫኑ"
                        >
                          <img
                            src={post.authorPhoto || `https://ui-avatars.com/api/?name=${encodeURIComponent(post.authorName)}&background=f9b03c&color=111827&bold=true`}
                            alt={post.authorName}
                            className="w-11 h-11 rounded-full object-cover ring-2 ring-white/10 group-hover:ring-[#f9b03c] transition shadow-md"
                          />
                          <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 rounded-full ring-2 ring-slate-900"></span>
                        </button>

                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <button
                              type="button"
                              onClick={() => openDmWithUser({
                                id: post.authorId,
                                name: post.authorName,
                                photo: post.authorPhoto,
                                email: post.authorEmail,
                                isPro: post.isPro,
                                isAdmin: post.isAdmin
                              })}
                              className="font-heading font-black text-sm text-white hover:text-[#f9b03c] transition text-left cursor-pointer"
                            >
                              {post.authorName}
                            </button>

                            {post.isAdmin ? (
                              <span className="bg-[#f9b03c]/20 text-[#f9b03c] border border-[#f9b03c]/40 text-[9.5px] font-black px-2 py-0.2 rounded-full">
                                👑 ADMIN
                              </span>
                            ) : post.isPro ? (
                              <span className="bg-[#3268ba]/20 text-[#5a93e8] border border-[#3268ba]/40 text-[9.5px] font-black px-2 py-0.2 rounded-full">
                                ★ PRO
                              </span>
                            ) : null}

                            {post.isPinned && (
                              <span className="bg-amber-400/20 text-amber-300 border border-amber-400/40 text-[9.5px] font-black px-2 py-0.2 rounded-full flex items-center gap-1">
                                <i className="fa-solid fa-thumbtack text-[8px]"></i> የተሰካ
                              </span>
                            )}
                          </div>
                          <span className="text-[10.5px] text-slate-400 font-medium">
                            {post.createdAt ? new Date(post.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric' }) : 'አሁን'} • {post.category || 'General'}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5">
                        {effectiveProfile?.isAdmin && (
                          <button
                            type="button"
                            onClick={() => handleTogglePin(post)}
                            className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs transition cursor-pointer ${
                              post.isPinned ? 'bg-amber-400/20 text-[#f9b03c]' : 'bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white'
                            }`}
                            title={post.isPinned ? "ፖስቱን ንቀል" : "ፖስቱን ሰካ (Pin)"}
                          >
                            <i className="fa-solid fa-thumbtack"></i>
                          </button>
                        )}

                        {canDelete && (
                          <button
                            type="button"
                            onClick={() => handleDeletePost(post.id)}
                            className="w-8 h-8 rounded-xl bg-white/5 hover:bg-red-500/20 text-slate-400 hover:text-red-400 flex items-center justify-center text-xs transition cursor-pointer"
                            title="ፖስቱን ሰርዝ"
                          >
                            <i className="fa-solid fa-trash-can"></i>
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="text-xs sm:text-[14px] leading-relaxed text-slate-200 font-normal">
                      <FormattedAiText text={post.content} />
                    </div>

                    {post.codeSnippet && post.codeSnippet.code && (
                      <div className="rounded-2xl bg-black/75 border border-white/10 p-4 font-mono text-xs overflow-x-auto relative">
                        <div className="flex items-center justify-between text-[11px] text-slate-400 mb-2 border-b border-white/10 pb-2">
                          <span className="text-[#f9b03c] font-bold">{post.codeSnippet.language}</span>
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard.writeText(post.codeSnippet!.code);
                              alert('ኮዱ ኮፒ ተደርጓል!');
                            }}
                            className="hover:text-white flex items-center gap-1 text-[10px]"
                          >
                            <i className="fa-solid fa-copy"></i>
                            <span>ኮፒ</span>
                          </button>
                        </div>
                        <pre className="text-amber-200 leading-relaxed">{post.codeSnippet.code}</pre>
                      </div>
                    )}

                    {post.imageUrl && (
                      <div 
                        onClick={() => setActiveZoomImage(post.imageUrl!)}
                        className="rounded-2xl overflow-hidden border border-white/15 bg-black/40 cursor-zoom-in max-h-96"
                      >
                        <img 
                          src={post.imageUrl} 
                          alt="Post attachment" 
                          className="w-full h-full object-cover hover:scale-[1.02] transition-transform duration-300 max-h-96" 
                        />
                      </div>
                    )}

                    <div className="pt-3 border-t border-white/10 flex items-center justify-between text-xs sm:text-sm text-slate-400">
                      <button
                        type="button"
                        onClick={() => handleLike(post)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
                          isLiked 
                            ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40' 
                            : 'hover:bg-white/5 hover:text-white border border-transparent'
                        }`}
                      >
                        <i className={`fa-heart ${isLiked ? 'fa-solid text-rose-500' : 'fa-regular'}`}></i>
                        <span className="font-bold">{post.likes?.length || 0}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => toggleComments(post.id)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl hover:bg-white/5 hover:text-white transition cursor-pointer"
                      >
                        <i className="fa-regular fa-comment"></i>
                        <span className="font-bold">{post.commentsCount || 0}</span>
                        <span className="hidden sm:inline">አስተያየቶች</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => openDmWithUser({
                          id: post.authorId,
                          name: post.authorName,
                          photo: post.authorPhoto,
                          email: post.authorEmail,
                          isPro: post.isPro,
                          isAdmin: post.isAdmin
                        })}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl hover:bg-[#f9b03c]/15 hover:text-[#f9b03c] transition cursor-pointer text-xs"
                        title="ለተጠቃሚው መልእክት ላክ"
                      >
                        <i className="fa-regular fa-paper-plane text-[#f9b03c]"></i>
                        <span className="hidden sm:inline">መልእክት</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleSharePost(post)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl hover:bg-white/5 hover:text-white transition cursor-pointer"
                        title="ፖስቱን አጋራ"
                      >
                        <i className="fa-solid fa-share-nodes"></i>
                        <span>{copiedPostId === post.id ? 'ሊንኩ ተገልብጧል!' : 'አጋራ'}</span>
                      </button>
                    </div>

                    {expandedComments[post.id] && (
                      <div className="pt-4 border-t border-white/10 space-y-3 animate-in fade-in duration-300">
                        <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
                          {(!commentsByPost[post.id] || commentsByPost[post.id].length === 0) ? (
                            <p className="text-center py-4 text-xs text-slate-500">
                              ምንም አስተያየት የለም። የመጀመሪያውን አስተያየት ይጻፉ!
                            </p>
                          ) : (
                            commentsByPost[post.id].map((comm) => (
                              <div 
                                key={comm.id} 
                                className="flex items-start gap-2.5 p-3 rounded-2xl bg-white/[0.03] border border-white/[0.06]"
                              >
                                <img
                                  src={comm.authorPhoto || `https://ui-avatars.com/api/?name=${encodeURIComponent(comm.authorName)}&background=f9b03c&color=111827&bold=true`}
                                  alt={comm.authorName}
                                  className="w-7 h-7 rounded-full object-cover shrink-0 mt-0.5"
                                />
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center justify-between gap-2">
                                    <span className="font-bold text-xs text-white">{comm.authorName}</span>
                                    <span className="text-[10px] text-slate-500">
                                      {comm.createdAt ? new Date(comm.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                                    </span>
                                  </div>
                                  <p className="text-xs text-slate-300 font-body mt-0.5 whitespace-pre-wrap">{comm.content}</p>
                                </div>
                              </div>
                            ))
                          )}
                        </div>

                        <form
                          onSubmit={(e) => {
                            e.preventDefault();
                            handleAddComment(post.id);
                          }}
                          className="flex items-center gap-2 pt-2"
                        >
                          <input
                            type="text"
                            value={commentInputs[post.id] || ''}
                            onChange={(e) => setCommentInputs({ ...commentInputs, [post.id]: e.target.value })}
                            placeholder="አስተያየትዎን እዚህ ይጻፉ..."
                            className="flex-1 bg-white/5 border border-white/10 focus:border-[#f9b03c] rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none transition"
                          />
                          <button
                            type="submit"
                            disabled={submittingComment[post.id] || !commentInputs[post.id]?.trim()}
                            className="px-4 py-2 rounded-xl bg-[#3268ba] hover:bg-[#2859a5] disabled:opacity-50 text-white font-bold text-xs transition cursor-pointer"
                          >
                            {submittingComment[post.id] ? '...' : 'ላክ'}
                          </button>
                        </form>
                      </div>
                    )}

                  </article>
                );
              })
            )}

          </section>

          {/* RIGHT SIDEBAR */}
          <aside className="lg:col-span-3 space-y-6 lg:sticky lg:top-32">
            <div className="p-5 rounded-3xl bg-slate-900/80 border border-white/10 backdrop-blur-2xl shadow-xl space-y-3">
              <h4 className="text-xs font-black text-[#f9b03c] uppercase tracking-wider flex items-center gap-2">
                <i className="fa-solid fa-fire text-amber-400"></i>
                <span>ትኩስ ርዕሶች (Trending)</span>
              </h4>
              <div className="flex flex-wrap gap-2 pt-1">
                {TRENDING_TAGS.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => setSearchQuery(tag)}
                    className="text-xs px-3 py-1.5 rounded-full bg-white/5 hover:bg-[#f9b03c]/20 hover:text-[#f9b03c] border border-white/10 hover:border-[#f9b03c]/40 transition text-slate-300 font-bold cursor-pointer"
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>

            <div className="p-5 rounded-3xl bg-slate-900/80 border border-white/10 backdrop-blur-2xl shadow-xl space-y-3">
              <h4 className="text-xs font-black text-blue-400 uppercase tracking-wider flex items-center gap-2">
                <i className="fa-solid fa-shield-halved"></i>
                <span>የማህበረሰብ መመሪያ</span>
              </h4>
              <ul className="text-xs text-slate-400 space-y-2 font-normal leading-relaxed">
                <li className="flex items-start gap-2">
                  <i className="fa-solid fa-check text-emerald-400 text-[10px] mt-1"></i>
                  <span>አክብሮት የተሞላበት እና ገንቢ ውይይት ያድርጉ።</span>
                </li>
                <li className="flex items-start gap-2">
                  <i className="fa-solid fa-check text-emerald-400 text-[10px] mt-1"></i>
                  <span>ስለ ስልጠናዎች እና ቢዝነስ ልምድዎን ያካፍሉ።</span>
                </li>
                <li className="flex items-start gap-2">
                  <i className="fa-solid fa-check text-emerald-400 text-[10px] mt-1"></i>
                  <span>ያልተፈቀደ ማስታወቂያ ወይም ስፓም (Spam) የተከለከለ ነው።</span>
                </li>
              </ul>
            </div>
          </aside>

        </div>

      </main>

      {/* DM Modal */}
      {activeDmUser && (
        <div className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="relative w-full max-w-lg bg-[#070b14] border border-white/15 rounded-3xl shadow-2xl overflow-hidden flex flex-col h-[600px] max-h-[90vh]">
            <div className="p-4 sm:p-5 border-b border-white/10 bg-slate-900/90 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <img
                  src={activeDmUser.photo || `https://ui-avatars.com/api/?name=${encodeURIComponent(activeDmUser.name)}&background=f9b03c&color=111827&bold=true`}
                  alt={activeDmUser.name}
                  className="w-10 h-10 rounded-full object-cover ring-2 ring-[#f9b03c]/40"
                />
                <div>
                  <h4 className="font-heading font-black text-sm text-white flex items-center gap-1.5">
                    <span>{activeDmUser.name}</span>
                    {activeDmUser.isPro && <span className="text-[10px] text-[#f9b03c] font-black">★ PRO</span>}
                  </h4>
                  <span className="text-[11px] text-emerald-400 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                    <span>ቀጥታ መልእክት (Direct Chat)</span>
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                <Link
                  href={`/inbox?user=${encodeURIComponent(activeDmUser.id)}`}
                  className="px-2.5 py-1.5 rounded-xl bg-[#f9b03c]/15 hover:bg-[#f9b03c]/25 border border-[#f9b03c]/30 text-[#f9b03c] text-xs font-black transition flex items-center gap-1"
                  title="ወደ ሙሉ የመልዕክት ሳጥን ይክፈቱ"
                >
                  <i className="fa-solid fa-up-right-from-square text-[10px]"></i>
                  <span className="hidden sm:inline">ሙሉ Inbox</span>
                </Link>
                <button
                  type="button"
                  onClick={() => setActiveDmUser(null)}
                  className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white flex items-center justify-center text-sm transition cursor-pointer"
                >
                  <i className="fa-solid fa-xmark"></i>
                </button>
              </div>
            </div>

            <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-[#03060c]">
              {dmList.length === 0 ? (
                <div className="text-center py-16 text-slate-500 text-xs">
                  <i className="fa-regular fa-comments text-3xl mb-2 block text-slate-600"></i>
                  <span>ውይይቱን እርስዎ ይጀምሩ! የመጀመሪያውን መልእክት ይላኩ።</span>
                </div>
              ) : (
                dmList.map((m) => {
                  const isMe = m.senderId === effectiveUser?.uid;
                  const isRead = m.status === 'read' || m.isRead;
                  const isDelivered = m.status === 'delivered';

                  return (
                    <div
                      key={m.id}
                      className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[80%] p-3.5 rounded-2xl text-xs sm:text-[13px] leading-relaxed shadow-md backdrop-blur-xl ${
                          isMe
                            ? 'bg-gradient-to-br from-[#1e4585] via-[#3268ba] to-[#254f8e] text-white border border-blue-400/25 rounded-br-xs'
                            : 'bg-[#0d1424]/90 text-slate-200 border border-white/10 rounded-bl-xs'
                        }`}
                      >
                        {m.imageUrl && m.imageUrl.startsWith('data:audio') ? (
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <i className="fa-solid fa-microphone text-[#f9b03c]"></i>
                              <span className="font-bold">የድምፅ መልእክት</span>
                            </div>
                            <audio controls src={m.imageUrl} className="w-full max-w-[240px] h-8 mt-1" />
                          </div>
                        ) : (
                          <p className="whitespace-pre-wrap">{m.content}</p>
                        )}
                        <div className={`text-[9.5px] flex items-center gap-1 mt-1 ${isMe ? 'text-blue-200 justify-end' : 'text-slate-400'}`}>
                          {m.isEdited && (
                            <span className="italic text-[8px] opacity-75">(ተስተካክሏል)</span>
                          )}
                          <span>
                            {m.createdAt ? new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                          </span>
                          {isMe && (
                            isRead ? (
                              <span className="text-sky-400 font-bold ml-0.5 drop-shadow-[0_0_6px_rgba(56,189,248,0.8)]" title="ተነቧል (Read)">
                                <i className="fa-solid fa-check-double text-[9px]"></i>
                              </span>
                            ) : isDelivered ? (
                              <span className="text-slate-400 ml-0.5" title="ደርሷል (Delivered)">
                                <i className="fa-solid fa-check-double text-[9px]"></i>
                              </span>
                            ) : (
                              <span className="text-slate-400 ml-0.5" title="ተልኳል (Sent)">
                                <i className="fa-solid fa-check text-[9px]"></i>
                              </span>
                            )
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={dmMessagesEndRef} />
            </div>

            <div className="p-3 sm:p-4 border-t border-white/10 bg-slate-900/90">
              {isRecordingVoice ? (
                <div className="flex items-center justify-between gap-3 p-2 bg-red-500/15 border border-red-500/30 rounded-2xl animate-pulse">
                  <div className="flex items-center gap-2 text-red-400 font-bold text-xs">
                    <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping"></span>
                    <span>ድምፅ በመቅዳት ላይ ({voiceDuration}s)...</span>
                  </div>
                  <button
                    type="button"
                    onClick={stopVoiceRecording}
                    className="px-4 py-1.5 rounded-xl bg-red-500 hover:bg-red-600 text-white font-black text-xs cursor-pointer"
                  >
                    አቁም & ላክ
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSendDm} className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={startVoiceRecording}
                    className="w-10 h-10 rounded-xl bg-white/5 hover:bg-red-500/20 text-slate-300 hover:text-red-400 border border-white/10 flex items-center justify-center text-sm transition cursor-pointer shrink-0"
                    title="የድምፅ መልእክት ይቅረጹ"
                  >
                    <i className="fa-solid fa-microphone"></i>
                  </button>

                  <input
                    type="text"
                    value={dmInput}
                    onChange={(e) => setDmInput(e.target.value)}
                    placeholder="መልእክትዎን እዚህ ይጻፉ..."
                    className="flex-1 bg-white/5 border border-white/10 focus:border-[#f9b03c] rounded-xl px-4 py-2.5 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none transition"
                  />

                  <button
                    type="submit"
                    disabled={dmSubmitting || !dmInput.trim()}
                    className="px-4 py-2.5 rounded-xl bg-[#f9b03c] hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-black text-xs transition cursor-pointer shrink-0"
                  >
                    {dmSubmitting ? '...' : <i className="fa-solid fa-paper-plane"></i>}
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Lightbox Zoom Modal */}
      {activeZoomImage && (
        <div 
          onClick={() => setActiveZoomImage(null)}
          className="fixed inset-0 z-[99999] bg-black/90 backdrop-blur-xl flex items-center justify-center p-4 cursor-zoom-out animate-in fade-in duration-200"
        >
          <div className="relative max-w-4xl max-h-[90vh]">
            <img src={activeZoomImage} alt="Zoomed view" className="w-auto h-auto max-h-[85vh] rounded-2xl object-contain shadow-2xl" />
            <button
              onClick={() => setActiveZoomImage(null)}
              className="absolute top-3 right-3 w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition"
            >
              <i className="fa-solid fa-xmark text-sm"></i>
            </button>
          </div>
        </div>
      )}

      <RequireAuthModal
        isOpen={showAuthModal && !effectiveUser}
        onClose={() => setShowAuthModal(false)}
        title={authModalTitle}
        description={authModalDescription}
      />

      <Footer />
    </div>
  );
}
