'use client';
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { 
  generateReferralLink, 
  getReferralShareData, 
  shareReferralLinkNative,
  REFERRAL_MILESTONES 
} from '@/lib/referralTrackingService';

interface StudentReferralSectionProps {
  courses?: any[];
  onCourseUnlocked?: (courseId: string) => void;
}

export default function StudentReferralSection({ courses = [], onCourseUnlocked }: StudentReferralSectionProps) {
  const { user } = useAuth();
  const [stats, setStats] = useState<{
    referralCount: number;
    milestones: {
      freeCourseUnlocked: boolean;
      mentorshipUnlocked: boolean;
      freeCourseClaimed: boolean;
      mentorshipClaimed: boolean;
      progressToFreeCourse: number;
      progressToMentorship: number;
    };
    referredFriends: Array<{
      id: string;
      name: string;
      email: string;
      createdAt: string;
      status: string;
    }>;
  }>({
    referralCount: 0,
    milestones: {
      freeCourseUnlocked: false,
      mentorshipUnlocked: false,
      freeCourseClaimed: false,
      mentorshipClaimed: false,
      progressToFreeCourse: 0,
      progressToMentorship: 0
    },
    referredFriends: []
  });

  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [isClaimModalOpen, setIsClaimModalOpen] = useState(false);
  const [claimType, setClaimType] = useState<'free_course' | 'mentorship'>('free_course');
  const [selectedCourseId, setSelectedCourseId] = useState('');
  const [mentorshipPhone, setMentorshipPhone] = useState('');
  const [mentorshipNotes, setMentorshipNotes] = useState('');
  const [claimLoading, setClaimLoading] = useState(false);
  const [claimSuccessMsg, setClaimSuccessMsg] = useState('');
  const [claimError, setClaimError] = useState('');

  const uid = user?.uid || '';
  const userName = user?.displayName || user?.email?.split('@')[0] || '';
  const referralLink = uid ? generateReferralLink(uid) : 'https://www.tsehaycampus.com';
  const shareData = uid ? getReferralShareData(uid, userName) : null;

  // 1. Fetch Referral Stats
  const fetchStats = async () => {
    if (!uid) return;
    try {
      const res = await fetch(`/api/referrals/stats?uid=${encodeURIComponent(uid)}`);
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setStats(data);
        }
      }
    } catch (err) {
      console.warn('Error fetching referral stats:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, [uid]);

  // 2. Copy Link Handler
  const handleCopyLink = async () => {
    if (!referralLink) return;
    try {
      await navigator.clipboard.writeText(referralLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (e) {
      const input = document.getElementById('referral-link-input') as HTMLInputElement;
      if (input) {
        input.select();
        document.execCommand('copy');
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
      }
    }
  };

  // 3. Web Share API Handler
  const handleNativeShare = async () => {
    if (!uid) return;
    const shared = await shareReferralLinkNative(uid, userName);
    if (!shared && shareData?.telegramUrl) {
      window.open(shareData.telegramUrl, '_blank');
    }
  };

  // 4. Claim Reward Handler
  const handleClaimReward = async () => {
    setClaimError('');
    setClaimSuccessMsg('');

    if (claimType === 'free_course' && !selectedCourseId) {
      setClaimError('እባክዎ መውሰድ የሚፈልጉትን ነፃ ኮርስ ይምረጡ።');
      return;
    }

    setClaimLoading(true);
    try {
      const selectedCourse = courses.find(c => c.id === selectedCourseId);
      const res = await fetch('/api/referrals/claim-reward', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          uid,
          rewardType: claimType,
          courseId: selectedCourseId,
          courseTitle: selectedCourse?.title || 'Tsehay Campus Course',
          phone: mentorshipPhone,
          notes: mentorshipNotes
        })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setClaimSuccessMsg(data.message || 'ሽልማትዎ በተሳካ ሁኔታ ተጠናቋል!');
        if (claimType === 'free_course' && selectedCourseId && onCourseUnlocked) {
          onCourseUnlocked(selectedCourseId);
        }
        await fetchStats();
        setTimeout(() => {
          setIsClaimModalOpen(false);
          setClaimSuccessMsg('');
        }, 2200);
      } else {
        setClaimError(data.error || 'ሽልማቱን መቀበል አልተቻለም።');
      }
    } catch (err: any) {
      setClaimError('የኔትወርክ ችግር አጋጥሟል። እባክዎ በድጋሚ ይሞክሩ።');
    } finally {
      setClaimLoading(false);
    }
  };

  const referralCount = stats.referralCount;
  const is5Reached = referralCount >= 5 || stats.milestones.freeCourseUnlocked;
  const is10Reached = referralCount >= 10 || stats.milestones.mentorshipUnlocked;

  return (
    <div className="space-y-8 max-w-6xl mx-auto animate-in fade-in duration-300">
      
      {/* 🌟 1. Flagship Hero Glassmorphism Referral Card */}
      <div 
        className="rounded-3xl sm:rounded-[2.5rem] p-6 sm:p-10 relative overflow-hidden text-white"
        style={{
          background: 'rgba(10, 16, 30, 0.75)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          border: '1px solid rgba(249, 176, 60, 0.4)',
          boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.7), 0 0 40px rgba(249, 176, 60, 0.15)'
        }}
      >
        {/* Ambient Golden Radial Glows */}
        <div className="absolute -top-24 -right-24 w-80 h-80 bg-[#f9b03c]/20 rounded-full blur-3xl pointer-events-none animate-pulse" />
        <div className="absolute -bottom-20 -left-20 w-72 h-72 bg-blue-600/15 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10">
          
          {/* Header Badge */}
          <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
            <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#f9b03c]/15 border border-[#f9b03c]/40 text-[#f9b03c] text-xs font-black tracking-wide">
              <span className="w-2 h-2 rounded-full bg-[#f9b03c] animate-ping" />
              <span>Tsehay Campus Growth Program • የፀሐይ ካምፓስ አጋርነት</span>
            </span>

            <div className="flex items-center gap-2 bg-white/5 border border-white/10 px-3.5 py-1.5 rounded-full text-xs font-bold text-slate-300">
              <i className="fa-solid fa-users text-[#f9b03c]"></i>
              <span>የጋበዟቸው ተማሪዎች፦ <strong className="text-[#f9b03c] font-black text-sm">{referralCount}</strong></span>
            </div>
          </div>

          {/* Headline & Subtitle */}
          <div className="max-w-3xl mb-8 space-y-3">
            <h2 className="text-2xl sm:text-4xl font-black font-heading tracking-tight leading-snug">
              ይህን ፕላትፎርም ለጓደኛዎ በማጋራት <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#f9b03c] via-amber-300 to-yellow-400">ልዩ ሽልማቶችን</span> ያግኙ!
            </h2>
            <p className="text-slate-300 text-xs sm:text-sm md:text-base leading-relaxed font-body">
              የግል ሪፈራል ሊንክዎን ለጓደኞችዎ፣ በቴሌግራም ግሩፖች ወይም በሶሻል ሚዲያ ያጋሩ። ጓደኞችዎ ሲመዘገቡ ነፃ ፕሪሚየም ኮርሶችን እና ከኢዮብ ሳህሌ ጋር የ 1-on-1 የግል ማማከር እድል ያሸንፉ!
            </p>
          </div>

          {/* 🌟 2. Rewards Milestones Grid (Tsehay Campus Cards) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 mb-8">
            
            {/* Milestone 1: 5 Invites = 1 Free Course */}
            <div 
              className={`p-5 sm:p-6 rounded-2xl sm:rounded-3xl border transition-all duration-300 relative overflow-hidden ${
                is5Reached 
                  ? 'bg-gradient-to-br from-amber-500/20 via-[#f9b03c]/10 to-transparent border-[#f9b03c] shadow-[0_0_30px_rgba(249,176,60,0.25)]' 
                  : 'bg-white/5 border-white/10 hover:border-white/20'
              }`}
            >
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex items-center gap-3">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-xl font-black shrink-0 ${
                    is5Reached ? 'bg-[#f9b03c] text-slate-950 shadow-md' : 'bg-white/10 text-slate-400'
                  }`}>
                    <i className="fa-solid fa-gift"></i>
                  </div>
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-wider text-[#f9b03c]">ደረጃ 1 (Milestone 1)</span>
                    <h3 className="text-base sm:text-lg font-black text-white font-heading">
                      5 Invites = 1 ነፃ ኮርስ (1 Free Course)
                    </h3>
                  </div>
                </div>

                {is5Reached ? (
                  <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-black flex items-center gap-1.5">
                    <i className="fa-solid fa-circle-check"></i> ተከፍቷል
                  </span>
                ) : (
                  <span className="px-2.5 py-1 rounded-full bg-white/10 text-slate-400 text-[11px] font-bold">
                    {referralCount}/5 የቀሩት: {Math.max(0, 5 - referralCount)}
                  </span>
                )}
              </div>

              <p className="text-xs text-slate-300 leading-relaxed mb-4">
                5 ጓደኞችዎ በሊንክዎ ሲመዘገቡ በፕላትፎርሙ ላይ ያለውን ማንኛውንም 1 ፕሪሚየም ኮርስ ሙሉ ለሙሉ በነፃ ይወስዳሉ።
              </p>

              {is5Reached ? (
                <button
                  type="button"
                  onClick={() => {
                    setClaimType('free_course');
                    setIsClaimModalOpen(true);
                  }}
                  className="w-full py-2.5 rounded-xl bg-gradient-to-r from-[#f9b03c] to-amber-400 text-slate-950 font-black text-xs transition shadow-md hover:brightness-110 flex items-center justify-center gap-2 cursor-pointer active:scale-98"
                >
                  <i className="fa-solid fa-graduation-cap"></i>
                  <span>{stats.milestones.freeCourseClaimed ? 'ሌላ ኮርስ ይምረጡ (Claim Again)' : '🎁 ነፃ ኮርስዎን ይውሰዱ (Claim Free Course)'}</span>
                </button>
              ) : (
                <div className="w-full bg-white/10 rounded-full h-2 overflow-hidden">
                  <div 
                    className="bg-gradient-to-r from-amber-500 to-[#f9b03c] h-full rounded-full transition-all duration-700"
                    style={{ width: `${Math.min(100, Math.round((referralCount / 5) * 100))}%` }}
                  />
                </div>
              )}
            </div>

            {/* Milestone 2: 10 Invites = 1-on-1 Mentorship */}
            <div 
              className={`p-5 sm:p-6 rounded-2xl sm:rounded-3xl border transition-all duration-300 relative overflow-hidden ${
                is10Reached 
                  ? 'bg-gradient-to-br from-blue-600/25 via-purple-600/15 to-transparent border-blue-400 shadow-[0_0_30px_rgba(59,130,246,0.25)]' 
                  : 'bg-white/5 border-white/10 hover:border-white/20'
              }`}
            >
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex items-center gap-3">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-xl font-black shrink-0 ${
                    is10Reached ? 'bg-blue-500 text-white shadow-md' : 'bg-white/10 text-slate-400'
                  }`}>
                    <i className="fa-solid fa-user-tie"></i>
                  </div>
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-wider text-blue-400">ደረጃ 2 (Milestone 2)</span>
                    <h3 className="text-base sm:text-lg font-black text-white font-heading">
                      10 Invites = ነፃ የግል ማማከር (1-on-1 Mentorship)
                    </h3>
                  </div>
                </div>

                {is10Reached ? (
                  <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-black flex items-center gap-1.5">
                    <i className="fa-solid fa-circle-check"></i> ተከፍቷል
                  </span>
                ) : (
                  <span className="px-2.5 py-1 rounded-full bg-white/10 text-slate-400 text-[11px] font-bold">
                    {referralCount}/10 የቀሩት: {Math.max(0, 10 - referralCount)}
                  </span>
                )}
              </div>

              <p className="text-xs text-slate-300 leading-relaxed mb-4">
                10 ጓደኞችዎ ሲመዘገቡ ከኢዮብ ሳህሌ ጋር የ 1 ሰዓት የቀጥታ የቢዝነስ፣ የዲጂታል ገቢ እና የዩቲዩብ የግል ማማከር (Mentorship) ያገኛሉ።
              </p>

              {is10Reached ? (
                <button
                  type="button"
                  onClick={() => {
                    setClaimType('mentorship');
                    setIsClaimModalOpen(true);
                  }}
                  className="w-full py-2.5 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-black text-xs transition shadow-md hover:brightness-110 flex items-center justify-center gap-2 cursor-pointer active:scale-98"
                >
                  <i className="fa-solid fa-calendar-check"></i>
                  <span>{stats.milestones.mentorshipClaimed ? 'ቀጠሮዎን እንደገና ያረጋግጡ' : '🚀 የግል ማማከር ቀጠሮ ያስይዙ (Book Mentorship)'}</span>
                </button>
              ) : (
                <div className="w-full bg-white/10 rounded-full h-2 overflow-hidden">
                  <div 
                    className="bg-gradient-to-r from-blue-500 to-indigo-500 h-full rounded-full transition-all duration-700"
                    style={{ width: `${Math.min(100, Math.round((referralCount / 10) * 100))}%` }}
                  />
                </div>
              )}
            </div>

          </div>

          {/* 🌟 3. Interactive Progress Track (Overall 0 - 10 Invites) */}
          <div className="bg-white/5 border border-white/10 rounded-2xl sm:rounded-3xl p-5 mb-8">
            <div className="flex justify-between items-center text-xs font-bold mb-2">
              <span className="text-slate-300 flex items-center gap-2">
                <i className="fa-solid fa-chart-line text-[#f9b03c]"></i>
                <span>የእርስዎ የጋባዥነት ሂደት (Progress Overview)</span>
              </span>
              <span className="text-[#f9b03c] font-mono font-black">{referralCount} / 10 ተማሪዎች</span>
            </div>

            <div className="w-full bg-black/40 rounded-full h-3.5 p-0.5 border border-white/10 relative overflow-hidden mb-3">
              <div 
                className="h-full bg-gradient-to-r from-amber-500 via-[#f9b03c] to-emerald-400 rounded-full transition-all duration-1000 relative shadow-[0_0_15px_rgba(249,176,60,0.5)]"
                style={{ width: `${Math.min(100, Math.round((referralCount / 10) * 100))}%` }}
              >
                <div className="absolute inset-0 bg-white/20 animate-pulse" />
              </div>
            </div>

            <div className="flex justify-between text-[11px] font-bold text-slate-400">
              <span>0 (ጅማሬ)</span>
              <span className={is5Reached ? 'text-[#f9b03c] font-black' : ''}>5 (🎁 1 ነፃ ኮርስ)</span>
              <span className={is10Reached ? 'text-emerald-400 font-black' : ''}>10 (🚀 1-on-1 Mentorship)</span>
            </div>
          </div>

          {/* 🌟 4. Personalized Referral Link & 1-Click Sharing Toolbar */}
          <div className="space-y-4">
            <label className="block text-xs font-black text-slate-300 uppercase tracking-wider">
              የእርስዎ የግል መጋበዣ ሊንክ (Your Referral Link)
            </label>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
              <div className="relative flex-1">
                <input
                  id="referral-link-input"
                  type="text"
                  readOnly
                  value={referralLink}
                  className="w-full bg-black/50 border border-white/20 rounded-2xl px-4 py-3.5 text-xs sm:text-sm font-mono text-[#f9b03c] font-bold outline-none select-all"
                />
              </div>

              <button
                type="button"
                onClick={handleCopyLink}
                className="px-6 py-3.5 rounded-2xl bg-gradient-to-r from-[#f9b03c] to-amber-400 text-slate-950 font-black text-xs sm:text-sm transition flex items-center justify-center gap-2 cursor-pointer active:scale-95 shadow-[0_0_25px_rgba(249,176,60,0.3)] hover:shadow-[0_0_35px_rgba(249,176,60,0.5)]"
              >
                <i className={`fa-solid ${copied ? 'fa-check text-slate-950' : 'fa-copy'}`}></i>
                <span>{copied ? '✓ ተገልብጧል (Copied)' : 'ሊንኩን ኮፒ አድርግ'}</span>
              </button>

              <button
                type="button"
                onClick={handleNativeShare}
                className="px-6 py-3.5 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-black text-xs sm:text-sm transition flex items-center justify-center gap-2 cursor-pointer active:scale-95 shadow-[0_0_25px_rgba(37,99,235,0.3)] border border-blue-400/40"
                title="በስልክዎ አጋራ (Share via native app)"
              >
                <i className="fa-solid fa-share-nodes"></i>
                <span>አጋራ (Share)</span>
              </button>
            </div>

            {/* Quick 1-Click Social Sharing Buttons */}
            {shareData && (
              <div className="flex flex-wrap items-center gap-2 pt-2">
                <span className="text-[11px] font-bold text-slate-400 mr-1">ፈጣን ማጋሪያ፦</span>
                
                <a
                  href={shareData.telegramUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 rounded-xl bg-[#229ED9]/20 hover:bg-[#229ED9] text-[#229ED9] hover:text-white border border-[#229ED9]/40 text-xs font-bold transition flex items-center gap-1.5"
                >
                  <i className="fa-brands fa-telegram"></i> Telegram
                </a>

                <a
                  href={shareData.whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 rounded-xl bg-[#25D366]/20 hover:bg-[#25D366] text-[#25D366] hover:text-white border border-[#25D366]/40 text-xs font-bold transition flex items-center gap-1.5"
                >
                  <i className="fa-brands fa-whatsapp"></i> WhatsApp
                </a>

                <a
                  href={shareData.facebookUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 rounded-xl bg-[#1877F2]/20 hover:bg-[#1877F2] text-[#1877F2] hover:text-white border border-[#1877F2]/40 text-xs font-bold transition flex items-center gap-1.5"
                >
                  <i className="fa-brands fa-facebook"></i> Facebook
                </a>

                <a
                  href={shareData.twitterUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white text-white hover:text-black border border-white/20 text-xs font-bold transition flex items-center gap-1.5"
                >
                  <i className="fa-brands fa-x-twitter"></i> X (Twitter)
                </a>
              </div>
            )}
          </div>

        </div>
      </div>

      {/* 🌟 5. Referred Students Activity Stream Table */}
      <div className="bg-white dark:bg-slate-800/90 rounded-3xl border border-gray-100 dark:border-slate-700/60 p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-[#f9b03c] text-sm">
              <i className="fa-solid fa-user-group"></i>
            </div>
            <div>
              <h3 className="text-base font-black text-dark dark:text-white font-heading">
                የተጋበዙ ጓደኞች ዝርዝር ({stats.referredFriends.length})
              </h3>
              <p className="text-[11px] text-gray-400">በእርስዎ ሪፈራል ሊንክ የተመዘገቡ ተማሪዎች</p>
            </div>
          </div>

          <button
            type="button"
            onClick={fetchStats}
            className="text-xs font-bold text-gray-500 hover:text-[#f9b03c] transition flex items-center gap-1 cursor-pointer"
          >
            <i className={`fa-solid fa-rotate ${loading ? 'fa-spin' : ''}`}></i>
            <span>አድስ (Refresh)</span>
          </button>
        </div>

        {stats.referredFriends.length === 0 ? (
          <div className="py-12 text-center text-gray-400 text-xs font-bold space-y-2">
            <i className="fa-solid fa-paper-plane text-3xl text-gray-300 dark:text-gray-600"></i>
            <p>እስካሁን በእርስዎ ሊንክ የተመዘገበ ተማሪ የለም።</p>
            <p className="text-[11px] text-gray-500">ሊንክዎን ለጓደኞችዎ በማጋራት የመጀመሪያውን ነፃ ኮርስ ያሸንፉ!</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-100 dark:border-slate-700 text-gray-400 text-[11px] font-black uppercase">
                  <th className="py-3 px-2">ተማሪ (Student)</th>
                  <th className="py-3 px-2">የተመዘገበበት ቀን</th>
                  <th className="py-3 px-2 text-right">ሁኔታ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-slate-700/40">
                {stats.referredFriends.map((friend, idx) => (
                  <tr key={friend.id || idx} className="text-xs">
                    <td className="py-3 px-2">
                      <div className="font-bold text-dark dark:text-white flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-amber-500 to-[#f9b03c] text-slate-950 font-black text-[10px] flex items-center justify-center">
                          {friend.name.charAt(0)}
                        </div>
                        <span>{friend.name}</span>
                      </div>
                      <span className="text-[10px] text-gray-400 font-mono ml-8">{friend.email}</span>
                    </td>
                    <td className="py-3 px-2 text-gray-500 dark:text-gray-400 text-[11px]">
                      {friend.createdAt ? new Date(friend.createdAt).toLocaleDateString() : '-'}
                    </td>
                    <td className="py-3 px-2 text-right">
                      <span className="px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 text-[10px] font-black inline-flex items-center gap-1">
                        <i className="fa-solid fa-circle-check"></i> ተመዝግቧል (+1 Invite)
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 🌟 6. Claim Reward Modal */}
      {isClaimModalOpen && (
        <div 
          className="fixed inset-0 z-[999] bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={(e) => { if (e.target === e.currentTarget && !claimLoading) setIsClaimModalOpen(false); }}
        >
          <div className="bg-white dark:bg-[#0c1222] border border-gray-200 dark:border-white/15 rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl text-dark dark:text-white space-y-6 animate-in zoom-in-95 duration-200">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-gray-100 dark:border-white/10 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-[#f9b03c]/20 text-[#f9b03c] flex items-center justify-center text-lg font-black">
                  <i className={`fa-solid ${claimType === 'free_course' ? 'fa-gift' : 'fa-user-tie'}`}></i>
                </div>
                <div>
                  <h3 className="text-lg font-black font-heading">
                    {claimType === 'free_course' ? '🎁 ነፃ ኮርስዎን ይውሰዱ' : '🚀 የ 1-on-1 Mentorship ቀጠሮ'}
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {claimType === 'free_course' ? 'በ 5 ሪፈራል የተገኘ ነፃ የኮርስ ሽልማት' : 'በ 10 ሪፈራል የተገኘ የቀጥታ ማማከር'}
                  </p>
                </div>
              </div>
              
              <button 
                type="button" 
                disabled={claimLoading} 
                onClick={() => setIsClaimModalOpen(false)}
                className="text-gray-400 hover:text-white text-xl p-1 cursor-pointer"
              >
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>

            {/* Success Message */}
            {claimSuccessMsg && (
              <div className="p-4 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-600 dark:text-emerald-400 text-xs font-bold text-center animate-in fade-in">
                {claimSuccessMsg}
              </div>
            )}

            {/* Error Message */}
            {claimError && (
              <div className="p-4 rounded-2xl bg-red-500/20 border border-red-500/40 text-red-600 dark:text-red-400 text-xs font-bold text-center animate-in fade-in">
                {claimError}
              </div>
            )}

            {/* Form Content */}
            {claimType === 'free_course' ? (
              <div className="space-y-4">
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300">
                  መውሰድ የሚፈልጉትን ኮርስ ይምረጡ፦
                </label>

                <select
                  value={selectedCourseId}
                  onChange={(e) => setSelectedCourseId(e.target.value)}
                  className="w-full bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl p-3 text-xs font-bold text-dark dark:text-white outline-none focus:border-[#f9b03c] cursor-pointer"
                >
                  <option value="">-- ኮርስ ይምረጡ (Select Course) --</option>
                  {courses.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.title} ({Number(c.price || 0).toLocaleString()} ብር ዋጋ)
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-gray-400">
                  ማስታወሻ፦ የመረጡት ኮርስ ወዲያውኑ በዳሽቦርድዎ ላይ በነፃ ይከፈታል።
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                    ስልክ ቁጥርዎ ወይም ቴሌግራም ዩዘርኔም፦
                  </label>
                  <input
                    type="text"
                    value={mentorshipPhone}
                    onChange={(e) => setMentorshipPhone(e.target.value)}
                    placeholder="0911... ወይም @yourusername"
                    className="w-full bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl p-3 text-xs text-dark dark:text-white outline-none focus:border-[#f9b03c]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                    በማማከሩ ላይ ማተኮር የሚፈልጉት ዋና ርዕስ (አማራጭ)፦
                  </label>
                  <textarea
                    rows={3}
                    value={mentorshipNotes}
                    onChange={(e) => setMentorshipNotes(e.target.value)}
                    placeholder="ለምሳሌ፡ የዩቲዩብ ቻናል እድገት፣ የዲጂታል ገቢ አጀማመር፣ የኢኮሜርስ ቢዝነስ..."
                    className="w-full bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl p-3 text-xs text-dark dark:text-white outline-none focus:border-[#f9b03c]"
                  />
                </div>
              </div>
            )}

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                disabled={claimLoading}
                onClick={() => setIsClaimModalOpen(false)}
                className="px-5 py-2.5 rounded-xl bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-gray-300 text-xs font-bold hover:bg-gray-200 dark:hover:bg-slate-700 transition cursor-pointer"
              >
                ይቅር
              </button>

              <button
                type="button"
                disabled={claimLoading || !!claimSuccessMsg}
                onClick={handleClaimReward}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#f9b03c] to-amber-400 text-slate-950 text-xs font-black transition shadow-md hover:brightness-110 flex items-center gap-2 cursor-pointer active:scale-95 disabled:opacity-50"
              >
                {claimLoading ? (
                  <i className="fa-solid fa-spinner fa-spin text-xs"></i>
                ) : (
                  <i className="fa-solid fa-circle-check text-xs"></i>
                )}
                <span>ሽልማቱን አረጋግጥ (Confirm & Unlock)</span>
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
