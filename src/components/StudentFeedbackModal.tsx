'use client';

import React, { useState, useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { db, storage } from '@/lib/firebase/config';
import { collection, addDoc, doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

export interface StudentFeedbackModalProps {
  initialOpen?: boolean;
}

export default function StudentFeedbackModal({ initialOpen = false }: StudentFeedbackModalProps) {
  const pathname = usePathname();
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(initialOpen);
  const [rating, setRating] = useState<number>(5);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [category, setCategory] = useState<'idea' | 'bug' | 'course' | 'general'>('general');
  const [message, setMessage] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactName, setContactName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 📷 Image/Screenshot Attachment State
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 🎙️ Voice Recording State
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioPreviewUrl, setAudioPreviewUrl] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);

  // 🌟 Freely Draggable Physics States
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ mouseX: 0, mouseY: 0, posX: 0, posY: 0 });
  const hasMovedRef = useRef(false);

  const handleLauncherDragStart = (e: React.MouseEvent | React.TouchEvent) => {
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    dragStartRef.current = { mouseX: clientX, mouseY: clientY, posX: position.x, posY: position.y };
    hasMovedRef.current = false;
    setIsDragging(true);
  };

  useEffect(() => {
    if (!isDragging) return;

    const handleDragMove = (e: MouseEvent | TouchEvent) => {
      const clientX = 'touches' in e ? e.touches[0].clientX : (e as MouseEvent).clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : (e as MouseEvent).clientY;
      const deltaX = clientX - dragStartRef.current.mouseX;
      const deltaY = clientY - dragStartRef.current.mouseY;

      if (Math.abs(deltaX) > 4 || Math.abs(deltaY) > 4) {
        hasMovedRef.current = true;
      }

      let newX = dragStartRef.current.posX + deltaX;
      let newY = dragStartRef.current.posY + deltaY;

      // Constrain within viewport bounds
      const maxX = 10;
      const minX = typeof window !== 'undefined' ? -window.innerWidth + 140 : -500;
      const maxY = 10;
      const minY = typeof window !== 'undefined' ? -window.innerHeight + 140 : -700;

      newX = Math.min(maxX, Math.max(minX, newX));
      newY = Math.min(maxY, Math.max(minY, newY));

      setPosition({ x: newX, y: newY });
    };

    const handleDragEnd = () => {
      setIsDragging(false);
    };

    window.addEventListener('mousemove', handleDragMove);
    window.addEventListener('mouseup', handleDragEnd);
    window.addEventListener('touchmove', handleDragMove, { passive: false });
    window.addEventListener('touchend', handleDragEnd);

    return () => {
      window.removeEventListener('mousemove', handleDragMove);
      window.removeEventListener('mouseup', handleDragEnd);
      window.removeEventListener('touchmove', handleDragMove);
      window.removeEventListener('touchend', handleDragEnd);
    };
  }, [isDragging]);

  // Sync user info
  useEffect(() => {
    if (user) {
      setContactEmail(user.email || '');
      setContactName(user.displayName || '');
    }
  }, [user]);

  // Global Event Listener to open feedback modal from any component/page
  useEffect(() => {
    const handleOpenModal = (event: any) => {
      if (event?.detail?.category) {
        setCategory(event.detail.category);
      }
      setIsOpen(true);
    };

    window.addEventListener('tsehay_open_feedback_modal', handleOpenModal as EventListener);
    window.addEventListener('open-feedback-modal', handleOpenModal as EventListener);

    return () => {
      window.removeEventListener('tsehay_open_feedback_modal', handleOpenModal as EventListener);
      window.removeEventListener('open-feedback-modal', handleOpenModal as EventListener);
    };
  }, []);

  // Handle Paste Event for Screenshots
  useEffect(() => {
    if (!isOpen) return;

    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          const file = items[i].getAsFile();
          if (file) {
            handleImageSelected(file);
            break;
          }
        }
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [isOpen]);

  const ratingLabels: { [key: number]: string } = {
    1: '⭐ ደካማ (Needs Major Improvement)',
    2: '⭐⭐ ማሻሻያ ያስፈልገዋል (Fair)',
    3: '⭐⭐⭐ መካከለኛ (Good)',
    4: '⭐⭐⭐⭐ በጣም ጥሩ (Very Good)',
    5: '⭐⭐⭐⭐⭐ ድንቅ እና ምርጥ! (Excellent & Loved it)',
  };

  const categories = [
    { id: 'idea', label: '💡 አዲስ ሃሳብ (Idea)', desc: 'አዲስ የኮርስ ወይም የገፅ ሃሳብ' },
    { id: 'bug', label: '🐛 ችግር (Bug)', desc: 'የቴክኒክ ወይም የሲስተም ክፍተት' },
    { id: 'course', label: '📚 የኮርስ አስተያየት (Course)', desc: 'ስለ ትምህርቶቹ ይዘት' },
    { id: 'general', label: '💬 አጠቃላይ (General)', desc: 'አጠቃላይ አስተያየት' },
  ];

  // 📷 Image selection handler
  const handleImageSelected = (file: File) => {
    if (!file.type.startsWith('image/')) {
      setError('እባክዎ ትክክለኛ የፎቶ ፋይል (PNG, JPG, WebP) ይምረጡ።');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError('የምስሉ መጠን ከ 10MB መብለጥ የለበትም።');
      return;
    }

    setImageFile(file);
    const reader = new FileReader();
    reader.onload = () => {
      setImagePreviewUrl(reader.result as string);
    };
    reader.readAsDataURL(file);
    setError(null);
  };

  const handleRemoveImage = () => {
    setImageFile(null);
    setImagePreviewUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // 🎙️ Voice Recording Handlers
  const startRecording = async () => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setError('ይህ ብሮውዘር ድምፅ መቅረፅን አይደግፍም።');
        return;
      }

      setError(null);
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];

      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        const mimeType = recorder.mimeType || 'audio/webm';
        const blob = new Blob(audioChunksRef.current, { type: mimeType });
        setAudioBlob(blob);
        const audioUrl = URL.createObjectURL(blob);
        setAudioPreviewUrl(audioUrl);
        stream.getTracks().forEach((track) => track.stop());
      };

      recorder.start(100);
      setIsRecording(true);
      setRecordingSeconds(0);

      recordingTimerRef.current = setInterval(() => {
        setRecordingSeconds((prev) => {
          if (prev >= 60) {
            stopRecording();
            return 60;
          }
          return prev + 1;
        });
      }, 1000);
    } catch (err: any) {
      console.error('Audio recording error:', err);
      setError('የማይክሮፎን ፈቃድ አልተሰጠም። እባክዎ ማይክሮፎን ይፍቀዱ።');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
        recordingTimerRef.current = null;
      }
    }
  };

  const handleRemoveAudio = () => {
    if (audioPreviewUrl) URL.revokeObjectURL(audioPreviewUrl);
    setAudioBlob(null);
    setAudioPreviewUrl(null);
    setRecordingSeconds(0);
  };

  // Convert Blob to Base64 Data URL (fallback helper)
  const blobToDataURL = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  };

  // Timeout helper to ensure uploads and network calls never hang indefinitely
  const withTimeout = <T,>(promise: Promise<T>, ms: number, fallback: T): Promise<T> => {
    return Promise.race([
      promise,
      new Promise<T>((resolve) => setTimeout(() => resolve(fallback), ms))
    ]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() && !audioBlob) {
      setError('እባክዎ ሀሳብዎን ይፃፉ ወይም በድምፅ ይቅረጹ።');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    const feedbackId = `fb_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    let uploadedImageUrl: string | null = imagePreviewUrl;
    let uploadedAudioUrl: string | null = null;

    try {
      // 1. Audio Processing: Fast Base64 conversion + Quick Cloud Storage Upload Attempt
      if (audioBlob) {
        try {
          uploadedAudioUrl = await blobToDataURL(audioBlob);
        } catch (bErr) {
          console.warn('Blob to data URL notice:', bErr);
        }

        // Parallel non-blocking cloud storage upload attempt (3.5s timeout)
        try {
          const audioStorageRef = ref(storage, `feedback_audio/${feedbackId}.webm`);
          const uploadTask = uploadBytes(audioStorageRef, audioBlob).then(snap => getDownloadURL(snap.ref));
          const storageUrl = await withTimeout(uploadTask, 3500, null);
          if (storageUrl) uploadedAudioUrl = storageUrl;
        } catch (uploadErr) {
          console.warn('Fast storage audio upload notice:', uploadErr);
        }
      }

      // 2. Image Processing
      if (imageFile) {
        try {
          const imageStorageRef = ref(storage, `feedback_attachments/${feedbackId}_${imageFile.name}`);
          const uploadTask = uploadBytes(imageStorageRef, imageFile).then(snap => getDownloadURL(snap.ref));
          const storageUrl = await withTimeout(uploadTask, 3500, null);
          if (storageUrl) uploadedImageUrl = storageUrl;
        } catch (uploadErr) {
          console.warn('Fast storage image upload notice:', uploadErr);
        }
      }

      const feedbackPayload = {
        id: feedbackId,
        category,
        type: category,
        rating: Number(rating) || 5,
        message: message.trim() || (uploadedAudioUrl ? '🎙️ [የድምፅ መልዕክት ተልኳል]' : ''),
        audioUrl: uploadedAudioUrl || null,
        imageUrl: uploadedImageUrl || null,
        userEmail: contactEmail.trim() || user?.email || 'student@tsehaycampus.com',
        userName: contactName.trim() || user?.displayName || (user?.email ? user.email.split('@')[0] : 'ተማሪ'),
        userId: user?.uid || 'guest_student',
        pageUrl: typeof window !== 'undefined' ? window.location.pathname : '/',
        status: 'pending',
        createdAt: Date.now(),
        createdAtISO: new Date().toISOString()
      };

      // 3. Direct Client Firestore Writes to user_feedbacks & student_feedback
      try {
        await setDoc(doc(db, 'user_feedbacks', feedbackId), {
          ...feedbackPayload,
          createdAt: serverTimestamp(),
          createdAtClient: new Date().toISOString()
        }, { merge: true });
      } catch (fsErr) {}

      try {
        await setDoc(doc(db, 'student_feedback', feedbackId), {
          ...feedbackPayload,
          createdAt: serverTimestamp(),
          createdAtClient: new Date().toISOString()
        }, { merge: true });
      } catch (fsErr) {}

      // 4. Server API Dispatch
      try {
        const apiCall = fetch('/api/feedback', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(feedbackPayload),
        });
        await withTimeout(apiCall, 4000, null);
      } catch (apiErr) {}

      // 5. Local Cache & Custom Event for Admin & Dashboard
      try {
        const existing = JSON.parse(localStorage.getItem('tsehay_user_feedbacks') || '[]');
        localStorage.setItem('tsehay_user_feedbacks', JSON.stringify([feedbackPayload, ...existing]));
        window.dispatchEvent(new CustomEvent('tsehay_feedback_submitted', { detail: feedbackPayload }));
      } catch (lsErr) {}

      // 🌟 UI Transition: Immediately reset submitting and show Green Success Screen
      setIsSubmitting(false);
      setIsSubmitted(true);

      // Auto-close modal after 1.5 seconds & reset recorder
      setTimeout(() => {
        setIsSubmitted(false);
        setMessage('');
        setImageFile(null);
        setImagePreviewUrl(null);
        handleRemoveAudio();
        setRating(5);
        setIsOpen(false);
      }, 1500);

    } catch (err: any) {
      setError(err?.message || 'አስተያየትዎን ማስገባት አልተቻለም። እባክዎ እንደገና ይሞክሩ።');
      setIsSubmitting(false);
    }
  };

  const isClassroomOrAdmin = pathname?.startsWith('/admin') || pathname?.startsWith('/dashboard') || pathname?.startsWith('/classroom');

  return (
    <>
      {/* 🌟 1. FLOATING FEEDBACK TRIGGER BUTTON (Draggable, Pulsing, Positioned below AI at fixed bottom-6 right-6 z-[9999]) */}
      {!isClassroomOrAdmin && (
        <div
          className="fixed bottom-6 right-6 z-[9999] font-body select-none"
          style={{
            transform: `translate3d(${position.x}px, ${position.y}px, 0)`,
            touchAction: 'none'
          }}
        >
          <button
            type="button"
            onMouseDown={handleLauncherDragStart}
            onTouchStart={handleLauncherDragStart}
            onClick={() => {
              if (!hasMovedRef.current) setIsOpen(true);
            }}
            className="group relative flex items-center gap-2.5 px-4 py-2.5 rounded-full bg-gradient-to-r from-[#0d1527] via-[#13203f] to-[#0d1527] border border-[#f9b03c]/40 hover:border-[#f9b03c] text-white shadow-[0_10px_30px_rgba(0,0,0,0.8),0_0_25px_rgba(249,176,60,0.4)] hover:shadow-[0_0_35px_rgba(249,176,60,0.6)] backdrop-blur-xl transition-all duration-300 hover:scale-105 active:scale-95 cursor-grab active:cursor-grabbing select-none"
            title="ጠቅ አድርገው ይክፈቱ ወይም ወደ ፈለጉበት ቦታ ይጎትቱ (Click to give feedback or drag)"
          >
            <span className="absolute -inset-0.5 rounded-full bg-gradient-to-r from-[#f9b03c] via-amber-400 to-[#3268ba] opacity-35 group-hover:opacity-100 blur-xs transition duration-500 animate-pulse pointer-events-none"></span>

            <div className="relative flex items-center gap-2">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#f9b03c] opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-[#f9b03c]"></span>
              </span>
              <i className="fa-solid fa-comment-dots text-[#f9b03c] text-sm group-hover:rotate-12 transition-transform"></i>
              <span className="text-xs font-heading font-black text-slate-200 group-hover:text-white tracking-wide">
                💬 አስተያየት (Feedback)
              </span>
            </div>
          </button>
        </div>
      )}

      {/* 🌟 2. GLOBAL FEEDBACK MODAL */}
      {isOpen && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/85 backdrop-blur-md transition-opacity animate-in fade-in duration-300"
            onClick={() => setIsOpen(false)}
          />

          {/* Modal Card */}
          <div
            className="relative w-full max-w-lg bg-[#0c1017]/95 border border-[#f9b03c]/40 rounded-3xl p-5 sm:p-7 shadow-[0_25px_80px_rgba(0,0,0,0.95),0_0_50px_rgba(249,176,60,0.2)] backdrop-blur-2xl z-10 animate-in zoom-in-95 duration-300 overflow-hidden my-auto max-h-[90vh] overflow-y-auto custom-scrollbar"
            style={{ animation: 'modalPop 0.25s cubic-bezier(0.16, 1, 0.3, 1)' }}
          >
            {/* Ambient Glows */}
            <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-64 h-64 bg-[#f9b03c]/20 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -bottom-24 right-0 w-64 h-64 bg-[#3268ba]/15 rounded-full blur-3xl pointer-events-none" />

            {/* Close Button */}
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="absolute top-4 right-4 sm:top-5 sm:right-5 w-9 h-9 rounded-full bg-white/5 hover:bg-white/15 text-slate-400 hover:text-white flex items-center justify-center transition-all cursor-pointer z-20 border border-white/10"
              title="ዝጋ (Close)"
            >
              <i className="fa-solid fa-xmark text-base"></i>
            </button>

            {isSubmitted ? (
              /* Success Screen with Confetti Checkmark */
              <div className="py-8 text-center space-y-4 animate-in zoom-in-90 duration-300">
                <div className="w-16 h-16 rounded-full bg-emerald-500/20 border-2 border-emerald-400 text-emerald-400 flex items-center justify-center text-3xl mx-auto shadow-[0_0_30px_rgba(16,185,129,0.5)]">
                  <i className="fa-solid fa-check animate-bounce"></i>
                </div>
                <div className="space-y-1.5">
                  <h3 className="text-xl font-black font-heading text-white">
                    🎉 አስተያየትዎ ደርሶናል! እናመሰግናለን!
                  </h3>
                  <p className="text-xs text-slate-300 max-w-xs mx-auto">
                    የእርስዎ አስተያየት የፀሐይ ካምፓስን የላቀ እና የተሻለ የትምህርት ተሞክሮ እንድንገነባ ያግዘናል።
                  </p>
                </div>
              </div>
            ) : (
              /* Feedback Form */
              <div>
                {/* Header */}
                <div className="flex items-center gap-3.5 mb-4">
                  <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-[#f9b03c] to-amber-300 text-slate-950 flex items-center justify-center text-lg font-black shadow-[0_0_25px_rgba(249,176,60,0.4)] shrink-0">
                    <i className="fa-solid fa-lightbulb"></i>
                  </div>
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-widest text-[#f9b03c] block">
                      Tsehay Campus • Student Voice
                    </span>
                    <h3 className="text-base sm:text-lg font-black font-heading text-white">
                      ስለ ፀሐይ ካምፓስ ምን አስተያየት አለዎት?
                    </h3>
                  </div>
                </div>

                {error && (
                  <div className="p-3 rounded-xl bg-red-500/15 border border-red-500/30 text-xs text-red-300 mb-4 flex items-center gap-2">
                    <i className="fa-solid fa-circle-exclamation text-red-400"></i>
                    <span>{error}</span>
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                  {/* 1. Star Rating UI */}
                  <div className="bg-white/5 border border-white/10 rounded-2xl p-3 text-center">
                    <label className="block text-xs font-bold text-slate-300 mb-1.5">
                      አጠቃላይ እርካታዎን በኮከብ ይግለጹ (Rating) *
                    </label>
                    <div className="flex items-center justify-center gap-2 mb-1">
                      {[1, 2, 3, 4, 5].map((star) => {
                        const active = (hoverRating || rating) >= star;
                        return (
                          <button
                            key={star}
                            type="button"
                            onMouseEnter={() => setHoverRating(star)}
                            onMouseLeave={() => setHoverRating(0)}
                            onClick={() => setRating(star)}
                            className="p-1 text-2xl transition-transform hover:scale-125 focus:outline-none cursor-pointer"
                          >
                            <i
                              className={`fa-solid fa-star transition-colors duration-200 ${
                                active
                                  ? 'text-[#f9b03c] drop-shadow-[0_0_10px_rgba(249,176,60,0.7)]'
                                  : 'text-slate-700'
                              }`}
                            />
                          </button>
                        );
                      })}
                    </div>
                    <span className="text-[11px] font-bold text-[#f9b03c]">
                      {ratingLabels[hoverRating || rating]}
                    </span>
                  </div>

                  {/* 2. Feedback Type Selection */}
                  <div>
                    <label className="block text-xs font-black uppercase tracking-wider text-slate-400 mb-1.5">
                      የአስተያየት አይነት ይምረጡ (Category) *
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {categories.map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => setCategory(item.id as any)}
                          className={`p-2.5 rounded-2xl border text-left transition-all duration-200 cursor-pointer ${
                            category === item.id
                              ? 'bg-[#f9b03c]/20 border-[#f9b03c] text-white shadow-[0_0_20px_rgba(249,176,60,0.25)]'
                              : 'bg-white/5 border-white/10 text-slate-400 hover:border-white/20 hover:text-slate-200'
                          }`}
                        >
                          <div className="font-heading font-black text-xs">{item.label}</div>
                          <div className="text-[9px] text-slate-400 mt-0.5">{item.desc}</div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* 3. Text Message Area */}
                  <div>
                    <label className="block text-xs font-black uppercase tracking-wider text-slate-400 mb-1 flex items-center justify-between">
                      <span>የአስተያየትዎ ዝርዝር (Message)</span>
                      <span className="text-[10px] text-slate-500 font-normal">{message.length}/500</span>
                    </label>
                    <textarea
                      rows={3}
                      maxLength={500}
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder="ስለ ፕላትፎርሙ፣ ኮርሶቹ ወይም ስላጋጠመዎት ነገር በዝርዝር ይንገሩን..."
                      className="w-full bg-white/5 border border-white/10 rounded-2xl p-3 text-xs text-white placeholder-slate-500 outline-none focus:border-[#f9b03c] transition-all resize-none"
                    />
                  </div>

                  {/* 4. 🎙️ Live Voice Recording & 📷 Screenshot Attachment Controls */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    
                    {/* Voice Recording Control */}
                    <div className="p-3 rounded-2xl bg-white/5 border border-white/10 flex flex-col justify-between gap-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                          <i className="fa-solid fa-microphone text-[#f9b03c]"></i>
                          <span>የድምፅ መልዕክት</span>
                        </span>
                        {isRecording && (
                          <span className="text-[10px] text-red-400 font-mono font-bold animate-pulse flex items-center gap-1">
                            <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
                            00:{recordingSeconds < 10 ? `0${recordingSeconds}` : recordingSeconds}
                          </span>
                        )}
                      </div>

                      {!isRecording && !audioPreviewUrl && (
                        <button
                          type="button"
                          onClick={startRecording}
                          className="w-full py-2 px-3 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-[#f9b03c]/40 text-[#f9b03c] text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer active:scale-95"
                        >
                          <i className="fa-solid fa-microphone"></i>
                          <span>ድምፅ ቅረጽ (Record)</span>
                        </button>
                      )}

                      {isRecording && (
                        <div className="flex items-center gap-2">
                          <div className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 rounded-xl bg-red-500/10 border border-red-500/30">
                            <span className="w-1 h-3 bg-red-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                            <span className="w-1 h-5 bg-red-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                            <span className="w-1 h-2 bg-red-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                            <span className="w-1 h-4 bg-red-400 rounded-full animate-bounce" style={{ animationDelay: '100ms' }}></span>
                            <span className="text-[10px] text-red-400 font-bold ml-1">እየተቀረጸ ነው...</span>
                          </div>
                          <button
                            type="button"
                            onClick={stopRecording}
                            className="px-3 py-1.5 rounded-xl bg-red-500 hover:bg-red-600 text-white text-xs font-black transition cursor-pointer"
                          >
                            አቁም
                          </button>
                        </div>
                      )}

                      {audioPreviewUrl && !isRecording && (
                        <div className="space-y-1.5">
                          <audio controls src={audioPreviewUrl} className="w-full h-7 rounded-lg" />
                          <div className="flex items-center justify-between text-[10px]">
                            <span className="text-emerald-400 font-bold">✓ ድምፅ ተቀርጿል</span>
                            <button
                              type="button"
                              onClick={handleRemoveAudio}
                              className="text-red-400 hover:text-red-300 cursor-pointer font-bold"
                            >
                              አጥፋ / ድገም
                            </button>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Screenshot Attachment Control */}
                    <div className="p-3 rounded-2xl bg-white/5 border border-white/10 flex flex-col justify-between gap-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                          <i className="fa-solid fa-image text-blue-400"></i>
                          <span>ምስል / ስክሪንሾት</span>
                        </span>
                      </div>

                      {!imagePreviewUrl ? (
                        <div>
                          <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            onChange={(e) => {
                              if (e.target.files && e.target.files[0]) {
                                handleImageSelected(e.target.files[0]);
                              }
                            }}
                            className="hidden"
                            id="feedback-image-upload"
                          />
                          <label
                            htmlFor="feedback-image-upload"
                            className="w-full py-2 px-3 rounded-xl bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/40 text-blue-400 text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer active:scale-95"
                          >
                            <i className="fa-solid fa-paperclip"></i>
                            <span>ፎቶ ምረጥ (Attach)</span>
                          </label>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between gap-2 bg-white/5 p-1.5 rounded-xl border border-white/10">
                          <div className="flex items-center gap-2 min-w-0">
                            <img
                              src={imagePreviewUrl}
                              alt="Attachment Preview"
                              className="w-8 h-8 rounded-lg object-cover border border-white/20 shrink-0"
                            />
                            <span className="text-[10px] text-emerald-400 font-bold truncate">
                              ✓ ምስል ተያይዟል
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={handleRemoveImage}
                            className="w-6 h-6 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-400 flex items-center justify-center text-[10px] cursor-pointer"
                            title="ምስል አስወግድ"
                          >
                            <i className="fa-solid fa-xmark"></i>
                          </button>
                        </div>
                      )}
                    </div>

                  </div>

                  {/* 5. Optional Contact Inputs (For guests) */}
                  {!user && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <input
                        type="text"
                        value={contactName}
                        onChange={(e) => setContactName(e.target.value)}
                        placeholder="ስምዎ (አማራጭ)"
                        className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 outline-none focus:border-[#f9b03c]"
                      />
                      <input
                        type="email"
                        value={contactEmail}
                        onChange={(e) => setContactEmail(e.target.value)}
                        placeholder="ኢሜይል (አማራጭ)"
                        className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 outline-none focus:border-[#f9b03c]"
                      />
                    </div>
                  )}

                  {/* Submit Button */}
                  <div className="pt-1">
                    <button
                      type="submit"
                      disabled={isSubmitting || (!message.trim() && !audioBlob)}
                      className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-[#f9b03c] to-amber-500 hover:from-amber-400 hover:to-[#f9b03c] text-slate-950 font-heading font-black text-xs uppercase tracking-wider shadow-[0_0_30px_rgba(249,176,60,0.4)] hover:shadow-[0_0_40px_rgba(249,176,60,0.6)] transition-all duration-300 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 active:scale-98"
                    >
                      {isSubmitting ? (
                        <>
                          <i className="fa-solid fa-spinner fa-spin text-sm"></i>
                          <span>በመላክ ላይ...</span>
                        </>
                      ) : (
                        <>
                          <i className="fa-solid fa-paper-plane text-xs"></i>
                          <span>አስተያየቱን ላክ (Submit Feedback)</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
