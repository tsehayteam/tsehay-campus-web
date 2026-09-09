'use client';

import React, { useState, useEffect } from 'react';
import { TsehayEvent, EventTicket, formatEventBannerUrl, DEFAULT_EVENT_BANNER } from '@/lib/eventCache';
import { useAuth } from '@/context/AuthContext';
import { validateReferralCode, recordReferralUsage } from '@/lib/referralService';
import { Check } from 'lucide-react';

interface TwoStageEventBookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  event: TsehayEvent | null;
  onSuccess: (ticket: EventTicket) => void;
  initialAttendeeName?: string;
  initialAttendeeEmail?: string;
  initialAttendeePhone?: string;
}

export default function TwoStageEventBookingModal({
  isOpen,
  onClose,
  event,
  onSuccess,
  initialAttendeeName = '',
  initialAttendeeEmail = '',
  initialAttendeePhone = '',
}: TwoStageEventBookingModalProps) {
  const { user } = useAuth();

  // Step state: 1 = Attendee Info, 2 = Full LMS-Style Payment Modal
  const [step, setStep] = useState<1 | 2>(1);

  // Step 1: Attendee Information Form
  const [attendeeName, setAttendeeName] = useState('');
  const [attendeeEmail, setAttendeeEmail] = useState('');
  const [attendeePhone, setAttendeePhone] = useState('');
  const [step1Error, setStep1Error] = useState<string | null>(null);

  // Step 2: Payment & Discount Form
  const [paymethod, setPaymethod] = useState<'lakipay' | 'paypal' | 'nowpayments'>('lakipay');
  const [referralInput, setReferralInput] = useState('');
  const [appliedCode, setAppliedCode] = useState<string | null>(null);
  const [discountPercent, setDiscountPercent] = useState<number>(0);
  const [promoMessage, setPromoMessage] = useState<{ text: string; isError: boolean } | null>(null);
  const [isValidatingCode, setIsValidatingCode] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [generalError, setGeneralError] = useState<string | null>(null);

  // Sync initial user info when opened
  useEffect(() => {
    if (isOpen) {
      setStep(1);
      setStep1Error(null);
      setGeneralError(null);
      setAttendeeName(
        initialAttendeeName || 
        user?.displayName || 
        (user?.email ? user.email.split('@')[0] : '')
      );
      setAttendeeEmail(
        initialAttendeeEmail || 
        user?.email || 
        ''
      );
      setAttendeePhone(initialAttendeePhone || '');
    }
  }, [isOpen, user, initialAttendeeName, initialAttendeeEmail, initialAttendeePhone]);

  // Lock body scroll
  useEffect(() => {
    if (isOpen && typeof document !== 'undefined') {
      document.body.style.overflow = 'hidden';
    } else if (typeof document !== 'undefined') {
      document.body.style.overflow = '';
    }
    return () => {
      if (typeof document !== 'undefined') {
        document.body.style.overflow = '';
      }
    };
  }, [isOpen]);

  if (!isOpen || !event) return null;

  const originalPrice = Number(event.price) || 0;
  const isOriginallyFree = Boolean(event.isFree || originalPrice === 0);
  const isFreeAfterDiscount = Boolean(isOriginallyFree || discountPercent >= 100);
  const finalPrice = isFreeAfterDiscount
    ? 0
    : Math.max(0, Math.round(originalPrice * (1 - discountPercent / 100)));

  // Validate Step 1 Inputs
  const handleProceedToStep2 = (e: React.FormEvent) => {
    e.preventDefault();
    setStep1Error(null);

    const trimmedName = attendeeName.trim();
    const trimmedEmail = attendeeEmail.trim().toLowerCase();
    const trimmedPhone = attendeePhone.trim();

    if (!trimmedName || trimmedName.length < 2) {
      setStep1Error('እባክዎ ሙሉ ስምዎን በትክክል ያስገቡ (Full Name is required)።');
      return;
    }

    if (!trimmedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setStep1Error('እባክዎ ትክክለኛ የኢሜይል አድራሻ ያስገቡ (Valid Email is required)።');
      return;
    }

    const cleanPhone = trimmedPhone.replace(/[\s\-()]/g, '');
    if (!cleanPhone || cleanPhone.length < 9) {
      setStep1Error('እባክዎ ትክክለኛ ስልክ ቁጥር ያስገቡ (ለምሳሌ 0911223344 ወይም +251911223344)።');
      return;
    }

    // If event is free, execute registration immediately
    if (isOriginallyFree) {
      executeRegistration(0, 'free');
      return;
    }

    // Otherwise proceed to Step 2 (Full LMS Payment Modal)
    setStep(2);
  };

  // Validate and Apply Coupon/Promo Code
  const handleApplyPromoCode = async () => {
    const code = referralInput.trim().toUpperCase();
    if (!code) {
      setPromoMessage({ text: 'እባክዎ የቅናሽ ኮድ ያስገቡ።', isError: true });
      return;
    }

    setIsValidatingCode(true);
    setPromoMessage(null);

    try {
      const result = await validateReferralCode(code, event.id);
      if (result.isValid) {
        setAppliedCode(code);
        setDiscountPercent(result.discountPercent);
        setPromoMessage({ text: result.message || `${result.discountPercent}% ቅናሽ ተተግብሯል!`, isError: false });
      } else {
        setAppliedCode(null);
        setDiscountPercent(0);
        setPromoMessage({ text: result.message || 'ትክክል ያልሆነ የቅናሽ ኮድ', isError: true });
      }
    } catch (err) {
      setPromoMessage({ text: 'የቅናሽ ኮዱን ማረጋገጥ አልተቻለም። እባክዎ በድጋሚ ይሞክሩ።', isError: true });
    } finally {
      setIsValidatingCode(false);
    }
  };

  const handleRemovePromoCode = () => {
    setAppliedCode(null);
    setDiscountPercent(0);
    setReferralInput('');
    setPromoMessage(null);
  };

  // Execute Ticket Registration & Issuance
  const executeRegistration = async (pricePaid: number, method: string) => {
    setIsProcessing(true);
    setGeneralError(null);
    setStep1Error(null);

    try {
      const res = await fetch('/api/tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventId: event.id,
          eventSlug: event.slug,
          eventTitle: event.title,
          eventDate: event.date,
          eventTime: event.time,
          eventLocation: event.location,
          isOnline: event.isOnline,
          meetingLink: event.meetingLink,
          mapsUrl: event.mapsUrl,
          eventImage: event.image,
          attendeeName: attendeeName.trim(),
          attendeeEmail: attendeeEmail.trim().toLowerCase(),
          attendeePhone: attendeePhone.trim(),
          amount: pricePaid,
          paymentMethod: method,
          referralCode: appliedCode || null,
          tier: pricePaid > 1200 ? 'VIP Pass' : 'General Admission'
        })
      });

      const data = await res.json();
      if (res.ok && data.success && data.ticket) {
        const ticketCode = data.ticket.ticketCode || data.ticket.ticket_code || data.ticket.ticketId || `TKT-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
        const unifiedTicket: EventTicket = {
          ticketId: data.ticket.ticketId || data.ticket.id || ticketCode,
          id: data.ticket.id || `TKT-${Date.now()}`,
          ticketCode: ticketCode,
          userId: data.ticket.userId || user?.uid || `guest_${Date.now()}`,
          pricePaid: Number(data.ticket.pricePaid ?? data.ticket.amount ?? pricePaid) || 0,
          isUsed: Boolean(data.ticket.isUsed ?? false),
          issuedAt: data.ticket.issuedAt || data.ticket.createdAt || new Date().toISOString(),
          eventId: data.ticket.eventId || event.id,
          eventTitle: data.ticket.eventTitle || event.title,
          eventDate: data.ticket.eventDate || event.date,
          eventTime: data.ticket.eventTime || event.time,
          eventLocation: data.ticket.eventLocation || event.location,
          isOnline: data.ticket.isOnline ?? event.isOnline,
          meetingLink: data.ticket.meetingLink || event.meetingLink,
          mapsUrl: data.ticket.mapsUrl || event.mapsUrl,
          attendeeName: data.ticket.attendeeName || attendeeName.trim(),
          attendeeEmail: data.ticket.attendeeEmail || attendeeEmail.trim().toLowerCase(),
          attendeePhone: data.ticket.attendeePhone || attendeePhone.trim(),
          amount: data.ticket.amount ?? pricePaid,
          currency: 'ETB',
          paymentMethod: data.ticket.paymentMethod || method,
          status: 'confirmed',
          createdAt: data.ticket.createdAt || new Date().toISOString(),
          tier: data.ticket.tier || (pricePaid > 1200 ? 'VIP Pass' : 'General Admission'),
          qrCodeData: data.ticket.qrCodeData || `${ticketCode}|${event.id}`,
          eventImage: data.ticket.eventImage || event.image || '',
          image: data.ticket.image || event.image || ''
        };
        onSuccess(unifiedTicket);
        onClose();
      } else {
        const msg = data?.error || 'ትኬት መቁረጥ አልተቻለም። እባክዎ እንደገና ይሞክሩ።';
        if (step === 1) setStep1Error(msg);
        else setGeneralError(msg);
      }
    } catch (e: any) {
      const msg = 'የኔትዎርክ ችግር አጋጥሟል። እባክዎ በድጋሚ ይሞክሩ።';
      if (step === 1) setStep1Error(msg);
      else setGeneralError(msg);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCompletePayment = async () => {
    const trimmedName = attendeeName.trim() || user?.displayName || 'Student';
    const trimmedEmail = attendeeEmail.trim().toLowerCase() || user?.email || '';
    const trimmedPhone = attendeePhone.trim();

    // 🌟 If Paid Event, initiate dynamic hosted checkout session for chosen gateway
    if (finalPrice > 0) {
      setIsProcessing(true);
      setGeneralError(null);

      try {
        const checkoutRes = await fetch('/api/initiate-payment', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            courseId: event.id,
            title: `ትኬት - ${event.title}`,
            price: finalPrice,
            originalPrice: originalPrice,
            referralCode: appliedCode || null,
            discountPercent: discountPercent,
            userEmail: trimmedEmail,
            userId: user?.uid || `guest_${Date.now()}`,
            phone: trimmedPhone,
            phone_number: trimmedPhone,
            phoneNumber: trimmedPhone,
            paymethod: paymethod,
            isEventTicket: true,
            eventId: event.id,
            eventSlug: event.slug,
            eventTitle: event.title,
            eventDate: event.date,
            eventTime: event.time,
            eventLocation: event.location,
            isOnline: event.isOnline,
            meetingLink: event.meetingLink,
            mapsUrl: event.mapsUrl,
            eventImage: event.image,
            attendeeName: trimmedName,
            attendeeEmail: trimmedEmail,
            attendeePhone: trimmedPhone,
            tier: finalPrice > 1200 ? 'VIP Pass' : 'General Admission'
          })
        });

        const checkoutData = await checkoutRes.json().catch(() => null);
        const redirectUrl = checkoutData?.paymentUrl || checkoutData?.payment_url || checkoutData?.checkoutUrl || checkoutData?.checkout_url;

        if (redirectUrl && typeof redirectUrl === 'string' && redirectUrl.startsWith('http')) {
          if (appliedCode) {
            recordReferralUsage(appliedCode).catch(() => {});
          }
          window.location.href = redirectUrl;
          return;
        } else {
          setGeneralError(checkoutData?.error || checkoutData?.message || 'የክፍያ ሂደቱን ማስጀመር አልተሳካም። እባክዎ በድጋሚ ይሞክሩ።');
          setIsProcessing(false);
          return;
        }
      } catch (err: any) {
        console.warn("Event payment initiation error:", err);
        setGeneralError('የኔትዎርክ ችግር አጋጥሟል። እባክዎ በድጋሚ ይሞክሩ።');
        setIsProcessing(false);
        return;
      }
    }

    // Free ticket or manual CBE direct bank deposit
    executeRegistration(finalPrice, paymethod);
  };

  const bannerImg = formatEventBannerUrl(event.image) || DEFAULT_EVENT_BANNER;

  return (
    <div
      className="fixed inset-0 z-[9999999] flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-xl animate-in fade-in duration-200 overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isProcessing) onClose();
      }}
    >
      {/*  360° Rotating Cybernetic Border Beam Wrapper */}
      <div className="relative p-[2px] rounded-[2rem] overflow-hidden max-w-lg w-full m-auto shadow-[0_25px_90px_rgba(0,0,0,0.95)] animate-in zoom-in-95 duration-200">
        
        {/* Ambient Glow Beam */}
        <div 
          className="absolute -inset-[200%] z-0 rounded-full animate-[spin_6s_linear_infinite]"
          style={{
            background: 'conic-gradient(from 0deg, transparent 0deg, transparent 200deg, rgba(50, 104, 186, 0.5) 240deg, #f9b03c 290deg, #ffe066 330deg, #ffffff 360deg)',
            filter: 'blur(2px)'
          }}
        />

        {/* Modal Card Content */}
        <div
          className="bg-[#0b0f19] text-white w-full flex flex-col relative z-10 rounded-[calc(2rem-2px)] overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Top Golden Accent Line */}
          <div className="h-1.5 bg-gradient-to-r from-amber-400 via-[#f9b03c] to-yellow-300 shadow-[0_0_15px_rgba(249,176,60,0.8)]" />

          {/* Modal Header */}
          <div className="px-5 py-4 sm:px-6 sm:py-4.5 border-b border-gray-800/80 flex items-center justify-between bg-[#0d1424]">
            <div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#f9b03c] animate-pulse"></span>
                <span className="text-[10px] sm:text-[11px] font-black tracking-widest uppercase text-[#f9b03c]">
                  {step === 1 ? 'ደረጃ 1 ፦ የተሳታፊ መረጃ (Step 1/2)' : 'ደረጃ 2 ፦ የተሟላ ክፍያ እና ቅናሽ (Step 2/2)'}
                </span>
              </div>
              <h3 className="font-heading font-black text-base sm:text-lg text-white line-clamp-1 mt-0.5">
                {step === 1 ? 'የትኬት ምዝገባ ማረጋገጫ' : 'ደህንነቱ የተጠበቀ ክፍያ'}
              </h3>
            </div>

            <button
              type="button"
              onClick={onClose}
              disabled={isProcessing}
              className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-slate-400 hover:text-white flex items-center justify-center text-xs transition cursor-pointer disabled:opacity-50"
              title="ዝጋ (Close)"
            >
              <i className="fa-solid fa-xmark"></i>
            </button>
          </div>

          {/* Stepper Progress Indicator */}
          <div className="px-5 sm:px-6 py-2.5 bg-black/40 border-b border-white/5 flex items-center justify-between text-[11px] font-bold">
            <div className={`flex items-center gap-1.5 ${step === 1 ? 'text-[#f9b03c]' : 'text-emerald-400'}`}>
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black ${
                step === 1 ? 'bg-[#f9b03c] text-slate-950' : 'bg-emerald-500 text-white'
              }`}>
                {step === 2 ? <Check className="w-3 h-3 stroke-[3]" aria-hidden="true" /> : '1'}
              </span>
              <span>የተሳታፊ መረጃ</span>
            </div>

            <div className={`flex-1 h-[2px] mx-3 rounded-full ${step === 2 ? 'bg-gradient-to-r from-emerald-400 to-[#f9b03c]' : 'bg-white/10'}`} />

            <div className={`flex items-center gap-1.5 ${step === 2 ? 'text-[#f9b03c]' : 'text-slate-400'}`}>
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black ${
                step === 2 ? 'bg-[#f9b03c] text-slate-950' : 'bg-white/10 text-slate-400'
              }`}>
                2
              </span>
              <span>የክፍያ አማራጭ</span>
            </div>
          </div>

          {/* Modal Body */}
          <div className="p-5 sm:p-6 space-y-4 max-h-[78vh] overflow-y-auto">
            
            {/* Event Summary Pill (Compact on both steps) */}
            <div className="flex items-center gap-3 bg-[#121a2d] p-3 rounded-2xl border border-gray-800 shadow-inner">
              <img
                src={bannerImg}
                alt={event.title}
                className="w-13 h-13 sm:w-14 sm:h-14 rounded-xl object-cover border border-gray-700/80 shrink-0"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = DEFAULT_EVENT_BANNER;
                }}
              />
              <div className="min-w-0 flex-1">
                <p className="text-[10px] text-[#f9b03c] font-black uppercase tracking-wider truncate">
                  {event.isOnline ? 'Online Stream' : event.location}
                </p>
                <h4 className="font-bold text-white text-xs sm:text-sm line-clamp-1 leading-snug">
                  {event.title}
                </h4>
                <p className="text-[11px] text-slate-400 mt-0.5 truncate">
                  {event.date} • {event.time}
                </p>
              </div>
              <div className="shrink-0 text-right">
                <span className="px-2.5 py-1 rounded-lg bg-amber-500/20 text-[#f9b03c] border border-amber-500/40 text-xs font-black">
                  {isOriginallyFree ? 'ነፃ (FREE)' : `${originalPrice.toLocaleString()} ETB`}
                </span>
              </div>
            </div>

            {/* ========================================================= */}
            {/* STEP 1: ATTENDEE INFORMATION FORM                          */}
            {/* ========================================================= */}
            {step === 1 && (
              <form onSubmit={handleProceedToStep2} className="space-y-3.5">
                {step1Error && (
                  <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-xs text-red-300 flex items-center gap-2">
                    <i className="fa-solid fa-circle-exclamation text-red-400 shrink-0"></i>
                    <span>{step1Error}</span>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    ሙሉ ስም (Full Name) <span className="text-amber-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="ለምሳሌ፡ ኢዮብ ሳህሌ (Eyoub Sahle)"
                    value={attendeeName}
                    onChange={(e) => setAttendeeName(e.target.value)}
                    className="w-full px-3.5 py-2.5 sm:py-3 rounded-xl bg-white/5 border border-white/15 focus:border-[#f9b03c] text-white text-xs sm:text-sm outline-none transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    ኢሜይል አድራሻ (Email Address) <span className="text-amber-400">*</span>
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="student@example.com (ዲጂታል ቲኬቱ የሚላክበት)"
                    value={attendeeEmail}
                    onChange={(e) => setAttendeeEmail(e.target.value)}
                    className="w-full px-3.5 py-2.5 sm:py-3 rounded-xl bg-white/5 border border-white/15 focus:border-[#f9b03c] text-white text-xs sm:text-sm outline-none transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    ስልክ ቁጥር (Phone Number) <span className="text-amber-400">*</span>
                  </label>
                  <input
                    type="tel"
                    required
                    placeholder="0911223344 ወይም +251911223344"
                    value={attendeePhone}
                    onChange={(e) => setAttendeePhone(e.target.value)}
                    className="w-full px-3.5 py-2.5 sm:py-3 rounded-xl bg-white/5 border border-white/15 focus:border-[#f9b03c] text-white text-xs sm:text-sm outline-none transition"
                  />
                  <p className="text-[10px] text-slate-400 mt-1 flex items-center gap-1.5">
                    <i className="fa-solid fa-qrcode text-[#f9b03c]"></i>
                    <span>የቲኬቱ ዲጂታል QR ኮድ እና የመግቢያ ማረጋገጫ ወዲያውኑ ይዘጋጅልዎታል</span>
                  </p>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={isProcessing}
                    className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-[#f9b03c] via-amber-400 to-[#f9b03c] hover:brightness-110 text-slate-950 font-black text-sm flex items-center justify-center gap-2 shadow-[0_0_25px_rgba(249,176,60,0.4)] active:scale-98 transition disabled:opacity-50 cursor-pointer"
                  >
                    {isProcessing ? (
                      <>
                        <i className="fa-solid fa-circle-notch fa-spin text-sm"></i>
                        <span>ትኬትዎ እየተዘጋጀ ነው...</span>
                      </>
                    ) : isOriginallyFree ? (
                      <>
                        <i className="fa-solid fa-ticket text-sm"></i>
                        <span>ምዝገባውን አጠናቅቅ (Confirm Free Ticket)</span>
                      </>
                    ) : (
                      <>
                        <span>ቀጣይ ወደ ክፍያ (Proceed to Payment)</span>
                        <i className="fa-solid fa-arrow-right text-xs"></i>
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}

            {/* ========================================================= */}
            {/* STEP 2: FULL LMS-STYLE PAYMENT MODAL                       */}
            {/* ========================================================= */}
            {step === 2 && (
              <div className="space-y-4">
                {generalError && (
                  <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-xs text-red-300 flex items-center gap-2">
                    <i className="fa-solid fa-circle-exclamation text-red-400 shrink-0"></i>
                    <span>{generalError}</span>
                  </div>
                )}

                {/*  Promo / Discount Coupon Code Box */}
                <div className="bg-[#121a2d]/80 p-3 sm:p-3.5 rounded-2xl border border-gray-800/90 space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold text-gray-300">
                    <span className="flex items-center gap-1.5">
                      <i className="fa-solid fa-tag text-[#f9b03c]"></i>
                      <span>የቅናሽ ኩፖን (Discount / Coupon Code)</span>
                    </span>
                    {appliedCode && (
                      <span className="text-[11px] text-emerald-400 font-bold">ተተግብሯል ({discountPercent}% OFF)</span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      placeholder="ለምሳሌ፡ VIP100 ወይም TSEHAY"
                      value={referralInput}
                      disabled={isProcessing || Boolean(appliedCode)}
                      onChange={(e) => setReferralInput(e.target.value.toUpperCase().replace(/\s+/g, ''))}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleApplyPromoCode();
                        }
                      }}
                      className="flex-1 bg-[#080d1a] border border-gray-700/90 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm font-mono uppercase tracking-wider text-white outline-none focus:border-[#f9b03c] transition disabled:opacity-60"
                    />
                    {appliedCode ? (
                      <button
                        type="button"
                        onClick={handleRemovePromoCode}
                        disabled={isProcessing}
                        className="bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/40 font-bold px-3 py-2 rounded-xl text-xs transition cursor-pointer shrink-0"
                      >
                        አስወግድ
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={handleApplyPromoCode}
                        disabled={isValidatingCode || isProcessing || !referralInput.trim()}
                        className="bg-gradient-to-r from-[#f9b03c] to-amber-400 hover:brightness-110 text-slate-950 font-black px-4 py-2.5 rounded-xl text-xs transition shadow-sm hover:shadow-[0_0_15px_rgba(249,176,60,0.3)] cursor-pointer disabled:opacity-50 shrink-0"
                      >
                        {isValidatingCode ? <i className="fa-solid fa-spinner fa-spin"></i> : 'ተጠቀም (Apply)'}
                      </button>
                    )}
                  </div>

                  {promoMessage && (
                    <div className={`text-xs font-bold flex items-center gap-1.5 pt-0.5 animate-in fade-in ${
                      promoMessage.isError ? 'text-red-400' : 'text-emerald-400'
                    }`}>
                      <i className={`fa-solid ${promoMessage.isError ? 'fa-circle-exclamation' : 'fa-circle-check'}`}></i>
                      <span>{promoMessage.text}</span>
                    </div>
                  )}
                </div>

                {/* Dynamic Price Breakdown */}
                <div className="flex justify-between items-center py-2.5 px-3 bg-white/[0.02] rounded-xl border border-white/10">
                  <div>
                    <span className="text-gray-300 font-bold text-xs uppercase tracking-wider block">ጠቅላላ ክፍያ (Total)</span>
                    {appliedCode && discountPercent > 0 && !isOriginallyFree && (
                      <span className="text-xs text-gray-400 line-through">
                        {originalPrice.toLocaleString()} ETB
                      </span>
                    )}
                  </div>
                  <div className="text-right">
                    <span className="text-xl sm:text-2xl font-black text-[#f9b03c] tracking-tight">
                      {isFreeAfterDiscount ? "0 ETB (100% ነፃ)" : `${finalPrice.toLocaleString()} ETB`}
                    </span>
                    {appliedCode && discountPercent > 0 && (
                      <span className="block text-[11px] font-bold text-emerald-400">
                        {discountPercent >= 100 ? '100% FREE Pass' : `${discountPercent}% ቅናሽ ተደርጓል`}
                      </span>
                    )}
                  </div>
                </div>

                {/* Payment Methods (Full LMS Standard Options) */}
                {!isFreeAfterDiscount && (
                  <div className="space-y-2.5">
                    <h4 className="font-bold text-xs text-gray-400 uppercase tracking-wider">የክፍያ አማራጭ ይምረጡ (Payment Method)</h4>

                    {/* Option 1: LakiPay */}
                    <label
                      className={`payment-option flex items-center justify-between p-3 sm:p-3.5 rounded-2xl border cursor-pointer transition-all duration-200 ${
                        paymethod === 'lakipay'
                          ? 'border-[#f9b03c] bg-amber-500/10 shadow-[0_0_20px_rgba(249,176,60,0.2)] ring-2 ring-amber-500/40'
                          : 'border-gray-800/90 bg-[#121a2d] hover:bg-[#16233d]'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0 pr-2">
                        <input
                          type="radio"
                          name="ticket-paymethod"
                          value="lakipay"
                          checked={paymethod === 'lakipay'}
                          onChange={() => setPaymethod('lakipay')}
                          className="w-4 h-4 text-amber-500 focus:ring-amber-500 accent-amber-500 cursor-pointer shrink-0"
                        />
                        <div className="min-w-0">
                          <span className="font-black text-white text-sm sm:text-base block leading-tight">LakiPay</span>
                          <span className="text-[11px] text-amber-400 font-bold block mt-0.5">For Local Payments</span>
                        </div>
                      </div>
                      <div className="bg-white w-20 sm:w-24 h-8 px-2 rounded-xl flex items-center justify-center shadow-md border border-gray-200 shrink-0">
                        <img src="/lakipay-logo.svg" alt="LakiPay" className="h-4 sm:h-5 w-auto max-w-full object-contain" />
                      </div>
                    </label>

                    {/* Option 2: PayPal */}
                    <label
                      className={`payment-option flex items-center justify-between p-3 sm:p-3.5 rounded-2xl border cursor-pointer transition-all duration-200 ${
                        paymethod === 'paypal'
                          ? 'border-blue-500 bg-blue-500/10 shadow-[0_0_20px_rgba(59,130,246,0.2)] ring-2 ring-blue-500/40'
                          : 'border-gray-800/90 bg-[#121a2d] hover:bg-[#16233d]'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0 pr-2">
                        <input
                          type="radio"
                          name="ticket-paymethod"
                          value="paypal"
                          checked={paymethod === 'paypal'}
                          onChange={() => setPaymethod('paypal')}
                          className="w-4 h-4 text-blue-500 focus:ring-blue-500 accent-blue-500 cursor-pointer shrink-0"
                        />
                        <div className="min-w-0">
                          <span className="font-black text-white text-sm sm:text-base block leading-tight">PayPal</span>
                          <span className="text-[11px] text-blue-400 font-bold block mt-0.5">For International Payments</span>
                        </div>
                      </div>
                      <div className="bg-white w-20 sm:w-24 h-8 px-2 rounded-xl flex items-center justify-center shadow-md border border-gray-200 shrink-0">
                        <img src="/paypal-logo.svg" alt="PayPal" className="h-4 sm:h-5 w-auto max-w-full object-contain" />
                      </div>
                    </label>

                    {/* Option 3: NOWPayments */}
                    <label
                      className={`payment-option flex items-center justify-between p-3 sm:p-3.5 rounded-2xl border cursor-pointer transition-all duration-200 ${
                        paymethod === 'nowpayments'
                          ? 'border-cyan-500 bg-cyan-500/10 shadow-[0_0_20px_rgba(6,182,212,0.2)] ring-2 ring-cyan-500/40'
                          : 'border-gray-800/90 bg-[#121a2d] hover:bg-[#16233d]'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0 pr-2">
                        <input
                          type="radio"
                          name="ticket-paymethod"
                          value="nowpayments"
                          checked={paymethod === 'nowpayments'}
                          onChange={() => setPaymethod('nowpayments')}
                          className="w-4 h-4 text-cyan-500 focus:ring-cyan-500 accent-cyan-500 cursor-pointer shrink-0"
                        />
                        <div className="min-w-0">
                          <span className="font-black text-white text-sm sm:text-base block leading-tight">NOWPayments</span>
                          <span className="text-[11px] text-cyan-400 font-bold block mt-0.5">For Crypto Payments</span>
                        </div>
                      </div>
                      <div className="bg-white w-20 sm:w-24 h-8 px-2 rounded-xl flex items-center justify-center shadow-md border border-gray-200 shrink-0">
                        <img src="/nowpayments-logo.svg" alt="NOWPayments" className="h-4 sm:h-5 w-auto max-w-full object-contain" />
                      </div>
                    </label>
                  </div>
                )}

                {/* Action Buttons: Back + Complete */}
                <div className="flex items-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    disabled={isProcessing}
                    className="w-1/3 py-3.5 rounded-2xl bg-white/10 hover:bg-white/15 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 transition cursor-pointer border border-white/10 disabled:opacity-50"
                  >
                    <i className="fa-solid fa-arrow-left text-xs"></i>
                    <span>ተመለስ</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleCompletePayment}
                    disabled={isProcessing}
                    className="flex-1 py-3.5 rounded-2xl bg-gradient-to-r from-[#f9b03c] via-amber-400 to-[#f9b03c] hover:brightness-110 text-slate-950 font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-[0_0_30px_rgba(249,176,60,0.5)] active:scale-98 transition disabled:opacity-50 cursor-pointer"
                  >
                    {isProcessing ? (
                      <>
                        <i className="fa-solid fa-circle-notch fa-spin text-sm"></i>
                        <span>ትኬትዎ እየተረጋገጠ ነው...</span>
                      </>
                    ) : isFreeAfterDiscount ? (
                      <>
                        <i className="fa-solid fa-gift text-sm"></i>
                        <span>በነፃ ትኬት ቁረጥ (100% Free Pass)</span>
                      </>
                    ) : (
                      <>
                        <i className="fa-solid fa-shield-check text-sm"></i>
                        <span>ክፍያ ፈጽመህ ትኬት ቁረጥ ({finalPrice.toLocaleString()} ETB)</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  );
}
