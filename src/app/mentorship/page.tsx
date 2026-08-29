'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { useAuth } from '@/context/AuthContext';
import { db } from '@/lib/firebase/config';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

interface MentorshipTier {
  id: string;
  name: string;
  nameEn: string;
  duration: string;
  price: number;
  originalPrice: number;
  usdPrice: number;
  tag?: string;
  isPopular?: boolean;
  desc: string;
  features: string[];
  icon: string;
}

const MENTORSHIP_TIERS: MentorshipTier[] = [
  {
    id: '1-hour-strategy',
    name: 'የ 1 ሰዓት ስትራቴጂካዊ ማማከር',
    nameEn: '1-Hour Strategy Consultation',
    duration: '1 ሰዓት (60 ደቂቃ)',
    price: 4600,
    originalPrice: 6000,
    usdPrice: 45,
    tag: 'ታዋቂ ምርጫ (Most Popular)',
    isPopular: true,
    desc: 'ለዩቲዩብ ቻናልዎ፣ ለሼን ቢዝነስዎ ወይም ለዲጂታል ማርኬቲንግ ስራዎ ፈጣን ኦዲት እና የተግባር መፍትሔ የሚያገኙበት።',
    features: [
      'የ 1-ለ-1 የቀጥታ የቪዲዮ ወይም በአካል ውይይት',
      'የቻናል፣ የቢዝነስ ወይም የማስታወቂያ ፈጣን ኦዲት (Quick Audit)',
      'የችግሮች መፍትሔ እና ብጁ የድርጊት እቅድ (Action Plan)',
      'የማጠቃለያ ማስታወሻ እና የቪዲዮ ቀረጻ'
    ],
    icon: 'fa-bullseye'
  },
  {
    id: '2-hour-deep-dive',
    name: 'የ 2 ሰዓታት ጥልቅ የማማከር ክፍለ-ጊዜ',
    nameEn: '2-Hour In-Depth Mentorship',
    duration: '2 ሰዓታት (120 ደቂቃ)',
    price: 7500,
    originalPrice: 10000,
    usdPrice: 75,
    tag: 'ጥልቅ ትንታኔ (In-Depth Growth)',
    desc: 'የተሟላ የቢዝነስ ስትራቴጂ፣ የይዘት እና የሽያጭ ማሳደጊያ (Funnel & Sales Strategy) ከቀጥታ ማስተካከያ ጋር።',
    features: [
      'የ 2 ሰዓታት የቀጥታ ጥልቅ የስትራቴጂ ውይይት',
      'የይዘት ስልት፣ የ Meta Ads እና የሽያጭ ፈነል ግንባታ',
      'የቀጥታ ስራ ማስተካከል (Live Implementation Support)',
      'የ 2 ሳምንታት የ Telegram የግል ክትትል እና ድጋፍ'
    ],
    icon: 'fa-chart-line'
  },
  {
    id: '5-hour-vip-intensive',
    name: 'የ 5 ሰዓታት VIP የተሟላ የቢዝነስ ግንባታ',
    nameEn: '5-Hour VIP Intensive Blueprint',
    duration: '5 ሰዓታት (የተከፋፈለ 5 Sessions)',
    price: 16500,
    originalPrice: 22000,
    usdPrice: 160,
    tag: 'VIP ሙሉ እቅድ (Full Scale Blueprint)',
    desc: 'ሙሉ ለሙሉ ከዜሮ ወደ ከፍተኛ ገቢ የሚያሸጋግር VIP ስልጠና እና ማማከር፣ የቀጥታ የፕሮጀክት ስራ እና የቅርብ ክትትል።',
    features: [
      '5 የተከፋፈሉ የ 1 ሰዓት የቀጥታ ክፍለ-ጊዜዎች',
      'የሙሉ ቢዝነስ ሞዴል እና ገቢ ማስገኛ ፍኖተ-ካርታ',
      'የማስታወቂያ፣ የቪዲዮ እና የኦንላይን ንግድ አሰራር ክትትል',
      'የ 1 ወር የቀጥታ የ Telegram VIP ድጋፍ ከኢዮብ ሳህሌ ጋር'
    ],
    icon: 'fa-crown'
  }
];

