'use client';

import React, { useState } from 'react';
import { db } from '@/lib/firebase/config';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

export interface FeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
  user?: {
    uid?: string;
    displayName?: string | null;
    email?: string | null;
  } | null;
}

export default function FeedbackModal({ isOpen, onClose, user }: FeedbackModalProps) {
  const [rating, setRating] = useState<number>(5);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [feedbackType, setFeedbackType] = useState<'course' | 'bug' | 'idea' | 'general'>('general');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

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
      type: feedbackType,
      message: message.trim(),
      userId: user?.uid || 'guest_user',
      userName: user?.displayName || (user?.email ? user.email.split('@')[0] : 'ተማሪ'),
      userEmail: user?.email || 'student@tsehaycampus.com',
      status: 'pending',
      createdAt: serverTimestamp(),
      createdAtClient: new Date().toISOString()
    };

    try {
      // 1. Save to Firestore
      try {
        await addDoc(collection(db, 'user_feedbacks'), feedbackPayload);
      } catch (fsErr) {
        console.warn("Direct Firestore feedback write notice:", fsErr);
      }

      // 2. Save to local storage as fallback/cache
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
        onClose();
      }, 2500);
    } catch (err: any) {
      setError(err?.message || 'አስተያየትዎን ማስገባት አልተቻለም። እባክዎ እንደገና ይሞክሩ።');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/80 backdrop-blur-md transition-opacity animate-in fade-in duration-300"
        onClick={onClose}
      />

      {/* Modal Card */}
      <div className="relative w-full max-w-lg bg-[#0c1017]/95 border border-[#f9b03c]/30 rounded-3xl p-6 sm:p-8 shadow-[0_25px_80px_rgba(0,0,0,0.9),0_0_50px_rgba(249,176,60,0.15)] backdrop-blur-2xl z-10 animate-in zoom-in-95 duration-300 overflow-hidden">
        
        {/* Glow Effects */}
        <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-64 h-64 bg-[#f9b03c]/20 rounded-full blur-3xl pointer-events-none" />

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 sm:top-5 sm:right-5 w-9 h-9 rounded-full bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white flex items-center justify-center transition-all cursor-pointer z-20 border border-white/10"
          title="ዝጋ (Close)"
        >
          <i className="fa-solid fa-xmark text-base"></i>
        </button>

        {isSubmitted ? (
          /* Success Screen */
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
          /* Form Content */
          <div>
            {/* Header */}
            <div className="flex items-center gap-3.5 mb-5">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#f9b03c] to-yellow-300 text-slate-950 flex items-center justify-center text-xl font-black shadow-[0_0_25px_rgba(249,176,60,0.4)] shrink-0">
                <i className="fa-solid fa-lightbulb"></i>
              </div>
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest text-[#f9b03c] block">
                  User Feedback & Suggestions
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
                  አጠቃላይ እርካታዎን በኮከብ ይግለጹ (Rating)
                </label>
                <div className="flex items-center justify-center gap-2">
                  {[1, 2, 3, 4, 5].map((star) => {
                    const isFilled = star <= (hoverRating || rating);
                    return (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setRating(star)}
                        onMouseEnter={() => setHoverRating(star)}
                        onMouseLeave={() => setHoverRating(0)}
                        className="p-1 text-2xl sm:text-3xl transition-transform hover:scale-125 cursor-pointer focus:outline-none"
                      >
                        <i 
                          className={`fa-solid fa-star ${
                            isFilled 
                              ? 'text-[#f9b03c] drop-shadow-[0_0_12px_rgba(249,176,60,0.8)]' 
                              : 'text-slate-600'
                          }`}
                        />
                      </button>
                    );
                  })}
                </div>
                <span className="text-[11px] font-black text-[#f9b03c] mt-1.5 block">
                  {rating === 5 ? '🌟 እጅግ በጣም ምርጥ (5/5 Excellent)' : 
                   rating === 4 ? '👍 በጣም ጥሩ (4/5 Very Good)' : 
                   rating === 3 ? '👌 ጥሩ (3/5 Good)' : 
                   rating === 2 ? '😐 መሻሻል አለበት (2/5 Needs Improvement)' : 
                   '👎 ደካማ (1/5 Poor)'}
                </span>
              </div>

              {/* 2. Feedback Type Selection */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  የአስተያየት አይነት ይምረጡ (Feedback Type)
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {[
                    { id: 'course', label: '🎓 የኮርስ አስተያየት', desc: 'Course' },
                    { id: 'bug', label: '🐛 የዌብሳይት ችግር', desc: 'Bug' },
                    { id: 'idea', label: '💡 አዲስ ሀሳብ', desc: 'New Idea' },
                    { id: 'general', label: '💬 አጠቃላይ', desc: 'General' },
                  ].map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setFeedbackType(item.id as any)}
                      className={`p-2.5 rounded-xl border text-xs font-bold transition text-left flex flex-col cursor-pointer active:scale-95 ${
                        feedbackType === item.id
                          ? 'bg-[#f9b03c]/20 border-[#f9b03c] text-white shadow-sm'
                          : 'bg-white/5 border-white/10 text-slate-400 hover:text-white hover:bg-white/10'
                      }`}
                    >
                      <span className="font-black text-[11px]">{item.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* 3. Textarea Message */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold text-slate-300">
                    የእርስዎ አስተያየት (Your Message) <span className="text-[#f9b03c]">*</span>
                  </label>
                  <span className="text-[10px] text-slate-500">{message.length} ፊደላት</span>
                </div>
                <textarea
                  required
                  rows={4}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="እባክዎ ሀሳብዎን እዚህ ይጻፉ... (ምን ተመችቶዎታል? ምን ቢስተካከል ደስ ይልዎታል?)"
                  className="w-full bg-white/5 border border-white/10 rounded-2xl p-3.5 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-[#f9b03c] transition resize-none"
                />
              </div>

              {/* User Info Capsule */}
              <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5 flex items-center justify-between text-[11px] text-slate-400">
                <span>ላኪ: <strong className="text-slate-200">{user?.displayName || 'ተማሪ'}</strong></span>
                <span>{user?.email || 'student@tsehaycampus.com'}</span>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isSubmitting || !message.trim()}
                className="w-full btn-buy-now-vibe py-3.5 sm:py-4 rounded-2xl text-xs sm:text-sm font-black flex items-center justify-center gap-2 cursor-pointer active:scale-98 shadow-[0_0_25px_rgba(249,176,60,0.35)] text-slate-950 disabled:opacity-50"
              >
                {isSubmitting ? (
                  <div className="w-5 h-5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <>
                    <i className="fa-solid fa-paper-plane text-xs"></i>
                    <span>አስተያየትን ላክ (Submit Feedback)</span>
                  </>
                )}
              </button>

            </form>
          </div>
        )}

      </div>
    </div>
  );
}
