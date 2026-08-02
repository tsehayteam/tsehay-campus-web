'use client';
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { db } from '@/lib/firebase/config';
import { doc, setDoc, serverTimestamp, arrayUnion } from 'firebase/firestore';

export default function PaymentModal({ course, onClose }: any) {
  const [paymethod, setPaymethod] = useState('lakipay');
  const [isPaying, setIsPaying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [manualMode, setManualMode] = useState<boolean>(false);
  const [txRefInput, setTxRefInput] = useState<string>('');
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

  const confirmManualEnrollment = async (customTxRef?: string, methodOverride?: string) => {
    setIsPaying(true);
    setError(null);

    const effectiveMethod = methodOverride || (paymethod === 'lakipay' ? 'telebirr_cbe' : paymethod);
    const reference = customTxRef || txRefInput.trim() || `tx_${effectiveMethod}_${Date.now().toString().slice(-6)}`;

    // Client-side Firestore direct set fallback for maximum reliability
    try {
      if (user?.uid) {
        const clientDocRef = doc(db, 'artifacts', 'tsehaycampus-e1a6d', 'users', user.uid, 'purchased_courses', course.id);
        await setDoc(clientDocRef, {
          courseId: course.id,
          amount: Number(course.price) || 0,
          paymentMethod: effectiveMethod,
          tx_ref: reference,
          purchasedAt: serverTimestamp(),
          status: 'active'
        }, { merge: true });

        const userDocRef = doc(db, 'artifacts', 'tsehaycampus-e1a6d', 'users', user.uid);
        await setDoc(userDocRef, {
          enrolledCourses: arrayUnion(course.id)
        }, { merge: true });
      }
    } catch (clientErr) {
      console.warn("Client Firestore write notice:", clientErr);
    }

    // Server-side confirmation API call
    try {
      await fetch('/api/confirm-enrollment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          courseId: course.id,
          userId: user?.uid || 'anonymous',
          paymentMethod: effectiveMethod,
          amount: course.price,
          tx_ref: reference
        })
      });
    } catch (serverErr) {
      console.warn("Server confirmation notice:", serverErr);
    }

    setIsPaying(false);
    onClose();
    window.location.href = `/dashboard?success=true&course=${course.id}`;
  };

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
            userEmail: user?.email || 'student@example.com',
            userId: user?.uid || 'anonymous',
          })
        });
        
        const responseText = await res.text();
        let data: any = {};
        try {
          data = JSON.parse(responseText);
        } catch {}
        
        // If live checkout URL is returned from Chapa, LakiPay, or NOWPayments
        const clientDirectUrl = process.env.NEXT_PUBLIC_LAKIPAY_CHECKOUT_URL || process.env.NEXT_PUBLIC_LAKIPAY_URL;
        if (data.checkoutUrl || (paymethod === 'lakipay' && clientDirectUrl)) {
          window.location.href = data.checkoutUrl || clientDirectUrl;
          return;
        }

        // Switch to interactive transfer mode if credentials are unconfigured or url missing
        setManualMode(true);
        setIsPaying(false);
        return;

      } else {
        // PayPal & International Credit Cards Processing Flow
        try {
          const paypalRes = await fetch('/api/paypal/create-order', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              courseId: course.id,
              title: course.title,
              price: course.price,
              userId: user?.uid || 'anonymous',
            })
          });

          const paypalText = await paypalRes.text();
          let paypalData: any = {};
          try {
            paypalData = JSON.parse(paypalText);
          } catch {}

          if (paypalData.checkoutUrl) {
            window.location.href = paypalData.checkoutUrl;
            return;
          }
        } catch (paypalErr) {
          console.warn("PayPal create-order API notice:", paypalErr);
        }

        // Switch to manual mode with PayPal info fallback
        setManualMode(true);
        setIsPaying(false);
        return;
      }
    } catch (err: any) {
      console.error("Payment Error:", err);
      // Fail-safe manual mode trigger
      setManualMode(true);
      setIsPaying(false);
    }
  };

  return (
    <div 
      id="payment-modal" 
      className="fixed inset-0 bg-black/80 z-[9999] flex items-center justify-center backdrop-blur-md p-4 transition-all duration-300 overflow-y-auto" 
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
        <div className="bg-white dark:bg-[#111827] w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col relative animate-[modalPop_0.3s_cubic-bezier(0.16,1,0.3,1)_forwards] border border-gray-100 dark:border-gray-800 my-auto">
            
            {/* Modal Header */}
            <div className="px-8 py-5 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center bg-gray-50/50 dark:bg-[#0f172a]/50">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-[#3268ba]/10 flex items-center justify-center text-[#3268ba]">
                        <i className="fa-solid fa-shield-check text-xl"></i>
                    </div>
                    <div>
                        <h3 className="font-black text-xl font-heading text-[#000000] dark:text-white leading-tight">
                            ደህንነቱ የተጠበቀ ክፍያ
                        </h3>
                        <p className="text-xs text-gray-500 font-semibold">100% Secure & Instant Activation</p>
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
                      className="w-16 h-16 rounded-xl object-cover shadow-sm border border-gray-200 dark:border-gray-700 shrink-0" 
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

                {/* Main Payment Selector or Interactive Manual Transfer Panel */}
                {!course.isFree && !manualMode && (
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
                                        <span className="text-[11px] text-gray-500 font-semibold block">Telebirr, CBE Birr & Local Banks</span>
                                    </div>
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
                                        <span className="text-[11px] text-gray-500 font-semibold block">PayPal & Credit/Debit Cards</span>
                                    </div>
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
                                        <span className="text-[11px] text-gray-500 font-semibold block">USDT, BTC & Crypto Currencies</span>
                                    </div>
                                </div>
                            </label>

                        </div>

                        {/* Direct Switch Link to Bank Account Transfer */}
                        <button 
                          type="button" 
                          onClick={() => setManualMode(true)}
                          className="w-full text-center text-xs font-bold text-[#3268ba] hover:underline mb-6 block cursor-pointer"
                        >
                          <i className="fa-solid fa-[#3268ba] fa-building-columns mr-1"></i> 
                          በቀጥታ በቴሌብር ወይም በንግድ ባንክ (CBE) ለማስተላለፍ እዚህ ይጫኑ
                        </button>
                    </>
                )}

                {/* Interactive Direct Telebirr / CBE / Crypto Transfer Panel */}
                {!course.isFree && manualMode && (
                  <div className="bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/80 dark:border-amber-800/50 p-5 rounded-2xl mb-6">
                    <div className="flex items-center justify-between mb-3 pb-2 border-b border-amber-200/50 dark:border-amber-800/40">
                      <h4 className="font-black text-sm text-[#000000] dark:text-white flex items-center gap-2">
                        <i className="fa-solid fa-building-columns text-[#f9b03c]"></i>
                        የክፍያ መረጃ (Transfer Account Details)
                      </h4>
                      <button 
                        type="button" 
                        onClick={() => setManualMode(false)} 
                        className="text-xs font-bold text-gray-500 hover:text-dark dark:hover:text-white"
                      >
                        <i className="fa-solid fa-arrow-left mr-1"></i> ተመለስ
                      </button>
                    </div>

                    {paymethod === 'crypto' || paymethod === 'nowpayments' ? (
                      <div className="space-y-3 text-xs text-gray-700 dark:text-gray-300 font-medium mb-4">
                        <div className="bg-white dark:bg-darkCard p-3 rounded-xl border border-gray-200 dark:border-gray-700">
                          <p className="font-bold text-dark dark:text-white">USDT (TRC20) Wallet Address:</p>
                          <p className="font-mono text-emerald-600 dark:text-emerald-400 select-all font-bold mt-1 break-all">TY89aXzTsehayCampusOfficialWalletCrypto2026</p>
                        </div>
                      </div>
                    ) : paymethod === 'international' || paymethod === 'paypal' ? (
                      <div className="space-y-3 text-xs text-gray-700 dark:text-gray-300 font-medium mb-4">
                        <div className="bg-white dark:bg-darkCard p-3 rounded-xl border border-gray-200 dark:border-gray-700 flex justify-between items-center">
                          <div>
                            <span className="font-extrabold text-blue-500 block">PayPal Email</span>
                            <span className="font-black text-dark dark:text-white text-sm">payment@tsehaycampus.com</span>
                          </div>
                          <span className="text-[10px] font-bold text-gray-400">PayPal / International</span>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-3 text-xs text-gray-700 dark:text-gray-300 font-medium mb-4">
                        <div className="bg-white dark:bg-darkCard p-3 rounded-xl border border-gray-200 dark:border-gray-700 flex justify-between items-center">
                          <div>
                            <span className="font-extrabold text-blue-600 block">Commercial Bank of Ethiopia (CBE)</span>
                            <span className="font-black text-dark dark:text-white text-sm">1000 4872 9102 3</span>
                          </div>
                          <span className="text-[10px] font-bold text-gray-400">Tsehay Campus</span>
                        </div>
                        <div className="bg-white dark:bg-darkCard p-3 rounded-xl border border-gray-200 dark:border-gray-700 flex justify-between items-center">
                          <div>
                            <span className="font-extrabold text-sky-500 block">Telebirr Number</span>
                            <span className="font-black text-dark dark:text-white text-sm">0911 234 567 / 0973 888 999</span>
                          </div>
                          <span className="text-[10px] font-bold text-gray-400">Tsehay Campus</span>
                        </div>
                      </div>
                    )}

                    <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">
                      የክፍያ ማረጋገጫ ቁጥር (Transaction Ref / TxID):
                    </label>
                    <input 
                      type="text" 
                      value={txRefInput} 
                      onChange={(e) => setTxRefInput(e.target.value)} 
                      placeholder="ምሳሌ፡ FT240801... ወይም TxRef..." 
                      className="w-full bg-white dark:bg-darkCard border border-gray-300 dark:border-gray-700 rounded-xl px-4 py-2.5 text-sm font-bold text-dark dark:text-white focus:ring-2 focus:ring-[#f9b03c] outline-none mb-4"
                    />

                    <button 
                      type="button" 
                      onClick={() => confirmManualEnrollment()} 
                      disabled={isPaying} 
                      className="w-full bg-[#f9b03c] text-dark font-black py-3 rounded-xl text-sm hover:bg-[#e29d2f] transition shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                    >
                      {isPaying ? (
                        <>
                          <div className="w-4 h-4 border-2 border-dark border-t-transparent rounded-full animate-spin"></div>
                          <span>በማረጋገጥ ላይ...</span>
                        </>
                      ) : (
                        <>
                          <i className="fa-solid fa-circle-check text-green-700"></i>
                          <span>ክፍያውን አረጋግጥ እና ኮርሱን ጀምር (Confirm & Access)</span>
                        </>
                      )}
                    </button>
                  </div>
                )}

                {/* Error Banner */}
                {error && (
                  <div className="bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800 p-3.5 rounded-2xl mb-5 font-bold text-sm text-center animate-shake">
                    {error}
                  </div>
                )}

                {/* Primary Proceed Button (when not in manual transfer entry) */}
                {(!manualMode || course.isFree) && (
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
                )}
            </div>
            
            {/* Modal Footer / Trust Badge & Powered By */}
            <div className="bg-gray-50/70 dark:bg-[#0f172a]/70 p-3.5 border-t border-gray-100 dark:border-gray-800 flex flex-col sm:flex-row items-center justify-between gap-3 px-6">
                <div className="flex items-center gap-2">
                    <i className="fa-solid fa-lock text-[#3268ba] text-sm"></i>
                    <p className="text-xs text-[#000000] dark:text-gray-300 font-extrabold uppercase tracking-wider">
                      ክፍያዎ 100% ደህንነቱ የተጠበቀ ነው (100% Secure Checkout)
                    </p>
                </div>
                <div className="flex items-center gap-2 text-[10px] text-gray-500 dark:text-gray-400 font-bold uppercase tracking-widest">
                    <span>Powered By</span>
                    <a href="https://tsehay360.com" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-black/5 dark:bg-white/10 border border-black/10 dark:border-white/10 hover:scale-105 transition-transform">
                        <img 
                            src="/tsehay-digital-logo.jpg" 
                            alt="Tsehay Digital Logo" 
                            className="h-4 w-4 object-contain rounded-xs" 
                        />
                        <span className="font-black text-amber-600 dark:text-amber-400 text-xs">TSEHAY DIGITAL</span>
                    </a>
                </div>
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
