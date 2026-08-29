'use client';

import React, { useState, useEffect, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Navbar from '@/components/Navbar';
import RequireAuthModal from '@/components/RequireAuthModal';
import { auth, db } from '@/lib/firebase/config';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc, collection, getDocs, query, limit } from 'firebase/firestore';
import { 
  Conversation, 
  DirectMessage,
  subscribeUserConversations, 
  subscribeConversationMessages, 
  sendDirectMessage,
  getConversationId,
  isUserAdmin
} from '@/lib/communityService';

function InboxContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const targetUserId = searchParams.get('user');

  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<{ displayName: string; photoURL: string; email: string; isPro: boolean; isAdmin: boolean } | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [showAuthModal, setShowAuthModal] = useState(false);

  // Conversations & Chat State
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [activeRecipient, setActiveRecipient] = useState<{ uid: string; name: string; photo: string; email: string; isAdmin?: boolean; isPro?: boolean } | null>(null);
  const [messages, setMessages] = useState<DirectMessage[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [inputMessage, setInputMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [chatSearch, setChatSearch] = useState('');
  const [attachedChatImage, setAttachedChatImage] = useState<string | null>(null);
  const [showNewChatModal, setShowNewChatModal] = useState(false);
  const [availableContacts, setAvailableContacts] = useState<Array<{ uid: string; name: string; photo: string; email: string; isAdmin?: boolean; isPro?: boolean }>>([]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatFileInputRef = useRef<HTMLInputElement>(null);

  // Auth & Profile Listener
  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      setAuthLoading(false);

      if (user) {
        let isPro = false;
        try {
          const userDoc = await getDoc(doc(db, 'artifacts', 'tsehaycampus-e1a6d', 'users', user.uid));
          if (userDoc.exists()) {
            const data = userDoc.data();
            isPro = Boolean(data?.enrolledCourses?.length > 0 || data?.isPro);
          }
        } catch (e) {}

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

  // Fetch Available Contacts for New Chat Modal
  useEffect(() => {
    const fetchContacts = async () => {
      const defaultContacts = [
        {
          uid: 'admin-tsehay',
          name: 'Tsehay Campus Admin (Help & Support)',
          photo: '/tc-logo.jpg',
          email: 'admin@tsehaycampus.com',
          isAdmin: true,
          isPro: true,
        },
        {
          uid: 'instructor-marketing',
          name: 'መምህር ዳዊት (Digital Marketing Lead)',
          photo: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&auto=format&fit=crop&q=80',
          email: 'dawit@tsehaycampus.com',
          isAdmin: false,
          isPro: true,
        },
        {
          uid: 'instructor-import',
          name: 'መምህር ሰለሞን (China & Shein Import Expert)',
          photo: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&auto=format&fit=crop&q=80',
          email: 'solomon@tsehaycampus.com',
          isAdmin: false,
          isPro: true,
        }
      ];

      try {
        const usersRef = collection(db, 'artifacts', 'tsehaycampus-e1a6d', 'users');
        const q = query(usersRef, limit(20));
        const snap = await getDocs(q);
        const fetchedList: any[] = [];
        snap.forEach((d) => {
          if (currentUser && d.id === currentUser.uid) return;
          const u = d.data();
          fetchedList.push({
            uid: d.id,
            name: u.displayName || u.email?.split('@')[0] || 'ተማሪ',
            photo: u.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(u.displayName || 'User')}&background=f9b03c&color=111827&bold=true`,
            email: u.email || '',
            isAdmin: isUserAdmin(u.email, u.role),
            isPro: Boolean(u.enrolledCourses?.length > 0 || u.isPro),
          });
        });

        if (fetchedList.length > 0) {
          setAvailableContacts([...defaultContacts, ...fetchedList]);
        } else {
          setAvailableContacts(defaultContacts);
        }
      } catch (e) {
        setAvailableContacts(defaultContacts);
      }
    };

    if (currentUser) {
      fetchContacts();
    }
  }, [currentUser]);

  // Subscribe to user's conversation threads
  useEffect(() => {
    if (!currentUser) return;

    const unsub = subscribeUserConversations(currentUser.uid, (liveConvs) => {
      setConversations(liveConvs);

      // If target user was passed via URL parameter (e.g. /inbox?user=admin-tsehay)
      if (targetUserId && !activeConversationId) {
        const convId = getConversationId(currentUser.uid, targetUserId);
        setActiveConversationId(convId);
        
        // Find recipient info
        const found = availableContacts.find(c => c.uid === targetUserId);
        if (found) {
          setActiveRecipient(found);
        } else {
          setActiveRecipient({
            uid: targetUserId,
            name: targetUserId === 'admin-tsehay' || targetUserId === 'admin' ? 'Tsehay Campus Admin (Help & Support)' : 'ተማሪ / መምህር',
            photo: targetUserId === 'admin-tsehay' || targetUserId === 'admin' ? '/tc-logo.jpg' : `https://ui-avatars.com/api/?name=${encodeURIComponent(targetUserId)}&background=f9b03c&color=111827&bold=true`,
            email: targetUserId === 'admin-tsehay' || targetUserId === 'admin' ? 'admin@tsehaycampus.com' : '',
            isAdmin: targetUserId === 'admin-tsehay' || targetUserId === 'admin',
            isPro: true,
          });
        }
      } else if (!activeConversationId && liveConvs.length > 0) {
        // Auto-select first conversation
        const first = liveConvs[0];
        setActiveConversationId(first.id);
        const otherUid = first.participants.find(p => p !== currentUser.uid) || '';
        const details = first.participantDetails[otherUid];
        if (details) {
          setActiveRecipient({
            uid: otherUid,
            name: details.name,
            photo: details.photo,
            email: details.email,
            isAdmin: details.isAdmin,
            isPro: details.isPro,
          });
        }
      }
    });

    return () => {
      if (typeof unsub === 'function') unsub();
    };
  }, [currentUser, targetUserId, availableContacts]);

  // Subscribe to messages in active conversation + API fallback
  useEffect(() => {
    if (!activeConversationId) {
      setMessages([]);
      setMessagesLoading(false);
      return;
    }

    setMessagesLoading(true);

    // 1. API Fallback fetch
    const fetchApiMessages = async () => {
      try {
        const res = await fetch(`/api/messages?conversationId=${encodeURIComponent(activeConversationId)}`);
        if (res.ok) {
          const data = await res.json();
          if (data.messages && Array.isArray(data.messages) && data.messages.length > 0) {
            setMessages(data.messages);
            setMessagesLoading(false);
          }
        }
      } catch (e) {}
    };
    fetchApiMessages();

    // 2. Real-time Firestore Subscription
    const unsub = subscribeConversationMessages(activeConversationId, (liveMsgs) => {
      if (liveMsgs.length > 0) {
        setMessages(liveMsgs);
      }
      setMessagesLoading(false);
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    });

    // 3. Safety Spinner Auto-Dismiss
    const safetyTimer = setTimeout(() => {
      setMessagesLoading(false);
    }, 1200);

    return () => {
      if (typeof unsub === 'function') unsub();
      clearTimeout(safetyTimer);
    };
  }, [activeConversationId]);

  // Auto scroll on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Handle Send Direct Message (Instant 0ms Optimistic UI)
  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!currentUser || !activeRecipient || !activeConversationId) return;

    const trimmed = inputMessage.trim();
    if (!trimmed && !attachedChatImage) return;

    const tempMsgId = `msg_${Date.now()}`;
    const nowIso = new Date().toISOString();
    const optimisticMessage: DirectMessage = {
      id: tempMsgId,
      conversationId: activeConversationId,
      senderId: currentUser.uid,
      senderName: userProfile?.displayName || 'ተማሪ',
      senderPhoto: userProfile?.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(userProfile?.displayName || 'User')}&background=f9b03c&color=111827&bold=true`,
      senderEmail: currentUser.email || '',
      receiverId: activeRecipient.uid,
      content: trimmed,
      imageUrl: attachedChatImage || null,
      createdAt: nowIso,
      isRead: false,
    };

    // Instant UI Append
    setMessages(prev => [...prev, optimisticMessage]);
    
    // Update local conversations last message preview
    setConversations(prev => {
      const exists = prev.some(c => c.id === activeConversationId);
      if (exists) {
        return prev.map(c => c.id === activeConversationId ? {
          ...c,
          lastMessage: trimmed || (attachedChatImage ? '📷 ምስል ተልኳል' : ''),
          lastMessageTime: nowIso,
          lastMessageSenderId: currentUser.uid
        } : c);
      } else {
        return [{
          id: activeConversationId,
          participants: [currentUser.uid, activeRecipient.uid],
          participantDetails: {
            [currentUser.uid]: {
              name: userProfile?.displayName || 'ተማሪ',
              photo: userProfile?.photoURL || '',
              email: currentUser.email || '',
              isAdmin: Boolean(userProfile?.isAdmin)
            },
            [activeRecipient.uid]: {
              name: activeRecipient.name,
              photo: activeRecipient.photo,
              email: activeRecipient.email,
              isAdmin: Boolean(activeRecipient.isAdmin)
            }
          },
          lastMessage: trimmed || (attachedChatImage ? '📷 ምስል ተልኳል' : ''),
          lastMessageSenderId: currentUser.uid,
          lastMessageTime: nowIso,
          unreadCount: {}
        }, ...prev];
      }
    });

    setInputMessage('');
    setAttachedChatImage(null);
    setIsSending(true);

    try {
      await sendDirectMessage(activeConversationId, {
        senderId: currentUser.uid,
        senderName: userProfile?.displayName || 'ተማሪ',
        senderPhoto: userProfile?.photoURL || '',
        senderEmail: currentUser.email || '',
        receiverId: activeRecipient.uid,
        receiverName: activeRecipient.name,
        receiverPhoto: activeRecipient.photo,
        receiverEmail: activeRecipient.email,
        content: trimmed,
        imageUrl: attachedChatImage,
      });
    } catch (err) {
      console.warn('Direct message background dispatch:', err);
    } finally {
      setIsSending(false);
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 50);
    }
  };

  // Image attachment handler
  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      alert('የምስሉ መጠን ከ 5MB በታች መሆን አለበት።');
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => {
      setAttachedChatImage(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  // Start new chat with a user
  const handleStartChatWithUser = (contact: { uid: string; name: string; photo: string; email: string; isAdmin?: boolean; isPro?: boolean }) => {
    if (!currentUser) return;
    const convId = getConversationId(currentUser.uid, contact.uid);
    setActiveConversationId(convId);
    setActiveRecipient(contact);
    setShowNewChatModal(false);
  };

  // Filter conversations
  const filteredConversations = conversations.filter((c) => {
    if (!currentUser) return false;
    const otherUid = c.participants.find(p => p !== currentUser.uid) || '';
    const details = c.participantDetails[otherUid];
    if (!details) return true;
    if (!chatSearch.trim()) return true;
    return (
      details.name.toLowerCase().includes(chatSearch.toLowerCase()) ||
      details.email.toLowerCase().includes(chatSearch.toLowerCase())
    );
  });

  return (
    <div className="min-h-screen bg-[#030509] text-slate-200 font-body selection:bg-[#f9b03c]/30 flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-8 flex flex-col">
        
        {/* Header Bar */}
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#3268ba]/20 text-blue-400 border border-blue-500/40 flex items-center justify-center text-lg shadow-lg">
              <i className="fa-solid fa-paper-plane"></i>
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-heading font-black text-white">
                የመልዕክት ሳጥን (Direct Messages & Chat)
              </h1>
              <p className="text-xs text-slate-400">ከአስተማሪዎች፣ ከአስተዳዳሪ እና ከተማሪ ጓደኞች ጋር የሚደረግ ቀጥታ ውይይት</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => router.push('/community')}
              className="px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 text-xs font-black transition flex items-center gap-1.5 cursor-pointer"
            >
              <i className="fa-solid fa-users text-xs"></i>
              <span className="hidden sm:inline">ወደ ማህበረሰብ (Community)</span>
            </button>
            <button
              onClick={() => setShowNewChatModal(true)}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#f9b03c] to-amber-400 text-slate-950 font-heading font-black text-xs shadow-md shadow-amber-400/20 hover:scale-105 active:scale-95 transition flex items-center gap-1.5 cursor-pointer"
            >
              <i className="fa-solid fa-plus text-xs"></i>
              <span>አዲስ ውይይት</span>
            </button>
          </div>
        </div>

        {/* 2-COLUMN CHAT CONTAINER (GLASSMORPHISM) */}
        <div className="flex-1 grid grid-cols-1 md:grid-cols-12 rounded-3xl border border-white/10 bg-[#050811]/90 backdrop-blur-2xl shadow-2xl overflow-hidden min-h-[600px] max-h-[750px]">
          
          {/* LEFT 4 COLS: RECENT CONVERSATIONS SIDEBAR */}
          <div className={`md:col-span-4 lg:col-span-4 border-r border-white/10 flex flex-col bg-[#050811]/95 ${
            activeConversationId && typeof window !== 'undefined' && window.innerWidth < 768 ? 'hidden md:flex' : 'flex'
          }`}>
            
            {/* Sidebar Search Bar */}
            <div className="p-4 border-b border-white/10">
              <div className="relative">
                <i className="fa-solid fa-magnifying-glass absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs"></i>
                <input
                  type="text"
                  value={chatSearch}
                  onChange={(e) => setChatSearch(e.target.value)}
                  placeholder="ውይይት ፈልግ..."
                  className="w-full bg-white/5 border border-white/10 focus:border-[#f9b03c] rounded-xl py-2 pl-9 pr-4 text-xs text-white placeholder-slate-500 focus:outline-none transition-all"
                />
              </div>
            </div>

            {/* Conversations List */}
            <div className="flex-1 overflow-y-auto no-scrollbar divide-y divide-white/5">
              {filteredConversations.length === 0 ? (
                <div className="p-8 text-center space-y-3">
                  <i className="fa-solid fa-comments text-4xl text-slate-700 block"></i>
                  <p className="text-xs text-slate-400 font-bold">ምንም የተጀመረ ውይይት የለም</p>
                  <button
                    onClick={() => setShowNewChatModal(true)}
                    className="text-xs text-[#f9b03c] font-black underline cursor-pointer hover:text-amber-300"
                  >
                    አዲስ ውይይት ጀምር
                  </button>
                </div>
              ) : (
                filteredConversations.map((conv) => {
                  if (!currentUser) return null;
                  const otherUid = conv.participants.find(p => p !== currentUser.uid) || '';
                  const details = conv.participantDetails[otherUid] || {
                    name: 'ተጠቃሚ',
                    photo: `https://ui-avatars.com/api/?name=User&background=f9b03c&color=111827&bold=true`,
                    email: '',
                  };
                  const isActive = activeConversationId === conv.id;
                  const unread = conv.unreadCount?.[currentUser.uid] || 0;

                  return (
                    <div
                      key={conv.id}
                      onClick={() => {
                        setActiveConversationId(conv.id);
                        setActiveRecipient({
                          uid: otherUid,
                          name: details.name,
                          photo: details.photo,
                          email: details.email,
                          isAdmin: details.isAdmin,
                          isPro: details.isPro,
                        });
                      }}
                      className={`p-4 flex items-center gap-3 cursor-pointer transition-all duration-200 hover:bg-white/[0.04] ${
                        isActive ? 'bg-[#f9b03c]/10 border-l-4 border-[#f9b03c]' : ''
                      }`}
                    >
                      <div className="relative shrink-0">
                        <img
                          src={details.photo}
                          alt={details.name}
                          className={`w-11 h-11 rounded-full object-cover ring-2 ${
                            details.isAdmin ? 'ring-blue-500' : details.isPro ? 'ring-[#f9b03c]' : 'ring-white/20'
                          }`}
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(details.name)}&background=f9b03c&color=111827&bold=true`;
                          }}
                        />
                        {details.isAdmin && (
                          <span className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-blue-500 text-white text-[9px] flex items-center justify-center shadow-md">
                            ✓
                          </span>
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1 mb-1">
                          <span className={`text-xs font-black truncate ${isActive ? 'text-[#f9b03c]' : 'text-white'}`}>
                            {details.name}
                          </span>
                          {unread > 0 && (
                            <span className="w-2 h-2 rounded-full bg-[#f9b03c] animate-pulse"></span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-400 truncate">
                          {conv.lastMessage || 'ምስል ተልኳል'}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* RIGHT 8 COLS: ACTIVE CHAT STREAM & COMPOSER */}
          <div className={`md:col-span-8 lg:col-span-8 flex flex-col bg-slate-950/60 ${
            !activeConversationId && typeof window !== 'undefined' && window.innerWidth < 768 ? 'hidden md:flex' : 'flex'
          }`}>
            
            {activeRecipient ? (
              <>
                {/* Active Chat Top Bar */}
                <div className="p-4 border-b border-white/10 bg-[#050811]/90 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {/* Mobile Back Button */}
                    <button
                      onClick={() => setActiveConversationId(null)}
                      className="md:hidden w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center text-xs text-white"
                    >
                      ←
                    </button>

                    <div className="relative">
                      <img
                        src={activeRecipient.photo}
                        alt={activeRecipient.name}
                        className={`w-10 h-10 rounded-full object-cover ring-2 ${
                          activeRecipient.isAdmin ? 'ring-blue-500' : activeRecipient.isPro ? 'ring-[#f9b03c]' : 'ring-white/20'
                        }`}
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(activeRecipient.name)}&background=f9b03c&color=111827&bold=true`;
                        }}
                      />
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-heading font-black text-sm text-white">
                          {activeRecipient.name}
                        </span>
                        {activeRecipient.isAdmin && (
                          <span className="text-[10px] font-black bg-blue-500/20 text-blue-400 border border-blue-500/40 px-2 py-0.2 rounded-full">
                            Admin
                          </span>
                        )}
                        {!activeRecipient.isAdmin && activeRecipient.isPro && (
                          <span className="text-[10px] font-black text-[#f9b03c]">
                            ⭐ Pro
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] text-emerald-400 flex items-center gap-1 font-bold">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                        <span>ኦንላይን (Online)</span>
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => router.push(`/community`)}
                      className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-bold transition"
                      title="ወደ ማህበረሰብ"
                    >
                      <i className="fa-solid fa-users text-xs"></i>
                    </button>
                  </div>
                </div>

                {/* Messages Stream Container */}
                <div className="flex-1 p-4 sm:p-6 overflow-y-auto no-scrollbar space-y-3.5">
                  {messagesLoading ? (
                    <div className="flex items-center justify-center h-full">
                      <i className="fa-solid fa-spinner fa-spin text-2xl text-[#f9b03c]"></i>
                    </div>
                  ) : messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center space-y-2 opacity-60">
                      <i className="fa-solid fa-comments text-4xl text-slate-600"></i>
                      <p className="text-xs text-slate-400">ምንም መልዕክት የለም። ውይይት ይጀምሩ!</p>
                    </div>
                  ) : (
                    messages.map((msg) => {
                      const isMe = currentUser?.uid === msg.senderId;

                      return (
                        <div
                          key={msg.id}
                          className={`flex items-end gap-2 ${isMe ? 'justify-end' : 'justify-start'}`}
                        >
                          {!isMe && (
                            <img
                              src={msg.senderPhoto}
                              alt={msg.senderName}
                              className="w-7 h-7 rounded-full object-cover shrink-0 mb-1"
                              onError={(e) => {
                                (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(msg.senderName)}&background=f9b03c&color=111827&bold=true`;
                              }}
                            />
                          )}

                          <div
                            className={`max-w-[80%] sm:max-w-[70%] rounded-2xl p-3.5 shadow-md space-y-1.5 ${
                              isMe
                                ? 'bg-gradient-to-br from-[#3268ba] via-blue-600 to-indigo-700 text-white rounded-br-none'
                                : 'bg-slate-900 border border-white/10 text-slate-200 rounded-bl-none'
                            }`}
                          >
                            {msg.imageUrl && (
                              <img
                                src={msg.imageUrl}
                                alt="Chat Attachment"
                                className="rounded-xl max-h-60 w-full object-cover mb-1 border border-white/10"
                              />
                            )}

                            {msg.content && (
                              <p className="text-xs sm:text-[13px] leading-relaxed whitespace-pre-wrap font-body">
                                {msg.content}
                              </p>
                            )}

                            <div className={`text-[9px] flex items-center gap-1 ${isMe ? 'text-blue-200 justify-end' : 'text-slate-500'}`}>
                              <span>
                                {msg.createdAt ? new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                              </span>
                              {isMe && <i className="fa-solid fa-check-double text-[8px]"></i>}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Attached Image Preview in Composer */}
                {attachedChatImage && (
                  <div className="px-4 py-2 bg-slate-900/90 border-t border-white/10 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <img src={attachedChatImage} alt="Preview" className="w-12 h-12 object-cover rounded-lg border border-white/20" />
                      <span className="text-xs text-slate-300">ምስል ተያይዟል</span>
                    </div>
                    <button
                      onClick={() => setAttachedChatImage(null)}
                      className="text-xs text-red-400 hover:text-white"
                    >
                      ✕ አስወግድ
                    </button>
                  </div>
                )}

                {/* Chat Composer Input */}
                <form
                  onSubmit={handleSendMessage}
                  className="p-3.5 border-t border-white/10 bg-[#050811]/90 flex items-center gap-2"
                >
                  <button
                    type="button"
                    onClick={() => chatFileInputRef.current?.click()}
                    className="w-10 h-10 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white flex items-center justify-center text-sm transition cursor-pointer shrink-0"
                    title="ምስል አያይዝ"
                  >
                    <i className="fa-solid fa-image"></i>
                  </button>
                  <input
                    ref={chatFileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleImageSelect}
                    className="hidden"
                  />

                  <input
                    type="text"
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    placeholder="መልዕክትዎን እዚህ ይጻፉ..."
                    className="flex-1 bg-white/5 border border-white/10 focus:border-[#f9b03c] rounded-xl py-2.5 px-4 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none transition-all font-body"
                  />

                  <button
                    type="submit"
                    disabled={isSending || (!inputMessage.trim() && !attachedChatImage)}
                    className="w-10 h-10 rounded-xl bg-gradient-to-r from-[#f9b03c] via-amber-400 to-yellow-300 text-slate-950 flex items-center justify-center text-sm font-black shadow-md shadow-amber-400/20 hover:scale-105 active:scale-95 transition disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shrink-0"
                  >
                    {isSending ? <i className="fa-solid fa-spinner fa-spin"></i> : <i className="fa-solid fa-paper-plane"></i>}
                  </button>
                </form>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-4">
                <div className="w-16 h-16 rounded-3xl bg-[#f9b03c]/15 text-[#f9b03c] border border-[#f9b03c]/30 flex items-center justify-center text-3xl shadow-xl animate-bounce">
                  <i className="fa-solid fa-comments"></i>
                </div>
                <h3 className="text-lg font-heading font-black text-white">Tsehay Campus Messenger</h3>
                <p className="text-xs text-slate-400 max-w-sm">
                  ውይይት ለመጀመር ከግራ በኩል ያለውን የተጠቃሚ ዝርዝር ይምረጡ ወይም "አዲስ ውይይት" የሚለውን ይጫኑ።
                </p>
                <button
                  onClick={() => setShowNewChatModal(true)}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#f9b03c] to-amber-400 text-slate-950 font-heading font-black text-xs shadow-md shadow-amber-400/20 hover:scale-105 transition cursor-pointer"
                >
                  <i className="fa-solid fa-plus mr-1"></i> አዲስ ውይይት ጀምር
                </button>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* 🌟 NEW CHAT USER PICKER MODAL */}
      {showNewChatModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="bg-slate-900 border border-white/15 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <h3 className="font-heading font-black text-sm text-white flex items-center gap-2">
                <i className="fa-solid fa-user-plus text-[#f9b03c]"></i>
                <span>ውይይት የሚጀምሩበትን ሰው ይምረጡ</span>
              </h3>
              <button onClick={() => setShowNewChatModal(false)} className="text-slate-400 hover:text-white text-xs">✕</button>
            </div>

            <div className="space-y-2 max-h-80 overflow-y-auto no-scrollbar">
              {availableContacts.map((contact) => (
                <div
                  key={contact.uid}
                  onClick={() => handleStartChatWithUser(contact)}
                  className="p-3 rounded-2xl bg-white/[0.03] hover:bg-white/[0.08] transition flex items-center justify-between cursor-pointer border border-white/5"
                >
                  <div className="flex items-center gap-3">
                    <img
                      src={contact.photo}
                      alt={contact.name}
                      className="w-10 h-10 rounded-full object-cover ring-1 ring-white/20"
                    />
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-black text-white">{contact.name}</span>
                        {contact.isAdmin && (
                          <span className="text-[9px] font-black bg-blue-500/20 text-blue-400 px-1.5 py-0.2 rounded-full">
                            Admin
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-slate-400">{contact.email}</p>
                    </div>
                  </div>
                  <i className="fa-solid fa-comment-dots text-xs text-[#f9b03c]"></i>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* REQUIRE AUTH MODAL */}
      <RequireAuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        title="ወደ የመልዕክት ሳጥን ለመግባት ይግቡ"
        description="ከአስተማሪዎች እና ከተማሪዎች ጋር በግል ለመወያየት እባክዎ አካውንትዎን ይክፈቱ።"
      />
    </div>
  );
}

export default function InboxPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#030509] flex items-center justify-center text-amber-400 font-heading font-black">የመልዕክት ሳጥን በመጫን ላይ...</div>}>
      <InboxContent />
    </Suspense>
  );
}
