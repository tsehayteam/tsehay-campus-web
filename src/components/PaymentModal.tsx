'use client';
import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '@/context/AuthContext';
import { db } from '@/lib/firebase/config';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { validateReferralCode, recordReferralUsage } from '@/lib/referralService';

export default function PaymentModal({ course: propCourse, onClose: propOnClose }: any) {
  const [internalCourse, setInternalCourse] = useState<any>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  const course = propCourse || internalCourse;
  const isControlled = propCourse !== undefined;

  const [paymethod, setPaymethod] = useState('lakipay');
  const [isPaying, setIsPaying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  // 🌟 Referral / Promo Code States
  const [referralInput, setReferralInput] = useState('');
  const [appliedCode, setAppliedCode] = useState<string | null>(null);
  const [discountPercent, setDiscountPercent] = useState<number>(0);
  const [referralMessage, setReferralMessage] = useState<{ text: string; isError: boolean } | null>(null);
  const [isValidatingCode, setIsValidatingCode] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Listen for global open events if not controlled
  useEffect(() => {
    const handleOpenEvent = (e: any) => {
      const targetCourse = e.detail?.course || e.detail;
      if (targetCourse) {
        setInternalCourse(targetCourse);
        setIsOpen(true);
        setError(null);
        setIsPaying(false);
      }
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('open-payment-modal', handleOpenEvent);
      (window as any).openPaymentModal = (targetCourse: any) => {
        setInternalCourse(targetCourse);
        setIsOpen(true);
        setError(null);
        setIsPaying(false);
      };
    }

    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('open-payment-modal', handleOpenEvent);
      }
    };
  }, []);

  const handleClose = () => {
    if (isControlled && propOnClose) {
      propOnClose();
    } else {
      setIsOpen(false);
      setInternalCourse(null);
    }
  };

  // Lock body scroll when modal is active
  useEffect(() => {
    const shouldShow = isControlled ? Boolean(propCourse) : isOpen;
    if (shouldShow && typeof document !== 'undefined') {
      document.body.style.overflow = 'hidden';
    } else if (typeof document !== 'undefined') {
      document.body.style.overflow = '';
    }
    return () => {
      if (typeof document !== 'undefined') {
        document.body.style.overflow = '';
      }
    };
  }, [isControlled, propCourse, isOpen]);

  // Close modal on Escape key press and check cached referral code
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleClose();
    };
    window.addEventListener('keydown', handleKeyDown);

    // Auto-check for stored referral code
    try {
      const savedCode = localStorage.getItem('tsehay_applied_referral_code');
      if (savedCode && course?.id) {
        setReferralInput(savedCode);
        validateAndApplyCode(savedCode);
      }
    } catch (e) {}

    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [course?.id]);

  if (!mounted) return null;
  if (isControlled && !propCourse) return null;
  if (!isControlled && !isOpen) return null;
  if (!course) return null;

  // Safe Price Parsing
  const rawPrice = course.price;
  let originalPrice = 4500;
  if (typeof rawPrice === 'number') {
    originalPrice = rawPrice;
  } else if (typeof rawPrice === 'string') {
    const parsed = parseFloat(rawPrice.replace(/[^0-9.]/g, ''));
    if (!isNaN(parsed) && parsed > 0) {
      originalPrice = parsed;
    }
  }

  const isOriginallyFree = Boolean(
    course.isFree === true || 
    course.price === 'Free' || 
    course.price === '0' || 
    course.price === 0 || 
    originalPrice === 0
  );

  // Calculate dynamic discounted price
  const isFreeAfterDiscount = Boolean(isOriginallyFree || (discountPercent >= 100));
  const finalPrice = isFreeAfterDiscount 
    ? 0 
    : Math.max(0, Math.round(originalPrice * (1 - discountPercent / 100)));

  // Validate and Apply Promo Code
  const validateAndApplyCode = async (codeToTest?: string) => {
    const code = (codeToTest || referralInput).trim().toUpperCase();
    if (!code) {
      setReferralMessage({ text: 'እባክዎ የቅናሽ ኮድ ያስገቡ።', isError: true });
      return;
    }

    setIsValidatingCode(true);
    setReferralMessage(null);

    const result = await validateReferralCode(code, course?.id);

    setIsValidatingCode(false);

    if (result.isValid) {
      setAppliedCode(code);
      setDiscountPercent(result.discountPercent);
      setReferralMessage({ text: result.message, isError: false });
      try {
        localStorage.setItem('tsehay_applied_referral_code', code);
      } catch (e) {}
    } else {
      setAppliedCode(null);
      setDiscountPercent(0);
      setReferralMessage({ text: result.message, isError: true });
    }
  };

  const handleRemoveCode = () => {
    setAppliedCode(null);
    setDiscountPercent(0);
    setReferralInput('');
    setReferralMessage(null);
    try {
      localStorage.removeItem('tsehay_applied_referral_code');
    } catch (e) {}
  };

  const handlePayment = async () => {
    setIsPaying(true);
    setError(null);

    // 1. Authentication Check
    if (!user) {
      setIsPaying(false);
      try {
        sessionStorage.setItem('tsehay_pending_course_action', JSON.stringify({
          type: 'buy',
          courseId: course?.id,
          courseTitle: course?.title,
          course: course
        }));
        sessionStorage.setItem('tsehay_pending_action', JSON.stringify({
          type: 'buy_course',
          courseId: course?.id,
          courseTitle: course?.title,
          course: course
        }));
      } catch (e) {}

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('open-auth-modal', { detail: { isSignUp: false, isSignupMode: false } }));
      }
      return;
    }

    const targetCourseId = course.id || 'course_default';

    // 2. Handle 100% Free (Either Course Free or 100% Discount via Promo/Referral Code)
    if (isFreeAfterDiscount) {
      try {
        const purchaseRef = doc(db, 'artifacts', 'tsehaycampus-e1a6d', 'users', user.uid, 'purchased_courses', targetCourseId);
        await setDoc(purchaseRef, {
          courseId: targetCourseId,
          amount: 0,
          paymentMethod: appliedCode ? 'referral_code' : 'free',
          referralCode: appliedCode || null,
          discountPercent: discountPercent,
          purchasedAt: serverTimestamp(),
          status: 'active'
        }, { merge: true });

        if (appliedCode) {
          await recordReferralUsage(appliedCode);
        }

        try {
          localStorage.setItem('tsehay_user_active_course', JSON.stringify(course));
          if (course.lessons && course.lessons.length > 0) {
            localStorage.setItem('tsehay_user_active_lesson', JSON.stringify({ ...course.lessons[0], moduleIndex: 0, lessonIndex: 0 }));
          }
        } catch (e) {}

        try {
          const idToken = await user.getIdToken();
          fetch('/api/enroll-free', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${idToken}`
            },
            body: JSON.stringify({ 
              courseId: targetCourseId, 
              referralCode: appliedCode || null 
            })
          }).catch(e => console.warn("Background enrollment sync:", e));
        } catch (authErr) {}

        if (typeof window !== 'undefined') {
          window.location.href = `/dashboard?courseId=${targetCourseId}&lesson=0`;
        }
        return;
      } catch (err: any) {
        console.error("Free enrollment error:", err);
        setError("ምዝገባውን ማጠናቀቅ አልተቻለም። እባክዎ በድጋሚ ይሞክሩ።");
        setIsPaying(false);
        return;
      }
    }

    // 3. Paid Course Checkout with applied discount
    const targetAmount = finalPrice;
    const ref = `TC-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
    
    let fallbackUrl = '';
    if (paymethod === 'paypal') {
      fallbackUrl = `https://www.paypal.com/checkoutnow?reference=${ref}&amount=${(targetAmount / 125).toFixed(2)}`;
    } else if (paymethod === 'crypto' || paymethod === 'nowpayments') {
      fallbackUrl = `https://nowpayments.io/payment/?order_id=${ref}&price_amount=${(targetAmount / 125).toFixed(2)}`;
    }

    try {
      const res = await fetch('/api/initiate-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          courseId: targetCourseId,
          title: course.title,
          price: targetAmount,
          originalPrice: originalPrice,
          referralCode: appliedCode || null,
          discountPercent: discountPercent,
          userEmail: user?.email || 'student@example.com',
          userId: user?.uid || 'anonymous',
          paymethod: paymethod,
        })
      });
      
      const data = await res.json().catch(() => null);
      
      if (data && data.checkoutUrl) {
        if (appliedCode) {
          recordReferralUsage(appliedCode);
        }
        window.location.href = data.checkoutUrl;
      } else if (data && data.error) {
        setError(data.error);
        setIsPaying(false);
      } else {
        if (paymethod === 'lakipay') {
          setError('የLakiPay ሂሳብ ቁልፎች በ Vercel ላይ Redeploy መደረግ አለባቸው።');
          setIsPaying(false);
        } else {
          if (appliedCode) {
            recordReferralUsage(appliedCode);
          }
          window.location.href = fallbackUrl;
        }
      }
    } catch (err: any) {
      console.error("Payment initiation error:", err);
      if (paymethod === 'lakipay') {
        setError('የLakiPay ሂሳብ ቁልፎችን ማግኘት አልተቻለም። እባክዎ Vercel ላይ Redeploy ማድረጉን ያረጋግጡ።');
        setIsPaying(false);
      } else {
        if (appliedCode) {
          recordReferralUsage(appliedCode);
        }
        window.location.href = fallbackUrl;
      }
    }
  };

  const modalContent = (
    <div 
      id="payment-modal-backdrop" 
      className="fixed inset-0 z-[99999999] w-screen h-screen bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-hidden animate-[paymentBackdropFade_0.3s_ease-out_forwards]"
      onClick={(e) => { 
        if (e.target === e.currentTarget && !isPaying) handleClose(); 
      }}
    >
      {/* 🌟 Rotating Glowing Border Beam Wrapper (ሽክርክር የሚል የመስመር ብርሃን) */}
      <div className="relative p-[2px] rounded-[2rem] overflow-hidden max-w-lg w-full m-auto shadow-[0_25px_90px_rgba(0,0,0,0.95)] animate-[paymentModalPop_0.4s_cubic-bezier(0.16,1,0.3,1)_forwards] group">
        
        {/* 💫 360° Rotating Cybernetic Border Beam (ሽክርክር የሚል የመስመር ብርሃን) */}
        <div 
          className="absolute -inset-[200%] z-0 rounded-full animate-[spinLightBeam_5s_linear_infinite]"
          style={{
            background: 'conic-gradient(from 0deg, transparent 0deg, transparent 200deg, rgba(50, 104, 186, 0.5) 240deg, #f9b03c 290deg, #ffe066 330deg, #ffffff 360deg)',
            filter: 'blur(1.5px)'
          }}
        />

        {/* 🌟 Ambient Glow Diffusion Aura */}
        <div 
          className="absolute -inset-[200%] z-0 rounded-full animate-[spinLightBeam_5s_linear_infinite] opacity-60 pointer-events-none"
          style={{
            background: 'conic-gradient(from 0deg, transparent 0deg, transparent 180deg, rgba(249, 176, 60, 0.7) 270deg, rgba(50, 104, 186, 0.8) 330deg, transparent 360deg)',
            filter: 'blur(20px)'
          }}
        />

        {/* 🌟 Inner Centered Modal Card */}
        <div 
          className="bg-[#0b0f19] text-white w-full max-h-[90vh] flex flex-col relative z-10 rounded-[calc(2rem-2px)] overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Top Glowing Golden Accent Line */}
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-amber-400 via-[#f9b03c] to-yellow-300 shadow-[0_0_15px_rgba(249,176,60,0.8)] z-30" />

          {/* Modal Header */}
          <div className="px-5 py-4 sm:px-6 sm:py-5 border-b border-gray-800/80 flex justify-between items-center bg-[#0d1424] sticky top-0 z-20 backdrop-blur-lg">
            <div>
              <h3 className="font-black text-lg sm:text-xl font-heading text-white flex items-center gap-2">
                <i className="fa-solid fa-shield-halved text-[#f9b03c]"></i> 
                <span>ደህንነቱ የተጠበቀ ክፍያ</span>
              </h3>
              <p className="text-xs text-emerald-400 font-bold mt-0.5 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                <span>100% አስተማማኝ እና ፈጣን ማረጋገጫ</span>
              </p>
            </div>
            <button 
              type="button"
              onClick={handleClose} 
              disabled={isPaying} 
              className="text-gray-400 hover:text-white hover:bg-gray-800 transition text-xl p-2 rounded-full w-9 h-9 flex items-center justify-center cursor-pointer disabled:opacity-50"
              title="ዝጋ (Close)"
            >
              <i className="fa-solid fa-xmark"></i>
            </button>
          </div>
          
          {/* Modal Scrollable Body */}
          <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5">
            
            {/* Selected Course Card */}
            <div className="flex items-center gap-3.5 bg-[#121a2d] p-3.5 sm:p-4 rounded-2xl border border-gray-800/90 shadow-inner">
              <img 
                src={course.image || 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?q=80&w=1000&auto=format&fit=crop'} 
                className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl object-cover shadow-sm border border-gray-700/80 shrink-0" 
                alt={course.title} 
              />
              <div className="flex-1 min-w-0">
                <p className="text-[10px] text-[#f9b03c] font-black mb-1 uppercase tracking-widest">የተመረጠው ኮርስ</p>
                <h4 className="font-black text-white text-xs sm:text-base leading-snug line-clamp-2">{course.title}</h4>
              </div>
            </div>

            {/* 🌟 Promo Code Box */}
            <div className="bg-[#121a2d]/80 p-3.5 sm:p-4 rounded-2xl border border-gray-800/90 space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-gray-300">
                <span className="flex items-center gap-1.5">
                  <i className="fa-solid fa-tag text-[#f9b03c]"></i>
                  <span>የቅናሽ ኮድ (Promo Code)</span>
                </span>
                {appliedCode && (
                  <span className="text-[11px] text-emerald-400 font-bold">✓ ተተግብሯል ({discountPercent}% OFF)</span>
                )}
              </div>

              <div className="flex items-center gap-2">
                <input 
                  type="text" 
                  placeholder="የቅናሽ ኮድ (Promo Code)" 
                  value={referralInput}
                  disabled={isPaying || !!appliedCode}
                  onChange={(e) => setReferralInput(e.target.value.toUpperCase().replace(/\s+/g, ''))}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); validateAndApplyCode(); } }}
                  className="flex-1 bg-[#080d1a] border border-gray-700/90 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm font-mono uppercase tracking-wider text-white outline-none focus:border-[#f9b03c] transition disabled:opacity-60"
                />
                {appliedCode ? (
                  <button
                    type="button"
                    onClick={handleRemoveCode}
                    disabled={isPaying}
                    className="bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/40 font-bold px-3.5 py-2.5 rounded-xl text-xs transition cursor-pointer shrink-0"
                  >
                    አስወግድ
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => validateAndApplyCode()}
                    disabled={isValidatingCode || isPaying || !referralInput.trim()}
                    className="bg-gradient-to-r from-[#f9b03c] to-amber-400 hover:brightness-110 text-slate-950 font-black px-4 py-2.5 rounded-xl text-xs transition shadow-sm hover:shadow-[0_0_15px_rgba(249,176,60,0.3)] cursor-pointer disabled:opacity-50 shrink-0 active:scale-95"
                  >
                    {isValidatingCode ? <i className="fa-solid fa-spinner fa-spin"></i> : 'ተጠቀም (Apply)'}
                  </button>
                )}
              </div>

              {referralMessage && (
                <div className={`text-xs font-bold flex items-center gap-1.5 pt-0.5 animate-in fade-in ${referralMessage.isError ? 'text-red-400' : 'text-emerald-400'}`}>
                  <i className={`fa-solid ${referralMessage.isError ? 'fa-circle-exclamation' : 'fa-circle-check'}`}></i>
                  <span>{referralMessage.text}</span>
                </div>
              )}
            </div>

            {/* Dynamic Price Display */}
            <div className="flex justify-between items-center py-3 border-y border-gray-800/80">
              <div>
                <span className="text-gray-300 font-bold text-xs sm:text-sm uppercase tracking-wider block">ጠቅላላ የሚከፈል</span>
                {appliedCode && discountPercent > 0 && !isOriginallyFree && (
                  <span className="text-xs text-gray-400 line-through">
                    {originalPrice.toLocaleString()} ETB
                  </span>
                )}
              </div>
              <div className="text-right">
                <span className="text-xl sm:text-3xl font-black text-[#f9b03c] tracking-tight">
                  {isFreeAfterDiscount ? "0 ETB (ነፃ)" : `${finalPrice.toLocaleString()} ETB`}
                </span>
                {appliedCode && discountPercent > 0 && (
                  <span className="block text-[11px] font-bold text-emerald-400">
                    {discountPercent >= 100 ? '100% FREE Pass' : `${discountPercent}% ቅናሽ ተደርጓል`}
                  </span>
                )}
              </div>
            </div>

            {/* Payment Methods (Clickable Cards with Hover Effects) */}
            {!isFreeAfterDiscount && (
              <div className="space-y-3">
                <h4 className="font-bold text-xs text-gray-400 uppercase tracking-wider">የክፍያ አማራጭ ይምረጡ</h4>
                
                {/* Option 1: LakiPay */}
                <label 
                  className={`payment-option flex items-center justify-between p-3.5 sm:p-4 rounded-2xl border cursor-pointer transition-all duration-200 transform hover:-translate-y-0.5 ${paymethod === 'lakipay' ? 'border-[#f9b03c] bg-amber-500/10 shadow-[0_0_20px_rgba(249,176,60,0.2)] ring-2 ring-amber-500/40' : 'border-gray-800/90 bg-[#121a2d] hover:bg-[#16233d] hover:border-gray-700'}`}
                >
                  <div className="flex items-center gap-3 min-w-0 pr-2">
                    <input 
                      type="radio" 
                      name="paymethod" 
                      value="lakipay" 
                      checked={paymethod === 'lakipay'} 
                      onChange={() => setPaymethod('lakipay')} 
                      className="w-4 h-4 sm:w-5 sm:h-5 text-amber-500 focus:ring-amber-500 accent-amber-500 cursor-pointer shrink-0" 
                    />
                    <div className="min-w-0">
                      <span className="font-black text-white text-base sm:text-lg block leading-tight">LakiPay</span>
                      <span className="text-[11px] sm:text-xs text-[#f9b03c] font-bold block mt-0.5">For Local Payments</span>
                    </div>
                  </div>
                  <div className="bg-white w-24 sm:w-32 h-9 sm:h-10 px-2 rounded-xl flex items-center justify-center shadow-md border border-gray-200 shrink-0">
                    <img src="/lakipay-logo.svg" alt="LakiPay" className="h-5 sm:h-6 w-auto max-w-full object-contain" />
                  </div>
                </label>

                {/* Option 2: PayPal */}
                <label 
                  className={`payment-option flex items-center justify-between p-3.5 sm:p-4 rounded-2xl border cursor-pointer transition-all duration-200 transform hover:-translate-y-0.5 ${paymethod === 'paypal' ? 'border-blue-500 bg-blue-500/10 shadow-[0_0_20px_rgba(59,130,246,0.2)] ring-2 ring-blue-500/40' : 'border-gray-800/90 bg-[#121a2d] hover:bg-[#16233d] hover:border-gray-700'}`}
                >
                  <div className="flex items-center gap-3 min-w-0 pr-2">
                    <input 
                      type="radio" 
                      name="paymethod" 
                      value="paypal" 
                      checked={paymethod === 'paypal'} 
                      onChange={() => setPaymethod('paypal')} 
                      className="w-4 h-4 sm:w-5 sm:h-5 text-blue-500 focus:ring-blue-500 accent-blue-500 cursor-pointer shrink-0" 
                    />
                    <div className="min-w-0">
                      <span className="font-black text-white text-base sm:text-lg block leading-tight">PayPal</span>
                      <span className="text-[11px] sm:text-xs text-blue-400 font-bold block mt-0.5">For International Payments</span>
                    </div>
                  </div>
                  <div className="bg-white w-24 sm:w-32 h-9 sm:h-10 px-2 rounded-xl flex items-center justify-center shadow-md border border-gray-200 shrink-0">
                    <img src="/paypal-logo.svg" alt="PayPal" className="h-5 sm:h-6 w-auto max-w-full object-contain" />
                  </div>
                </label>

                {/* Option 3: NOWPayments (Crypto) */}
                <label 
                  className={`payment-option flex items-center justify-between p-3.5 sm:p-4 rounded-2xl border cursor-pointer transition-all duration-200 transform hover:-translate-y-0.5 ${paymethod === 'crypto' || paymethod === 'nowpayments' ? 'border-cyan-500 bg-cyan-500/10 shadow-[0_0_20px_rgba(6,182,212,0.2)] ring-2 ring-cyan-500/40' : 'border-gray-800/90 bg-[#121a2d] hover:bg-[#16233d] hover:border-gray-700'}`}
                >
                  <div className="flex items-center gap-3 min-w-0 pr-2">
                    <input 
                      type="radio" 
                      name="paymethod" 
                      value="nowpayments" 
                      checked={paymethod === 'crypto' || paymethod === 'nowpayments'} 
                      onChange={() => setPaymethod('nowpayments')} 
                      className="w-4 h-4 sm:w-5 sm:h-5 text-cyan-500 focus:ring-cyan-500 accent-cyan-500 cursor-pointer shrink-0" 
                    />
                    <div className="min-w-0">
                      <span className="font-black text-white text-base sm:text-lg block leading-tight">NowPayments</span>
                      <span className="text-[11px] sm:text-xs text-cyan-400 font-bold block mt-0.5">For Crypto Payments</span>
                    </div>
                  </div>
                  <div className="bg-white w-24 sm:w-32 h-9 sm:h-10 px-2 rounded-xl flex items-center justify-center shadow-md border border-gray-200 shrink-0">
                    <img src="/nowpayments-logo.svg" alt="NOWPayments" className="h-5 sm:h-6 w-auto max-w-full object-contain" />
                  </div>
                </label>
              </div>
            )}

            {error && (
              <div className="bg-red-900/40 text-red-300 border border-red-800 p-3.5 rounded-xl font-bold text-xs text-center animate-in fade-in">
                {error}
              </div>
            )}

            {/* Primary Action Button */}
            <button 
              type="button"
              onClick={handlePayment} 
              disabled={isPaying} 
              className="w-full btn-buy-now-vibe py-4 rounded-2xl text-base transition-all flex items-center justify-center gap-2.5 group disabled:opacity-70 cursor-pointer active:scale-[0.98] shadow-[0_0_40px_rgba(249,176,60,0.6)]"
            >
              {isPaying ? (
                <>
                  <div className="w-5 h-5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin"></div>
                  <span className="font-black">በማስኬድ ላይ... (Processing...)</span>
                </>
              ) : isFreeAfterDiscount ? (
                <>
                  <i className="fa-solid fa-gift text-lg buy-icon-animated"></i>
                  <span className="font-black">በነፃ ይመዝገቡ (Enroll 100% Free) 🎉</span>
                </>
              ) : (
                <>
                  <i className="fa-solid fa-lock text-xs text-slate-950/80 mr-0.5"></i>
                  <span className="font-black">ወደ ክፍያ ይቀጥሉ ({finalPrice.toLocaleString()} ETB)</span> 
                  <i className="fa-solid fa-arrow-right text-xs group-hover:translate-x-1 transition-transform"></i>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Cinematic Entrance & Rotating Light Beam CSS Keyframes */}
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes paymentBackdropFade {
          0% { opacity: 0; }
          100% { opacity: 1; }
        }
        @keyframes paymentModalPop {
          0% { opacity: 0; transform: scale(0.90) translateY(18px); }
          100% { opacity: 1; transform: scale(1) translateY(0); }
        }
        @keyframes spinLightBeam {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}} />
    </div>
  );

  return createPortal(modalContent, document.body);
}
