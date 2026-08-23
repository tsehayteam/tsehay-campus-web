'use client';
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { db } from '@/lib/firebase/config';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { validateReferralCode, recordReferralUsage } from '@/lib/referralService';

export default function PaymentModal({ course, onClose }: any) {
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

  // Close modal on Escape key press and check cached referral code
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
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
  }, [onClose, course?.id]);

  if (!course) return null;

  const originalPrice = Number(course.price) || 4500;
  const isOriginallyFree = course.isFree || course.price === 'Free' || course.price === '0' || course.price === 0;

  // Calculate dynamic discounted price
  const isFreeAfterDiscount = isOriginallyFree || discountPercent >= 100;
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
      setError("ክፍያውን ለመፈጸም እባክዎ አስቀድመው ይግቡ።");
      setIsPaying(false);
      if (typeof window !== 'undefined') {
        const globalWin = window as any;
        if (typeof globalWin.openAuthModal === 'function') {
          globalWin.openAuthModal(false);
        } else {
          window.dispatchEvent(new CustomEvent('open-auth-modal', { detail: { isSignUp: false } }));
        }
      }
      return;
    }

    const targetCourseId = course.id || 'course_default';

    // 2. Handle 100% Free (Either Course Free or 100% Discount via Promo/Referral Code)
    if (isFreeAfterDiscount) {
      try {
        // Record direct purchase/enrollment in Firestore
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

        // If a referral code was used, record usage count
        if (appliedCode) {
          await recordReferralUsage(appliedCode);
        }

        // Cache active course for zero-latency classroom view
        try {
          localStorage.setItem('tsehay_user_active_course', JSON.stringify(course));
          if (course.lessons && course.lessons.length > 0) {
            localStorage.setItem('tsehay_user_active_lesson', JSON.stringify({ ...course.lessons[0], moduleIndex: 0, lessonIndex: 0 }));
          }
        } catch (e) {}

        // Notify free enrollment API in background
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

        // Redirect to dashboard
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

  return (
    <div id="payment-modal" className="fixed inset-0 bg-black/80 z-[9999] flex items-center justify-center backdrop-blur-md p-4" onClick={(e) => { if (e.target === e.currentTarget && !isPaying) onClose() }}>
        <div className="bg-[#0b1329] text-white w-full max-w-lg max-h-[92vh] overflow-y-auto rounded-[2rem] shadow-2xl flex flex-col relative animate-[modalPop_0.3s_ease-out_forwards] border border-gray-800">
            
            {/* Header */}
            <div className="p-5 sm:p-6 border-b border-gray-800/80 flex justify-between items-center bg-[#0d1735] sticky top-0 z-20">
                <div>
                  <h3 className="font-black text-lg sm:text-xl font-heading text-white flex items-center gap-2">
                      <i className="fa-solid fa-shield-halved text-amber-400"></i> ደህንነቱ የተጠበቀ ክፍያ
                  </h3>
                  <p className="text-xs text-emerald-400 font-bold mt-0.5">100% አስተማማኝ እና ፈጣን ማረጋገጫ</p>
                </div>
                <button onClick={onClose} disabled={isPaying} className="text-gray-400 hover:text-white hover:bg-gray-800 transition text-xl p-2 rounded-full w-9 h-9 flex items-center justify-center cursor-pointer disabled:opacity-50">
                    <i className="fa-solid fa-xmark"></i>
                </button>
            </div>
            
            <div className="p-4 sm:p-6 space-y-5">
                
                {/* Course Info Card */}
                <div className="flex items-center gap-3.5 bg-[#121e3d] p-3.5 sm:p-4 rounded-2xl border border-gray-800">
                    <img 
                      src={course.image || 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?q=80&w=1000&auto=format&fit=crop'} 
                      className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl object-cover shadow-sm border border-gray-700 shrink-0" 
                      alt={course.title} 
                    />
                    <div className="flex-1 min-w-0">
                        <p className="text-[10px] text-amber-400/90 font-black mb-1 uppercase tracking-widest">የተመረጠው ኮርስ</p>
                        <h4 className="font-black text-white text-xs sm:text-base leading-snug line-clamp-2">{course.title}</h4>
                    </div>
                </div>

                {/* 🌟 REFERRAL / PROMO CODE INPUT BOX */}
                <div className="bg-[#121e3d]/80 p-3.5 sm:p-4 rounded-2xl border border-gray-800 space-y-2">
                    <label className="text-xs font-bold text-gray-300 flex items-center justify-between">
                        <span className="flex items-center gap-1.5">
                            <i className="fa-solid fa-ticket text-[#f9b03c]"></i>
                            <span>የሪፈራል ወይም የቅናሽ ኮድ (Referral / Promo Code)</span>
                        </span>
                        {appliedCode && (
                            <span className="text-[11px] text-emerald-400 font-bold">✓ ተተግብሯል ({discountPercent}% OFF)</span>
                        )}
                    </label>

                    <div className="flex items-center gap-2">
                        <input 
                          type="text" 
                          placeholder="ኮድ ያስገቡ (e.g. TSEHAY50, FREE100)" 
                          value={referralInput}
                          disabled={isPaying || !!appliedCode}
                          onChange={(e) => setReferralInput(e.target.value.toUpperCase().replace(/\s+/g, ''))}
                          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); validateAndApplyCode(); } }}
                          className="flex-1 bg-[#0b1329] border border-gray-700 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm font-mono uppercase tracking-wider text-white outline-none focus:border-[#f9b03c] transition disabled:opacity-60"
                        />
                        {appliedCode ? (
                            <button
                              type="button"
                              onClick={handleRemoveCode}
                              disabled={isPaying}
                              className="bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/40 font-bold px-3 py-2.5 rounded-xl text-xs transition cursor-pointer shrink-0"
                            >
                                አስወግድ
                            </button>
                        ) : (
                            <button
                              type="button"
                              onClick={() => validateAndApplyCode()}
                              disabled={isValidatingCode || isPaying || !referralInput.trim()}
                              className="bg-[#f9b03c] hover:bg-[#ffbe53] text-slate-950 font-black px-4 py-2.5 rounded-xl text-xs transition shadow-sm cursor-pointer disabled:opacity-50 shrink-0"
                            >
                                {isValidatingCode ? <i className="fa-solid fa-spinner fa-spin"></i> : 'ተግብር (Apply)'}
                            </button>
                        )}
                    </div>

                    {referralMessage && (
                        <p className={`text-xs font-bold flex items-center gap-1.5 ${referralMessage.isError ? 'text-red-400' : 'text-emerald-400'}`}>
                            <i className={`fa-solid ${referralMessage.isError ? 'fa-circle-exclamation' : 'fa-circle-check'}`}></i>
                            <span>{referralMessage.text}</span>
                        </p>
                    )}
                </div>

                {/* Total Calculation Display */}
                <div className="flex justify-between items-center py-3 border-y border-gray-800">
                    <div>
                      <span className="text-gray-300 font-bold text-xs sm:text-sm uppercase tracking-wider block">ጠቅላላ የሚከፈል</span>
                      {appliedCode && discountPercent > 0 && !isOriginallyFree && (
                        <span className="text-xs text-gray-400 line-through">
                          {originalPrice.toLocaleString()} ETB
                        </span>
                      )}
                    </div>
                    <div className="text-right">
                      <span className="text-xl sm:text-3xl font-black text-amber-400 tracking-tight">
                          {isFreeAfterDiscount ? "0 ETB (ነፃ)" : `${finalPrice.toLocaleString()} ETB`}
                      </span>
                      {appliedCode && discountPercent > 0 && (
                        <span className="block text-[11px] font-bold text-emerald-400">
                          {discountPercent >= 100 ? '100% FREE Pass' : `${discountPercent}% ቅናሽ ተደርጓል`}
                        </span>
                      )}
                    </div>
                </div>

                {/* Payment Methods (Hidden if 100% Free) */}
                {!isFreeAfterDiscount && (
                    <div className="space-y-3">
                        <h4 className="font-bold text-xs text-gray-400 uppercase tracking-wider">የክፍያ አማራጭ ይምረጡ</h4>
                        
                        {/* Option 1: LakiPay */}
                        <label 
                          className={`payment-option flex items-center justify-between p-3.5 sm:p-4 rounded-2xl border cursor-pointer transition-all ${paymethod === 'lakipay' ? 'border-amber-500 bg-amber-500/10 shadow-lg ring-2 ring-amber-500/40 scale-[1.01]' : 'border-gray-800 bg-[#121e3d] hover:bg-[#16254a]'}`}
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
                                    <span className="text-[11px] sm:text-xs text-amber-400 font-bold block mt-0.5">Telebirr, CBE, Awash, BOA</span>
                                </div>
                            </div>
                            <div className="bg-white w-24 sm:w-32 h-9 sm:h-10 px-2 rounded-xl flex items-center justify-center shadow-md border border-gray-200 shrink-0">
                                <img src="/lakipay-logo.svg" alt="LakiPay" className="h-5 sm:h-6 w-auto max-w-full object-contain" />
                            </div>
                        </label>

                        {/* Option 2: PayPal */}
                        <label 
                          className={`payment-option flex items-center justify-between p-3.5 sm:p-4 rounded-2xl border cursor-pointer transition-all ${paymethod === 'paypal' ? 'border-blue-500 bg-blue-500/10 shadow-lg ring-2 ring-blue-500/40 scale-[1.01]' : 'border-gray-800 bg-[#121e3d] hover:bg-[#16254a]'}`}
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
                                    <span className="text-[11px] sm:text-xs text-blue-400 font-bold block mt-0.5">International Card / PayPal</span>
                                </div>
                            </div>
                            <div className="bg-white w-24 sm:w-32 h-9 sm:h-10 px-2 rounded-xl flex items-center justify-center shadow-md border border-gray-200 shrink-0">
                                <img src="/paypal-logo.svg" alt="PayPal" className="h-5 sm:h-6 w-auto max-w-full object-contain" />
                            </div>
                        </label>

                        {/* Option 3: NOWPayments (Crypto) */}
                        <label 
                          className={`payment-option flex items-center justify-between p-3.5 sm:p-4 rounded-2xl border cursor-pointer transition-all ${paymethod === 'crypto' || paymethod === 'nowpayments' ? 'border-cyan-500 bg-cyan-500/10 shadow-lg ring-2 ring-cyan-500/40 scale-[1.01]' : 'border-gray-800 bg-[#121e3d] hover:bg-[#16254a]'}`}
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
                                    <span className="font-black text-white text-base sm:text-lg block leading-tight">Crypto (USDT / BTC)</span>
                                    <span className="text-[11px] sm:text-xs text-cyan-400 font-bold block mt-0.5">Instant Crypto Checkout</span>
                                </div>
                            </div>
                            <div className="bg-white w-24 sm:w-32 h-9 sm:h-10 px-2 rounded-xl flex items-center justify-center shadow-md border border-gray-200 shrink-0">
                                <img src="/nowpayments-logo.svg" alt="NOWPayments" className="h-5 sm:h-6 w-auto max-w-full object-contain" />
                            </div>
                        </label>
                    </div>
                )}

                {error && <div className="bg-red-900/40 text-red-300 border border-red-800 p-3.5 rounded-xl font-bold text-xs text-center animate-in fade-in">{error}</div>}

                {/* Primary Proceed Button */}
                <button 
                  onClick={handlePayment} 
                  disabled={isPaying} 
                  className="w-full bg-[#f9b03c] hover:bg-[#ffbe53] text-slate-950 font-black py-4 rounded-2xl text-base transition-all shadow-lg hover:shadow-[0_0_25px_rgba(249,176,60,0.4)] flex items-center justify-center gap-2 group disabled:opacity-70 cursor-pointer active:scale-[0.98]"
                >
                    {isPaying ? (
                        <>
                            <div className="w-5 h-5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin"></div>
                            <span>በማስኬድ ላይ...</span>
                        </>
                    ) : isFreeAfterDiscount ? (
                        <>
                            <i className="fa-solid fa-gift text-lg"></i>
                            <span>በነፃ ይመዝገቡ (Enroll 100% Free) 🎉</span>
                        </>
                    ) : (
                        <>
                            <span>ወደ ክፍያ ይቀጥሉ ({finalPrice.toLocaleString()} ETB)</span> 
                            <i className="fa-solid fa-arrow-up-right-from-square group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform"></i>
                        </>
                    )}
                </button>
            </div>
        </div>
        <style dangerouslySetInnerHTML={{__html: `
            @keyframes modalPop {
                0% { opacity: 0; transform: scale(0.92) translateY(12px); }
                100% { opacity: 1; transform: scale(1) translateY(0); }
            }
        `}} />
    </div>
  );
}
