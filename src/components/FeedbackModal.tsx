'use client';

import React, { useState, useRef, useEffect } from 'react';
import { db, storage } from '@/lib/firebase/config';
import { collection, addDoc, doc, setDoc, serverTimestamp } from 'firebase/firestore';
import DirectCameraViewfinder from '@/components/camera/DirectCameraViewfinder';

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

  // 📷 Screenshot & Camera Attachment State
  const [screenshotUrl, setScreenshotUrl] = useState<string | null>(null);
  const [isDirectCameraOpen, setIsDirectCameraOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  // 🎙️ Voice Recording State
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [voiceAudioUrl, setVoiceAudioUrl] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordingTimerRef = useRef<any>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  useEffect(() => {
    return () => {
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.stop();
      }
    };
  }, []);

  if (!isOpen) return null;

  // Handle Screenshot Upload & Compression (Canvas resize for Firestore-friendly size)
  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('እባክዎ ትክክለኛ የምስል ፋይል (PNG, JPG, WebP) ይምረጡ።');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const maxDim = 900;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxDim) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          }
        } else {
          if (height > maxDim) {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.72);
          setScreenshotUrl(compressedDataUrl);
          setError(null);
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  // Start Voice Recording
  const startVoiceRecording = async () => {
    try {
      if (!navigator?.mediaDevices?.getUserMedia) {
        setError('የእርስዎ ብሮውዘር ድምፅ መቅዳት አይደግፍም።');
        return;
      }

      setError(null);
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];

      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        stream.getTracks().forEach((track) => track.stop());
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm;codecs=opus' });
        const reader = new FileReader();
        reader.onloadend = () => {
          setVoiceAudioUrl(reader.result as string);
        };
        reader.readAsDataURL(audioBlob);
      };

      mediaRecorder.start(250);
      setIsRecording(true);
      setRecordingSeconds(0);

      recordingTimerRef.current = setInterval(() => {
        setRecordingSeconds((prev) => {
          if (prev >= 120) {
            // Auto stop at 2 minutes
            stopVoiceRecording();
            return 120;
          }
          return prev + 1;
        });
      }, 1000);
    } catch (err: any) {
      console.warn('Voice record error:', err);
      setError('የማይክሮፎን ፈቃድ አልተገኘም። እባክዎ ማይክሮፎን ይፍቀዱ።');
      setIsRecording(false);
    }
  };

  // Stop Voice Recording
  const stopVoiceRecording = () => {
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
  };

  const formatSeconds = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const remainder = sec % 60;
    return `${mins.toString().padStart(2, '0')}:${remainder.toString().padStart(2, '0')}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalMsg = message.trim() || (voiceAudioUrl ? '🎙️ [የተማሪው የድምፅ አስተያየት ተያይዟል]' : '');

    if (!finalMsg && !screenshotUrl && !voiceAudioUrl) {
      setError('እባክዎ ሀሳብዎን ይፃፉ፣ ምስል ያያይዙ ወይም በድምፅ ይቅረጹ።');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    const feedbackId = `fb_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

    const feedbackPayload = {
      id: feedbackId,
      rating: Number(rating) || 5,
      type: feedbackType,
      message: finalMsg || '💬 አጠቃላይ አስተያየት',
      imageUrl: screenshotUrl || null,
      screenshotUrl: screenshotUrl || null,
      audioUrl: voiceAudioUrl || null,
      voiceNoteUrl: voiceAudioUrl || null,
      userId: user?.uid || 'guest_user',
      userName: user?.displayName || (user?.email ? user.email.split('@')[0] : 'ተማሪ'),
      userEmail: user?.email || 'student@tsehaycampus.com',
      status: 'pending',
      createdAt: serverTimestamp(),
      createdAtClient: new Date().toISOString()
    };

    try {
      // 1. Save to Firestore (both collections)
      try {
        await setDoc(doc(db, 'user_feedbacks', feedbackId), feedbackPayload, { merge: true });
        await setDoc(doc(db, 'student_feedback', feedbackId), feedbackPayload, { merge: true });
      } catch (fsErr) {
        console.warn('Direct Firestore feedback write notice:', fsErr);
      }

      // 2. Save to local storage cache
      try {
        const existing = JSON.parse(localStorage.getItem('tsehay_user_feedbacks') || '[]');
        localStorage.setItem('tsehay_user_feedbacks', JSON.stringify([feedbackPayload, ...existing]));
        window.dispatchEvent(new CustomEvent('tsehay_feedback_submitted', { detail: feedbackPayload }));
      } catch (lsErr) {}

      setIsSubmitted(true);
      setTimeout(() => {
        setIsSubmitted(false);
        setMessage('');
        setScreenshotUrl(null);
        setVoiceAudioUrl(null);
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
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/85 backdrop-blur-md transition-opacity animate-in fade-in duration-300"
        onClick={onClose}
      />

      {/* Modal Card */}
      <div className="relative w-full max-w-lg bg-[#0a0f1d]/95 border border-[#f9b03c]/35 rounded-3xl p-5 sm:p-7 shadow-[0_25px_80px_rgba(0,0,0,0.9),0_0_50px_rgba(249,176,60,0.15)] backdrop-blur-2xl z-10 animate-in zoom-in-95 duration-300 overflow-hidden my-auto">
        
        {/* Glow Effects */}
        <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-64 h-64 bg-[#f9b03c]/20 rounded-full blur-3xl pointer-events-none" />

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 sm:top-5 sm:right-5 w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white flex items-center justify-center transition-all cursor-pointer z-20 border border-white/10"
          title="ዝጋ (Close)"
        >
          <i className="fa-solid fa-xmark text-sm"></i>
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
            <div className="flex items-center gap-3.5 mb-4">
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-[#f9b03c] to-yellow-300 text-slate-950 flex items-center justify-center text-lg font-black shadow-[0_0_20px_rgba(249,176,60,0.4)] shrink-0">
                <i className="fa-solid fa-lightbulb"></i>
              </div>
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest text-[#f9b03c] block">
                  User Feedback & Suggestions
                </span>
                <h3 className="text-base sm:text-lg font-black font-heading text-white">
                  ስለ ፀሐይ ካምፓስ ምን አስተያየት አለዎት?
                </h3>
              </div>
            </div>

            {error && (
              <div className="p-3 rounded-xl bg-red-500/15 border border-red-500/30 text-xs text-red-300 mb-3 flex items-center gap-2">
                <i className="fa-solid fa-circle-exclamation text-red-400"></i>
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-3.5">
              
              {/* 1. Star Rating UI */}
              <div className="bg-white/5 border border-white/10 rounded-2xl p-3 text-center">
                <label className="block text-[11px] font-bold text-slate-300 mb-1.5">
                  አጠቃላይ እርካታዎን በኮከብ ይግለጹ (Rating)
                </label>
                <div className="flex items-center justify-center gap-1.5">
                  {[1, 2, 3, 4, 5].map((star) => {
                    const isFilled = star <= (hoverRating || rating);
                    return (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setRating(star)}
                        onMouseEnter={() => setHoverRating(star)}
                        onMouseLeave={() => setHoverRating(0)}
                        className="p-1 text-2xl transition-transform hover:scale-125 cursor-pointer focus:outline-none"
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
                <span className="text-[10px] font-black text-[#f9b03c] mt-1 block">
                  {rating === 5 ? '🌟 እጅግ በጣም ምርጥ (5/5 Excellent)' : 
                   rating === 4 ? '👍 በጣም ጥሩ (4/5 Very Good)' : 
                   rating === 3 ? '👌 ጥሩ (3/5 Good)' : 
                   rating === 2 ? '😐 መሻሻል አለበት (2/5 Needs Improvement)' : 
                   '👎 ደካማ (1/5 Poor)'}
                </span>
              </div>

              {/* 2. Feedback Type Selection */}
              <div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                  {[
                    { id: 'course', label: '🎓 ኮርስ' },
                    { id: 'bug', label: '🐛 ችግር / Bug' },
                    { id: 'idea', label: '💡 አዲስ ሀሳብ' },
                    { id: 'general', label: '💬 አጠቃላይ' },
                  ].map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setFeedbackType(item.id as any)}
                      className={`p-2 rounded-xl border text-[11px] font-bold transition text-center cursor-pointer active:scale-95 ${
                        feedbackType === item.id
                          ? 'bg-[#f9b03c]/20 border-[#f9b03c] text-white shadow-sm font-black'
                          : 'bg-white/5 border-white/10 text-slate-400 hover:text-white hover:bg-white/10'
                      }`}
                    >
                      <span>{item.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* 3. Textarea Message */}
              <div>
                <textarea
                  rows={3}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="እባክዎ ሀሳብዎን እዚህ ይጻፉ... (ወይም ከስር በድምፅ/በምስል ያጋሩን)"
                  className="w-full bg-white/5 border border-white/10 rounded-2xl p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#f9b03c] transition resize-none"
                />
              </div>

              {/* 4. 🎙️ Voice, 📸 Camera & 🖼️ Screenshot Attachment Controls */}
              <div className="space-y-1.5">
                <label className="block text-[11px] font-bold text-slate-300">
                  ማስረጃ ወይም ማብራሪያ ያያይዙ (ካሜራ፣ ስክሪንሾት ወይም ድምፅ)
                </label>

                {/* Hidden Inputs */}
                <input 
                  ref={cameraInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handleImageFileChange}
                  className="hidden"
                />
                <input 
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageFileChange}
                  className="hidden"
                />

                <div className="grid grid-cols-3 gap-1.5">
                  {/* Camera Direct Capture Trigger */}
                  <button
                    type="button"
                    onClick={() => setIsDirectCameraOpen(true)}
                    className={`p-2 sm:p-2.5 rounded-xl border flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-1.5 text-[11px] font-bold transition cursor-pointer active:scale-95 text-center ${
                      screenshotUrl 
                        ? 'bg-amber-500/15 border-[#f9b03c]/40 text-[#f9b03c]'
                        : 'bg-white/5 hover:bg-white/10 border-white/10 text-slate-300 hover:text-white'
                    }`}
                    title="በቀጥታ በመሳሪያዎ ካሜራ ፎቶ አንሳ"
                  >
                    <i className="fa-solid fa-camera text-[#f9b03c] text-sm"></i>
                    <span className="truncate">በካሜራ አንሳ</span>
                  </button>

                  {/* Screenshot / File Trigger */}
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className={`p-2 sm:p-2.5 rounded-xl border flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-1.5 text-[11px] font-bold transition cursor-pointer active:scale-95 text-center ${
                      screenshotUrl 
                        ? 'bg-blue-500/15 border-blue-400 text-blue-300'
                        : 'bg-white/5 hover:bg-white/10 border-white/10 text-slate-300 hover:text-white'
                    }`}
                    title="ከጋለሪ ወይም ከፋይል ስክሪንሾት ይምረጡ"
                  >
                    <i className="fa-solid fa-image text-blue-400 text-sm"></i>
                    <span className="truncate">ስክሪንሾት</span>
                  </button>

                  {/* Voice Record Trigger */}
                  {isRecording ? (
                    <button
                      type="button"
                      onClick={stopVoiceRecording}
                      className="p-2 sm:p-2.5 rounded-xl bg-red-500 text-white font-black text-[11px] flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-1.5 animate-pulse cursor-pointer shadow-md text-center"
                    >
                      <span className="w-2 h-2 rounded-full bg-white animate-ping"></span>
                      <span className="truncate">አቁም ({formatSeconds(recordingSeconds)})</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={startVoiceRecording}
                      className={`p-2 sm:p-2.5 rounded-xl border flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-1.5 text-[11px] font-bold transition cursor-pointer active:scale-95 text-center ${
                        voiceAudioUrl
                          ? 'bg-emerald-500/15 border-emerald-400 text-emerald-300'
                          : 'bg-white/5 hover:bg-white/10 border-white/10 text-slate-300 hover:text-white'
                      }`}
                      title="በድምፅ አስተያየት ይቅረጹ"
                    >
                      <i className="fa-solid fa-microphone text-emerald-400 text-sm"></i>
                      <span className="truncate">{voiceAudioUrl ? 'ድምፅ ተቀርጿል' : 'በድምፅ'}</span>
                    </button>
                  )}
                </div>
              </div>

              {/* 📷 Attached Screenshot Preview */}
              {screenshotUrl && (
                <div className="relative p-2 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <img src={screenshotUrl} alt="Attached Screenshot" className="w-12 h-12 object-cover rounded-xl border border-white/20" />
                    <span className="text-[11px] font-bold text-slate-200">የተያያዘ ስክሪንሾት</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setScreenshotUrl(null)}
                    className="w-7 h-7 rounded-full bg-red-500/20 hover:bg-red-500 text-red-400 hover:text-white flex items-center justify-center text-xs transition cursor-pointer"
                    title="ምስሉን አስወግድ"
                  >
                    ✕
                  </button>
                </div>
              )}

              {/* 🎙️ Attached Voice Audio Player */}
              {voiceAudioUrl && (
                <div className="p-3 rounded-2xl bg-amber-500/10 border border-[#f9b03c]/30 flex flex-col gap-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-black text-[#f9b03c] flex items-center gap-1.5">
                      <i className="fa-solid fa-waveform-lines"></i>
                      <span>የተቀዳ የድምፅ መልዕክት ({formatSeconds(recordingSeconds)})</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => setVoiceAudioUrl(null)}
                      className="text-[10px] text-red-400 hover:text-red-300 font-bold cursor-pointer"
                    >
                      አስወግድ ✕
                    </button>
                  </div>
                  <audio controls src={voiceAudioUrl} className="w-full h-8 rounded-lg" />
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isSubmitting || (!message.trim() && !screenshotUrl && !voiceAudioUrl)}
                className="w-full btn-buy-now-vibe py-3.5 rounded-2xl text-xs sm:text-sm font-black flex items-center justify-center gap-2 cursor-pointer active:scale-98 shadow-[0_0_25px_rgba(249,176,60,0.35)] text-slate-950 disabled:opacity-50"
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
      {/* Direct Device Camera Viewfinder */}
      <DirectCameraViewfinder
        isOpen={isDirectCameraOpen}
        onClose={() => setIsDirectCameraOpen(false)}
        title="አስተያየት • የቀጥታ ካሜራ"
        onCapture={(file, previewUrl) => {
          setScreenshotUrl(previewUrl);
        }}
      />
    </div>
  );
}
