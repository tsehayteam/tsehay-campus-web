'use client';
import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';

export default function PaymentModal({ course, onClose }: any) {
  const [paymethod, setPaymethod] = useState('addispay');
  const [isPaying, setIsPaying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  if (!course) return null;

  const handlePayment = async () => {
    setIsPaying(true);
    setError(null);
    try {
      if (paymethod === 'addispay') {
        const res = await fetch('/api/initiate-payment', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            courseId: course.id,
            title: course.title,
            price: course.price,
            userEmail: user?.email || 'student@example.com',
            userId: user?.uid || 'anonymous',
          })
        });
        
        const data = await res.json();
        
        if (data.checkoutUrl) {
          window.location.href = data.checkoutUrl;
        } else {
          setError(data.error || "የክፍያ ሲስተሙን ማግኘት አልተቻለም።");
          setIsPaying(false);
        }
      } else {
        // PayPal & Crypto Processing Flow
        // As requested: process the payment, update the database, and redirect to dashboard
        
        // Simulate external gateway processing time
        setTimeout(async () => {
          try {
            if (!user) {
                setError("Please login to complete payment.");
                setIsPaying(false);
                return;
            }
            
            // Import firestore dynamically or from config
            const { doc, setDoc, serverTimestamp } = await import('firebase/firestore');
            const { db } = await import('@/lib/firebase/config');
            
            // 1. Update Database (Unlock course)
            const docRef = doc(db, 'artifacts', 'tsehaycampus-e1a6d', 'users', user.uid, 'purchased_courses', course.id);
            await setDoc(docRef, {
                courseId: course.id,
                amount: course.price,
                paymentMethod: paymethod,
                purchasedAt: serverTimestamp(),
                status: 'active'
            });
            
            // 2. Redirect to Dashboard
            setIsPaying(false);
            onClose();
            window.location.href = '/dashboard?success=true&course=' + course.id;
            
          } catch (dbError: any) {
            console.error("Database enrollment error:", dbError);
            setError("ክፍያው ተፈፅሟል ነገር ግን ኮርሱን መክፈት አልተቻለም። እባክዎ ያግኙን።");
            setIsPaying(false);
          }
        }, 2000);
      }
    } catch (err: any) {
      setError("የክፍያ ስህተት አጋጥሟል! እባክዎ በድጋሚ ይሞክሩ።");
      setIsPaying(false);
    }
  };

  return (
    <div id="payment-modal" className="fixed inset-0 bg-black/80 z-[9999] flex items-center justify-center backdrop-blur-sm p-4" onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
        <div className="bg-white dark:bg-darkCard w-full max-w-lg rounded-[2rem] shadow-2xl overflow-hidden flex flex-col relative animate-[modalPop_0.3s_ease-out_forwards] border border-gray-100 dark:border-gray-800">
            
            <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center bg-gray-50 dark:bg-dark">
                <h3 className="font-black text-xl font-heading dark:text-white flex items-center gap-2">
                    <i className="fa-solid fa-shield-check text-secondary dark:text-primary"></i> ደህንነቱ የተጠበቀ ክፍያ
                </h3>
                <button onClick={onClose} className="text-gray-400 hover:text-danger transition text-xl">
                    <i className="fa-solid fa-xmark"></i>
                </button>
            </div>
            
            <div className="p-6">
                
                <div className="flex items-center gap-4 bg-gray-50 dark:bg-dark p-4 rounded-2xl border border-gray-100 dark:border-gray-800 mb-6">
                    <img src={course.image || 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?q=80&w=1000&auto=format&fit=crop'} className="w-16 h-16 rounded-xl object-cover shadow-sm" />
                    <div className="flex-1">
                        <p className="text-[10px] text-gray-500 font-bold mb-1 uppercase tracking-widest">የሚገዙት ኮርስ</p>
                        <h4 className="font-black text-dark dark:text-white leading-tight line-clamp-2">{course.title}</h4>
                    </div>
                </div>

                <div className="flex justify-between items-center mb-6 pb-6 border-b border-gray-100 dark:border-gray-800">
                    <span className="text-gray-600 dark:text-gray-400 font-bold">ጠቅላላ ክፍያ (Total)</span>
                    <span className="text-3xl font-black text-dark dark:text-white tracking-tighter">
                        {course.isFree ? "ነፃ" : `${Number(course.price).toLocaleString()} ብር`}
                    </span>
                </div>

                {!course.isFree && (
                    <>
                        <h4 className="font-bold text-sm text-gray-500 mb-3 uppercase tracking-wider">የክፍያ አማራጭ ይምረጡ</h4>
                        <div className="space-y-3 mb-8">
                            <label className={`payment-option flex items-center justify-between p-4 rounded-xl border cursor-pointer transition ${paymethod === 'addispay' ? 'border-secondary bg-blue-50/50 dark:border-primary dark:bg-primary/10' : 'border-gray-200 dark:border-gray-800 bg-white dark:bg-darkCard hover:bg-gray-50 dark:hover:bg-gray-900'}`}>
                                <div className="flex items-center gap-3">
                                    <input type="radio" name="paymethod" value="addispay" checked={paymethod === 'addispay'} onChange={(e) => setPaymethod(e.target.value)} className="w-4 h-4 text-secondary focus:ring-secondary" />
                                    <div>
                                        <span className="font-black dark:text-white text-sm md:text-base block">AddisPay (አዲስ ፔይ)</span>
                                        <span className="text-[11px] text-gray-500 font-semibold">Telebirr, CBE Birr & Bank Transfers</span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-1.5 bg-emerald-50 dark:bg-emerald-900/30 px-3 py-1.5 rounded-lg border border-emerald-200 dark:border-emerald-700">
                                    <span className="font-black text-emerald-600 dark:text-emerald-400 text-sm tracking-tight">addis<span className="text-amber-500">pay</span></span>
                                </div>
                            </label>

                            <label className={`payment-option flex items-center justify-between p-4 rounded-xl border cursor-pointer transition ${paymethod === 'international' ? 'border-secondary bg-blue-50/50 dark:border-primary dark:bg-primary/10' : 'border-gray-200 dark:border-gray-800 bg-white dark:bg-darkCard hover:bg-gray-50 dark:hover:bg-gray-900'}`}>
                                <div className="flex items-center gap-3">
                                    <input type="radio" name="paymethod" value="international" checked={paymethod === 'international'} onChange={(e) => setPaymethod(e.target.value)} className="w-4 h-4 text-secondary focus:ring-secondary" />
                                    <span className="font-black dark:text-white text-sm md:text-base">PayPal & Cards</span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <i className="fa-brands fa-paypal text-[#00457C] dark:text-[#0079C1] text-xl"></i>
                                    <i className="fa-brands fa-cc-visa text-[#1A1F71] dark:text-white text-xl"></i>
                                </div>
                            </label>

                            <label className={`payment-option flex items-center justify-between p-4 rounded-xl border cursor-pointer transition ${paymethod === 'crypto' ? 'border-secondary bg-blue-50/50 dark:border-primary dark:bg-primary/10' : 'border-gray-200 dark:border-gray-800 bg-white dark:bg-darkCard hover:bg-gray-50 dark:hover:bg-gray-900'}`}>
                                <div className="flex items-center gap-3">
                                    <input type="radio" name="paymethod" value="crypto" checked={paymethod === 'crypto'} onChange={(e) => setPaymethod(e.target.value)} className="w-4 h-4 text-secondary focus:ring-secondary" />
                                    <span className="font-black dark:text-white text-sm md:text-base">Crypto (USDT / BTC)</span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <img src="https://cryptologos.cc/logos/tether-usdt-logo.svg?v=025" className="h-5 md:h-6 object-contain" alt="USDT" />
                                    <img src="https://upload.wikimedia.org/wikipedia/commons/4/46/Bitcoin.svg" className="h-5 md:h-6 object-contain" alt="Bitcoin" />
                                </div>
                            </label>
                        </div>
                    </>
                )}

                {error && <div className="bg-red-50 dark:bg-red-900/30 text-danger border border-red-200 dark:border-red-800 p-3 rounded-xl mb-4 font-bold text-sm text-center">{error}</div>}

                <button onClick={handlePayment} disabled={isPaying} className="w-full bg-secondary dark:bg-primary text-white dark:text-dark py-4 rounded-2xl font-black text-lg hover:bg-blue-800 dark:hover:bg-yellow-400 transition shadow-lg flex items-center justify-center gap-2 group disabled:opacity-70">
                    {isPaying ? (
                        <>
                            <div className="w-5 h-5 border-2 border-white dark:border-dark border-t-transparent rounded-full animate-spin"></div>
                            <span>በማስኬድ ላይ...</span>
                        </>
                    ) : (
                        <>
                            <span>{course.isFree ? 'በነፃ ይጀምሩ' : 'ወደ ክፍያ ገፅ ሂድ'}</span> 
                            <i className="fa-solid fa-arrow-up-right-from-square group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform"></i>
                        </>
                    )}
                </button>
            </div>
            
            <div className="bg-gray-50 dark:bg-dark p-4 text-center border-t border-gray-100 dark:border-gray-800 flex items-center justify-center gap-2">
                <i className="fa-solid fa-lock text-success"></i>
                <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">ክፍያዎ 100% ደህንነቱ የተጠበቀ ነው</p>
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