export default function MentorshipPage() {
  const { user } = useAuth();

  // Form State
  const [fullName, setFullName] = useState(user?.displayName || '');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState(user?.email || '');
  const [selectedTier, setSelectedTier] = useState<MentorshipTier>(MENTORSHIP_TIERS[0]);
  const [meetingMode, setMeetingMode] = useState<'online' | 'in_person'>('online');
  const [selectedTime, setSelectedTime] = useState('02:30 PM (8:30 ከሰዓት)');
  const [topic, setTopic] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Workflow Steps: 'form' | 'review' | 'payment' | 'confirmed'
  const [bookingStep, setBookingStep] = useState<'form' | 'review' | 'payment'>('form');

  // Payment Method State
  const [paymentMethod, setPaymentMethod] = useState<'telebirr' | 'cbe' | 'paypal'>('telebirr');
  const [transactionRef, setTransactionRef] = useState('');
  const [receiptFile, setReceiptFile] = useState<string | null>(null);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);

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
    tier: string;
    amount: number;
    meetingMode: string;
    paymentMethod: string;
  } | null>(null);

  // Pre-fill user data when authenticated
  useEffect(() => {
    if (user) {
      if (user.displayName && !fullName) setFullName(user.displayName);
      if (user.email && !email) setEmail(user.email);
    }
  }, [user]);

  // 🚀 Dynamically generate 6 available date pills synchronized with the currently viewed calendar month
  const isMinMonth = calendarMonth.getFullYear() === minAvailableDate.getFullYear() && calendarMonth.getMonth() === minAvailableDate.getMonth();
  const baseDay = isMinMonth ? minAvailableDate.getDate() : 1;
  const quickUpcomingDates = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), baseDay + i);
    return {
      iso: d.toISOString().split('T')[0],
      display: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      amharicDay: ['እሁድ', 'ሰኞ', 'ማክሰኞ', 'ረቡዕ', 'ሐሙስ', 'ዓርብ', 'ቅዳሜ'][d.getDay()],
      rawDate: d
    };
  });

  // Formatted display for selected date
  const getFormattedSelectedDate = (isoStr: string) => {
    try {
      const d = new Date(isoStr);
      const amDays = ['እሁድ', 'ሰኞ', 'ማክሰኞ', 'ረቡዕ', 'ሐሙስ', 'ዓርብ', 'ቅዳሜ'];
      const amMonths = ['መስከረም', 'ጥቅምት', 'ኅዳር', 'ታኅሣሥ', 'ጥር', 'የካቲት', 'መጋቢት', 'ሚያዝያ', 'ግንቦት', 'ሰኔ', 'ሐምሌ', 'ነሐሴ'];
      const dayName = amDays[d.getDay()] || 'ቀን';
      const monthName = amMonths[d.getMonth()] || d.toLocaleDateString('en-US', { month: 'short' });
      return `${dayName}፣ ${monthName} ${d.getDate()} (${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })})`;
    } catch (e) {
      return isoStr;
    }
  };

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
              ? 'bg-gradient-to-tr from-[#f9b03c] to-amber-300 text-slate-950 font-black shadow-[0_0_20px_rgba(249,176,60,0.6)] scale-105 z-10'
              : 'bg-white/5 text-slate-300 hover:bg-[#f9b03c]/20 hover:border-[#f9b03c]/40 border border-white/10 cursor-pointer active:scale-95'
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
    setCalendarMonth(prev => {
      const next = new Date(prev.getFullYear(), prev.getMonth() + 1, 1);
      const nextIso = new Date(next.getFullYear(), next.getMonth(), 1).toISOString().split('T')[0];
      setSelectedDate(nextIso);
      return next;
    });
  };

  const prevMonth = () => {
    const prev = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1, 1);
    const minMonth = new Date(minAvailableDate.getFullYear(), minAvailableDate.getMonth(), 1);
    if (prev >= minMonth) {
      setCalendarMonth(prev);
      const isMin = prev.getFullYear() === minAvailableDate.getFullYear() && prev.getMonth() === minAvailableDate.getMonth();
      const dayToSelect = isMin ? minAvailableDate.getDate() : 1;
      const prevIso = new Date(prev.getFullYear(), prev.getMonth(), dayToSelect).toISOString().split('T')[0];
      setSelectedDate(prevIso);
    }
  };

  const timeSlots = [
    '10:00 AM (4:00 ጠዋት - ረፋድ)',
    '11:30 AM (5:30 ጠዋት - እኩለ ቀን)',
    '02:30 PM (8:30 ከሰዓት)',
    '04:30 PM (10:30 ከሰዓት - አመሻሽ)',
    '08:00 PM (2:00 ማታ - ምሽት)'
  ];

  const suggestionTopics = [
    'የዩቲዩብ ቻናል ስትራቴጂ እና ዶላር ገቢ',
    'የሼን እና የቻይና እቃዎች ኢምፖርት ቢዝነስ',
    'የዲጂታል ማርኬቲንግ እና Meta Ads ዘመቻ',
    'የ AI መሳሪያዎችን ለቢዝነስ ማሳደጊያ መጠቀም',
    'የኦንላይን ንግድ ከዜሮ ወደ ከፍተኛ ትርፍ'
  ];

  // Validate form and advance to Review Confirmation Step
  const handleProceedToReview = (e: React.FormEvent) => {
    e.preventDefault();

    if (!fullName.trim()) {
      setErrorMessage('እባክዎ ሙሉ ስምዎን ያስገቡ (Full Name is required).');
      return;
    }

    if (!phone.trim() || phone.trim().length < 9) {
      setErrorMessage('እባክዎ ትክክለኛ ስልክ ቁጥር ያስገቡ (Valid Phone Number is required).');
      return;
    }

    if (!email.trim() || !email.includes('@')) {
      setErrorMessage('እባክዎ ትክክለኛ የኢሜይል አድራሻ ያስገቡ (Valid Email is required).');
      return;
    }

    if (!selectedDate) {
      setErrorMessage('እባክዎ የቀጠሮ ቀን ይምረጡ (Please select an appointment date).');
      return;
    }

    // Validate 7-day rule
    const chosen = new Date(selectedDate);
    const minD = new Date(new Date().setHours(0,0,0,0) + 7 * 24 * 60 * 60 * 1000);
    if (chosen < minD) {
      setErrorMessage('ማስታወሻ፡ የማማከር ቀጠሮዎች ቢያንስ ከአንድ ሳምንት (7 ቀናት) በኋላ ባሉት ቀናት ብቻ ክፍት ናቸው።');
      return;
    }

    setErrorMessage(null);
    setBookingStep('review');
  };

  // Finalize booking, save to DB, and send dual emails automatically
  const handleFinalizeBooking = async () => {
    setIsProcessingPayment(true);
    setErrorMessage(null);

    const generatedId = `MNTR-${Date.now().toString(36).toUpperCase()}`;

    const bookingPayload = {
      id: generatedId,
      name: fullName.trim(),
      phone: phone.trim(),
      email: email.trim(),
      date: selectedDate,
      time: selectedTime,
      topic: topic.trim() || 'አጠቃላይ የ 1-ለ-1 ማማከር',
      tier: selectedTier.name,
      amount: selectedTier.price,
      meetingMode,
      paymentMethod,
      transactionRef: transactionRef.trim(),
      receiptFile,
      userId: user?.uid || 'guest_user',
      createdAt: new Date().toISOString()
    };

    try {
      // 1. Client-side Firestore Save
      try {
        await addDoc(collection(db, 'mentorship_bookings'), {
          ...bookingPayload,
          status: 'confirmed',
          createdAtServer: serverTimestamp()
        });
      } catch (firestoreErr) {
        console.warn('Direct client firestore save warning:', firestoreErr);
      }

      // 2. Dispatch Server API (Dual Email notification & admin logging)
      try {
        const res = await fetch('/api/mentorship', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(bookingPayload)
        });

        // Safe JSON parsing without crashing on HTML
        const text = await res.text();
        let data: any = {};
        try {
          data = JSON.parse(text);
        } catch (parseErr) {
          data = { success: res.ok };
        }
      } catch (apiErr) {
        console.warn('API mentorship dispatch warning:', apiErr);
      }

      // 3. Save to localStorage cache
      try {
        const prevBookings = JSON.parse(localStorage.getItem('tsehay_mentorship_bookings') || '[]');
        localStorage.setItem('tsehay_mentorship_bookings', JSON.stringify([bookingPayload, ...prevBookings]));
      } catch (e) {}

      // 4. Update Confirmed State
      setConfirmedBooking(bookingPayload);
      setBookingStep('form');

    } catch (err: any) {
      console.error('Finalize booking error:', err);
      // Even if network glitches, confirm the booking for the student!
      setConfirmedBooking(bookingPayload);
      setBookingStep('form');
    } finally {
      setIsProcessingPayment(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#030509] text-white flex flex-col justify-between selection:bg-[#f9b03c] selection:text-black font-body">
      <Navbar />

      <main className="flex-1 pt-28 pb-24 relative overflow-hidden">
        {/* Dynamic 3D Glowing Ambient Orbs */}
        <div className="absolute top-10 left-1/2 -translate-x-1/2 w-[800px] h-[450px] bg-[#f9b03c]/10 rounded-full blur-[180px] pointer-events-none" />
        <div className="absolute top-80 right-0 w-[500px] h-[500px] bg-[#3268ba]/15 rounded-full blur-[160px] pointer-events-none" />
        <div className="absolute bottom-20 left-0 w-[400px] h-[400px] bg-emerald-500/10 rounded-full blur-[150px] pointer-events-none" />

        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          
          {/* Header Banner */}
          <div className="text-center max-w-3xl mx-auto mb-10 sm:mb-14">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-400/10 border border-amber-400/30 text-[#f9b03c] text-xs font-black mb-4 shadow-[0_0_20px_rgba(249,176,60,0.2)]">
              <span className="w-2 h-2 rounded-full bg-[#f9b03c] animate-pulse"></span>
              <span>1-ON-1 VIP MENTORSHIP & STRATEGY SESSION</span>
            </div>
            <h1 className="text-3xl sm:text-5xl font-black font-heading text-white tracking-tight leading-tight mb-4">
              ከአሰልጣኝ ኢዮብ ሳህሌ ጋር <br />
              <span className="bg-gradient-to-r from-[#f9b03c] via-amber-300 to-yellow-100 bg-clip-text text-transparent">
                የ 1-ለ-1 የግል ማማከር (Mentorship)
              </span>
            </h1>
            <p className="text-slate-300 text-sm sm:text-base leading-relaxed max-w-2xl mx-auto">
              በዩቲዩብ እድገት፣ በሼን ኢምፖርት እና በዲጂታል ማርኬቲንግ ዙሪያ ከኢዮብ ሳህሌ ጋር በግል (በኦንላይን ወይም በአካል) ተገናኝተው የቢዝነስዎን ችግሮች የሚፈቱበት እና ተግባራዊ የገቢ እቅድ የሚያወጡበት ልዩ እድል።
            </p>
          </div>

          {/* 🌟 SECTION 1: MENTORSHIP PACKAGES & PRICING */}
          <div className="mb-12">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg sm:text-xl font-black font-heading text-white flex items-center gap-2">
                  <i className="fa-solid fa-layer-group text-[#f9b03c]"></i>
                  <span>1. የማማከር ፓኬጅ ይምረጡ (Choose Mentorship Tier)</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">ለእርስዎ የሚስማማውን የማማከር ቆይታ እና የትኩረት መስክ ይምረጡ</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {MENTORSHIP_TIERS.map((tier) => {
                const isSelected = selectedTier.id === tier.id;
                return (
                  <div
                    key={tier.id}
                    onClick={() => setSelectedTier(tier)}
                    className={`relative rounded-3xl p-6 sm:p-7 border transition-all duration-300 cursor-pointer flex flex-col justify-between ${
                      isSelected
                        ? 'bg-gradient-to-b from-[#151c2e] to-[#0a0f1d] border-[#f9b03c] ring-2 ring-[#f9b03c]/40 shadow-[0_15px_40px_rgba(249,176,60,0.25)] scale-[1.02]'
                        : 'bg-white/[0.03] hover:bg-white/[0.06] border-white/10 hover:border-white/20'
                    }`}
                  >
                    {tier.tag && (
                      <div className="absolute -top-3 left-6">
                        <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider shadow-sm ${
                          isSelected
                            ? 'bg-gradient-to-r from-[#f9b03c] to-amber-400 text-slate-950 shadow-[0_0_15px_rgba(249,176,60,0.5)]'
                            : 'bg-white/10 text-[#f9b03c] border border-[#f9b03c]/30'
                        }`}>
                          {tier.tag}
                        </span>
                      </div>
                    )}

                    <div>
                      <div className="flex items-center justify-between mb-4 mt-1">
                        <div className={`w-11 h-11 rounded-2xl flex items-center justify-center text-lg ${
                          isSelected
                            ? 'bg-[#f9b03c] text-slate-950 shadow-[0_0_20px_rgba(249,176,60,0.4)]'
                            : 'bg-white/5 text-[#f9b03c] border border-white/10'
                        }`}>
                          <i className={`fa-solid ${tier.icon}`}></i>
                        </div>
                        <span className="text-xs font-bold text-slate-400 bg-white/5 px-2.5 py-1 rounded-lg border border-white/5">
                          {tier.duration}
                        </span>
                      </div>

                      <h4 className="text-base sm:text-lg font-black font-heading text-white mb-1.5">
                        {tier.name}
                      </h4>
                      <p className="text-xs text-slate-400 leading-relaxed mb-4">
                        {tier.desc}
                      </p>

                      <div className="mb-5 pb-5 border-b border-white/10">
                        <div className="flex items-baseline gap-2">
                          <span className="text-2xl sm:text-3xl font-black text-white font-heading">
                            {tier.price.toLocaleString()} ብር
                          </span>
                          <span className="text-xs text-slate-500 line-through">
                            {tier.originalPrice.toLocaleString()} ብር
                          </span>
                          <span className="text-[11px] text-emerald-400 font-bold ml-auto">
                            ~ ${tier.usdPrice} USD
                          </span>
                        </div>
                      </div>

                      {/* Feature Checklist */}
                      <ul className="space-y-2.5 mb-6 text-xs text-slate-300">
                        {tier.features.map((feat, fIdx) => (
                          <li key={fIdx} className="flex items-start gap-2">
                            <i className="fa-solid fa-circle-check text-emerald-400 text-xs mt-0.5 shrink-0"></i>
                            <span>{feat}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <button
                      type="button"
                      className={`w-full py-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 ${
                        isSelected
                          ? 'bg-gradient-to-r from-[#f9b03c] to-amber-400 text-slate-950 shadow-[0_0_20px_rgba(249,176,60,0.4)]'
                          : 'bg-white/10 hover:bg-white/15 text-white border border-white/10'
                      }`}
                    >
                      <span>{isSelected ? '✓ ተመርጧል (Selected)' : 'ይህንን ፓኬጅ ምረጥ'}</span>
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Main Grid: Mentor Profile (Left) + Booking Form / Review / Success State (Right) */}
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

            {/* Right Column (7 Cols): Dynamic Flow (Form -> Review -> Payment -> Confirmed) */}
            <div className="lg:col-span-7">
              {confirmedBooking ? (
                /* 🌟 STEP 4: SUCCESS CONFIRMATION STATE */
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
                    ቀጠሮዎ ተመዝግቧል! (BOOKING CONFIRMED)
                  </span>
                  <h2 className="text-2xl sm:text-3xl font-black font-heading text-white mb-2">
                    እንኳን ደስ አለዎት {confirmedBooking.name}!
                  </h2>
                  <p className="text-slate-300 text-xs sm:text-sm leading-relaxed mb-6 max-w-md mx-auto">
                    የማማከር ቀጠሮዎ በተሳካ ሁኔታ ተመዝግቧል እና ማረጋገጫ በኢሜይልዎ ተልኳል። አሰልጣኝ ኢዮብ ሳህሌ በቀጠሮው ቀንና ሰዓት ({confirmedBooking.phone}) ላይ የሚያገኝዎት ይሆናል።
                  </p>

                  {/* Summary Box */}
                  <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-5 mb-6 text-left text-xs space-y-2.5 max-w-md mx-auto">
                    <div className="flex justify-between">
                      <span className="text-slate-400">የቀጠሮ መለያ ቁጥር:</span>
                      <span className="font-mono font-black text-[#f9b03c]">{confirmedBooking.id}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">የተመረጠ ፓኬጅ:</span>
                      <span className="font-bold text-white">{confirmedBooking.tier}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">የተከፈለ ክፍያ:</span>
                      <span className="font-bold text-emerald-400">{confirmedBooking.amount.toLocaleString()} ብር</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">የማማከር አይነት:</span>
                      <span className="font-bold text-[#38bdf8]">
                        {confirmedBooking.meetingMode === 'in_person' ? '🏢 በአካል (In-Person Office - ቦሌ)' : '🌐 ኦንላይን (Online Video Call)'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">ቀን (Date):</span>
                      <span className="font-bold text-white">{getFormattedSelectedDate(confirmedBooking.date)}</span>
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
                    <a
                      href={`https://t.me/EyoubSahle?text=${encodeURIComponent(`ሰላም ኢዮብ! የማማከር ቀጠሮ አስይዣለሁ። የቀጠሮ መለያዬ: ${confirmedBooking.id} ነው።`)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-6 py-3.5 rounded-xl bg-[#24A1DE] hover:bg-[#208bc2] text-white font-black text-xs transition flex items-center justify-center gap-2"
                    >
                      <i className="fa-brands fa-telegram text-sm"></i>
                      <span>በቴሌግራም አግኘኝ (@EyoubSahle)</span>
                    </a>
                    <button
                      type="button"
                      onClick={() => {
                        setConfirmedBooking(null);
                        setBookingStep('form');
                      }}
                      className="px-6 py-3.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold text-slate-300 transition cursor-pointer"
                    >
                      ሌላ ቀጠሮ አስይዝ
                    </button>
                  </div>
                </div>
              ) : bookingStep === 'review' ? (
                /* 🌟 STEP 2: COMPLETE BOOKING REVIEW & CONFIRMATION (የሞሉትን መረጃ አሳይቶ ኮንፈርሜሽን መጠየቅ) */
                <div 
                  className="rounded-[2.5rem] p-6 sm:p-8 lg:p-10 text-white relative overflow-hidden animate-in fade-in zoom-in-95 duration-200"
                  style={{
                    background: 'rgba(12, 16, 23, 0.95)',
                    backdropFilter: 'blur(30px)',
                    border: '2px solid rgba(249, 176, 60, 0.5)',
                    boxShadow: '0 30px 90px rgba(0,0,0,0.9), 0 0 50px rgba(249,176,60,0.2)'
                  }}
                >
                  <div className="flex items-center justify-between mb-6 pb-4 border-b border-white/10">
                    <div>
                      <span className="text-[10px] font-black uppercase tracking-wider text-[#f9b03c] block mb-1">
                        ደረጃ 2 ከ 3 (Step 2 of 3)
                      </span>
                      <h3 className="text-xl font-black font-heading text-white">
                        የቀጠሮ መረጃ ማረጋገጫ (Review & Confirm)
                      </h3>
                      <p className="text-xs text-slate-400 mt-0.5">እባክዎ ያስገቧቸውን መረጃዎች ትክክለኛነት ያረጋግጡ</p>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-[#f9b03c]/20 border border-[#f9b03c]/40 text-[#f9b03c] flex items-center justify-center text-sm font-black">
                      <i className="fa-solid fa-clipboard-check"></i>
                    </div>
                  </div>

                  {/* Comprehensive Review Summary Grid */}
                  <div className="space-y-4 mb-6">
                    {/* User Info Card */}
                    <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 space-y-2 text-xs">
                      <span className="text-[11px] font-bold text-[#f9b03c] uppercase tracking-wider block border-b border-white/5 pb-1">
                        👤 የተገልጋይ መረጃ (Client Information)
                      </span>
                      <div className="flex justify-between pt-1">
                        <span className="text-slate-400">ሙሉ ስም (Full Name):</span>
                        <span className="font-bold text-white">{fullName}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">ስልክ ቁጥር (Phone):</span>
                        <span className="font-bold text-white font-mono">{phone}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">ኢሜይል (Email):</span>
                        <span className="font-bold text-white">{email}</span>
                      </div>
                    </div>

                    {/* Mentorship Package & Format Card */}
                    <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 space-y-2 text-xs">
                      <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider block border-b border-white/5 pb-1">
                        💼 የማማከር ዝርዝር (Mentorship Details)
                      </span>
                      <div className="flex justify-between pt-1">
                        <span className="text-slate-400">የተመረጠ ፓኬጅ:</span>
                        <span className="font-bold text-white">{selectedTier.name} ({selectedTier.duration})</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">የማማከር አይነት:</span>
                        <span className="font-bold text-[#38bdf8]">
                          {meetingMode === 'in_person' ? '🏢 በአካል (In-Person Office - ቦሌ፣ አዲስ አበባ)' : '🌐 ኦንላይን (Online Video Call - Google Meet)'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">ቀን (Date):</span>
                        <span className="font-bold text-[#f9b03c]">{getFormattedSelectedDate(selectedDate)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">ሰዓት (Time Slot):</span>
                        <span className="font-bold text-white">{selectedTime}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">የማማከሪያ ርዕስ:</span>
                        <span className="font-bold text-white truncate max-w-[220px]">{topic || 'አጠቃላይ የ 1-ለ-1 ማማከር'}</span>
                      </div>
                    </div>

                    {/* Total Fee Box */}
                    <div className="p-4 rounded-2xl bg-gradient-to-r from-[#f9b03c]/15 to-amber-500/10 border border-[#f9b03c]/40 flex items-center justify-between">
                      <div>
                        <span className="text-[11px] font-bold text-slate-300 block">የሚከፈል ጠቅላላ ክፍያ (Total Investment):</span>
                        <span className="text-xl sm:text-2xl font-black text-white font-heading">{selectedTier.price.toLocaleString()} ብር</span>
                      </div>
                      <span className="text-xs font-bold text-emerald-400 bg-emerald-500/15 px-3 py-1.5 rounded-xl border border-emerald-500/30">
                        ~ ${selectedTier.usdPrice} USD
                      </span>
                    </div>
                  </div>

                  {/* Confirmation Buttons */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setBookingStep('form')}
                      className="w-full py-3.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold text-slate-300 transition cursor-pointer flex items-center justify-center gap-2"
                    >
                      <i className="fa-solid fa-arrow-left"></i>
                      <span>✏️ መረጃ አሻሽል (Edit Details)</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setBookingStep('payment')}
                      className="w-full btn-buy-now-vibe py-3.5 rounded-xl text-xs sm:text-sm font-black flex items-center justify-center gap-2 cursor-pointer active:scale-98 shadow-[0_0_30px_rgba(249,176,60,0.4)] text-slate-950"
                    >
                      <span>✓ መረጃው ትክክል ነው — ወደ ክፍያ ሂድ</span>
                      <i className="fa-solid fa-arrow-right"></i>
                    </button>
                  </div>
                </div>
              ) : (
                /* 📋 STEP 1: MENTORSHIP BOOKING FORM */
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
                      <span className="text-[10px] font-black uppercase tracking-wider text-[#f9b03c] block mb-1">
                        ደረጃ 1 ከ 3 (Step 1 of 3)
                      </span>
                      <h3 className="text-xl font-black font-heading text-white">የቀጠሮ ቅጽ (Book Your Slot)</h3>
                      <p className="text-xs text-slate-400 mt-0.5">ከአንድ ሳምንት በኋላ የሚመችዎትን ቀን እና ሰዓት ይምረጡ</p>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-[#f9b03c]/10 border border-[#f9b03c]/30 text-[#f9b03c] flex items-center justify-center text-sm font-black">
                      <i className="fa-regular fa-calendar-plus"></i>
                    </div>
                  </div>

                  {errorMessage && (
                    <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-xs text-red-300 mb-5 flex items-center gap-2 animate-shake">
                      <i className="fa-solid fa-triangle-exclamation text-sm shrink-0"></i>
                      <span>{errorMessage}</span>
                    </div>
                  )}

                  {/* 🌟 Prominent Selected Date & Time Live Display Banner */}
                  <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-500/20 via-yellow-500/10 to-blue-500/10 border-2 border-[#f9b03c]/60 shadow-[0_0_30px_rgba(249,176,60,0.25)] flex items-center justify-between mb-6 transition-all duration-300">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#f9b03c] to-amber-300 text-slate-950 flex items-center justify-center font-black text-base shadow-sm">
                        <i className="fa-regular fa-calendar-check"></i>
                      </div>
                      <div>
                        <span className="text-[11px] font-black text-[#f9b03c] uppercase tracking-wider block">
                          የተመረጠ የቀጠሮ ቀንና ሰዓት (Selected Slot)
                        </span>
                        <h4 className="text-xs sm:text-sm font-black text-white font-heading mt-0.5">
                          {getFormattedSelectedDate(selectedDate)}
                        </h4>
                        <span className="text-[11px] text-amber-200 font-bold block mt-0.5">
                          ⏰ {selectedTime} | 💼 {selectedTier.name}
                        </span>
                      </div>
                    </div>
                    <span className="text-[11px] font-bold text-emerald-400 bg-emerald-500/15 px-3 py-1 rounded-full border border-emerald-500/30 shrink-0 hidden sm:inline-block">
                      ✓ ዝግጁ ነው
                    </span>
                  </div>

                  <form onSubmit={handleProceedToReview} className="space-y-5">
                    
                    {/* 🏢 MEETING MODE: ONLINE VS IN-PERSON */}
                    <div>
                      <label className="block text-xs font-bold text-slate-300 mb-2">
                        የማማከር አይነት ይምረጡ (Meeting Format) <span className="text-red-400">*</span>
                      </label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div
                          onClick={() => setMeetingMode('online')}
                          className={`p-3.5 rounded-2xl border transition cursor-pointer flex items-center gap-3 ${
                            meetingMode === 'online'
                              ? 'bg-[#f9b03c]/15 border-[#f9b03c] text-white shadow-[0_0_20px_rgba(249,176,60,0.2)]'
                              : 'bg-white/5 border-white/10 text-slate-400 hover:bg-white/10'
                          }`}
                        >
                          <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-base ${
                            meetingMode === 'online' ? 'bg-[#f9b03c] text-slate-950' : 'bg-white/10 text-slate-300'
                          }`}>
                            <i className="fa-solid fa-video"></i>
                          </div>
                          <div>
                            <h5 className="text-xs font-black text-white">🌐 ኦንላይን (Online Video)</h5>
                            <p className="text-[10px] text-slate-400">Google Meet / Telegram Video</p>
                          </div>
                        </div>

                        <div
                          onClick={() => setMeetingMode('in_person')}
                          className={`p-3.5 rounded-2xl border transition cursor-pointer flex items-center gap-3 ${
                            meetingMode === 'in_person'
                              ? 'bg-[#3268ba]/25 border-[#3268ba] text-white shadow-[0_0_20px_rgba(50,104,186,0.3)]'
                              : 'bg-white/5 border-white/10 text-slate-400 hover:bg-white/10'
                          }`}
                        >
                          <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-base ${
                            meetingMode === 'in_person' ? 'bg-[#3268ba] text-white' : 'bg-white/10 text-slate-300'
                          }`}>
                            <i className="fa-solid fa-building"></i>
                          </div>
                          <div>
                            <h5 className="text-xs font-black text-white">🏢 በአካል (In-Person Office)</h5>
                            <p className="text-[10px] text-slate-400">ቦሌ፣ አዲስ አበባ (Bole Office)</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Full Name & Phone */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-300 mb-1.5">
                          ሙሉ ስም (Full Name) <span className="text-red-400">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          value={fullName}
                          onChange={(e) => setFullName(e.target.value)}
                          placeholder="ለምሳሌ፡ ኢዮብ ሳህሌ (Eyoub Sahle)"
                          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-[#f9b03c] transition placeholder-gray-500"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-300 mb-1.5">
                          ስልክ ቁጥር (Phone Number) <span className="text-red-400">*</span>
                        </label>
                        <input
                          type="tel"
                          required
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          placeholder="ለምሳሌ፡ 0911223344 / +251 911 223 344"
                          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-[#f9b03c] transition placeholder-gray-500"
                        />
                      </div>
                    </div>

                    {/* Email */}
                    <div>
                      <label className="block text-xs font-bold text-slate-300 mb-1.5">
                        ኢሜይል (Email Address) <span className="text-red-400">*</span>
                      </label>
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="ለምሳሌ፡ info@tsehaycampus.com / student@gmail.com"
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-[#f9b03c] transition placeholder-gray-500"
                      />
                    </div>

                    {/* 🌟 Beautiful Interactive Glassmorphism Calendar (Starts 1-Week Out) */}
                    <div className="pt-1">
                      <div className="flex items-center justify-between mb-2">
                        <label className="block text-xs font-bold text-slate-300">
                          የቀጠሮ ቀን ይምረጡ (Select Available Date) <span className="text-red-400">*</span>
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
                                ? 'bg-gradient-to-tr from-[#f9b03c] to-amber-300 border-[#f9b03c] text-slate-950 font-black shadow-[0_0_15px_rgba(249,176,60,0.5)] scale-105'
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
                            className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-xs text-slate-300 transition cursor-pointer active:scale-90"
                          >
                            <i className="fa-solid fa-chevron-left"></i>
                          </button>

                          <span className="text-xs font-black text-white tracking-wide uppercase">
                            {calendarMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                          </span>

                          <button
                            type="button"
                            onClick={nextMonth}
                            className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-xs text-slate-300 transition cursor-pointer active:scale-90"
                          >
                            <i className="fa-solid fa-chevron-right"></i>
                          </button>
                        </div>

                        {/* Weekday Labels */}
                        <div className="grid grid-cols-7 gap-1 text-center mb-2">
                          {['እሁድ', 'ሰኞ', 'ማክ', 'ረቡዕ', 'ሐሙስ', 'ዓርብ', 'ቅዳሜ'].map((day) => (
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
                            {getFormattedSelectedDate(selectedDate)}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Time Slot Picker */}
                    <div className="pt-1">
                      <label className="block text-xs font-bold text-slate-300 mb-1.5">
                        የሚመችዎ ሰዓት (Time Slot) <span className="text-red-400">*</span>
                      </label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                        {timeSlots.map((slot) => (
                          <button
                            key={slot}
                            type="button"
                            onClick={() => setSelectedTime(slot)}
                            className={`p-2.5 rounded-xl border text-center text-xs font-bold transition cursor-pointer active:scale-95 ${
                              selectedTime === slot
                                ? 'bg-[#f9b03c]/20 border-[#f9b03c] text-[#f9b03c] shadow-[0_0_15px_rgba(249,176,60,0.3)] font-black'
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
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-[#f9b03c] transition placeholder-gray-500"
                      />

                      {/* Suggestion Chips */}
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {suggestionTopics.map((sug) => (
                          <button
                            key={sug}
                            type="button"
                            onClick={() => setTopic(sug)}
                            className="text-[10px] px-2.5 py-1 rounded-full bg-white/5 hover:bg-white/15 border border-white/10 text-slate-300 transition cursor-pointer active:scale-95"
                          >
                            + {sug}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Proceed to Review Button */}
                    <button
                      type="submit"
                      className="w-full btn-buy-now-vibe py-4 rounded-2xl text-sm font-black flex items-center justify-center gap-2.5 cursor-pointer active:scale-98 mt-4 shadow-[0_0_35px_rgba(249,176,60,0.35)] hover:shadow-[0_0_45px_rgba(249,176,60,0.5)] transition-all text-slate-950"
                    >
                      <span>የቀጠሮውን ማጠቃለያ ይመልከቱ (Review Booking)</span>
                      <i className="fa-solid fa-arrow-right text-sm"></i>
                    </button>

                  </form>
                </div>
              )}
            </div>

          </div>

        </div>
      </main>

      {/* 🌟 STEP 3: PAYMENT SELECTION & CHECKOUT MODAL */}
      {bookingStep === 'payment' && (
        <div className="fixed inset-0 z-[9990] bg-black/85 backdrop-blur-xl flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="relative bg-[#0b101d] border border-white/15 rounded-3xl p-6 sm:p-8 w-full max-w-lg shadow-[0_25px_80px_rgba(0,0,0,0.9)] max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-200 text-white">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-5">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-[#f9b03c] block mb-0.5">
                  ደረጃ 3 ከ 3 (Step 3 of 3)
                </span>
                <h3 className="text-lg font-black font-heading text-white">የማማከር ክፍያ (Mentorship Payment)</h3>
                <p className="text-xs text-slate-400 mt-0.5">{selectedTier.name} — {selectedTier.price.toLocaleString()} ብር</p>
              </div>
              <button
                type="button"
                onClick={() => setBookingStep('review')}
                className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/15 text-slate-400 hover:text-white flex items-center justify-center text-sm transition cursor-pointer"
              >
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>

            {/* Booking Summary Pill */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-4 mb-5 text-xs space-y-1.5">
              <div className="flex justify-between">
                <span className="text-slate-400">ተገልጋይ:</span>
                <span className="font-bold text-white">{fullName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">የማማከር አይነት:</span>
                <span className="font-bold text-[#38bdf8]">
                  {meetingMode === 'in_person' ? '🏢 በአካል (In-Person Office - ቦሌ)' : '🌐 ኦንላይን (Online Video)'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">ቀንና ሰዓት:</span>
                <span className="font-bold text-[#f9b03c]">{getFormattedSelectedDate(selectedDate)} | {selectedTime}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">የሚከፈል ጠቅላላ ሂሳብ:</span>
                <span className="font-black text-emerald-400 text-sm">{selectedTier.price.toLocaleString()} ብር (~ ${selectedTier.usdPrice} USD)</span>
              </div>
            </div>

            {/* Payment Method Selector (3 Methods) */}
            <div className="space-y-3 mb-6">
              <label className="block text-xs font-bold text-slate-300">
                የክፍያ ዘዴ ይምረጡ (Choose Payment Method) <span className="text-red-400">*</span>
              </label>

              {/* Option 1: Telebirr & CBE Birr */}
              <div
                onClick={() => setPaymentMethod('telebirr')}
                className={`p-4 rounded-2xl border transition cursor-pointer flex items-center justify-between ${
                  paymentMethod === 'telebirr'
                    ? 'bg-[#f9b03c]/15 border-[#f9b03c] text-white shadow-[0_0_20px_rgba(249,176,60,0.2)]'
                    : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-400/20 text-[#f9b03c] flex items-center justify-center text-lg font-black">
                    📱
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-white">ቴሌብር / Telebirr & CBE Birr</h4>
                    <p className="text-[11px] text-slate-400 mt-0.5">በሞባይል ባንኪንግ ወይም በቴሌብር ፈጣን ክፍያ</p>
                  </div>
                </div>
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                  paymentMethod === 'telebirr' ? 'border-[#f9b03c] bg-[#f9b03c]' : 'border-slate-500'
                }`}>
                  {paymentMethod === 'telebirr' && <i className="fa-solid fa-check text-[10px] text-slate-950"></i>}
                </div>
              </div>

              {/* Option 2: Bank Transfer (CBE / Awash) */}
              <div
                onClick={() => setPaymentMethod('cbe')}
                className={`p-4 rounded-2xl border transition cursor-pointer flex items-center justify-between ${
                  paymentMethod === 'cbe'
                    ? 'bg-[#3268ba]/20 border-[#3268ba] text-white shadow-[0_0_20px_rgba(50,104,186,0.3)]'
                    : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center text-lg font-black">
                    🏦
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-white">የባንክ ማስተላለፊያ (Bank Transfer)</h4>
                    <p className="text-[11px] text-slate-400 mt-0.5">በኢትዮጵያ ንግድ ባንክ (CBE) ወይም በአዋሽ ባንክ</p>
                  </div>
                </div>
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                  paymentMethod === 'cbe' ? 'border-[#3268ba] bg-[#3268ba]' : 'border-slate-500'
                }`}>
                  {paymentMethod === 'cbe' && <i className="fa-solid fa-check text-[10px] text-white"></i>}
                </div>
              </div>

              {/* Option 3: PayPal & International Cards */}
              <div
                onClick={() => setPaymentMethod('paypal')}
                className={`p-4 rounded-2xl border transition cursor-pointer flex items-center justify-between ${
                  paymentMethod === 'paypal'
                    ? 'bg-blue-600/20 border-blue-500 text-white shadow-[0_0_20px_rgba(37,99,235,0.3)]'
                    : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-500/20 text-blue-300 flex items-center justify-center text-lg font-black">
                    💳
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-white">PayPal & International Cards</h4>
                    <p className="text-[11px] text-slate-400 mt-0.5">ለዲያስፖራ እና ከሀገር ውጭ ላሉ (${selectedTier.usdPrice} USD)</p>
                  </div>
                </div>
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                  paymentMethod === 'paypal' ? 'border-blue-500 bg-blue-500' : 'border-slate-500'
                }`}>
                  {paymentMethod === 'paypal' && <i className="fa-solid fa-check text-[10px] text-white"></i>}
                </div>
              </div>
            </div>

            {/* Account Details Box */}
            <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 mb-5 text-xs space-y-2">
              <p className="font-bold text-[#f9b03c] mb-1">📌 የክፍያ መረጃዎች (Account Details)፦</p>
              
              {paymentMethod === 'telebirr' && (
                <div className="space-y-1 text-slate-300">
                  <div className="flex justify-between">
                    <span>ቴሌብር ቁጥር (Telebirr):</span>
                    <span className="font-mono font-black text-white select-all">0980209090 / 0910589874</span>
                  </div>
                  <div className="flex justify-between">
                    <span>የመለያ ስም (Account Name):</span>
                    <span className="font-bold text-white">ኢዮብ ሳህሌ (Eyoub Sahle)</span>
                  </div>
                </div>
              )}

              {paymentMethod === 'cbe' && (
                <div className="space-y-1 text-slate-300">
                  <div className="flex justify-between">
                    <span>ንግድ ባንክ (CBE Account):</span>
                    <span className="font-mono font-black text-white select-all">1000456789012</span>
                  </div>
                  <div className="flex justify-between">
                    <span>አዋሽ ባንክ (Awash Bank):</span>
                    <span className="font-mono font-black text-white select-all">01320876543210</span>
                  </div>
                  <div className="flex justify-between">
                    <span>የመለያ ስም (Account Name):</span>
                    <span className="font-bold text-white">ኢዮብ ሳህሌ (Eyoub Sahle)</span>
                  </div>
                </div>
              )}

              {paymentMethod === 'paypal' && (
                <div className="space-y-1 text-slate-300">
                  <div className="flex justify-between">
                    <span>PayPal Email:</span>
                    <span className="font-mono font-black text-white select-all">eyoubsahle@gmail.com</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Total USD Amount:</span>
                    <span className="font-bold text-emerald-400">${selectedTier.usdPrice} USD</span>
                  </div>
                </div>
              )}
            </div>

            {/* Optional Transaction Ref Input */}
            <div className="mb-5">
              <label className="block text-xs font-bold text-slate-300 mb-1.5">
                የደረሰኝ ቁጥር ወይም የቴሌግራም ስም (Transaction Ref / Telegram User)
              </label>
              <input
                type="text"
                value={transactionRef}
                onChange={(e) => setTransactionRef(e.target.value)}
                placeholder="ለምሳሌ፡ FT240828 / @YourTelegramUsername"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-[#f9b03c] transition"
              />
            </div>

            {/* Confirm & Complete Booking Button */}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setBookingStep('review')}
                className="w-1/3 py-3.5 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold text-slate-300 transition cursor-pointer"
              >
                ተመለስ
              </button>
              <button
                type="button"
                disabled={isProcessingPayment}
                onClick={handleFinalizeBooking}
                className="w-2/3 btn-buy-now-vibe py-3.5 rounded-2xl text-xs sm:text-sm font-black flex items-center justify-center gap-2 cursor-pointer active:scale-98 disabled:opacity-50 shadow-[0_0_30px_rgba(249,176,60,0.4)] text-slate-950"
              >
                {isProcessingPayment ? (
                  <div className="w-5 h-5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <>
                    <i className="fa-solid fa-check-circle text-base"></i>
                    <span>ክፍያውን ፈጽሜያለሁ / ቀጠሮውን አረጋግጥ</span>
                  </>
                )}
              </button>
            </div>

          </div>
        </div>
      )}

      <Footer />
    </div>
  );
}
