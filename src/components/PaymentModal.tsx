'use client';
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { db } from '@/lib/firebase/config';
import { doc, setDoc, serverTimestamp, arrayUnion } from 'firebase/firestore';

export default function PaymentModal({ course, onClose }: any) {
  const [paymethod, setPaymethod] = useState('lakipay');
  const [isPaying, setIsPaying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  // Close modal on Escape key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!course) return null;

  const handlePayment = async () => {
    setIsPaying(true);
    setError(null);

    // Authentication Check Before Payment
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
    const targetAmount = Number(course.price) || 4500;
    const ref = `TC-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
    
    // Default fail-safe checkout URLs for each method
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
          price: course.price,
          userEmail: user?.email || 'student@example.com',
          userId: user?.uid || 'anonymous',
          paymethod: paymethod,
        })
      });
      
      const data = await res.json().catch(() => null);
      
      if (data && data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
      } else if (data && data.error) {
        setError(data.error);
        setIsPaying(false);
      } else {
        if (paymethod === 'lakipay') {
          setError('የLakiPay ሂሳብ ቁልፎች በ Vercel ላይ Redeploy መደረግ አለባቸው።');
          setIsPaying(false);
        } else {
          window.location.href = fallbackUrl;
        }
      }
    } catch (err: any) {
      console.error("Payment initiation error:", err);
      if (paymethod === 'lakipay') {
        setError('የLakiPay ሂሳብ ቁልፎችን ማግኘት አልተቻለም። እባክዎ Vercel ላይ Redeploy ማድረጉን ያረጋግጡ።');
        setIsPaying(false);
      } else {
        window.location.href = fallbackUrl;
      }
    }
  };

  return (
    <div id="payment-modal" className="fixed inset-0 bg-black/80 z-[9999] flex items-center justify-center backdrop-blur-md p-4" onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
        <div className="bg-[#0b1329] text-white w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-[2rem] shadow-2xl flex flex-col relative animate-[modalPop_0.3s_ease-out_forwards] border border-gray-800">
            
            {/* Header */}
            <div className="p-5 sm:p-6 border-b border-gray-800/80 flex justify-between items-center bg-[#0d1735] sticky top-0 z-20">
                <div>
                  <h3 className="font-black text-lg sm:text-xl font-heading text-white flex items-center gap-2">
                      <i className="fa-solid fa-shield-halved text-amber-400"></i> ደህንነቱ የተጠበቀ ክፍያ
                  </h3>
                  <p className="text-xs text-emerald-400 font-bold mt-0.5">100% አስተማማኝ እና ፈጣን ማረጋገጫ</p>
                </div>
                <button onClick={onClose} className="text-gray-400 hover:text-white hover:bg-gray-800 transition text-xl p-2 rounded-full w-9 h-9 flex items-center justify-center cursor-pointer">
                    <i className="fa-solid fa-xmark"></i>
                </button>
            </div>
            
            <div className="p-4 sm:p-6">
                
                {/* Course Info */}
                <div className="flex items-center gap-3.5 bg-[#121e3d] p-3.5 sm:p-4 rounded-2xl border border-gray-800 mb-5">
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

                {/* Total */}
                <div className="flex justify-between items-center mb-5 pb-4 border-b border-gray-800">
                    <span className="text-gray-300 font-bold text-xs sm:text-sm uppercase tracking-wider">ጠቅላላ ክፍያ</span>
                    <span className="text-xl sm:text-3xl font-black text-amber-400 tracking-tight">
                        {course.isFree ? "ነፃ" : `${Number(course.price).toLocaleString()} ETB`}
                    </span>
                </div>

                {!course.isFree && (
                    <>
                        <h4 className="font-bold text-xs text-gray-400 mb-3 uppercase tracking-wider">የክፍያ አማራጭ ይምረጡ</h4>
                        <div className="space-y-3 mb-5">
                            
                            {/* Option 1: LakiPay */}
                            <label 
                              style={{ animation: 'optionPop 0.45s cubic-bezier(0.16, 1, 0.3, 1) 0.08s backwards' }}
                              className={`payment-option flex items-center justify-between p-3.5 sm:p-4.5 rounded-2xl border cursor-pointer transition-all ${paymethod === 'lakipay' ? 'border-amber-500 bg-amber-500/10 shadow-lg ring-2 ring-amber-500/40 scale-[1.01]' : 'border-gray-800 bg-[#121e3d] hover:bg-[#16254a]'}`}
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
                                        <span className="text-[11px] sm:text-xs text-amber-400 font-bold block mt-0.5">For local payment</span>
                                    </div>
                                </div>
                                <div className="flex items-center shrink-0">
                                    <div className="bg-white w-28 sm:w-36 h-10 sm:h-11 px-2.5 rounded-xl flex items-center justify-center shadow-md border border-gray-200">
                                        <img src="/lakipay-logo.svg" alt="LakiPay" className="h-6 sm:h-7 w-auto max-w-full object-contain" />
                                    </div>
                                </div>
                            </label>

                            {/* Option 2: PayPal */}
                            <label 
                              style={{ animation: 'optionPop 0.45s cubic-bezier(0.16, 1, 0.3, 1) 0.18s backwards' }}
                              className={`payment-option flex items-center justify-between p-3.5 sm:p-4.5 rounded-2xl border cursor-pointer transition-all ${paymethod === 'paypal' ? 'border-blue-500 bg-blue-500/10 shadow-lg ring-2 ring-blue-500/40 scale-[1.01]' : 'border-gray-800 bg-[#121e3d] hover:bg-[#16254a]'}`}
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
                                        <span className="text-[11px] sm:text-xs text-blue-400 font-bold block mt-0.5">For international payments</span>
                                    </div>
                                </div>
                                <div className="flex items-center shrink-0">
                                    <div className="bg-white w-28 sm:w-36 h-10 sm:h-11 px-2.5 rounded-xl flex items-center justify-center shadow-md border border-gray-200">
                                        <img src="/paypal-logo.svg" alt="PayPal" className="h-6 sm:h-7 w-auto max-w-full object-contain" />
                                    </div>
                                </div>
                            </label>

                            {/* Option 3: NOWPayments (Crypto) */}
                            <label 
                              style={{ animation: 'optionPop 0.45s cubic-bezier(0.16, 1, 0.3, 1) 0.28s backwards' }}
                              className={`payment-option flex items-center justify-between p-3.5 sm:p-4.5 rounded-2xl border cursor-pointer transition-all ${paymethod === 'crypto' || paymethod === 'nowpayments' ? 'border-cyan-500 bg-cyan-500/10 shadow-lg ring-2 ring-cyan-500/40 scale-[1.01]' : 'border-gray-800 bg-[#121e3d] hover:bg-[#16254a]'}`}
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
                                        <span className="font-black text-white text-base sm:text-lg block leading-tight">NOWPayments</span>
                                        <span className="text-[11px] sm:text-xs text-cyan-400 font-bold block mt-0.5">For crypto payments</span>
                                    </div>
                                </div>
                                <div className="flex items-center shrink-0">
                                    <div className="bg-white w-28 sm:w-36 h-10 sm:h-11 px-2.5 rounded-xl flex items-center justify-center shadow-md border border-gray-200">
                                        <img src="/nowpayments-logo.svg" alt="NOWPayments" className="h-6 sm:h-7 w-auto max-w-full object-contain" />
                                    </div>
                                </div>
                            </label>

                        </div>
                    </>
                )}

                {error && <div className="bg-red-900/40 text-red-300 border border-red-800 p-3.5 rounded-xl mb-4 font-bold text-xs text-center">{error}</div>}

                {/* Primary Proceed Button */}
                <button 
                  style={{ animation: 'optionPop 0.45s cubic-bezier(0.16, 1, 0.3, 1) 0.36s backwards' }}
                  onClick={handlePayment} 
                  disabled={isPaying} 
                  className="w-full bg-amber-500 hover:bg-amber-400 text-slate-950 font-black py-4 rounded-2xl text-base transition-all shadow-lg hover:shadow-amber-500/25 flex items-center justify-center gap-2 group disabled:opacity-70 cursor-pointer active:scale-[0.98]"
                >
                    {isPaying ? (
                        <>
                            <div className="w-5 h-5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin"></div>
                            <span>በማስኬድ ላይ...</span>
                        </>
                    ) : (
                        <>
                            <span>{course.isFree ? 'በነፃ ይመዝገቡ' : 'ወደ ክፍያ ይቀጥሉ'}</span> 
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
            @keyframes optionPop {
                0% { 
                    opacity: 0; 
                    transform: translateY(22px) scale(0.94); 
                }
                60% {
                    opacity: 1;
                    transform: translateY(-2px) scale(1.01);
                }
                100% { 
                    opacity: 1; 
                    transform: translateY(0) scale(1); 
                }
            }
        `}} />
    </div>
  );
}
