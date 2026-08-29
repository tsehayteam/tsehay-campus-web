'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { db } from '@/lib/firebase/config';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

export interface StudentFeedbackModalProps {
  initialOpen?: boolean;
}

export default function StudentFeedbackModal({ initialOpen = false }: StudentFeedbackModalProps) {
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) {
      setError('እባክዎ ሀሳብዎን ወይም አስተያየትዎን ይፃፉ።');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    const feedbackPayload = {
      rating: Number(rating) || 5,
      type: category,
      category,
      message: message.trim(),
      userId: user?.uid || 'guest_student',
      userName: contactName.trim() || user?.displayName || (user?.email ? user.email.split('@')[0] : 'ተማሪ'),
      userEmail: contactEmail.trim() || user?.email || 'student@tsehaycampus.com',
      pageUrl: typeof window !== 'undefined' ? window.location.pathname : '/',
      status: 'pending',
      createdAt: new Date().toISOString(),
      createdAtClient: new Date().toISOString()
    };

    try {
      // 1. Direct Client Firestore Write
      try {
        await addDoc(collection(db, 'user_feedbacks'), {
          ...feedbackPayload,
          createdAt: serverTimestamp()
        });
      } catch (fsErr) {
        console.warn('Client firestore write fallback:', fsErr);
      }

      // 2. Server API Dispatch
      try {
        await fetch('/api/feedback', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(feedbackPayload)
        });
      } catch (apiErr) {}

      // 3. Local Cache & Custom Event for Admin & Dashboard
      try {
        const existing = JSON.parse(localStorage.getItem('tsehay_user_feedbacks') || '[]');
        localStorage.setItem('tsehay_user_feedbacks', JSON.stringify([feedbackPayload, ...existing]));
        window.dispatchEvent(new CustomEvent('tsehay_feedback_submitted', { detail: feedbackPayload }));
      } catch (lsErr) {}

      setIsSubmitted(true);
      setTimeout(() => {
        setIsSubmitted(false);
        setMessage('');
        setRating(5);
        setIsOpen(false);
      }, 2500);
    } catch (err: any) {
      setError(err?.message || 'አስተያየትዎን ማስገባት አልተቻለም። እባክዎ እንደገና ይሞክሩ።');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      {/* 🌟 1. FLOATING FEEDBACK TRIGGER BUTTON (Silicon Valley Glassmorphism) */}
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-40 group flex items-center gap-2.5 px-4 py-2.5 rounded-full bg-[#0c1017]/90 hover:bg-[#111827] text-white border border-[#f9b03c]/40 hover:border-[#f9b03c] shadow-[0_10px_30px_rgba(0,0,0,0.8),0_0_20px_rgba(249,176,60,0.2)] backdrop-blur-xl transition-all duration-300 hover:scale-105 active:scale-95 cursor-pointer"
        title="ለ ፀሐይ ካምፓስ አስተያየት ይስጡ (Give Feedback)"
      >
        <span className="relative flex h-3 w-3">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#f9b03c] opacity-75"></span>
          <span className="relative inline-flex rounded-full h-3 w-3 bg-[#f9b03c]"></span>
        </span>
        <i className="fa-solid fa-comment-dots text-[#f9b03c] text-sm group-hover:rotate-12 transition-transform"></i>
        <span className="text-xs font-heading font-black text-slate-200 group-hover:text-white tracking-wide">
          አስተያየት / Feedback
        </span>
      </button>

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
            className="relative w-full max-w-lg bg-[#0c1017]/95 border border-[#f9b03c]/40 rounded-3xl p-6 sm:p-8 shadow-[0_25px_80px_rgba(0,0,0,0.95),0_0_50px_rgba(249,176,60,0.2)] backdrop-blur-2xl z-10 animate-in zoom-in-95 duration-300 overflow-hidden my-auto"
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
                    እናመሰግናለን! አስተያየትዎ ደርሶናል።
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
                <div className="flex items-center gap-3.5 mb-5">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#f9b03c] to-amber-300 text-slate-950 flex items-center justify-center text-xl font-black shadow-[0_0_25px_rgba(249,176,60,0.4)] shrink-0">
                    <i className="fa-solid fa-lightbulb"></i>
                  </div>
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-widest text-[#f9b03c] block">
                      Tsehay Campus • Student Voice
                    </span>
                    <h3 className="text-lg sm:text-xl font-black font-heading text-white">
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
                  <div className="bg-white/5 border border-white/10 rounded-2xl p-4 text-center">
                    <label className="block text-xs font-bold text-slate-300 mb-2">
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
                            className="p-1 text-2xl sm:text-3xl transition-transform hover:scale-125 focus:outline-none cursor-pointer"
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
                    <label className="block text-xs font-black uppercase tracking-wider text-slate-400 mb-2">
                      የአስተያየት አይነት ይምረጡ (Category) *
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {categories.map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => setCategory(item.id as any)}
                          className={`p-3 rounded-2xl border text-left transition-all duration-200 cursor-pointer ${
                            category === item.id
                              ? 'bg-[#f9b03c]/20 border-[#f9b03c] text-white shadow-[0_0_20px_rgba(249,176,60,0.25)]'
                              : 'bg-white/5 border-white/10 text-slate-400 hover:border-white/20 hover:text-slate-200'
                          }`}
                        >
                          <div className="font-heading font-black text-xs">{item.label}</div>
                          <div className="text-[10px] text-slate-400 mt-0.5">{item.desc}</div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* 3. Text Message Area */}
                  <div>
                    <label className="block text-xs font-black uppercase tracking-wider text-slate-400 mb-1.5 flex items-center justify-between">
                      <span>የአስተያየትዎ ዝርዝር (Message) *</span>
                      <span className="text-[10px] text-slate-500 font-normal">{message.length}/500</span>
                    </label>
                    <textarea
                      rows={3}
                      required
                      maxLength={500}
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder="ስለ ፕላትፎርሙ፣ ኮርሶቹ ወይም ስለተሻሻለው ነገር በዝርዝር ይንገሩን..."
                      className="w-full bg-white/5 border border-white/10 rounded-2xl p-3.5 text-xs text-white placeholder-slate-500 outline-none focus:border-[#f9b03c] transition-all resize-none"
                    />
                  </div>

                  {/* 4. Optional Contact Inputs (For guests or update) */}
                  {!user && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <input
                        type="text"
                        value={contactName}
                        onChange={(e) => setContactName(e.target.value)}
                        placeholder="ስምዎ (አማራጭ)"
                        className="bg-white/5 border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 outline-none focus:border-[#f9b03c]"
                      />
                      <input
                        type="email"
                        value={contactEmail}
                        onChange={(e) => setContactEmail(e.target.value)}
                        placeholder="ኢሜይል (አማራጭ)"
                        className="bg-white/5 border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 outline-none focus:border-[#f9b03c]"
                      />
                    </div>
                  )}

                  {/* Submit Button */}
                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={isSubmitting || !message.trim()}
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
