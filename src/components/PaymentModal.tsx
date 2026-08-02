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
      const res = await fetch('/api/initiate-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          courseId: course.id,
          title: course.title,
          price: course.price,
          userEmail: user?.email || 'student@example.com',
          phoneNumber: user?.phoneNumber || '',
          userId: user?.uid || 'anonymous',
          paymethod: paymethod,
        })
      });
      
      const data = await res.json();
      
      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
      } else {
        setError(data.error || "የክፍያ ሲስተሙን ማግኘት አልተቻለም። እባክዎ በድጋሚ ይሞክሩ።");
        setIsPaying(false);
      }
    } catch (err: any) {
      console.error("Payment initiation error:", err);
      setError("የክፍያ ስህተት አጋጥሟል! እባክዎ በድጋሚ ይሞክሩ።");
      setIsPaying(false);
    }
  };

  return (
    <div id="payment-modal" className="fixed inset-0 bg-black/80 z-[9999] flex items-center justify-center backdrop-blur-sm p-4" onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
        <div className="bg-[#0b1329] text-white w-full max-w-lg rounded-[2rem] shadow-2xl overflow-hidden flex flex-col relative animate-[modalPop_0.3s_ease-out_forwards] border border-gray-800">
            
            {/* Header */}
            <div className="p-6 border-b border-gray-800/80 flex justify-between items-center bg-[#0d1735]">
                <div>
                  <h3 className="font-black text-xl font-heading text-white flex items-center gap-2">
                      <i className="fa-solid fa-shield-check text-amber-400"></i> ደህንነቱ የተጠበቀ ክፍያ
                  </h3>
                  <p className="text-xs text-emerald-400 font-bold mt-0.5">100% Secure & Instant Activation</p>
                </div>
                <button onClick={onClose} className="text-gray-400 hover:text-red-400 transition text-xl p-2 rounded-full hover:bg-gray-800/50">
                    <i className="fa-solid fa-xmark"></i>
                </button>
            </div>
            
            <div className="p-6">
                
                {/* Course Info */}
                <div className="flex items-center gap-4 bg-[#121e3d] p-4 rounded-2xl border border-gray-800 mb-6">
                    <img src={course.image || 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?q=80&w=1000&auto=format&fit=crop'} className="w-16 h-16 rounded-xl object-cover shadow-sm border border-gray-700" alt={course.title} />
                    <div className="flex-1">
                        <p className="text-[10px] text-gray-400 font-bold mb-1 uppercase tracking-widest">የሚገዙት ኮርስ (TARGET COURSE)</p>
                        <h4 className="font-black text-white leading-tight line-clamp-2">{course.title}</h4>
                    </div>
                </div>

                {/* Total */}
                <div className="flex justify-between items-center mb-6 pb-6 border-b border-gray-800">
                    <span className="text-gray-300 font-bold">ጠቅላላ ክፍያ (TOTAL)</span>
                    <span className="text-3xl font-black text-white tracking-tighter">
                        {course.isFree ? "ነፃ" : `${Number(course.price).toLocaleString()} ብር`}
                    </span>
                </div>

                {!course.isFree && (
                    <>
                        <h4 className="font-bold text-xs text-gray-400 mb-3 uppercase tracking-wider">የክፍያ አማራጭ ይምረጡ (SELECT PAYMENT METHOD)</h4>
                        <div className="space-y-3.5 mb-6">
                            
                            {/* Option 1: LakiPay */}
                            <label className={`payment-option flex items-center justify-between p-4.5 rounded-2xl border cursor-pointer transition-all ${paymethod === 'lakipay' ? 'border-amber-500 bg-amber-500/10 shadow-lg ring-2 ring-amber-500/40 scale-[1.01]' : 'border-gray-800 bg-[#121e3d] hover:bg-[#16254a]'}`}>
                                <div className="flex items-center gap-3.5">
                                    <input 
                                      type="radio" 
                                      name="paymethod" 
                                      value="lakipay" 
                                      checked={paymethod === 'lakipay'} 
                                      onChange={() => setPaymethod('lakipay')} 
                                      className="w-5 h-5 text-amber-500 focus:ring-amber-500 accent-amber-500 cursor-pointer" 
                                    />
                                    <div>
                                        <span className="font-black text-white text-lg block leading-tight">LakiPay</span>
                                        <span className="text-xs text-amber-400 font-bold block mt-0.5">Telebirr, CBE Birr & Local Banks</span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="bg-white px-3.5 py-2 rounded-xl flex items-center shadow-md border border-gray-200 h-11">
                                        <img src="/lakipay-logo.svg" alt="LakiPay" className="h-7 w-auto object-contain" />
                                    </div>
                                    <span className="flex items-center font-black text-xs bg-[#00A3E0] text-white px-3 py-2 rounded-xl shadow-md tracking-wider h-11">
                                      telebirr
                                    </span>
                                </div>
                            </label>

                            {/* Option 2: PayPal */}
                            <label className={`payment-option flex items-center justify-between p-4.5 rounded-2xl border cursor-pointer transition-all ${paymethod === 'paypal' ? 'border-blue-500 bg-blue-500/10 shadow-lg ring-2 ring-blue-500/40 scale-[1.01]' : 'border-gray-800 bg-[#121e3d] hover:bg-[#16254a]'}`}>
                                <div className="flex items-center gap-3.5">
                                    <input 
                                      type="radio" 
                                      name="paymethod" 
                                      value="paypal" 
                                      checked={paymethod === 'paypal'} 
                                      onChange={() => setPaymethod('paypal')} 
                                      className="w-5 h-5 text-blue-500 focus:ring-blue-500 accent-blue-500 cursor-pointer" 
                                    />
                                    <div>
                                        <span className="font-black text-white text-lg block leading-tight">PayPal</span>
                                        <span className="text-xs text-blue-400 font-bold block mt-0.5">PayPal & International Cards</span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="bg-white px-4 py-2 rounded-xl flex items-center shadow-md border border-gray-200 h-11">
                                        <img src="/paypal-logo.svg" alt="PayPal" className="h-7 w-auto object-contain" />
                                    </div>
                                </div>
                            </label>

                            {/* Option 3: Crypto */}
                            <label className={`payment-option flex items-center justify-between p-4.5 rounded-2xl border cursor-pointer transition-all ${paymethod === 'crypto' || paymethod === 'nowpayments' ? 'border-cyan-500 bg-cyan-500/10 shadow-lg ring-2 ring-cyan-500/40 scale-[1.01]' : 'border-gray-800 bg-[#121e3d] hover:bg-[#16254a]'}`}>
                                <div className="flex items-center gap-3.5">
                                    <input 
                                      type="radio" 
                                      name="paymethod" 
                                      value="crypto" 
                                      checked={paymethod === 'crypto' || paymethod === 'nowpayments'} 
                                      onChange={() => setPaymethod('crypto')} 
                                      className="w-5 h-5 text-cyan-500 focus:ring-cyan-500 accent-cyan-500 cursor-pointer" 
                                    />
                                    <div>
                                        <span className="font-black text-white text-lg block leading-tight">Crypto</span>
                                        <span className="text-xs text-cyan-400 font-bold block mt-0.5">USDT, Bitcoin, Ethereum & Solana</span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="bg-slate-900 px-3.5 py-2 rounded-xl flex items-center shadow-md border border-cyan-500/40 h-11">
                                        <img src="/crypto-logo.svg" alt="Crypto Payments" className="h-7 w-auto object-contain" />
                                    </div>
                                </div>
                            </label>

                        </div>
                    </>
                )}

                {error && <div className="bg-red-900/40 text-red-300 border border-red-800 p-3.5 rounded-xl mb-4 font-bold text-xs text-center">{error}</div>}

                {/* Primary Proceed Button */}
                <button 
                  onClick={handlePayment} 
                  disabled={isPaying} 
                  className="w-full bg-amber-500 hover:bg-amber-600 text-slate-950 font-black py-4 rounded-2xl text-base transition-all shadow-lg hover:shadow-amber-500/25 flex items-center justify-center gap-2 group disabled:opacity-70 cursor-pointer"
                >
                    {isPaying ? (
                        <>
                            <div className="w-5 h-5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin"></div>
                            <span>በማስኬድ ላይ...</span>
                        </>
                    ) : (
                        <>
                            <span>{course.isFree ? 'በነፃ ይጀምሩ' : 'ወደ ክፍያ ገፅ ሂድ (Proceed to Payment)'}</span> 
                            <i className="fa-solid fa-arrow-up-right-from-square group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform"></i>
                        </>
                    )}
                </button>
            </div>
            
            {/* Footer / Powered by Tsehay Digital */}
            <div className="bg-[#0d1735] p-4 text-center border-t border-gray-800 flex flex-col sm:flex-row items-center justify-between gap-3 px-6">
                <div className="flex items-center gap-2">
                    <i className="fa-solid fa-lock text-emerald-400 text-sm"></i>
                    <p className="text-xs text-gray-300 font-extrabold uppercase tracking-wider">
                      ክፍያዎ 100% ደህንነቱ የተጠበቀ ነው
                    </p>
                </div>
                <div className="flex items-center gap-2 text-[11px] text-gray-400 font-bold uppercase tracking-widest">
                    <span>POWERED BY</span>
                    <a href="https://tsehay360.com" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-white/10 border border-white/15 hover:border-amber-400/50 transition-all shadow-sm">
                        <img 
                          src="/tsehay-digital-logo.jpg" 
                          alt="Tsehay Digital" 
                          className="h-4 w-4 object-contain rounded-xs" 
                          onError={(e) => { e.currentTarget.src = '/tsehay-digital-logo.png'; }}
                        />
                        <span className="font-black text-amber-400 text-xs tracking-wider">TSEHAY DIGITAL</span>
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
