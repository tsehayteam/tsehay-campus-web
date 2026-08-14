'use client';

import { useState, useEffect } from "react";
import { auth, db } from "@/lib/firebase/config";
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile, GoogleAuthProvider, signInWithPopup, User } from "firebase/auth";
import { doc, setDoc, serverTimestamp, getDoc } from "firebase/firestore";
import { useRouter } from "next/navigation";

export default function AuthModal({ isOpen, onClose, isSignupMode, setIsSignupMode }: any) {
  const [isResetMode, setIsResetMode] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [city, setCity] = useState("");
  const [source, setSource] = useState("");
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [pendingGoogleAuth, setPendingGoogleAuth] = useState<User | null>(null);
  const router = useRouter();

  useEffect(() => {
      if (!isOpen) {
          setPendingGoogleAuth(null);
          setError("");
          setIsResetMode(false);
      }
  }, [isOpen]);

  const getFriendlyErrorMessage = (error: any) => {
    const errorCode = error?.code || '';
    if (errorCode === 'auth/wrong-password' || errorCode === 'auth/user-not-found' || errorCode === 'auth/invalid-credential') {
        return 'የተሳሳተ ኢሜል ወይም የይለፍ ቃል አስገብተዋል። እባክዎ በድጋሚ ይሞክሩ።';
    }
    if (errorCode === 'auth/email-already-in-use') {
        return 'ይህ ኢሜል አስቀድሞ ተመዝግቧል። እባክዎ በሌላ ኢሜል ይሞክሩ።';
    }
    if (errorCode === 'auth/weak-password') {
        return 'የይለፍ ቃሉ በጣም ደካማ ነው። እባክዎ ጠንከር ያለ የይለፍ ቃል ይጠቀሙ።';
    }
    if (errorCode === 'auth/invalid-email') {
        return 'እባክዎ ትክክለኛ የኢሜል አድራሻ ያስገቡ።';
    }
    if (errorCode === 'auth/network-request-failed') {
        return 'የኢንተርኔት ግንኙነት ችግር አጋጥሟል። እባክዎ የኢንተርኔትዎን ሁኔታ አረጋግጠው በድጋሚ ይሞክሩ።';
    }
    return 'የሆነ ችግር አጋጥሟል። እባክዎ በድጋሚ ይሞክሩ።';
  };

  if (!isOpen) return null;

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
        const { getAuth, sendPasswordResetEmail } = await import('firebase/auth');
        const auth = getAuth();
        await sendPasswordResetEmail(auth, email);
        alert('የይለፍ ቃል መቀየሪያ ሊንክ ወደ ኢሜልዎ ተልኳል (Password reset email sent)!');
        setIsResetMode(false);
    } catch (err: any) {
        console.error(err);
        setError(getFriendlyErrorMessage(err));
    } finally {
        setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const cleanEmail = email.trim();

    try {
      if (isSignupMode) {
        if (!agreedToTerms) {
          setError('እባክዎ የአጠቃቀም ህግ እና የግላዊነት ፖሊሲ (Terms & Privacy) መስማማትዎን ያረጋግጡ።');
          setLoading(false);
          return;
        }
        
        let currentUser = pendingGoogleAuth;
        if (!currentUser) {
            const cred = await createUserWithEmailAndPassword(auth, cleanEmail, password);
            if (name.trim()) {
              try { await updateProfile(cred.user, { displayName: name.trim() }); } catch(e) {}
            }
            currentUser = cred.user;
            
            // Send verification in background
            try {
              const { sendEmailVerification } = await import('firebase/auth');
              sendEmailVerification(cred.user).catch(() => {});
            } catch(e) {}
        }
        
        // Instant success - close modal immediately
        setError("");
        onClose();

        // Background profile sync
        if (currentUser) {
          (async () => {
            try {
              const userData = {
                  name: name.trim() || currentUser.displayName || "ተጠቃሚ",
                  email: cleanEmail,
                  phone: phone.trim(),
                  city: city.trim(),
                  source: source || "Direct",
                  createdAt: serverTimestamp(),
                  lastLogin: serverTimestamp(),
                  isAdmin: false,
                  photoURL: currentUser.photoURL || null
              };
              
              await setDoc(doc(db, 'artifacts', 'tsehaycampus-e1a6d', 'users', currentUser.uid, 'profile', 'info'), userData, { merge: true });
            } catch (err) {
              console.warn("Background profile save error:", err);
            }
          })();
        }
      } else {
        // Login mode
        const cred = await signInWithEmailAndPassword(auth, cleanEmail, password);
        
        // Instant success - close modal immediately
        setError("");
        onClose();

        // Update last login in background
        if (cred.user) {
          (async () => {
            try {
              await setDoc(doc(db, 'artifacts', 'tsehaycampus-e1a6d', 'users', cred.user.uid, 'profile', 'info'), {
                  lastLogin: serverTimestamp()
              }, { merge: true });
            } catch(e) {}
          })();
        }
      }
    } catch (err: any) {
      console.error("Auth error:", err);
      const code = err?.code || '';

      if (!isSignupMode && (code === 'auth/user-not-found' || code === 'auth/invalid-credential')) {
        setError('የተሳሳተ የይለፍ ቃል አስገብተዋል ወይም ይህ ኢሜል ገና አልተመዘገበም። አዲስ ከሆኑ ከታች "አዲስ ይመዝገቡ" የሚለውን ይጫኑ።');
      } else if (isSignupMode && code === 'auth/email-already-in-use') {
        setIsSignupMode(false);
        setError('ይህ ኢሜል አስቀድሞ ተመዝግቧል! እባክዎ የይለፍ ቃልዎን አስገብተው በቀጥታ ይግቡ።');
      } else {
        setError(getFriendlyErrorMessage(err));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleAuth = async () => {
    setError("");
    setLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      
      // Instant success - close modal immediately
      setPendingGoogleAuth(null);
      setError("");
      onClose();

      // Background profile sync
      (async () => {
        try {
          const docRef = doc(db, 'artifacts', 'tsehaycampus-e1a6d', 'users', user.uid, 'profile', 'info');
          const docSnap = await getDoc(docRef);
          
          const userData = {
              name: user.displayName || (docSnap.exists() ? docSnap.data()?.name : "") || "ተጠቃሚ",
              email: user.email || (docSnap.exists() ? docSnap.data()?.email : "") || "",
              phone: docSnap.exists() ? (docSnap.data()?.phone || "") : "",
              city: docSnap.exists() ? (docSnap.data()?.city || "") : "",
              source: docSnap.exists() ? (docSnap.data()?.source || "Google") : "Google",
              photoURL: user.photoURL || (docSnap.exists() ? docSnap.data()?.photoURL : null),
              lastLogin: serverTimestamp(),
              isAdmin: docSnap.exists() ? (docSnap.data()?.isAdmin || false) : false,
              createdAt: docSnap.exists() ? (docSnap.data()?.createdAt || serverTimestamp()) : serverTimestamp(),
          };
          
          await setDoc(docRef, userData, { merge: true });
        } catch (e) {
          console.warn("Background Google auth sync warning:", e);
        }
      })();
    } catch (err: any) {
        if (err?.code === 'auth/popup-closed-by-user' || err?.code === 'auth/cancelled-popup-request') {
          setError("");
        } else {
          console.error("Google Auth Error:", err);
          setError(getFriendlyErrorMessage(err));
        }
    } finally {
        setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 z-[9999] flex items-center justify-center backdrop-blur-sm p-4" onClick={(e) => { if(e.target === e.currentTarget) onClose() }}>
        <div className="bg-white dark:bg-darkCard w-full max-w-md rounded-3xl shadow-2xl overflow-hidden flex flex-col relative modal-animate border border-gray-100 dark:border-gray-800 max-h-[95vh]">
            <div className="bg-secondary dark:bg-dark p-6 text-white text-center relative border-b border-secondary/50 dark:border-gray-800 shrink-0">
                <button type="button" onClick={onClose} className="absolute top-4 right-4 text-white/70 hover:text-white transition text-2xl z-50 p-2"><i className="fa-solid fa-xmark"></i></button>
                
                <div className="w-16 h-16 sm:w-20 sm:h-20 bg-white rounded-2xl mx-auto flex items-center justify-center mb-3 shadow-lg p-1.5 border border-white/20">
                    <img src="/tc-logo.jpg" alt="Logo" className="w-full h-full object-contain rounded-xl" />
                </div>

                <h2 className="font-black font-heading text-xl sm:text-2xl">{isSignupMode ? 'ወደ ካምፓስ ይቀላቀሉ' : 'ወደ ካምፓስ ይግቡ'}</h2>
                <p className="text-blue-100 dark:text-gray-400 text-xs sm:text-sm mt-1">መረጃዎን አስገብተው ትምህርትዎን ይቀጥሉ</p>
            </div>
            
            <div className="p-6 md:p-8 overflow-y-auto custom-modal-scroll flex-1">
                {error && <div className="bg-red-50 dark:bg-red-900/30 text-danger border border-red-200 dark:border-red-800 text-sm p-3 rounded-lg mb-5 font-bold text-center">{error}</div>}
                
                {!pendingGoogleAuth && !isResetMode && (
                    <>
                        <button type="button" onClick={handleGoogleAuth} className="w-full bg-white dark:bg-dark border border-gray-200 dark:border-gray-800 text-dark dark:text-white font-bold py-3.5 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-900 transition shadow-sm flex items-center justify-center gap-3 mb-4">
                            <img src="https://www.svgrepo.com/show/475656/google-color.svg" alt="Google" className="w-5 h-5" />
                            በ Google (Gmail) ይግቡ
                        </button>

                        <div className="flex items-center my-4">
                            <hr className="flex-1 border-gray-200 dark:border-gray-800" />
                            <span className="px-3 text-xs text-gray-400 dark:text-gray-500 font-bold uppercase">ወይም</span>
                            <hr className="flex-1 border-gray-200 dark:border-gray-800" />
                        </div>
                    </>
                )}

                <form onSubmit={isResetMode ? handlePasswordReset : handleSubmit} className="space-y-4 px-1">
                    {isSignupMode && !isResetMode && (
                        <>
                            <div>
                                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">ሙሉ ስም (Full Name) *</label>
                                <input type="text" value={name} onChange={(e) => setName(e.target.value)} required placeholder="ሙሉ ስምዎን ያስገቡ" className="w-full bg-gray-50 dark:bg-dark border border-gray-200 dark:border-gray-800 rounded-xl py-3 px-4 text-sm outline-none focus:border-secondary dark:focus:border-primary dark:text-white transition" />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">ስልክ ቁጥር (Phone Number) *</label>
                                <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} required placeholder="ለምሳሌ፡ +251911..." className="w-full bg-gray-50 dark:bg-dark border border-gray-200 dark:border-gray-800 rounded-xl py-3 px-4 text-sm outline-none focus:border-secondary dark:focus:border-primary dark:text-white transition" />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">ከተማ / ሀገር (City/Country) *</label>
                                <input type="text" value={city} onChange={(e) => setCity(e.target.value)} required placeholder="አዲስ አበባ, ኢትዮጵያ" className="w-full bg-gray-50 dark:bg-dark border border-gray-200 dark:border-gray-800 rounded-xl py-3 px-4 text-sm outline-none focus:border-secondary dark:focus:border-primary dark:text-white transition" />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">ስለ እኛ ከየት ሰሙ? *</label>
                                <select value={source} onChange={(e) => setSource(e.target.value)} required className="w-full bg-gray-50 dark:bg-dark border border-gray-200 dark:border-gray-800 rounded-xl py-3 px-4 text-sm outline-none focus:border-secondary dark:focus:border-primary dark:text-white transition">
                                    <option value="" disabled>እባክዎ ይምረጡ...</option>
                                    <option value="Telegram">ቴሌግራም (Telegram)</option>
                                    <option value="TikTok">ቲክቶክ (TikTok)</option>
                                    <option value="Facebook">ፌስቡክ (Facebook)</option>
                                    <option value="Friend">ከጓደኛ (Friend/Referral)</option>
                                    <option value="Other">ሌላ (Other)</option>
                                </select>
                            </div>
                        </>
                    )}
                    <div>
                        <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">ኢሜል (Email) *</label>
                        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="email@example.com" disabled={!!pendingGoogleAuth} className="w-full bg-gray-50 dark:bg-dark border border-gray-200 dark:border-gray-800 rounded-xl py-3 px-4 text-sm outline-none focus:border-secondary dark:focus:border-primary dark:text-white transition disabled:opacity-50" />
                    </div>
                    {!pendingGoogleAuth && !isResetMode && (
                        <div>
                            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">የይለፍ ቃል (Password) *</label>
                            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required placeholder="••••••••" minLength={6} className="w-full bg-gray-50 dark:bg-dark border border-gray-200 dark:border-gray-800 rounded-xl py-3 px-4 text-sm outline-none focus:border-secondary dark:focus:border-primary dark:text-white transition" />
                        </div>
                    )}
                    
                    {!isSignupMode && !isResetMode && (
                        <div className="flex justify-end">
                            <button type="button" onClick={() => setIsResetMode(true)} className="text-xs font-bold text-secondary dark:text-primary hover:underline">
                                የይለፍ ቃል ረሱ? (Forgot Password?)
                            </button>
                        </div>
                    )}

                    {isSignupMode && !isResetMode && (
                        <div className="flex items-start gap-3 mt-4 text-sm">
                            <input 
                                type="checkbox" 
                                id="terms" 
                                checked={agreedToTerms} 
                                onChange={(e) => setAgreedToTerms(e.target.checked)} 
                                required
                                className="mt-1 min-w-[16px] w-4 h-4 text-primary bg-gray-100 border-gray-300 rounded focus:ring-primary dark:bg-gray-700 dark:border-gray-600" 
                            />
                            <label htmlFor="terms" className="text-gray-600 dark:text-gray-400 leading-tight">
                                አካውንት በመክፈት የTsehay Campus <button type="button" onClick={() => window.dispatchEvent(new Event('open-terms-modal'))} className="text-secondary dark:text-primary hover:underline font-bold">የአጠቃቀም ህግ እና የግላዊነት ፖሊሲ (Terms & Privacy)</button> ለመቀበል እስማማለሁ።
                            </label>
                        </div>
                    )}

                    <button type="submit" disabled={loading} className="w-full bg-primary text-dark font-black py-3.5 rounded-xl hover:bg-yellow-400 transition shadow-md mt-4 flex items-center justify-center gap-2">
                        {loading ? 'እባክዎ ይጠብቁ...' : (isResetMode ? 'ሊንክ ላክ (Send Link)' : (isSignupMode ? 'መዝግብ' : 'ግባ (Login)'))}
                    </button>
                    {isResetMode && (
                        <button type="button" onClick={() => setIsResetMode(false)} className="w-full bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 font-bold py-3.5 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-700 transition mt-2">
                            ተመለስ (Back to Login)
                        </button>
                    )}
                </form>
                
                {!pendingGoogleAuth && !isResetMode && (
                    <div className="mt-6 pt-4 border-t border-gray-100 dark:border-gray-800 flex flex-col items-center gap-3 text-sm text-gray-600 dark:text-gray-400 shrink-0">
                        <div>
                            <span>{isSignupMode ? 'አካውንት አለዎት?' : 'አካውንት የለዎትም?'}</span> 
                            <button type="button" onClick={() => setIsSignupMode(!isSignupMode)} className="text-secondary dark:text-primary font-bold hover:underline ml-1">
                                {isSignupMode ? 'ግባ (Login)' : 'አዲስ ይመዝገቡ (Sign Up)'}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    </div>
  );
}
