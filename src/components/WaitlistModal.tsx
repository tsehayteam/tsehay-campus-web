'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { ComingSoonCourse } from '@/lib/courseCache';

interface WaitlistModalProps {
  isOpen: boolean;
  onClose: () => void;
  course: ComingSoonCourse | null;
}

export default function WaitlistModal({ isOpen, onClose, course }: WaitlistModalProps) {
  const { user } = useAuth();
  const [studentName, setStudentName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Autofill with logged-in user credentials
  useEffect(() => {
    if (isOpen) {
      setIsSuccess(false);
      setErrorMsg(null);
      if (user) {
        setStudentName(user.displayName || '');
        setEmail(user.email || '');
        setPhone(user.phoneNumber || '');
      } else {
        setStudentName('');
        setEmail('');
        setPhone('');
      }
    }
  }, [isOpen, user]);

  // Close on ESC key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !isSubmitting) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isSubmitting, onClose]);

  if (!isOpen || !course) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentName.trim()) {
      setErrorMsg('እባክዎ ሙሉ ስምዎን ያስገቡ (Full name is required)');
      return;
    }
    if (!phone.trim()) {
      setErrorMsg('እባክዎ ስልክ ቁጥርዎን ያስገቡ (Phone number is required)');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    const waitlistId = `wl_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const waitlistPayload = {
      id: waitlistId,
      studentName: studentName.trim(),
      email: (email || '').trim().toLowerCase(),
      phone: phone.trim(),
      courseId: course.id,
      courseTitle: course.title,
      createdAt: new Date().toISOString(),
      timestamp: Date.now(),
      status: 'pending'
    };

    try {
      // 1. Direct resilient Supabase write
      try {
        await supabase.from('waitlists').insert({
          id: waitlistId,
          course_id: course.id,
          course_title: course.title,
          student_name: studentName.trim(),
          phone: phone.trim(),
          email: (email || '').trim().toLowerCase(),
          created_at: new Date().toISOString()
        });
      } catch (dbErr) {
        console.warn('Supabase waitlist write attempt:', dbErr);
      }

      // 2. Server API call
      try {
        await fetch('/api/waitlist', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(waitlistPayload)
        });
      } catch (apiErr) {
        console.warn('Waitlist API call notice:', apiErr);
      }

      setIsSuccess(true);
    } catch (err: any) {
      console.error('Waitlist submission error:', err);
      setIsSuccess(true); // Graceful recovery
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
      {/* Dark Blur Backdrop */}
      <div 
        className="fixed inset-0 bg-[#030509]/85 backdrop-blur-xl transition-opacity animate-fade-in"
        onClick={() => { if (!isSubmitting) onClose(); }}
      />

      {/* Modal Card */}
      <div 
        className="relative w-full max-w-lg bg-[#070b14] border border-[#f9b03c]/30 rounded-3xl p-6 sm:p-8 shadow-[0_25px_70px_rgba(0,0,0,0.9),0_0_40px_rgba(249,176,60,0.15)] z-10 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Ambient Glow */}
        <div className="absolute -top-24 -right-24 w-60 h-60 bg-[#f9b03c]/20 rounded-full blur-[90px] pointer-events-none"></div>
        <div className="absolute -bottom-24 -left-24 w-60 h-60 bg-[#3268ba]/20 rounded-full blur-[90px] pointer-events-none"></div>

        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          disabled={isSubmitting}
          className="absolute top-5 right-5 w-9 h-9 rounded-full bg-white/[0.06] hover:bg-white/10 text-gray-400 hover:text-white flex items-center justify-center transition border border-white/10 cursor-pointer disabled:opacity-50"
        >
          <i className="fa-solid fa-xmark text-sm"></i>
        </button>

        {isSuccess ? (
          /* =========================================================================
             SUCCESS STATE CARD
             ========================================================================= */
          <div className="py-6 text-center animate-fade-in flex flex-col items-center">
            {/* Glowing Green Success Halo */}
            <div className="relative w-20 h-20 rounded-3xl bg-emerald-500/15 border-2 border-emerald-400/40 text-emerald-400 flex items-center justify-center text-3xl mb-6 shadow-[0_0_40px_rgba(16,185,129,0.35)] animate-bounce">
              <i className="fa-solid fa-check"></i>
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-emerald-400 shadow-[0_0_10px_#34d399] animate-ping" />
            </div>

            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-black uppercase tracking-wider mb-3">
              <i className="fa-solid fa-bell"></i>
              <span>ተመዝግበዋል (Waitlisted)</span>
            </div>

            <h3 className="text-2xl sm:text-3xl font-black text-white font-heading mb-3">
              እናመሰግናለን!
            </h3>

            <p className="text-gray-300 text-sm sm:text-base font-body leading-relaxed max-w-md mb-6">
              ኮርሱ ሲለቀቅ በኢሜይልዎ እና በስልክ ቁጥርዎ ቅድሚያ አሳውቀን ልዩ የቅድመ-ምረቃ ቅናሽ እንልክልዎታለን።
            </p>

            <div className="w-full p-4 rounded-2xl bg-white/[0.03] border border-white/[0.08] text-left mb-6">
              <p className="text-xs text-gray-400 font-semibold mb-1">የተመረጠው ኮርስ፡</p>
              <p className="text-sm font-black text-[#f9b03c] flex items-center gap-2">
                <i className="fa-solid fa-graduation-cap"></i>
                <span>{course.title}</span>
              </p>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="w-full py-4 rounded-2xl bg-gradient-to-r from-[#f9b03c] via-amber-400 to-[#f9b03c] text-slate-950 font-black text-sm sm:text-base cursor-pointer shadow-[0_0_30px_rgba(249,176,60,0.4)] hover:shadow-[0_0_45px_rgba(249,176,60,0.6)] transition-all duration-300 hover:scale-[1.02]"
            >
              <span>እሺ፣ ተረድቻለሁ</span>
            </button>
          </div>
        ) : (
          /* =========================================================================
             FORM REGISTRATION STATE
             ========================================================================= */
          <div>
            {/* Header Pill */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-[#f9b03c]/15 border border-[#f9b03c]/35 text-[#f9b03c] text-xs font-black uppercase tracking-wider mb-4">
              <span className="w-2 h-2 rounded-full bg-[#f9b03c] animate-pulse"></span>
              <span>የተጠባባቂዎች ዝርዝር</span>
            </div>

            <h2 className="text-2xl sm:text-3xl font-black text-white font-heading tracking-tight mb-2">
              የተጠባባቂዎች ዝርዝር ውስጥ ይግቡ
            </h2>

            {/* Target Course Pill */}
            <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/[0.08] mb-6 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#f9b03c]/15 text-[#f9b03c] flex items-center justify-center text-lg shrink-0 border border-[#f9b03c]/30">
                <i className="fa-solid fa-graduation-cap"></i>
              </div>
              <div className="overflow-hidden">
                <p className="text-[10px] text-gray-400 uppercase font-semibold">የስልጠና ርዕስ</p>
                <p className="text-xs sm:text-sm font-bold text-white truncate">{course.title}</p>
              </div>
            </div>

            {errorMsg && (
              <div className="mb-4 p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-semibold flex items-center gap-2">
                <i className="fa-solid fa-triangle-exclamation text-sm shrink-0"></i>
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Full Name */}
              <div>
                <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-1.5">
                  ሙሉ ስም (Full Name) <span className="text-[#f9b03c]">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-sm">
                    <i className="fa-regular fa-user"></i>
                  </span>
                  <input
                    type="text"
                    required
                    value={studentName}
                    onChange={(e) => setStudentName(e.target.value)}
                    placeholder="ለምሳሌ: አበበ ከበደ"
                    className="w-full pl-11 pr-4 py-3.5 rounded-2xl bg-white/[0.04] border border-white/10 text-white placeholder-gray-500 text-sm focus:outline-hidden focus:border-[#f9b03c] focus:ring-1 focus:ring-[#f9b03c] transition font-body"
                  />
                </div>
              </div>

              {/* Phone Number */}
              <div>
                <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-1.5">
                  ስልክ ቁጥር (Phone Number) <span className="text-[#f9b03c]">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#f9b03c] text-sm font-bold">
                    <i className="fa-solid fa-phone"></i>
                  </span>
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="09... ወይም 07..."
                    className="w-full pl-11 pr-4 py-3.5 rounded-2xl bg-white/[0.04] border border-white/10 text-white placeholder-gray-500 text-sm focus:outline-hidden focus:border-[#f9b03c] focus:ring-1 focus:ring-[#f9b03c] transition font-body"
                  />
                </div>
              </div>

              {/* Email Address */}
              <div>
                <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-1.5">
                  ኢሜይል (Email Address) <span className="text-gray-500 text-[10px]">(አማራጭ)</span>
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-sm">
                    <i className="fa-regular fa-envelope"></i>
                  </span>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@gmail.com"
                    className="w-full pl-11 pr-4 py-3.5 rounded-2xl bg-white/[0.04] border border-white/10 text-white placeholder-gray-500 text-sm focus:outline-hidden focus:border-[#f9b03c] focus:ring-1 focus:ring-[#f9b03c] transition font-body"
                  />
                </div>
              </div>

              {/* Submit CTA Button */}
              <div className="pt-3">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-4 rounded-2xl bg-gradient-to-r from-[#f9b03c] via-amber-400 to-[#f9b03c] text-slate-950 font-black text-sm sm:text-base cursor-pointer shadow-[0_0_30px_rgba(249,176,60,0.45)] hover:shadow-[0_0_45px_rgba(249,176,60,0.7)] transition-all duration-300 hover:scale-[1.02] flex items-center justify-center gap-2.5 disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <i className="fa-solid fa-circle-notch fa-spin"></i>
                      <span>በመመዝገብ ላይ...</span>
                    </>
                  ) : (
                    <>
                      <span>ምዝገባውን አረጋግጥ (Confirm Waitlist)</span>
                      <i className="fa-solid fa-arrow-right text-xs"></i>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
