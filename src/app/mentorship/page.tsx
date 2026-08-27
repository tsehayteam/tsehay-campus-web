'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { useAuth } from '@/context/AuthContext';

export default function MentorshipPage() {
  const { user } = useAuth();

  // Form State
  const [fullName, setFullName] = useState(user?.displayName || '');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState(user?.email || '');
  const [selectedTime, setSelectedTime] = useState('02:30 PM');
  const [topic, setTopic] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // 📅 Calculate Minimum Available Date (1 Week / 7 Days in the Future)
  const getMinAvailableDate = () => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return d;
  };

  const minAvailableDate = getMinAvailableDate();
  const minDateIso = minAvailableDate.toISOString().split('T')[0];

  const [selectedDate, setSelectedDate] = useState<string>(minDateIso);
  const [calendarMonth, setCalendarMonth] = useState<Date>(new Date(minAvailableDate.getFullYear(), minAvailableDate.getMonth(), 1));

  // Success Confirmation State
  const [confirmedBooking, setConfirmedBooking] = useState<{
    id: string;
    name: string;
    phone: string;
    email: string;
    date: string;
    time: string;
    topic: string;
  } | null>(null);

  // Pre-fill user data when authenticated
  useEffect(() => {
    if (user) {
      if (user.displayName && !fullName) setFullName(user.displayName);
      if (user.email && !email) setEmail(user.email);
    }
  }, [user]);

  // 🚀 Quick date chips starting strictly from 7 days out
  const quickUpcomingDates = Array.from({ length: 6 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + 7 + i);
    return {
      iso: d.toISOString().split('T')[0],
      display: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      amharicDay: ['እሁድ', 'ሰኞ', 'ማክሰኞ', 'ረቡዕ', 'ሐሙስ', 'አርብ', 'ቅዳሜ'][d.getDay()],
      rawDate: d
    };
  });

  // Generate Month Grid for Interactive Glassmorphism Calendar
  const renderCalendarDays = () => {
    const year = calendarMonth.getFullYear();
    const month = calendarMonth.getMonth();
    const firstDayIndex = new Date(year, month, 1).getDay();
    const totalDaysInMonth = new Date(year, month + 1, 0).getDate();

    const days = [];
    // Blank padding days
    for (let i = 0; i < firstDayIndex; i++) {
      days.push(<div key={`blank-${i}`} className="p-2" />);
    }

    // Actual calendar days
    for (let dayNum = 1; dayNum <= totalDaysInMonth; dayNum++) {
      const currentDayDate = new Date(year, month, dayNum);
      const isoStr = currentDayDate.toISOString().split('T')[0];
      
      // Strict 7-day future rule
      const isPastOrUnderOneWeek = currentDayDate < new Date(new Date().setHours(0,0,0,0) + 7 * 24 * 60 * 60 * 1000);
      const isSelected = selectedDate === isoStr;

      days.push(
        <button
          key={`day-${dayNum}`}
          type="button"
          disabled={isPastOrUnderOneWeek}
          onClick={() => setSelectedDate(isoStr)}
          className={`p-2 sm:p-2.5 rounded-xl text-center text-xs font-bold transition flex flex-col items-center justify-center relative ${
            isPastOrUnderOneWeek
              ? 'opacity-25 cursor-not-allowed bg-white/[0.02] text-slate-500'
              : isSelected
              ? 'bg-gradient-to-tr from-[#f9b03c] to-amber-300 text-slate-950 font-black shadow-[0_0_20px_rgba(249,176,60,0.5)] scale-105 z-10'
              : 'bg-white/5 text-slate-300 hover:bg-[#3268ba]/20 hover:border-[#3268ba]/40 border border-white/5 cursor-pointer active:scale-95'
          }`}
        >
          <span>{dayNum}</span>
          {isSelected && (
            <span className="w-1.5 h-1.5 rounded-full bg-slate-950 mt-0.5"></span>
          )}
        </button>
      );
    }
    return days;
  };

  const nextMonth = () => {
    setCalendarMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  const prevMonth = () => {
    const prev = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1, 1);
    // Don't go to past months before current min booking month
    const minMonth = new Date(minAvailableDate.getFullYear(), minAvailableDate.getMonth(), 1);
    if (prev >= minMonth) {
      setCalendarMonth(prev);
    }
  };

  const timeSlots = [
    '10:00 AM (ረፋድ)',
    '11:30 AM (እኩለ ቀን)',
    '02:30 PM (ከሰዓት)',
    '04:30 PM (አመሻሽ)',
    '08:00 PM (ምሽት)'
  ];

  const suggestionTopics = [
    'የዩቲዩብ ቻናል እድገት እና ሞኒታይዜሽን',
    'ከቻይና እቃዎችን በቀጥታ አስመጥቶ መሸጥ',
    'የዲጂታል ማርኬቲንግ እና የሽያጭ ስትራቴጂ',
    'የ AI ቴክኖሎጂዎችን ለቢዝነስ መጠቀም'
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!fullName.trim() || !phone.trim() || !email.trim()) {
      setErrorMessage('እባክዎ ሙሉ ስምዎን፣ ስልክዎን እና ኢሜይልዎን ያስገቡ።');
      return;
    }

    if (!selectedDate) {
      setErrorMessage('እባክዎ የቀጠሮ ቀን ይምረጡ።');
      return;
    }

    // Validate that selectedDate is at least 7 days ahead
    const chosen = new Date(selectedDate);
    const minD = new Date(new Date().setHours(0,0,0,0) + 7 * 24 * 60 * 60 * 1000);
    if (chosen < minD) {
      setErrorMessage('ማስታወሻ፡ የማማከር ቀጠሮዎች ቢያንስ ከአንድ ሳምንት (7 ቀናት) በኋላ ባሉት ቀናት ብቻ ክፍት ናቸው።');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const res = await fetch('/api/mentorship', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: fullName.trim(),
          phone: phone.trim(),
          email: email.trim(),
          date: selectedDate,
          time: selectedTime,
          topic: topic.trim() || 'አጠቃላይ የ 1-ለ-1 ማማከር',
          userId: user?.uid || 'guest_user'
        })
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setConfirmedBooking({
          id: data.bookingId || `MNTR-${Date.now().toString(36).toUpperCase()}`,
          name: fullName.trim(),
          phone: phone.trim(),
          email: email.trim(),
          date: selectedDate,
          time: selectedTime,
          topic: topic.trim() || 'አጠቃላይ የ 1-ለ-1 ማማከር'
        });
      } else {
        setErrorMessage(data.error || 'ቀጠሮ ማስያዝ አልተቻለም፤ እባክዎ በድጋሚ ይሞክሩ።');
      }
    } catch (err: any) {
      console.error('Booking submission error:', err);
      setErrorMessage(err?.message || 'የኔትወርክ ስህተት አጋጥሟል፤ እባክዎ እንደገና ይሞክሩ።');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#030509] text-white flex flex-col justify-between selection:bg-[#f9b03c] selection:text-black">
      <Navbar />

      <main className="flex-1 pt-28 pb-24 relative overflow-hidden">
        {/* Dynamic 3D Glowing Ambient Orbs */}
        <div className="absolute top-10 left-1/2 -translate-x-1/2 w-[800px] h-[450px] bg-[#f9b03c]/10 rounded-full blur-[180px] pointer-events-none" />
        <div className="absolute top-80 right-0 w-[500px] h-[500px] bg-[#3268ba]/15 rounded-full blur-[160px] pointer-events-none" />
        <div className="absolute bottom-20 left-0 w-[400px] h-[400px] bg-emerald-500/10 rounded-full blur-[150px] pointer-events-none" />

        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          
          {/* Header Banner */}
          <div className="text-center max-w-3xl mx-auto mb-12 sm:mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-400/10 border border-amber-400/30 text-[#f9b03c] text-xs font-black mb-4 shadow-[0_0_20px_rgba(249,176,60,0.2)]">
              <span className="w-2 h-2 rounded-full bg-[#f9b03c] animate-pulse"></span>
              <span>1-ON-1 VIP MENTORSHIP SESSION</span>
            </div>
            <h1 className="text-3xl sm:text-5xl font-black font-heading text-white tracking-tight leading-tight mb-4">
              ከአሰልጣኝ ኢዮብ ሳህሌ ጋር <br />
              <span className="bg-gradient-to-r from-[#f9b03c] via-amber-300 to-yellow-100 bg-clip-text text-transparent">
                የግል ማማከር (1-on-1 Mentorship)
              </span>
            </h1>
            <p className="text-slate-300 text-sm sm:text-base leading-relaxed max-w-2xl mx-auto">
              በዩቲዩብ እድገት፣ በዲጂታል ቢዝነስ እና በኦንላይን ንግድ ዙሪያ ቀጥታ ከኢዮብ ሳህሌ ጋር ፊት ለፊት ተገናኝተው የሚመክሩበት እና ተግባራዊ እቅድ የሚያወጡበት ልዩ እድል።
            </p>
          </div>

          {/* Main Grid: Mentor Profile (Left) + Booking Form / Success State (Right) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
            
            {/* Left Column (5 Cols): Mentor Spotlight Card */}
            <div className="lg:col-span-5 space-y-6">
              <div 
                className="rounded-[2.5rem] p-6 sm:p-8 text-white relative overflow-hidden"
                style={{
                  background: 'rgba(12, 16, 23, 0.85)',
                  backdropFilter: 'blur(25px)',
                  border: '1px solid rgba(249, 176, 60, 0.3)',
                  boxShadow: '0 30px 80px rgba(0,0,0,0.9), 0 0 40px rgba(249,176,60,0.15)'
                }}
              >
                {/* Profile Header with Eyoub Sahle Real Photo */}
                <div className="flex items-center gap-4 mb-6">
                  <div className="relative">
                    <img 
                      src="/assets/eyob_white.jpg" 
                      alt="ኢዮብ ሳህሌ (Eyoub Sahle)" 
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = '/assets/eyob_new.png';
                      }}
                      className="w-24 h-24 rounded-2xl object-cover border-2 border-[#f9b03c] shadow-[0_0_30px_rgba(249,176,60,0.4)]"
                    />
                    <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-emerald-500 border-2 border-slate-900 flex items-center justify-center text-[10px] text-white">
                      <i className="fa-solid fa-check"></i>
                    </div>
                  </div>
                  <div>
                    <h3 className="text-xl font-black font-heading text-white">ኢዮብ ሳህሌ (Eyoub Sahle)</h3>
                    <p className="text-xs text-[#f9b03c] font-bold">Founder & Lead Mentor @ Tsehay Campus</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">Top Digital Entrepreneur & Creator</p>
                  </div>
                </div>

                {/* Booking Advance Notice */}
                <div className="p-3.5 rounded-2xl bg-amber-400/10 border border-amber-400/30 mb-6 text-xs text-amber-200 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-amber-400/20 text-[#f9b03c] flex items-center justify-center text-sm shrink-0">
                    <i className="fa-solid fa-calendar-days"></i>
                  </div>
                  <div>
                    <p className="font-bold text-white">የሳምንት ቅድመ-ዝግጅት ቀጠሮ</p>
                    <p className="text-[11px] text-slate-300 mt-0.5">ቀጠሮዎች ጥልቅ ዝግጅት እንዲደረግባቸው ቢያንስ ከአንድ ሳምንት (7 ቀናት) በኋላ ባሉት ቀናት ይያዛሉ።</p>
                  </div>
                </div>

                {/* What's included in this Session */}
                <div className="space-y-3.5 pt-2 mb-6">
                  <p className="text-xs font-black uppercase tracking-wider text-slate-300">
                    በዚህ ማማከር ውስጥ ምን ያገኛሉ?
                  </p>

                  <div className="flex items-start gap-3 p-3 rounded-2xl bg-white/[0.03] border border-white/[0.06]">
                    <div className="w-8 h-8 rounded-xl bg-amber-400/15 text-[#f9b03c] flex items-center justify-center text-xs shrink-0 mt-0.5">
                      <i className="fa-solid fa-bullseye"></i>
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-white">የ 1-ለ-1 የቀጥታ ስትራቴጂ ውይይት</h4>
                      <p className="text-[11px] text-slate-400">ለእርስዎ ቢዝነስ ወይም ቻናል ብቻ የተዘጋጀ ብጁ እቅድ</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3 rounded-2xl bg-white/[0.03] border border-white/[0.06]">
                    <div className="w-8 h-8 rounded-xl bg-blue-500/15 text-blue-400 flex items-center justify-center text-xs shrink-0 mt-0.5">
                      <i className="fa-solid fa-chart-line"></i>
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-white">የኦንላይን ገቢ ማሳደጊያ ስልት</h4>
                      <p className="text-[11px] text-slate-400">በቀላሉ ተደራሽነትን እና ሽያጭን የሚያሳድጉ ሚስጥራዊ መንገዶች</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3 rounded-2xl bg-white/[0.03] border border-white/[0.06]">
                    <div className="w-8 h-8 rounded-xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center text-xs shrink-0 mt-0.5">
                      <i className="fa-solid fa-comments"></i>
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-white">ቀጥታ የጥያቄና መልስ እድል</h4>
                      <p className="text-[11px] text-slate-400">የከበዱዎትን ማንኛውንም ችግሮች በግልፅ ይጠይቁ</p>
                    </div>
                  </div>
                </div>

                {/* Direct Telegram Support note */}
                <div className="p-3.5 rounded-2xl bg-gradient-to-r from-[#3268ba]/20 to-blue-500/10 border border-[#3268ba]/30 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2.5">
                    <i className="fa-brands fa-telegram text-[#24A1DE] text-lg"></i>
                    <span className="font-semibold text-slate-300">ፈጣን ጥያቄ አለዎት?</span>
                  </div>
                  <a
                    href="https://t.me/EyoubSahle"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#f9b03c] font-black hover:underline"
                  >
                    @EyoubSahle ላይ ፃፉ
                  </a>
                </div>
              </div>
            </div>

            {/* Right Column (7 Cols): Dynamic Booking Form or Confirmed State */}
            <div className="lg:col-span-7">
              {confirmedBooking ? (
                /* 🌟 SUCCESS CONFIRMATION STATE */
                <div 
                  className="rounded-[2.5rem] p-6 sm:p-10 text-white relative overflow-hidden text-center animate-in zoom-in-95 duration-300"
                  style={{
                    background: 'rgba(12, 16, 23, 0.95)',
                    backdropFilter: 'blur(30px)',
                    border: '2px solid rgba(16, 185, 129, 0.5)',
                    boxShadow: '0 30px 100px rgba(0,0,0,0.95), 0 0 50px rgba(16, 185, 129, 0.2)'
                  }}
                >
                  <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-emerald-500 to-teal-400 text-slate-950 flex items-center justify-center text-3xl mx-auto mb-4 shadow-[0_0_30px_rgba(16,185,129,0.5)]">
                    <i className="fa-solid fa-calendar-check"></i>
                  </div>
                  <span className="inline-block px-4 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-black mb-3">
                    ቀጠሮዎ ተረጋግጧል! (CONFIRMED)
                  </span>
                  <h2 className="text-2xl sm:text-3xl font-black font-heading text-white mb-2">
                    እንኳን ደስ አለዎት {confirmedBooking.name}!
                  </h2>
                  <p className="text-slate-300 text-xs sm:text-sm leading-relaxed mb-6 max-w-md mx-auto">
                    የማማከር ቀጠሮዎ በተሳካ ሁኔታ ተመዝግቧል። አሰልጣኝ ኢዮብ ሳህሌ በቅርቡ በስልክ ቁጥርዎ ({confirmedBooking.phone}) የሚያገኝዎት ይሆናል።
                  </p>

                  {/* Summary Box */}
                  <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-5 mb-6 text-left text-xs space-y-2.5 max-w-md mx-auto">
                    <div className="flex justify-between">
                      <span className="text-slate-400">የቀጠሮ መለያ ቁጥር:</span>
                      <span className="font-mono font-black text-[#f9b03c]">{confirmedBooking.id}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">ቀን (Date):</span>
                      <span className="font-bold text-white">{confirmedBooking.date}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">ሰዓት (Time):</span>
                      <span className="font-bold text-white">{confirmedBooking.time}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">የተመረጠ ርዕስ:</span>
                      <span className="font-bold text-white truncate max-w-[200px]">{confirmedBooking.topic}</span>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-3 justify-center">
                    <Link
                      href="/dashboard"
                      className="px-6 py-3.5 rounded-xl bg-gradient-to-r from-[#f9b03c] to-amber-400 text-slate-950 font-black text-xs hover:shadow-[0_0_20px_rgba(249,176,60,0.4)] transition"
                    >
                      ወደ ተማሪ ዳሽቦርድ ሂድ
                    </Link>
                    <button
                      type="button"
                      onClick={() => setConfirmedBooking(null)}
                      className="px-6 py-3.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold text-slate-300 transition"
                    >
                      ሌላ ቀጠሮ አስይዝ
                    </button>
                  </div>
                </div>
              ) : (
                /* 📋 MENTORSHIP BOOKING FORM */
                <div 
                  className="rounded-[2.5rem] p-6 sm:p-8 lg:p-10 text-white relative overflow-hidden"
                  style={{
                    background: 'rgba(12, 16, 23, 0.9)',
                    backdropFilter: 'blur(25px)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    boxShadow: '0 30px 90px rgba(0,0,0,0.85), 0 0 50px rgba(50,104,186,0.1)'
                  }}
                >
                  <div className="flex items-center justify-between mb-6 pb-4 border-b border-white/10">
                    <div>
                      <h3 className="text-xl font-black font-heading text-white">የቀጠሮ ቅጽ (Book Your Slot)</h3>
                      <p className="text-xs text-slate-400 mt-0.5">ከአንድ ሳምንት በኋላ የሚመችዎትን ቀን እና ሰዓት ይምረጡ</p>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-[#f9b03c]/10 border border-[#f9b03c]/30 text-[#f9b03c] flex items-center justify-center text-sm font-black">
                      <i className="fa-regular fa-calendar-plus"></i>
                    </div>
                  </div>

                  {errorMessage && (
                    <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-xs text-red-300 mb-5 flex items-center gap-2">
                      <i className="fa-solid fa-triangle-exclamation"></i>
                      <span>{errorMessage}</span>
                    </div>
                  )}

                  <form onSubmit={handleSubmit} className="space-y-5">
                    
                    {/* Full Name & Phone */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-300 mb-1.5">
                          ሙሉ ስም (Full Name) *
                        </label>
                        <input
                          type="text"
                          required
                          value={fullName}
                          onChange={(e) => setFullName(e.target.value)}
                          placeholder="ለምሳሌ፡ ኢዮብ ሳህሌ (Eyoub Sahle)"
                          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-[#f9b03c] transition"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-300 mb-1.5">
                          ስልክ ቁጥር (Phone Number) *
                        </label>
                        <input
                          type="tel"
                          required
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          placeholder="ለምሳሌ፡ 0911223344 / +251 911 223 344"
                          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-[#f9b03c] transition"
                        />
                      </div>
                    </div>

                    {/* Email */}
                    <div>
                      <label className="block text-xs font-bold text-slate-300 mb-1.5">
                        ኢሜይል (Email Address) *
                      </label>
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="ለምሳሌ፡ info@tsehaycampus.com / student@gmail.com"
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-[#f9b03c] transition"
                      />
                    </div>

                    {/* 🌟 Beautiful Interactive Glassmorphism Calendar (Starts 1-Week Out) */}
                    <div className="pt-1">
                      <div className="flex items-center justify-between mb-2">
                        <label className="block text-xs font-bold text-slate-300">
                          የቀጠሮ ቀን ይምረጡ (Select Available Date) *
                        </label>
                        <span className="text-[11px] font-bold text-[#f9b03c] flex items-center gap-1">
                          <i className="fa-solid fa-lock text-[10px]"></i> ከአንድ ሳምንት በኋላ ብቻ
                        </span>
                      </div>

                      {/* Quick Date Chips (Days +7 to +12) */}
                      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 mb-3">
                        {quickUpcomingDates.map((item) => (
                          <button
                            key={item.iso}
                            type="button"
                            onClick={() => setSelectedDate(item.iso)}
                            className={`p-2 sm:p-2.5 rounded-xl border text-center transition cursor-pointer active:scale-95 ${
                              selectedDate === item.iso
                                ? 'bg-gradient-to-tr from-[#f9b03c] to-amber-300 border-[#f9b03c] text-slate-950 font-black shadow-[0_0_15px_rgba(249,176,60,0.4)]'
                                : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10'
                            }`}
                          >
                            <span className={`block text-[10px] font-black ${selectedDate === item.iso ? 'text-slate-950' : 'text-[#f9b03c]'}`}>
                              {item.amharicDay}
                            </span>
                            <span className="block text-xs font-black mt-0.5">{item.display}</span>
                          </button>
                        ))}
                      </div>

                      {/* Interactive Month Calendar Box */}
                      <div className="bg-white/[0.02] border border-white/10 rounded-2xl p-4 sm:p-5">
                        {/* Month Header Navigation */}
                        <div className="flex items-center justify-between mb-4">
                          <button
                            type="button"
                            onClick={prevMonth}
                            className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-xs text-slate-300 transition"
                          >
                            <i className="fa-solid fa-chevron-left"></i>
                          </button>

                          <span className="text-xs font-black text-white tracking-wide uppercase">
                            {calendarMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                          </span>

                          <button
                            type="button"
                            onClick={nextMonth}
                            className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-xs text-slate-300 transition"
                          >
                            <i className="fa-solid fa-chevron-right"></i>
                          </button>
                        </div>

                        {/* Weekday Labels */}
                        <div className="grid grid-cols-7 gap-1 text-center mb-2">
                          {['እሁድ', 'ሰኞ', 'ማክ', 'ረቡዕ', 'ሐሙስ', 'አርብ', 'ቅዳሜ'].map((day) => (
                            <span key={day} className="text-[10px] font-bold text-slate-400">
                              {day}
                            </span>
                          ))}
                        </div>

                        {/* Calendar Days Grid */}
                        <div className="grid grid-cols-7 gap-1">
                          {renderCalendarDays()}
                        </div>

                        {/* Selected Date Indicator */}
                        <div className="mt-3 pt-3 border-t border-white/5 flex items-center justify-between text-xs">
                          <span className="text-slate-400">የተመረጠው ቀን፡</span>
                          <span className="font-mono font-bold text-[#f9b03c] bg-amber-400/10 px-2.5 py-1 rounded-lg border border-amber-400/20">
                            {selectedDate}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Time Slot Picker */}
                    <div className="pt-1">
                      <label className="block text-xs font-bold text-slate-300 mb-1.5">
                        የሚመችዎ ሰዓት (Time Slot) *
                      </label>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {timeSlots.map((slot) => (
                          <button
                            key={slot}
                            type="button"
                            onClick={() => setSelectedTime(slot)}
                            className={`p-2.5 rounded-xl border text-center text-xs font-bold transition cursor-pointer active:scale-95 ${
                              selectedTime === slot
                                ? 'bg-[#3268ba]/30 border-[#3268ba] text-white shadow-[0_0_15px_rgba(50,104,186,0.35)]'
                                : 'bg-white/5 border-white/10 text-slate-400 hover:bg-white/10'
                            }`}
                          >
                            {slot}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Discussion Topic Textarea */}
                    <div className="pt-1">
                      <label className="block text-xs font-bold text-slate-300 mb-1.5">
                        ምን ማማከር ይፈልጋሉ? (What do you want to discuss?)
                      </label>
                      <textarea
                        rows={3}
                        value={topic}
                        onChange={(e) => setTopic(e.target.value)}
                        placeholder="ለምሳሌ፡ የዩቲዩብ ቻናል ስትራቴጂ እና የሞኒታይዜሽን እቅድ..."
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-[#f9b03c] transition"
                      />

                      {/* Suggestion Chips */}
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {suggestionTopics.map((sug) => (
                          <button
                            key={sug}
                            type="button"
                            onClick={() => setTopic(sug)}
                            className="text-[10px] px-2.5 py-1 rounded-full bg-white/5 hover:bg-white/15 border border-white/10 text-slate-300 transition cursor-pointer"
                          >
                            + {sug}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Magnetic Submit Button */}
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full btn-buy-now-vibe py-4 rounded-2xl text-sm font-black flex items-center justify-center gap-2.5 cursor-pointer active:scale-98 disabled:opacity-50 mt-4 shadow-[0_0_35px_rgba(249,176,60,0.35)] hover:shadow-[0_0_45px_rgba(249,176,60,0.5)] transition-all"
                    >
                      <i className="fa-solid fa-calendar-check text-base"></i>
                      <span>
                        {isSubmitting ? 'ቀጠሮው በመመዝገብ ላይ...' : 'ቀጠሮ ያስይዙ (Book Mentorship Session)'}
                      </span>
                    </button>

                  </form>
                </div>
              )}
            </div>

          </div>

        </div>
      </main>

      <Footer />
    </div>
  );
}
