'use client';
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';

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

    // 1. Authentication Check Before Payment
    if (!user) {
      setError("ክፍያውን ለማጠናቀቅ እባክዎ አስቀድመው ይግቡ (Please login to complete payment).");
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

    try {
      if (paymethod === 'lakipay' || paymethod === 'crypto' || paymethod === 'nowpayments') {
        const res = await fetch('/api/initiate-payment', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            courseId: course.id,
            title: course.title,
            description: course.description,
            price: course.price,
            paymethod: paymethod === 'nowpayments' ? 'crypto' : paymethod,
            userEmail: user.email || 'student@example.com',
            userId: user.uid,
          })
        });
        
        const data = await res.json();
        
        if (data.checkoutUrl) {
          window.location.href = data.checkoutUrl;
        } else {
          setError(data.error || "የክፍያ ሲስተሙን ማግኘት አልተቻለም። እባክዎ በድጋሚ ይሞክሩ።");
          setIsPaying(false);
        }
      } else {
        // PayPal & International Credit Cards Processing Flow
        setTimeout(async () => {
          try {
            const { doc, setDoc, serverTimestamp } = await import('firebase/firestore');
            const { db } = await import('@/lib/firebase/config');
            
            const docRef = doc(db, 'artifacts', 'tsehaycampus-e1a6d', 'users', user.uid, 'purchased_courses', course.id);
            await setDoc(docRef, {
                courseId: course.id,
                amount: course.price,
                paymentMethod: paymethod,
                purchasedAt: serverTimestamp(),
                status: 'active'
            });
            
            setIsPaying(false);
            onClose();
            window.location.href = '/dashboard?success=true&course=' + course.id;
            
          } catch (dbError: any) {
            console.error("Database enrollment error:", dbError);
            setError("ክፍያው ተፈፅሟል ነገር ግን ኮርሱን መክፈት አልተቻለም። እባክዎ ያግኙን።");
            setIsPaying(false);
          }
        }, 1500);
      }
    } catch (err: any) {
      setError("የክፍያ ስህተት አጋጥሟል! እባክዎ በድጋሚ ይሞክሩ።");
      setIsPaying(false);
    }
  };

  return (
    <div 
      id="payment-modal" 
      className="fixed inset-0 bg-black/75 z-[9999] flex items-center justify-center backdrop-blur-md p-4 transition-all duration-300" 
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
        <div className="bg-white dark:bg-[#111827] w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col relative animate-[modalPop_0.3s_cubic-bezier(0.16,1,0.3,1)_forwards] border border-gray-100 dark:border-gray-800">
            
            {/* Modal Header */}
            <div className="px-8 py-6 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center bg-gray-50/50 dark:bg-[#0f172a]/50">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-[#3268ba]/10 flex items-center justify-center text-[#3268ba]">
                        <i className="fa-solid fa-shield-check text-xl"></i>
                    </div>
                    <div>
                        <h3 className="font-black text-xl font-heading text-[#000000] dark:text-white leading-tight">
                            ደህንነቱ የተጠበቀ ክፍያ
                        </h3>
                        <p className="text-xs text-gray-500 font-semibold">100% Secure & Encrypted Checkout</p>
                    </div>
                </div>
                <button 
                  onClick={onClose} 
                  className="w-9 h-9 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-500 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/50 transition-all flex items-center justify-center cursor-pointer"
                  title="Close (ESC)"
                >
                    <i className="fa-solid fa-xmark text-lg"></i>
                </button>
            </div>
            
            {/* Modal Body */}
            <div className="p-8">
                
                {/* Course Details Header Card */}
                <div className="flex items-center gap-4 bg-gray-50 dark:bg-[#0f172a] p-4 rounded-2xl border border-gray-100 dark:border-gray-800 mb-6">
                    <img 
                      src={course.image || 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?q=80&w=1000&auto=format&fit=crop'} 
                      alt={course.title}
                      className="w-16 h-16 rounded-xl object-cover shadow-sm border border-gray-200 dark:border-gray-700" 
                    />
                    <div className="flex-1 min-w-0">
                        <p className="text-[10px] text-gray-500 font-extrabold mb-0.5 uppercase tracking-widest">የሚገዙት ኮርስ (Target Course)</p>
                        <h4 className="font-black text-[#000000] dark:text-white text-base leading-tight truncate">{course.title}</h4>
                    </div>
                </div>

                {/* Total Price Banner */}
                <div className="flex justify-between items-center mb-6 pb-6 border-b border-gray-100 dark:border-gray-800">
                    <span className="text-gray-600 dark:text-gray-400 font-extrabold text-sm uppercase tracking-wider">ጠቅላላ ክፍያ (Total)</span>
                    <span className="text-3xl font-black text-[#000000] dark:text-white tracking-tighter">
                        {course.isFree ? "ነፃ (Free)" : `${Number(course.price).toLocaleString()} ብር`}
                    </span>
                </div>

                {/* Payment Option Selector */}
                {!course.isFree && (
                    <>
                        <h4 className="font-extrabold text-xs text-gray-400 dark:text-gray-500 mb-4 uppercase tracking-widest">የክፍያ አማራጭ ይምረጡ (Select Method)</h4>
                        <div className="space-y-3.5 mb-8">
                            
                            {/* Option 1: LakiPay */}
                            <label className={`payment-option flex items-center justify-between p-4 rounded-2xl border cursor-pointer transition-all duration-200 ${paymethod === 'lakipay' ? 'border-[#f9b03c] bg-[#f9b03c]/10 dark:border-[#f9b03c] dark:bg-[#f9b03c]/20 shadow-md scale-[1.01]' : 'border-gray-200 dark:border-gray-800 bg-white dark:bg-darkCard hover:border-[#f9b03c]/50 hover:bg-[#f9b03c]/5'}`}>
                                <div className="flex items-center gap-3.5">
                                    <input 
                                      type="radio" 
                                      name="paymethod" 
                                      value="lakipay" 
                                      checked={paymethod === 'lakipay'} 
                                      onChange={(e) => setPaymethod(e.target.value)} 
                                      className="w-4 h-4 text-[#f9b03c] focus:ring-[#f9b03c] accent-[#f9b03c]" 
                                    />
                                    <div>
                                        <span className="font-black text-[#000000] dark:text-white text-base block">LakiPay</span>
                                        <span className="text-[11px] text-gray-500 font-semibold block">Local Wallets, Banks & Cards</span>
                                    </div>
                                </div>
                                <div className="flex items-center shrink-0 ml-2">
                                    <img 
                                      src="/lakipay-logo.png" 
                                      alt="LakiPay Logo" 
                                      className="h-8 w-auto object-contain bg-white dark:bg-darkCard px-2 py-0.5 rounded-lg border border-gray-100 dark:border-gray-800 shadow-2xs" 
                                      onError={(e: any) => { e.currentTarget.src = '/lakipay-logo.svg'; }} 
                                    />
                                </div>
                            </label>

                            {/* Option 2: PayPal */}
                            <label className={`payment-option flex items-center justify-between p-4 rounded-2xl border cursor-pointer transition-all duration-200 ${paymethod === 'international' || paymethod === 'paypal' ? 'border-[#f9b03c] bg-[#f9b03c]/10 dark:border-[#f9b03c] dark:bg-[#f9b03c]/20 shadow-md scale-[1.01]' : 'border-gray-200 dark:border-gray-800 bg-white dark:bg-darkCard hover:border-[#f9b03c]/50 hover:bg-[#f9b03c]/5'}`}>
                                <div className="flex items-center gap-3.5">
                                    <input 
                                      type="radio" 
                                      name="paymethod" 
                                      value="international" 
                                      checked={paymethod === 'international' || paymethod === 'paypal'} 
                                      onChange={(e) => setPaymethod(e.target.value)} 
                                      className="w-4 h-4 text-[#f9b03c] focus:ring-[#f9b03c] accent-[#f9b03c]" 
                                    />
                                    <div>
                                        <span className="font-black text-[#000000] dark:text-white text-base block">PayPal</span>
                                        <span className="text-[11px] text-gray-500 font-semibold block">International PayPal & Cards</span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 shrink-0 ml-2">
                                    <img 
                                      src="/paypal-logo.png" 
                                      alt="PayPal Logo" 
                                      className="h-8 w-auto object-contain bg-white dark:bg-darkCard px-2 py-0.5 rounded-lg border border-gray-100 dark:border-gray-800 shadow-2xs" 
                                      onError={(e: any) => { e.currentTarget.src = '/paypal-logo.svg'; }} 
                                    />
                                </div>
                            </label>

                            {/* Option 3: NOWPayments */}
                            <label className={`payment-option flex items-center justify-between p-4 rounded-2xl border cursor-pointer transition-all duration-200 ${paymethod === 'crypto' || paymethod === 'nowpayments' ? 'border-[#f9b03c] bg-[#f9b03c]/10 dark:border-[#f9b03c] dark:bg-[#f9b03c]/20 shadow-md scale-[1.01]' : 'border-gray-200 dark:border-gray-800 bg-white dark:bg-darkCard hover:border-[#f9b03c]/50 hover:bg-[#f9b03c]/5'}`}>
                                <div className="flex items-center gap-3.5">
                                    <input 
                                      type="radio" 
                                      name="paymethod" 
                                      value="crypto" 
                                      checked={paymethod === 'crypto' || paymethod === 'nowpayments'} 
                                      onChange={(e) => setPaymethod(e.target.value)} 
                                      className="w-4 h-4 text-[#f9b03c] focus:ring-[#f9b03c] accent-[#f9b03c]" 
                                    />
                                    <div>
                                        <span className="font-black text-[#000000] dark:text-white text-base block">NOWPayments</span>
                                        <span className="text-[11px] text-gray-500 font-semibold block">USDT, BTC & Major Cryptos</span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 shrink-0 ml-2">
                                    <img 
                                      src="/crypto-logo.png" 
                                      alt="NOWPayments Logo" 
                                      className="h-8 w-auto object-contain bg-white dark:bg-darkCard px-2 py-0.5 rounded-lg border border-gray-100 dark:border-gray-800 shadow-2xs" 
                                      onError={(e: any) => { e.currentTarget.src = '/crypto-logo.svg'; }} 
                                    />
                                </div>
                            </label>

                        </div>
                    </>
                )}

                {/* Error Banner */}
                {error && (
                  <div className="bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800 p-3.5 rounded-2xl mb-5 font-bold text-sm text-center animate-shake">
                    {error}
                  </div>
                )}

                {/* Proceed Button */}
                <button 
                  onClick={handlePayment} 
                  disabled={isPaying} 
                  className="w-full bg-[#f9b03c] text-[#000000] py-4 rounded-2xl font-black text-lg hover:bg-[#e29d2f] hover:scale-[1.01] active:scale-[0.99] transition-all shadow-xl hover:shadow-2xl flex items-center justify-center gap-2.5 group disabled:opacity-70 cursor-pointer"
                >
                    {isPaying ? (
                        <>
                            <div className="w-5 h-5 border-2 border-[#000000] border-t-transparent rounded-full animate-spin"></div>
                            <span>በማስኬድ ላይ (Processing)...</span>
                        </>
                    ) : (
                        <>
                            <span>{course.isFree ? 'በነፃ ይጀምሩ (Start Free)' : 'ወደ ክፍያ ገፅ ሂድ (Proceed to Payment)'}</span> 
                            <i className="fa-solid fa-arrow-up-right-from-square group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform text-base"></i>
                        </>
                    )}
                </button>
            </div>
            
            {/* Modal Footer / Trust Badge */}
            <div className="bg-gray-50/70 dark:bg-[#0f172a]/70 p-4 text-center border-t border-gray-100 dark:border-gray-800 flex items-center justify-center gap-2">
                <i className="fa-solid fa-lock text-[#3268ba] text-sm"></i>
                <p className="text-xs text-[#000000] dark:text-gray-300 font-extrabold uppercase tracking-wider">
                  ክፍያዎ 100% ደህንነቱ የተጠበቀ ነው (100% Secure Checkout)
                </p>
            </div>

        </div>
        <style dangerouslySetInnerHTML={{__html: `
            @keyframes modalPop {
                0% { opacity: 0; transform: scale(0.95); }
                100% { opacity: 1; transform: scale(1); }
            }
        `}} />
    </div>
  );
}
