'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import RequireAuthModal from '@/components/RequireAuthModal';
import { auth, db } from '@/lib/firebase/config';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { 
  CommunityPost, 
  CommunityComment,
  subscribeCommunityPosts, 
  createCommunityPost, 
  toggleLikePost, 
  deleteCommunityPost,
  pinCommunityPost,
  featureCommunityPost,
  subscribePostComments,
  addCommentToPost,
  deleteCommentFromPost,
  isUserAdmin
} from '@/lib/communityService';

export default function CommunityPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<{ displayName: string; photoURL: string; email: string; isPro: boolean; isAdmin: boolean } | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [showAuthModal, setShowAuthModal] = useState(false);

  // Posts State
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [postsLoading, setPostsLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Post Creator State
  const [postContent, setPostContent] = useState('');
  const [postCategory, setPostCategory] = useState<'general' | 'questions' | 'success' | 'tech' | 'business'>('general');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [customTagInput, setCustomTagInput] = useState('');
  const [showCodeInput, setShowCodeInput] = useState(false);
  const [codeLanguage, setCodeLanguage] = useState('javascript');
  const [codeText, setCodeText] = useState('');
  const [attachedImage, setAttachedImage] = useState<string | null>(null);
  const [isSubmittingPost, setIsSubmittingPost] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Comments & Lightbox State
  const [expandedComments, setExpandedComments] = useState<{ [postId: string]: boolean }>({});
  const [commentsByPost, setCommentsByPost] = useState<{ [postId: string]: CommunityComment[] }>({});
  const [commentInputs, setCommentInputs] = useState<{ [postId: string]: string }>({});
  const [submittingComment, setSubmittingComment] = useState<{ [postId: string]: boolean }>({});
  const [activeZoomImage, setActiveZoomImage] = useState<string | null>(null);
  const [copiedPostId, setCopiedPostId] = useState<string | null>(null);
  const [copiedCodePostId, setCopiedCodePostId] = useState<string | null>(null);

  // Auth Listener & User Pro Status Check
  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      setAuthLoading(false);

      if (user) {
        let isPro = false;
        try {
          // Check if user has enrolled courses in Firestore or localStorage
          const userDoc = await getDoc(doc(db, 'artifacts', 'tsehaycampus-e1a6d', 'users', user.uid));
          if (userDoc.exists()) {
            const data = userDoc.data();
            isPro = Boolean(data?.enrolledCourses?.length > 0 || data?.isPro || data?.purchasedCourses?.length > 0);
          }
        } catch (e) {}

        const cachedCourses = typeof window !== 'undefined' ? localStorage.getItem('tsehay_user_purchased_courses') : null;
        if (cachedCourses && JSON.parse(cachedCourses)?.length > 0) {
          isPro = true;
        }

        const isAdmin = isUserAdmin(user.email);
        setUserProfile({
          displayName: user.displayName || user.email?.split('@')[0] || 'ተማሪ',
          photoURL: user.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.displayName || 'User')}&background=f9b03c&color=111827&bold=true`,
          email: user.email || '',
          isPro,
          isAdmin,
        });
      } else {
        setUserProfile(null);
      }
    });

    return () => unsubAuth();
  }, []);

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

  // Deep-link auto-scroll when visiting /community?post=ID or /community#post-ID
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

  // Handle Comments Toggle
  const toggleComments = (postId: string) => {
    setExpandedComments((prev) => {
      const nextState = !prev[postId];
      if (nextState && !commentsByPost[postId]) {
        // Start listening to comments for this post
        subscribePostComments(postId, (comments) => {
          setCommentsByPost((cPrev) => ({ ...cPrev, [postId]: comments }));
        });
      }
      return { ...prev, [postId]: nextState };
    });
  };

  // Image upload handler (converts to optimized Base64 data URL)
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
    if (!currentUser) {
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
        authorId: currentUser.uid,
        authorName: userProfile?.displayName || 'ተማሪ',
        authorEmail: currentUser.email || '',
        authorPhoto: userProfile?.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(userProfile?.displayName || 'User')}&background=f9b03c&color=111827&bold=true`,
        authorRole: (userProfile?.isAdmin ? 'admin' : 'student') as 'admin' | 'student' | 'instructor',
        isAdmin: Boolean(userProfile?.isAdmin),
        isPro: Boolean(userProfile?.isPro),
        content: postContent.trim(),
        codeSnippet: showCodeInput && codeText.trim() ? { code: codeText.trim(), language: codeLanguage } : null,
        imageUrl: attachedImage,
        category: postCategory,
        tags: selectedTags,
        isPinned: false,
        isFeatured: false,
      };

      const docId = await createCommunityPost(newPostPayload);

      // Optimistically insert to feed
      setPosts(prev => [{
        id: docId || `post_${Date.now()}`,
        ...newPostPayload,
        likes: [],
        commentsCount: 0,
        createdAt: new Date().toISOString()
      }, ...prev]);

      // Reset Creator Form
      setPostContent('');
      setAttachedImage(null);
      setShowCodeInput(false);
      setCodeText('');
      setSelectedTags([]);
      setCustomTagInput('');
    } catch (err: any) {
      console.error('Error creating post:', err);
      alert('ፖስቱን ማጋራት አልተቻለም። እባክዎ እንደገና ይሞክሩ።');
    } finally {
      setIsSubmittingPost(false);
    }
  };

  // Handle Like Post (Instant Optimistic UI)
  const handleLike = async (post: CommunityPost) => {
    if (!currentUser) {
      setShowAuthModal(true);
      return;
    }

    const isLiked = post.likes.includes(currentUser.uid);
    
    // Instant Optimistic Update
    setPosts(prev => prev.map(p => {
      if (p.id === post.id) {
        return {
          ...p,
          likes: isLiked 
            ? p.likes.filter(id => id !== currentUser.uid) 
            : [...p.likes, currentUser.uid]
        };
      }
      return p;
    }));

    try {
      await toggleLikePost(post.id, currentUser.uid, isLiked, {
        postAuthorEmail: post.authorEmail,
        postAuthorName: post.authorName,
        postSnippet: post.content,
        likerName: userProfile?.displayName || currentUser.displayName || 'አንድ ተማሪ'
      });
    } catch (e) {
      console.error('Error toggling like:', e);
    }
  };

  // Handle Toggle Pin (Optimistic UI)
  const handleTogglePin = async (post: CommunityPost) => {
    const nextPinned = !post.isPinned;
    setPosts(prev => prev.map(p => p.id === post.id ? { ...p, isPinned: nextPinned } : p));
    try {
      await pinCommunityPost(post.id, nextPinned);
    } catch (e) {
      console.error('Error pinning post:', e);
    }
  };

  // Handle Share Post (Web Share API + Clipboard Copy)
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
    if (!currentUser) {
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
      authorId: currentUser.uid,
      authorName: userProfile?.displayName || 'ተማሪ',
      authorEmail: currentUser.email || '',
      authorPhoto: userProfile?.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(userProfile?.displayName || 'User')}&background=f9b03c&color=111827&bold=true`,
      isAdmin: Boolean(userProfile?.isAdmin),
      isPro: Boolean(userProfile?.isPro),
      content: text,
      createdAt: new Date().toISOString()
    };

    // Optimistic comment and counter update
    setCommentsByPost(prev => ({
      ...prev,
      [postId]: [...(prev[postId] || []), newCommentObj]
    }));
    setPosts(prev => prev.map(p => p.id === postId ? { ...p, commentsCount: (p.commentsCount || 0) + 1 } : p));
    setCommentInputs((prev) => ({ ...prev, [postId]: '' }));

    try {
      await addCommentToPost(postId, {
        authorId: currentUser.uid,
        authorName: userProfile?.displayName || 'ተማሪ',
        authorEmail: currentUser.email || '',
        authorPhoto: userProfile?.photoURL || '',
        isAdmin: Boolean(userProfile?.isAdmin),
        isPro: Boolean(userProfile?.isPro),
        content: text,
      }, {
        authorEmail: targetPost?.authorEmail,
        authorName: targetPost?.authorName,
        postSnippet: targetPost?.content
      });
    } catch (err) {
      console.error('Error posting comment:', err);
    } finally {
      setSubmittingComment((prev) => ({ ...prev, [postId]: false }));
    }
  };

  // Handle Delete Post (Admin or Post Author)
  const handleDeletePost = async (postId: string) => {
    if (!confirm('ይህንን ፖስት መሰረዝ እርግጠኛ ነዎት? (Are you sure you want to delete this post?)')) return;
    
    // Instant Optimistic Removal
    setPosts(prev => prev.filter(p => p.id !== postId));

    try {
      await deleteCommunityPost(postId);
    } catch (e) {
      console.error('Error deleting post:', e);
    }
  };

  // Handle Delete Comment
  const handleDeleteComment = async (postId: string, commentId: string) => {
    if (!confirm('አስተያየቱን መሰረዝ እርግጠኛ ነዎት?')) return;
    
    setCommentsByPost(prev => ({
      ...prev,
      [postId]: (prev[postId] || []).filter(c => c.id !== commentId)
    }));
    setPosts(prev => prev.map(p => p.id === postId ? { ...p, commentsCount: Math.max(0, (p.commentsCount || 1) - 1) } : p));

    try {
      await deleteCommentFromPost(postId, commentId);
    } catch (e) {
      console.error('Error deleting comment:', e);
    }
  };

  // Filter posts by search query
  const displayedPosts = posts.filter((p) => {
    if (!searchQuery.trim()) return true;
    const queryLower = searchQuery.toLowerCase();
    return (
      p.content.toLowerCase().includes(queryLower) ||
      p.authorName.toLowerCase().includes(queryLower) ||
      (p.tags && p.tags.some((t) => t.toLowerCase().includes(queryLower)))
    );
  });

  // Time formatter in Amharic
  const formatTimeAgo = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      const now = new Date();
      const diffSecs = Math.floor((now.getTime() - d.getTime()) / 1000);

      if (diffSecs < 60) return 'ልክ አሁን';
      if (diffSecs < 3600) return `ከ ${Math.floor(diffSecs / 60)} ደቂቃ በፊት`;
      if (diffSecs < 86400) return `ከ ${Math.floor(diffSecs / 3600)} ሰዓት በፊት`;
      if (diffSecs < 604800) return `ከ ${Math.floor(diffSecs / 86400)} ቀን በፊት`;
      return d.toLocaleDateString('am-ET', { month: 'short', day: 'numeric' });
    } catch (e) {
      return '';
    }
  };

  return (
    <div className="min-h-screen bg-[#030509] text-slate-200 font-body selection:bg-[#f9b03c]/30">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-20">
        
        {/* 🌟 HERO COMMUNITY HEADER & STATS */}
        <div className="relative rounded-3xl overflow-hidden border border-white/10 bg-gradient-to-r from-slate-900/90 via-[#050811] to-slate-900/90 backdrop-blur-2xl p-6 sm:p-10 mb-8 shadow-2xl">
          <div className="absolute top-0 right-0 w-96 h-96 bg-[#f9b03c]/10 rounded-full blur-3xl pointer-events-none"></div>
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-[#3268ba]/10 rounded-full blur-3xl pointer-events-none"></div>

          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gradient-to-r from-[#f9b03c]/20 via-amber-400/10 to-transparent border border-[#f9b03c]/40 text-[#f9b03c] text-xs font-black uppercase tracking-wider mb-3">
                <i className="fa-solid fa-users text-xs animate-pulse"></i>
                <span>Tsehay Campus Student Community</span>
              </div>
              <h1 className="text-2xl sm:text-4xl font-heading font-black text-white tracking-tight leading-tight">
                የተማሪዎች ማህበረሰብ እና <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#f9b03c] via-amber-300 to-yellow-200">የልምድ መጋሪያ</span>
              </h1>
              <p className="text-xs sm:text-sm text-slate-400 mt-2 leading-relaxed font-body">
                ጥያቄዎችን ይጠይቁ፣ የቢዝነስና የኮርስ ስኬቶችዎን ያጋሩ፣ ከአስተማሪዎችና ከተማሪ ጓደኞችዎ ጋር በእውነተኛ ሰዓት (Real-Time) ይገናኙ።
              </p>
            </div>

            {/* Quick Community Action Hub */}
            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={() => router.push('/inbox')}
                className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-[#3268ba] via-blue-600 to-[#3268ba] text-white font-heading font-black text-xs shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 hover:scale-105 active:scale-95 transition-all duration-300 flex items-center gap-2 cursor-pointer"
              >
                <i className="fa-solid fa-paper-plane text-xs"></i>
                <span>የመልዕክት ሳጥን (Inbox)</span>
              </button>

              <button
                onClick={() => {
                  const element = document.getElementById('post-creator-box');
                  if (element) element.scrollIntoView({ behavior: 'smooth' });
                }}
                className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-[#f9b03c] via-amber-400 to-yellow-300 text-slate-950 font-heading font-black text-xs shadow-lg shadow-amber-400/25 hover:shadow-amber-400/40 hover:scale-105 active:scale-95 transition-all duration-300 flex items-center gap-2 cursor-pointer"
              >
                <i className="fa-solid fa-pen-nib text-xs"></i>
                <span>ሀሳብ አጋራ (Create Post)</span>
              </button>
            </div>
          </div>

          {/* Quick Search & Category Filters */}
          <div className="mt-8 pt-6 border-t border-white/10 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar w-full md:w-auto pb-2 md:pb-0">
              {[
                { id: 'all', label: 'ሁሉም (All)', icon: 'fa-layer-group' },
                { id: 'questions', label: '❓ ጥያቄና መልስ', icon: 'fa-circle-question' },
                { id: 'success', label: '🚀 የስራ ስኬቶች', icon: 'fa-trophy' },
                { id: 'business', label: '💼 ቢዝነስና ኢምፖርት', icon: 'fa-briefcase' },
                { id: 'tech', label: '💻 ቴክኖሎጂ', icon: 'fa-code' },
              ].map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategory(cat.id)}
                  className={`px-4 py-2 rounded-xl text-xs font-black transition-all duration-300 whitespace-nowrap flex items-center gap-2 cursor-pointer ${
                    activeCategory === cat.id
                      ? 'bg-gradient-to-r from-[#f9b03c] via-amber-400 to-yellow-300 text-slate-950 shadow-md shadow-amber-400/20 scale-105'
                      : 'bg-white/5 hover:bg-white/10 text-slate-300 border border-white/5 hover:border-white/20'
                  }`}
                >
                  <i className={`fa-solid ${cat.icon} text-xs`}></i>
                  <span>{cat.label}</span>
                </button>
              ))}
            </div>

            {/* Keyword Search Input */}
            <div className="w-full md:w-72 relative">
              <i className="fa-solid fa-magnifying-glass absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs"></i>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="ማህበረሰቡን ፈልግ..."
                className="w-full bg-white/5 border border-white/10 focus:border-[#f9b03c] focus:bg-white/10 rounded-xl py-2 pl-9 pr-4 text-xs text-white placeholder-slate-500 focus:outline-none transition-all"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-white">✕</button>
              )}
            </div>
          </div>
        </div>

        {/* 🌟 2-COLUMN MAIN CONTENT GRID */}
        <div className="grid grid-cols-1 lg:grid-cols-3 xl:grid-cols-4 gap-8">
          
          {/* LEFT 2-3 COLS: MAIN FEED & POST CREATOR */}
          <div className="lg:col-span-2 xl:col-span-3 space-y-6">
            
            {/* ✍️ POST CREATION CARD (GLASSMORPHISM) */}
            <div id="post-creator-box" className="rounded-3xl border border-white/10 bg-[#050811]/90 backdrop-blur-xl p-5 sm:p-6 shadow-xl relative overflow-hidden transition-all duration-300 hover:border-[#f9b03c]/30">
              <div className="flex items-start gap-3.5">
                <img
                  src={userProfile?.photoURL || 'https://ui-avatars.com/api/?name=User&background=f9b03c&color=111827&bold=true'}
                  alt={userProfile?.displayName || 'User'}
                  className="w-10 h-10 rounded-full object-cover ring-2 ring-[#f9b03c]/40 shrink-0"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=User&background=f9b03c&color=111827&bold=true`;
                  }}
                />

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="font-heading font-black text-sm text-white">
                      {userProfile?.displayName || 'ተማሪ'}
                    </span>
                    {userProfile?.isAdmin && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-black bg-blue-500/20 text-blue-400 border border-blue-500/40 px-2 py-0.5 rounded-full">
                        <i className="fa-solid fa-circle-check text-blue-400 text-[10px]"></i>
                        <span>Admin</span>
                      </span>
                    )}
                    {userProfile?.isPro && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-black bg-[#f9b03c]/20 text-[#f9b03c] border border-[#f9b03c]/40 px-2 py-0.5 rounded-full">
                        ⭐ <span>Pro Student</span>
                      </span>
                    )}
                  </div>

                  <form onSubmit={handleCreatePost} className="space-y-3">
                    <textarea
                      value={postContent}
                      onChange={(e) => setPostContent(e.target.value)}
                      placeholder="ምን አዲስ ሀሳብ ወይም ጥያቄ አለዎት? (What's on your mind?)"
                      rows={3}
                      className="w-full bg-white/[0.03] border border-white/10 focus:border-[#f9b03c]/60 focus:bg-white/[0.06] rounded-2xl p-4 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none transition-all resize-none font-body leading-relaxed"
                    />

                    {/* Code Snippet Box Toggle */}
                    {showCodeInput && (
                      <div className="bg-slate-950/90 border border-white/15 rounded-2xl p-3.5 space-y-2 animate-in fade-in duration-300">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-black text-[#f9b03c] flex items-center gap-1.5">
                            <i className="fa-solid fa-code"></i> የኮድ ማስገቢያ (Code Snippet)
                          </span>
                          <select
                            value={codeLanguage}
                            onChange={(e) => setCodeLanguage(e.target.value)}
                            className="bg-slate-900 border border-white/10 text-[11px] text-slate-300 rounded-lg px-2 py-1 focus:outline-none"
                          >
                            <option value="javascript">JavaScript / TypeScript</option>
                            <option value="python">Python</option>
                            <option value="html">HTML / CSS</option>
                            <option value="json">JSON</option>
                            <option value="bash">Terminal / Command</option>
                          </select>
                        </div>
                        <textarea
                          value={codeText}
                          onChange={(e) => setCodeText(e.target.value)}
                          placeholder="// የኮድዎን ይዘት እዚህ ይጻፉ..."
                          rows={4}
                          className="w-full bg-black/60 border border-white/10 rounded-xl p-3 text-xs font-mono text-emerald-400 placeholder-slate-600 focus:outline-none focus:border-[#f9b03c]/50"
                        />
                      </div>
                    )}

                    {/* Image Attachment Preview */}
                    {attachedImage && (
                      <div className="relative rounded-2xl overflow-hidden border border-white/15 max-h-80 w-full group/img bg-slate-950">
                        <img src={attachedImage} alt="Attachment" className="w-full h-full object-contain" />
                        <button
                          type="button"
                          onClick={() => setAttachedImage(null)}
                          className="absolute top-3 right-3 w-8 h-8 rounded-full bg-red-600/90 hover:bg-red-500 text-white flex items-center justify-center text-xs shadow-lg transition cursor-pointer"
                          title="ምስሉን ሰርዝ"
                        >
                          ✕
                        </button>
                      </div>
                    )}

                    {/* Category and Tags Selector */}
                    <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <select
                          value={postCategory}
                          onChange={(e: any) => setPostCategory(e.target.value)}
                          className="bg-white/5 border border-white/10 text-xs font-black text-slate-200 rounded-xl px-3 py-1.5 focus:outline-none focus:border-[#f9b03c]"
                        >
                          <option value="general" className="bg-slate-900">🌟 አጠቃላይ (General)</option>
                          <option value="questions" className="bg-slate-900">❓ ጥያቄና መልስ (Q&A)</option>
                          <option value="success" className="bg-slate-900">🚀 የስራ ስኬት (Success)</option>
                          <option value="business" className="bg-slate-900">💼 ቢዝነስና ኢምፖርት</option>
                          <option value="tech" className="bg-slate-900">💻 ቴክኖሎጂና ኮዲንግ</option>
                        </select>

                        {/* Attach Image Button */}
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className={`px-3 py-1.5 rounded-xl border text-xs font-black transition flex items-center gap-1.5 cursor-pointer ${
                            attachedImage 
                              ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40' 
                              : 'bg-white/5 hover:bg-white/10 text-slate-300 border-white/10'
                          }`}
                        >
                          <i className="fa-solid fa-image text-xs"></i>
                          <span>{attachedImage ? 'ምስል ተመርጧል' : 'ምስል አያይዝ'}</span>
                        </button>
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/*"
                          onChange={handleImageSelect}
                          className="hidden"
                        />

                        {/* Code Snippet Toggle Button */}
                        <button
                          type="button"
                          onClick={() => setShowCodeInput(prev => !prev)}
                          className={`px-3 py-1.5 rounded-xl border text-xs font-black transition flex items-center gap-1.5 cursor-pointer ${
                            showCodeInput 
                              ? 'bg-[#3268ba]/20 text-blue-400 border-blue-500/40' 
                              : 'bg-white/5 hover:bg-white/10 text-slate-300 border-white/10'
                          }`}
                        >
                          <i className="fa-solid fa-code text-xs"></i>
                          <span>ኮድ አስገባ</span>
                        </button>
                      </div>

                      {/* Submit Post Button */}
                      <button
                        type="submit"
                        disabled={isSubmittingPost || (!postContent.trim() && !attachedImage && !codeText.trim())}
                        className="px-6 py-2 rounded-xl bg-gradient-to-r from-[#f9b03c] via-amber-400 to-yellow-300 text-slate-950 font-heading font-black text-xs shadow-md shadow-amber-400/20 hover:scale-105 active:scale-95 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 cursor-pointer"
                      >
                        {isSubmittingPost ? (
                          <>
                            <i className="fa-solid fa-spinner fa-spin"></i>
                            <span>በማጋራት ላይ...</span>
                          </>
                        ) : (
                          <>
                            <i className="fa-solid fa-paper-plane"></i>
                            <span>ፖስት አድርግ (Post)</span>
                          </>
                        )}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </div>

            {/* 📜 FEED POSTS LIST */}
            {postsLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((n) => (
                  <div key={n} className="rounded-3xl border border-white/10 bg-[#050811]/60 p-6 animate-pulse space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-white/10"></div>
                      <div className="space-y-2 flex-1">
                        <div className="h-4 w-32 bg-white/10 rounded"></div>
                        <div className="h-3 w-20 bg-white/10 rounded"></div>
                      </div>
                    </div>
                    <div className="h-16 bg-white/10 rounded-2xl"></div>
                  </div>
                ))}
              </div>
            ) : displayedPosts.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-white/15 bg-[#050811]/40 p-12 text-center space-y-3">
                <i className="fa-solid fa-comments text-5xl text-slate-600 block"></i>
                <h3 className="text-lg font-heading font-black text-white">ምንም ፖስት አልተገኘም</h3>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  በዚህ ዘርፍ የመጀመሪያውን ጠቃሚ ሀሳብ ወይም ጥያቄ እርስዎ ያጋሩ!
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                {displayedPosts.map((post) => {
                  const isLiked = currentUser ? post.likes.includes(currentUser.uid) : false;
                  const isAuthor = currentUser?.uid === post.authorId;
                  const canDelete = isAuthor || userProfile?.isAdmin;

                  return (
                    <article
                      key={post.id}
                      id={`post-${post.id}`}
                      className="rounded-3xl border border-white/10 bg-[#050811]/90 backdrop-blur-xl p-5 sm:p-7 shadow-xl space-y-4 transition-all duration-300 hover:border-white/20"
                    >
                      {/* Pinned & Featured Badges */}
                      {(post.isPinned || post.isFeatured) && (
                        <div className="flex items-center gap-2 pb-2 border-b border-white/5">
                          {post.isPinned && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-black text-[#f9b03c] bg-[#f9b03c]/15 px-2.5 py-0.5 rounded-full border border-[#f9b03c]/30">
                              <i className="fa-solid fa-thumbtack text-[9px]"></i>
                              <span>የተሰካ ማስታወቂያ (Pinned)</span>
                            </span>
                          )}
                          {post.isFeatured && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-black text-amber-300 bg-amber-400/15 px-2.5 py-0.5 rounded-full border border-amber-400/30">
                              ⭐ <span>ተመራጭ ስኬት (Featured)</span>
                            </span>
                          )}
                        </div>
                      )}

                      {/* Post Header: Avatar, Name, Badges, Timestamp & Menu */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <img
                            src={post.authorPhoto}
                            alt={post.authorName}
                            className={`w-11 h-11 rounded-full object-cover shrink-0 ring-2 ${
                              post.isAdmin ? 'ring-blue-500' : post.isPro ? 'ring-[#f9b03c]' : 'ring-white/20'
                            }`}
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(post.authorName)}&background=f9b03c&color=111827&bold=true`;
                            }}
                          />
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-heading font-black text-sm text-white">
                                {post.authorName}
                              </span>

                              {/* Verified Admin Blue Badge */}
                              {post.isAdmin && (
                                <span className="inline-flex items-center gap-1 text-[10px] font-black bg-blue-500/20 text-blue-400 border border-blue-500/40 px-2 py-0.5 rounded-full shadow-sm" title="ይፋዊ የ Tsehay Campus አስተዳዳሪ">
                                  <i className="fa-solid fa-circle-check text-blue-400 text-[10px]"></i>
                                  <span>Tsehay Campus Admin</span>
                                </span>
                              )}

                              {/* Pro Student Golden Star Badge */}
                              {!post.isAdmin && post.isPro && (
                                <span className="inline-flex items-center gap-1 text-[10px] font-black bg-[#f9b03c]/20 text-[#f9b03c] border border-[#f9b03c]/40 px-2 py-0.5 rounded-full" title="ኮርስ የገዛ ንቁ ተማሪ">
                                  ⭐ <span>Pro Student</span>
                                </span>
                              )}
                            </div>

                            <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
                              <span>{formatTimeAgo(post.createdAt)}</span>
                              <span>•</span>
                              <span className="text-[#f9b03c] font-bold capitalize">
                                {post.category === 'questions' && '❓ ጥያቄ'}
                                {post.category === 'success' && '🚀 ስኬት'}
                                {post.category === 'business' && '💼 ቢዝነስ'}
                                {post.category === 'tech' && '💻 ቴክኖሎጂ'}
                                {post.category === 'general' && '🌟 አጠቃላይ'}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Actions (Delete, Pin, Feature for Admin) */}
                        <div className="flex items-center gap-1.5">
                          {userProfile?.isAdmin && (
                            <>
                              <button
                                onClick={() => handleTogglePin(post)}
                                className={`w-8 h-8 rounded-xl border flex items-center justify-center text-xs transition cursor-pointer ${
                                  post.isPinned ? 'bg-amber-400/20 text-amber-400 border-amber-400/40 shadow-[0_0_10px_rgba(249,176,60,0.3)]' : 'bg-white/5 text-slate-400 border-white/10 hover:text-white'
                                }`}
                                title={post.isPinned ? "ማስቀሪያን አንሳ" : "ወደ ላይ ሰካ (Pin Post)"}
                              >
                                <i className="fa-solid fa-thumbtack"></i>
                              </button>
                            </>
                          )}

                          {canDelete && (
                            <button
                              onClick={() => handleDeletePost(post.id)}
                              className="w-8 h-8 rounded-xl bg-red-500/10 hover:bg-red-500 text-red-400 hover:text-white border border-red-500/20 flex items-center justify-center text-xs transition cursor-pointer"
                              title="ፖስቱን ሰርዝ (Delete Post)"
                            >
                              <i className="fa-solid fa-trash"></i>
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Post Text Content */}
                      <p className="text-xs sm:text-sm text-slate-200 font-body leading-relaxed whitespace-pre-line break-words">
                        {post.content}
                      </p>

                      {/* Code Snippet Block */}
                      {post.codeSnippet && (
                        <div className="rounded-2xl bg-black/80 border border-white/15 overflow-hidden font-mono text-xs shadow-inner">
                          <div className="flex items-center justify-between px-4 py-2 bg-white/5 border-b border-white/10 text-[11px] text-slate-400">
                            <span className="flex items-center gap-1.5 text-emerald-400 font-black">
                              <i className="fa-solid fa-terminal text-[10px]"></i> {post.codeSnippet.language}
                            </span>
                            <button
                              onClick={() => {
                                navigator.clipboard.writeText(post.codeSnippet?.code || '');
                                setCopiedCodePostId(post.id);
                                setTimeout(() => setCopiedCodePostId(null), 2000);
                              }}
                              className="text-[10px] text-slate-300 hover:text-white px-2 py-0.5 rounded bg-white/10 cursor-pointer"
                            >
                              {copiedCodePostId === post.id ? '✓ ተቀድቷል' : 'ኮዱን ቅዳ (Copy)'}
                            </button>
                          </div>
                          <pre className="p-4 text-emerald-300 overflow-x-auto no-scrollbar whitespace-pre-wrap leading-relaxed">
                            <code>{post.codeSnippet.code}</code>
                          </pre>
                        </div>
                      )}

                      {/* Attached Image (Click to Zoom Lightbox) */}
                      {post.imageUrl && (
                        <div
                          onClick={() => setActiveZoomImage(post.imageUrl || null)}
                          className="rounded-2xl overflow-hidden border border-white/10 max-h-96 w-full cursor-zoom-in bg-slate-950 group/img relative"
                        >
                          <img
                            src={post.imageUrl}
                            alt="Post Media"
                            className="w-full h-full object-cover group-hover/img:scale-[1.02] transition-transform duration-500"
                          />
                          <div className="absolute inset-0 bg-black/20 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center">
                            <span className="bg-black/80 backdrop-blur-md px-3 py-1.5 rounded-full text-xs font-black text-white flex items-center gap-1.5">
                              <i className="fa-solid fa-expand"></i> ምስሉን አጉላ
                            </span>
                          </div>
                        </div>
                      )}

                      {/* Tags */}
                      {post.tags && post.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 pt-1">
                          {post.tags.map((tag, tIdx) => (
                            <span
                              key={tIdx}
                              className="text-[10px] font-black bg-white/5 text-[#f9b03c] border border-white/10 px-2.5 py-0.5 rounded-full"
                            >
                              #{tag}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* 🌟 ACTION BAR: Like, Comment, Share, Direct Message */}
                      <div className="flex items-center justify-between pt-3 border-t border-white/10 text-xs">
                        <div className="flex items-center gap-2 sm:gap-3">
                          {/* Like Button */}
                          <button
                            onClick={() => handleLike(post)}
                            className={`px-3.5 py-1.5 rounded-xl border flex items-center gap-2 font-black transition-all duration-300 cursor-pointer active:scale-95 ${
                              isLiked
                                ? 'bg-[#f9b03c]/20 text-[#f9b03c] border-[#f9b03c]/50 shadow-[0_0_12px_rgba(249,176,60,0.2)]'
                                : 'bg-white/5 hover:bg-white/10 text-slate-300 border-white/10 hover:text-white'
                            }`}
                          >
                            <i className={`fa-solid fa-thumbs-up text-xs transition-transform ${isLiked ? 'scale-125 text-[#f9b03c]' : ''}`}></i>
                            <span>{post.likes.length} ወደድኩት</span>
                          </button>

                          {/* Comment Toggle Button */}
                          <button
                            onClick={() => toggleComments(post.id)}
                            className={`px-3.5 py-1.5 rounded-xl border flex items-center gap-2 font-black transition-all duration-300 cursor-pointer ${
                              expandedComments[post.id]
                                ? 'bg-blue-500/20 text-blue-400 border-blue-500/50'
                                : 'bg-white/5 hover:bg-white/10 text-slate-300 border-white/10 hover:text-white'
                            }`}
                          >
                            <i className="fa-solid fa-message text-xs"></i>
                            <span>{post.commentsCount || 0} አስተያየት</span>
                          </button>
                        </div>

                        <div className="flex items-center gap-2">
                          {/* DM Author Button */}
                          {currentUser && currentUser.uid !== post.authorId && (
                            <button
                              onClick={() => router.push(`/inbox?user=${encodeURIComponent(post.authorId)}`)}
                              className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-[#3268ba]/20 text-slate-300 hover:text-blue-400 border border-white/10 hover:border-blue-500/40 font-black text-xs transition flex items-center gap-1.5 cursor-pointer"
                              title="ለፖስቱ ጸሐፊ ቀጥታ መልዕክት ላክ"
                            >
                              <i className="fa-solid fa-envelope text-[11px]"></i>
                              <span className="hidden sm:inline">መልዕክት ላክ</span>
                            </button>
                          )}

                          {/* Share / Copy Link */}
                          <button
                            onClick={() => handleSharePost(post)}
                            className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-[#f9b03c] border border-white/10 text-xs transition cursor-pointer flex items-center gap-1.5 active:scale-95"
                            title="የፖስቱን ሊንክ አጋራ / ቅዳ (Share Post)"
                          >
                            {copiedPostId === post.id ? (
                              <span className="text-[#f9b03c] font-black text-[11px]">✓ ሊንኩ ተገልብጧል (Copied!)</span>
                            ) : (
                              <>
                                <i className="fa-solid fa-share-nodes"></i>
                                <span className="hidden sm:inline text-[11px]">አጋራ</span>
                              </>
                            )}
                          </button>
                        </div>
                      </div>

                      {/* 💬 EXPANDABLE REAL-TIME COMMENTS DRAWER */}
                      {expandedComments[post.id] && (
                        <div className="pt-4 border-t border-white/10 space-y-4 animate-in slide-in-from-top-2 duration-300">
                          {/* New Comment Input */}
                          <div className="flex items-center gap-2.5">
                            <img
                              src={userProfile?.photoURL || 'https://ui-avatars.com/api/?name=User&background=f9b03c&color=111827&bold=true'}
                              alt="My Avatar"
                              className="w-8 h-8 rounded-full object-cover shrink-0 ring-1 ring-white/20"
                            />
                            <div className="flex-1 flex items-center gap-2 bg-white/5 border border-white/10 rounded-2xl px-3 py-1.5 focus-within:border-[#f9b03c]/60">
                              <input
                                type="text"
                                value={commentInputs[post.id] || ''}
                                onChange={(e) => setCommentInputs({ ...commentInputs, [post.id]: e.target.value })}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    handleAddComment(post.id);
                                  }
                                }}
                                placeholder="አስተያየትዎን እዚህ ይጻፉ... (Enter ን ይጫኑ)"
                                className="w-full bg-transparent text-xs text-white placeholder-slate-500 focus:outline-none"
                              />
                              <button
                                onClick={() => handleAddComment(post.id)}
                                disabled={submittingComment[post.id] || !commentInputs[post.id]?.trim()}
                                className="px-3 py-1 rounded-xl bg-[#f9b03c] text-slate-950 font-black text-xs hover:bg-amber-300 disabled:opacity-40 transition cursor-pointer shrink-0"
                              >
                                {submittingComment[post.id] ? <i className="fa-solid fa-spinner fa-spin"></i> : <i className="fa-solid fa-arrow-up"></i>}
                              </button>
                            </div>
                          </div>

                          {/* Comments List */}
                          <div className="space-y-3 pl-2 sm:pl-4 border-l-2 border-white/10">
                            {commentsByPost[post.id] && commentsByPost[post.id].length > 0 ? (
                              commentsByPost[post.id].map((comm) => (
                                <div key={comm.id} className="flex items-start justify-between gap-3 bg-white/[0.02] p-3 rounded-2xl border border-white/5">
                                  <div className="flex items-start gap-2.5">
                                    <img
                                      src={comm.authorPhoto}
                                      alt={comm.authorName}
                                      className="w-7 h-7 rounded-full object-cover shrink-0"
                                      onError={(e) => {
                                        (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(comm.authorName)}&background=f9b03c&color=111827&bold=true`;
                                      }}
                                    />
                                    <div>
                                      <div className="flex items-center gap-1.5 flex-wrap">
                                        <span className="font-heading font-black text-xs text-white">
                                          {comm.authorName}
                                        </span>
                                        {comm.isAdmin && (
                                          <span className="text-[9px] font-black bg-blue-500/20 text-blue-400 px-1.5 py-0.2 rounded-full border border-blue-500/40">
                                            Admin
                                          </span>
                                        )}
                                        {!comm.isAdmin && comm.isPro && (
                                          <span className="text-[9px] font-black text-[#f9b03c]">
                                            ⭐ Pro
                                          </span>
                                        )}
                                        <span className="text-[10px] text-slate-500">
                                          {formatTimeAgo(comm.createdAt)}
                                        </span>
                                      </div>
                                      <p className="text-xs text-slate-300 mt-1 font-body leading-relaxed whitespace-pre-wrap">
                                        {comm.content}
                                      </p>
                                    </div>
                                  </div>

                                  {(currentUser?.uid === comm.authorId || userProfile?.isAdmin) && (
                                    <button
                                      onClick={() => handleDeleteComment(post.id, comm.id)}
                                      className="text-slate-500 hover:text-red-400 text-xs p-1 cursor-pointer transition"
                                      title="አስተያየቱን ሰርዝ"
                                    >
                                      ✕
                                    </button>
                                  )}
                                </div>
                              ))
                            ) : (
                              <p className="text-xs text-slate-500 italic py-2">ምንም አስተያየት የለም። የመጀመሪያውን አስተያየት ይስጡ!</p>
                            )}
                          </div>
                        </div>
                      )}
                    </article>
                  );
                })}
              </div>
            )}
          </div>

          {/* RIGHT 1 COL: COMMUNITY SIDEBAR & GUIDELINES */}
          <div className="space-y-6">
            
            {/* 💬 Quick Direct Message Link Banner */}
            <div className="rounded-3xl border border-blue-500/30 bg-gradient-to-br from-blue-950/40 via-slate-900/90 to-slate-900 p-6 shadow-xl space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-blue-500/20 text-blue-400 border border-blue-500/40 flex items-center justify-center text-xl shadow-lg">
                <i className="fa-solid fa-comments"></i>
              </div>
              <div>
                <h3 className="font-heading font-black text-base text-white">ቀጥታ የመልዕክት ሳጥን (Direct Chat)</h3>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                  ከተማሪ ጓደኞችዎ እና ከአስተማሪዎች ጋር በግል (1-on-1) ለመወያየት ወደ Inbox ይግቡ።
                </p>
              </div>
              <button
                onClick={() => router.push('/inbox')}
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-[#3268ba] text-white font-heading font-black text-xs shadow-md shadow-blue-500/20 hover:scale-105 active:scale-95 transition-all duration-300 flex items-center justify-center gap-2 cursor-pointer"
              >
                <i className="fa-solid fa-inbox"></i>
                <span>ወደ የመልዕክት ሳጥን ሂድ</span>
              </button>
            </div>

            {/* 🏆 Top Active Contributors Leaderboard */}
            <div className="rounded-3xl border border-white/10 bg-[#050811]/90 backdrop-blur-xl p-6 shadow-xl space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-white/10">
                <h3 className="font-heading font-black text-sm text-white flex items-center gap-2">
                  <i className="fa-solid fa-crown text-[#f9b03c]"></i>
                  <span>ንቁ ተማሪዎች (Top Members)</span>
                </h3>
                <span className="text-[10px] text-[#f9b03c] font-black bg-[#f9b03c]/15 px-2 py-0.5 rounded-full">
                  ሳምንታዊ
                </span>
              </div>

              <div className="space-y-3">
                {[
                  { name: 'ዮሴፍ ተስፋዬ', badge: '⭐ Pro Student', points: '1,450 ነጥብ', avatar: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=200&auto=format&fit=crop&q=80' },
                  { name: 'ሰላም አበበ', badge: '⭐ Pro Student', points: '1,120 ነጥብ', avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80' },
                  { name: 'ዳዊት ግርማ', badge: '⭐ Pro Student', points: '980 ነጥብ', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&auto=format&fit=crop&q=80' },
                ].map((member, mIdx) => (
                  <div key={mIdx} className="flex items-center justify-between p-2.5 rounded-2xl bg-white/[0.02] hover:bg-white/[0.06] transition border border-white/5">
                    <div className="flex items-center gap-2.5">
                      <div className="relative">
                        <img src={member.avatar} alt={member.name} className="w-8 h-8 rounded-full object-cover ring-1 ring-[#f9b03c]/50" />
                        <span className="absolute -top-1 -left-1 w-4 h-4 rounded-full bg-[#f9b03c] text-slate-950 font-black text-[9px] flex items-center justify-center">
                          {mIdx + 1}
                        </span>
                      </div>
                      <div>
                        <p className="text-xs font-black text-white">{member.name}</p>
                        <p className="text-[10px] text-[#f9b03c] font-bold">{member.badge}</p>
                      </div>
                    </div>
                    <span className="text-[11px] font-black text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md">
                      {member.points}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* 📜 Community Rules / የስነምግባር ደንቦች */}
            <div className="rounded-3xl border border-white/10 bg-[#050811]/90 backdrop-blur-xl p-6 shadow-xl space-y-3">
              <h3 className="font-heading font-black text-sm text-white flex items-center gap-2">
                <i className="fa-solid fa-shield-halved text-emerald-400"></i>
                <span>የማህበረሰብ ደንቦች (Guidelines)</span>
              </h3>
              <ul className="text-xs text-slate-400 space-y-2 font-body list-disc pl-4 leading-relaxed">
                <li>እርስ በርስ መከባበርና መደጋገፍ ቀዳሚ መርሐችን ነው።</li>
                <li>ጠቃሚ የኮርስ እና የቢዝነስ ልምዶችን በነጻነት ያጋሩ።</li>
                <li>ያልተፈቀዱ የንግድ ማስታወቂያዎች (Spam) ማስገባት በጥብቅ የተከለከለ ነው።</li>
                <li>ለጥያቄዎች ምላሽ በመስጠት ተጨማሪ የክብር ነጥቦችን ያግኙ!</li>
              </ul>
            </div>
          </div>
        </div>
      </main>

      {/* 🔍 LIGHTBOX MODAL FOR IMAGE ZOOM */}
      {activeZoomImage && (
        <div
          onClick={() => setActiveZoomImage(null)}
          className="fixed inset-0 z-50 bg-black/95 backdrop-blur-xl flex items-center justify-center p-4 animate-in fade-in duration-300 cursor-zoom-out"
        >
          <button
            onClick={() => setActiveZoomImage(null)}
            className="absolute top-6 right-6 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center text-lg font-black transition cursor-pointer"
          >
            ✕
          </button>
          <img
            src={activeZoomImage}
            alt="Zoomed"
            className="max-w-full max-h-[90vh] object-contain rounded-2xl shadow-2xl border border-white/20"
          />
        </div>
      )}

      {/* REQUIRE AUTH MODAL */}
      <RequireAuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        title="ወደ ማህበረሰቡ ለመቀላቀል ይግቡ"
        description="ፖስት ለማጋራት፣ አስተያየት ለመስጠት እና ከጓደኞችዎ ጋር ቀጥታ መልዕክት ለመለዋወጥ እባክዎ አካውንትዎን ይክፈቱ።"
      />

      <Footer />
    </div>
  );
}
