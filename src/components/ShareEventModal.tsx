'use client';

import React, { useState } from 'react';

interface ShareEventModalProps {
  isOpen: boolean;
  onClose: () => void;
  eventTitle: string;
  eventSlug: string;
  eventDate?: string;
  eventLocation?: string;
}

export default function ShareEventModal({
  isOpen,
  onClose,
  eventTitle,
  eventSlug,
  eventDate,
  eventLocation
}: ShareEventModalProps) {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://tsehaycampus.com';
  const shareUrl = `${baseUrl}/events/${eventSlug}`;
  const shareCaption = `ይህንን እጅግ አነቃቂ የTsehay Campus የቀጥታ ስልጠና አግኝቻለሁ! አብረን እንማር? እዚህ ይመዝገቡ👇\n\n📌 ${eventTitle}\n📅 ቀን፡ ${eventDate || 'በቅርቡ'}\n📍 ቦታ፡ ${eventLocation || 'Addis Ababa'}\n\n👉 `;

  const fullShareText = `${shareCaption}${shareUrl}`;

  const handleCopy = () => {
    if (typeof window !== 'undefined') {
      navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const handleNativeShare = async () => {
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: eventTitle,
          text: shareCaption,
          url: shareUrl
        });
      } catch (err) {
        console.warn('Native share dismissed or failed:', err);
      }
    } else {
      handleCopy();
    }
  };

  // Social Share URL Links
  const socialChannels = [
    {
      name: 'Telegram',
      icon: 'fa-brands fa-telegram',
      color: 'bg-[#24A1DE]/20 hover:bg-[#24A1DE] text-[#24A1DE] hover:text-white border-[#24A1DE]/40 shadow-[0_0_15px_rgba(36,161,222,0.2)]',
      url: `https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(shareCaption)}`
    },
    {
      name: 'WhatsApp',
      icon: 'fa-brands fa-whatsapp',
      color: 'bg-[#25D366]/20 hover:bg-[#25D366] text-[#25D366] hover:text-white border-[#25D366]/40 shadow-[0_0_15px_rgba(37,211,102,0.2)]',
      url: `https://api.whatsapp.com/send?text=${encodeURIComponent(fullShareText)}`
    },
    {
      name: 'Facebook',
      icon: 'fa-brands fa-facebook-f',
      color: 'bg-[#1877F2]/20 hover:bg-[#1877F2] text-[#1877F2] hover:text-white border-[#1877F2]/40 shadow-[0_0_15px_rgba(24,119,242,0.2)]',
      url: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`
    },
    {
      name: 'LinkedIn',
      icon: 'fa-brands fa-linkedin-in',
      color: 'bg-[#0A66C2]/20 hover:bg-[#0A66C2] text-[#0A66C2] hover:text-white border-[#0A66C2]/40 shadow-[0_0_15px_rgba(10,102,194,0.2)]',
      url: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`
    },
    {
      name: 'Twitter / X',
      icon: 'fa-brands fa-x-twitter',
      color: 'bg-white/10 hover:bg-white text-white hover:text-black border-white/20 shadow-[0_0_15px_rgba(255,255,255,0.2)]',
      url: `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareCaption)}&url=${encodeURIComponent(shareUrl)}`
    }
  ];

  return (
    <div 
      className="fixed inset-0 z-[999999] flex items-center justify-center p-4 bg-black/85 backdrop-blur-xl animate-in fade-in duration-200"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div 
        className="relative w-full max-w-md rounded-[2.5rem] p-6 sm:p-8 text-white animate-in zoom-in-95 duration-200"
        style={{
          background: 'rgba(12, 16, 23, 0.96)',
          backdropFilter: 'blur(30px)',
          border: '2px solid rgba(50, 104, 186, 0.4)',
          boxShadow: '0 30px 100px rgba(0,0,0,0.95), 0 0 50px rgba(50,104,186,0.25)'
        }}
      >
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-5 right-5 w-8 h-8 rounded-full bg-white/5 hover:bg-white/15 text-slate-400 hover:text-white flex items-center justify-center transition cursor-pointer border border-white/10"
        >
          <i className="fa-solid fa-xmark text-sm"></i>
        </button>

        {/* Modal Header */}
        <div className="text-center mb-6">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-[#3268ba] via-blue-500 to-indigo-600 text-white flex items-center justify-center text-2xl mx-auto mb-3 shadow-[0_0_25px_rgba(50,104,186,0.5)]">
            <i className="fa-solid fa-share-nodes"></i>
          </div>
          <h3 className="text-xl font-black font-heading text-white">ይህንን ክንውን ያጋሩ</h3>
          <p className="text-xs text-slate-400 mt-1">ለጓደኞችዎ በማጋራት አብረው እንዲማሩ ይጋብዙ!</p>
        </div>

        {/* Native Mobile Share Button (if supported) */}
        {typeof navigator !== 'undefined' && 'share' in navigator && (
          <button
            type="button"
            onClick={handleNativeShare}
            className="w-full mb-5 py-3 rounded-2xl bg-gradient-to-r from-[#3268ba] to-[#254f8e] text-white hover:from-blue-600 hover:to-indigo-700 text-xs font-black flex items-center justify-center gap-2 cursor-pointer transition shadow-[0_0_20px_rgba(50,104,186,0.35)] active:scale-98"
          >
            <i className="fa-solid fa-arrow-up-from-bracket"></i>
            <span>በስልክዎ መተግበሪያዎች አጋራ (Native Share)</span>
          </button>
        )}

        {/* Social Share Grid */}
        <div className="mb-6">
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2.5 text-center">
            በማህበራዊ ሚዲያ ይምረጡ
          </p>
          <div className="grid grid-cols-5 gap-2.5">
            {socialChannels.map((channel) => (
              <a
                key={channel.name}
                href={channel.url}
                target="_blank"
                rel="noopener noreferrer"
                className={`p-3 rounded-2xl border flex flex-col items-center justify-center gap-1.5 transition-all duration-300 active:scale-95 group ${channel.color}`}
                title={`${channel.name} ላይ አጋራ`}
              >
                <i className={`${channel.icon} text-lg group-hover:scale-110 transition-transform`}></i>
                <span className="text-[10px] font-bold truncate max-w-full">{channel.name.split(' ')[0]}</span>
              </a>
            ))}
          </div>
        </div>

        {/* Copy Link Input Box */}
        <div className="space-y-2">
          <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider block">
            የክንውኑ ቀጥታ ሊንክ (Event Link)
          </label>
          <div className="flex items-center gap-2 p-1.5 rounded-2xl bg-black/60 border border-white/15 focus-within:border-[#3268ba] transition">
            <input
              type="text"
              readOnly
              value={shareUrl}
              className="flex-1 bg-transparent px-3 py-1.5 text-xs text-slate-200 outline-none font-mono truncate"
            />
            <button
              type="button"
              onClick={handleCopy}
              className={`px-4 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 transition cursor-pointer shrink-0 active:scale-95 ${
                copied 
                  ? 'bg-emerald-500 text-slate-950 shadow-[0_0_15px_rgba(16,185,129,0.5)]' 
                  : 'bg-[#3268ba] hover:bg-blue-600 text-white shadow-[0_0_15px_rgba(50,104,186,0.4)]'
              }`}
            >
              <i className={copied ? "fa-solid fa-check" : "fa-solid fa-copy"}></i>
              <span>{copied ? 'ተገልብጧል!' : 'ኮፒ'}</span>
            </button>
          </div>
        </div>

        {/* Engaging Preview Caption Box */}
        <div className="mt-4 p-3 rounded-xl bg-white/[0.03] border border-white/[0.06] text-[11px] text-slate-400">
          <p className="font-semibold text-slate-300 mb-1">የመልዕክቱ ቅድመ-ዕይታ (Preview):</p>
          <p className="line-clamp-2 italic text-slate-400">"{shareCaption}"</p>
        </div>
      </div>
    </div>
  );
}
