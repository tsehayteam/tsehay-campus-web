'use client';

import { useState, useEffect } from "react";
import { auth, db } from "@/lib/firebase/config";
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  updateProfile, 
  GoogleAuthProvider, 
  signInWithPopup, 
  User 
} from "firebase/auth";
import { doc, setDoc, serverTimestamp, getDoc } from "firebase/firestore";
import { useRouter } from "next/navigation";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  isSignupMode: boolean;
  setIsSignupMode: (val: boolean) => void;
}

export default function AuthModal({ isOpen, onClose, isSignupMode, setIsSignupMode }: AuthModalProps) {
  const [isResetMode, setIsResetMode] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
  // Form fields
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
      setShowPassword(false);
    }
  }, [isOpen]);

  const getFriendlyErrorMessage = (error: any) => {
    const errorCode = error?.code || '';
    if (errorCode === 'auth/wrong-password' || errorCode === 'auth/user-not-found' || errorCode === 'auth/invalid-credential') {
      return 'የተሳሳተ ኢሜል ወይም የይለፍ ቃል አስገብተዋል። እባክዎ በድጋሚ ይሞክሩ።';
    }
    if (errorCode === 'auth/email-already-in-use') {
      return 'ይህ ኢሜል አስቀድሞ ተመዝግቧል። እባክዎ የይለፍ ቃልዎን አስገብተው ይግቡ ወይም በሌላ ኢሜል ይሞክሩ።';
    }
    if (errorCode === 'auth/weak-password') {
      return 'የይለፍ ቃሉ በጣም አጭር ወይም ደካማ ነው። እባክዎ ቢያንስ 6 ፊደላት/ቁጥሮች ይጠቀሙ።';
    }
    if (errorCode === 'auth/invalid-email') {
      return 'እባክዎ ትክክለኛ የኢሜል አድራሻ ያስገቡ።';
    }
    if (errorCode === 'auth/network-request-failed') {
      return 'የኢንተርኔት ግንኙነት ችግር አጋጥሟል። እባክዎ የኢንተርኔትዎን ሁኔታ አረጋግጠው በድጋሚ ይሞክሩ።';
    }
    if (errorCode === 'auth/popup-closed-by-user') {
      return '';
    }
    return error?.message || 'የሆነ ችግር አጋጥሟል። እባክዎ በድጋሚ ይሞክሩ።';
  };

  if (!isOpen) return null;

  // Handle Forgot Password
  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!email.trim()) {
      setError('እባክዎ መጀመሪያ የኢሜል አድራሻዎን ያስገቡ።');
      return;
    }
    setLoading(true);
    try {
      const { sendPasswordResetEmail } = await import('firebase/auth');
      await sendPasswordResetEmail(auth, email.trim());
      alert('የይለፍ ቃል መቀየሪያ ሊንክ ወደ ኢሜልዎ ተልኳል (Password reset email sent)!');
      setIsResetMode(false);
    } catch (err: any) {
      console.error("Reset password error:", err);
      setError(getFriendlyErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  // Check if profile is complete in Firestore
  const isProfileDataComplete = (data: any) => {
    if (!data) return false;
    const hasPhone = typeof data.phone === 'string' && data.phone.trim().length >= 7;
    const hasCity = typeof data.city === 'string' && data.city.trim().length > 0;
    return hasPhone && hasCity;
  };

  // Google Authentication Flow with Automatic Profile Completion Detection
  const handleGoogleAuth = async () => {
    setError("");
    setLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      // Check Firestore to see if this user has already completed registration
      const docRef = doc(db, 'artifacts', 'tsehaycampus-e1a6d', 'users', user.uid, 'profile', 'info');
      const docSnap = await getDoc(docRef);
      const existingData = docSnap.exists() ? docSnap.data() : null;

      if (existingData && isProfileDataComplete(existingData)) {
        // User is already fully registered! Update last login and proceed directly.
        await setDoc(docRef, {
          lastLogin: serverTimestamp(),
          photoURL: user.photoURL || existingData.photoURL || null,
          email: user.email || existingData.email || "",
        }, { merge: true });

        setPendingGoogleAuth(null);
        setError("");
        onClose();
      } else {
        // User is NEW or has missing profile fields (phone, city, etc.)
        // DO NOT close modal! Prompt them to fill out the remaining signup fields.
        setPendingGoogleAuth(user);
        setName(existingData?.name || user.displayName || "");
        setEmail(user.email || "");
        setPhone(existingData?.phone || "");
        setCity(existingData?.city || "");
        setSource(existingData?.source || "");
        setAgreedToTerms(false);
        setIsSignupMode(true);
      }
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

  // Submit Handler: Email/Password (Login & Signup) and Google Profile Completion
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const cleanEmail = (email || pendingGoogleAuth?.email || "").trim();

    // 1. Google Profile Completion submission
    if (pendingGoogleAuth) {
      if (!name.trim()) {
        setError('እባክዎ ሙሉ ስምዎን ያስገቡ።');
        return;
      }
      if (!phone.trim() || phone.trim().length < 7) {
        setError('እባክዎ ትክክለኛ ስልክ ቁጥር ያስገቡ።');
        return;
      }
      if (!city.trim()) {
        setError('እባክዎ የሚኖሩበትን ከተማ ወይም ሀገር ያስገቡ።');
        return;
      }
      if (!source) {
        setError('እባክዎ ስለ እኛ ከየት እንደሰሙ ይምረጡ።');
        return;
      }
      if (!agreedToTerms) {
        setError('እባክዎ የአጠቃቀም ህግ እና የግላዊነት ፖሊሲ (Terms & Privacy) መስማማትዎን ያረጋግጡ።');
        return;
      }

      setLoading(true);
      try {
        const userData = {
          name: name.trim() || pendingGoogleAuth.displayName || "ተጠቃሚ",
          email: pendingGoogleAuth.email || cleanEmail,
          phone: phone.trim(),
          city: city.trim(),
          source: source || "Google",
          photoURL: pendingGoogleAuth.photoURL || null,
          createdAt: serverTimestamp(),
          lastLogin: serverTimestamp(),
          isAdmin: false,
        };

        const docRef = doc(db, 'artifacts', 'tsehaycampus-e1a6d', 'users', pendingGoogleAuth.uid, 'profile', 'info');
        await setDoc(docRef, userData, { merge: true });

        if (name.trim()) {
          try {
            await updateProfile(pendingGoogleAuth, { displayName: name.trim() });
          } catch (e) {}
        }

        setPendingGoogleAuth(null);
        setError("");
        onClose();
      } catch (err: any) {
        console.error("Profile save error:", err);
        setError(getFriendlyErrorMessage(err));
      } finally {
        setLoading(false);
      }
      return;
    }

    // 2. Email & Password Sign Up
    if (isSignupMode) {
      if (!name.trim()) {
        setError('እባክዎ ሙሉ ስምዎን ያስገቡ።');
        return;
      }
      if (!phone.trim() || phone.trim().length < 7) {
        setError('እባክዎ ትክክለኛ ስልክ ቁጥር ያስገቡ።');
        return;
      }
      if (!city.trim()) {
        setError('እባክዎ የሚኖሩበትን ከተማ ወይም ሀገር ያስገቡ።');
        return;
      }
      if (!source) {
        setError('እባክዎ ስለ እኛ ከየት እንደሰሙ ይምረጡ።');
        return;
      }
      if (!cleanEmail) {
        setError('እባክዎ የኢሜል አድራሻዎን ያስገቡ።');
        return;
      }
      if (!password || password.length < 6) {
        setError('የይለፍ ቃል ቢያንስ 6 ፊደላት ወይም ቁጥሮች መሆን አለበት።');
        return;
      }
      if (!agreedToTerms) {
        setError('እባክዎ የአጠቃቀም ህግ እና የግላዊነት ፖሊሲ (Terms & Privacy) መስማማትዎን ያረጋግጡ።');
        return;
      }

      setLoading(true);
      try {
        const cred = await createUserWithEmailAndPassword(auth, cleanEmail, password);
        if (name.trim()) {
          try {
            await updateProfile(cred.user, { displayName: name.trim() });
          } catch (e) {}
        }

        const userData = {
          name: name.trim(),
          email: cleanEmail,
          phone: phone.trim(),
          city: city.trim(),
          source: source || "Direct",
          createdAt: serverTimestamp(),
          lastLogin: serverTimestamp(),
          isAdmin: false,
          photoURL: null
        };

        await setDoc(doc(db, 'artifacts', 'tsehaycampus-e1a6d', 'users', cred.user.uid, 'profile', 'info'), userData, { merge: true });

        // Try sending verification email in background
        try {
          const { sendEmailVerification } = await import('firebase/auth');
          sendEmailVerification(cred.user).catch(() => {});
        } catch (e) {}

        setError("");
        onClose();
      } catch (err: any) {
        console.error("Email signup error:", err);
        const code = err?.code || '';
        if (code === 'auth/email-already-in-use') {
          setIsSignupMode(false);
          setError('ይህ ኢሜል አስቀድሞ ተመዝግቧል! እባክዎ የይለፍ ቃልዎን አስገብተው በቀጥታ ይግቡ።');
        } else {
          setError(getFriendlyErrorMessage(err));
        }
      } finally {
        setLoading(false);
      }
      return;
    }

    // 3. Email & Password Login
    if (!cleanEmail) {
      setError('እባክዎ የኢሜል አድራሻዎን ያስገቡ።');
      return;
    }
    if (!password) {
      setError('እባክዎ የይለፍ ቃልዎን ያስገቡ።');
      return;
    }

    setLoading(true);
    try {
      const cred = await signInWithEmailAndPassword(auth, cleanEmail, password);

      // Background lastLogin update
      if (cred.user) {
        setDoc(doc(db, 'artifacts', 'tsehaycampus-e1a6d', 'users', cred.user.uid, 'profile', 'info'), {
          lastLogin: serverTimestamp()
        }, { merge: true }).catch(() => {});
      }

      setError("");
      onClose();
    } catch (err: any) {
      console.error("Email login error:", err);
      const code = err?.code || '';
      if (code === 'auth/user-not-found' || code === 'auth/invalid-credential' || code === 'auth/wrong-password') {
        setError('የተሳሳተ ኢሜል ወይም የይለፍ ቃል አስገብተዋል። አዲስ ከሆኑ "አዲስ ይመዝገቡ" የሚለውን ይጫኑ።');
      } else {
        setError(getFriendlyErrorMessage(err));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div 
      className="fixed inset-0 bg-black/80 z-[9999] flex items-center justify-center backdrop-blur-sm p-4 animate-fade-in" 
      onClick={(e) => { if (e.target === e.currentTarget && !loading) onClose(); }}
    >
      <div className="bg-white dark:bg-darkCard w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden flex flex-col relative modal-animate border border-gray-100 dark:border-gray-800 max-h-[92vh]">
        
        {/* Modal Header */}
        <div className="bg-secondary dark:bg-dark p-6 text-white text-center relative border-b border-secondary/50 dark:border-gray-800 shrink-0">
          <button 
            type="button" 
            onClick={onClose} 
            disabled={loading}
            className="absolute top-4 right-4 text-white/70 hover:text-white transition text-2xl z-50 p-2"
          >
            <i className="fa-solid fa-xmark"></i>
          </button>
          
          <div className="w-16 h-16 sm:w-20 sm:h-20 bg-white rounded-2xl mx-auto flex items-center justify-center mb-3 shadow-lg p-1.5 border border-white/20">
            <img src="/tc-logo.jpg" alt="Logo" className="w-full h-full object-contain rounded-xl" />
          </div>

          <h2 className="font-black font-heading text-xl sm:text-2xl">
            {pendingGoogleAuth 
              ? 'ምዝገባዎን ያጠናቅቁ' 
              : isResetMode 
              ? 'የይለፍ ቃል መቀየሪያ' 
              : isSignupMode 
              ? 'ወደ ካምፓስ ይቀላቀሉ' 
              : 'ወደ ካምፓስ ይግቡ'}
          </h2>
          
          <p className="text-blue-100 dark:text-gray-400 text-xs sm:text-sm mt-1">
            {pendingGoogleAuth 
              ? 'በ Google ተገናኝተዋል! የቀሩትን መረጃዎች ሞልተው ምዝገባዎን ያጠናቅቁ' 
              : isResetMode 
              ? 'የኢሜል አድራሻዎን ያስገቡ፤ ሊንክ እንልክልዎታለን' 
              : isSignupMode 
              ? 'በ Google ወይም በኢሜል እና የይለፍ ቃል አዲስ አካውንት ይክፈቱ' 
              : 'በ Google ወይም በኢሜል እና የይለፍ ቃል ይግቡ'}
          </p>
        </div>
        
        {/* Modal Body */}
        <div className="p-6 md:p-8 overflow-y-auto custom-modal-scroll flex-1">
          {error && (
            <div className="bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800 text-sm p-3 rounded-xl mb-5 font-bold text-center">
              <i className="fa-solid fa-circle-exclamation mr-2"></i>
              {error}
            </div>
          )}

          {/* Pending Google Connected Badge */}
          {pendingGoogleAuth && (
            <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800/60 rounded-2xl p-3.5 flex items-center gap-3 mb-5">
              <img 
                src={pendingGoogleAuth.photoURL || "https://www.svgrepo.com/show/475656/google-color.svg"} 
                alt="Google User" 
                className="w-10 h-10 rounded-full object-cover border-2 border-primary shrink-0" 
              />
              <div className="text-left overflow-hidden">
                <div className="flex items-center gap-1.5 text-xs text-secondary dark:text-primary font-bold">
                  <i className="fa-brands fa-google"></i>
                  <span>የ Google አካውንት ተገናኝቷል</span>
                </div>
                <p className="text-sm font-black text-gray-900 dark:text-white truncate">{pendingGoogleAuth.email}</p>
              </div>
            </div>
          )}

          {/* Top Quick Google Sign-In / Sign-Up Button (Shown when not pending and not in reset mode) */}
          {!pendingGoogleAuth && !isResetMode && (
            <>
              <button 
                type="button" 
                onClick={handleGoogleAuth} 
                disabled={loading}
                className="w-full bg-white dark:bg-dark border border-gray-200 dark:border-gray-800 text-gray-900 dark:text-white font-bold py-3.5 px-4 rounded-2xl hover:bg-gray-50 dark:hover:bg-gray-900 transition shadow-sm flex items-center justify-center gap-3 mb-4 group cursor-pointer hover:border-primary/50"
              >
                <img src="https://www.svgrepo.com/show/475656/google-color.svg" alt="Google" className="w-5 h-5 group-hover:scale-110 transition-transform" />
                <span>{isSignupMode ? 'በ Google (Gmail) በፍጥነት ይመዝገቡ' : 'በ Google (Gmail) ይግቡ'}</span>
              </button>

              <div className="flex items-center my-5">
                <hr className="flex-1 border-gray-200 dark:border-gray-800" />
                <span className="px-3 text-xs text-gray-400 dark:text-gray-500 font-bold uppercase">
                  {isSignupMode ? 'ወይም በኢሜል እና የይለፍ ቃል' : 'ወይም በኢሜል ይግቡ'}
                </span>
                <hr className="flex-1 border-gray-200 dark:border-gray-800" />
              </div>
            </>
          )}

          {/* Form */}
          <form onSubmit={isResetMode ? handlePasswordReset : handleSubmit} className="space-y-4 px-1">
            
            {/* Required Signup / Profile Completion Fields */}
            {(isSignupMode || pendingGoogleAuth) && !isResetMode && (
              <>
                <div>
                  <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">
                    ሙሉ ስም (Full Name) <span className="text-red-500">*</span>
                  </label>
                  <input 
                    type="text" 
                    value={name} 
                    onChange={(e) => setName(e.target.value)} 
                    required 
                    placeholder="ለምሳሌ፡ ዮናስ አበበ" 
                    className="w-full bg-gray-50 dark:bg-dark border border-gray-200 dark:border-gray-800 rounded-xl py-3 px-4 text-sm outline-none focus:border-secondary dark:focus:border-primary dark:text-white transition" 
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">
                    ስልክ ቁጥር (Phone Number) <span className="text-red-500">*</span>
                  </label>
                  <input 
                    type="tel" 
                    value={phone} 
                    onChange={(e) => setPhone(e.target.value)} 
                    required 
                    placeholder="ለምሳሌ፡ +251 91 123 4567 ወይም 0911..." 
                    className="w-full bg-gray-50 dark:bg-dark border border-gray-200 dark:border-gray-800 rounded-xl py-3 px-4 text-sm outline-none focus:border-secondary dark:focus:border-primary dark:text-white transition" 
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">
                    ከተማ / ሀገር (City / Country) <span className="text-red-500">*</span>
                  </label>
                  <input 
                    type="text" 
                    value={city} 
                    onChange={(e) => setCity(e.target.value)} 
                    required 
                    placeholder="ለምሳሌ፡ አዲስ አበባ, ኢትዮጵያ" 
                    className="w-full bg-gray-50 dark:bg-dark border border-gray-200 dark:border-gray-800 rounded-xl py-3 px-4 text-sm outline-none focus:border-secondary dark:focus:border-primary dark:text-white transition" 
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">
                    ስለ እኛ ከየት ሰሙ? (How did you hear about us?) <span className="text-red-500">*</span>
                  </label>
                  <select 
                    value={source} 
                    onChange={(e) => setSource(e.target.value)} 
                    required 
                    className="w-full bg-gray-50 dark:bg-dark border border-gray-200 dark:border-gray-800 rounded-xl py-3 px-4 text-sm outline-none focus:border-secondary dark:focus:border-primary dark:text-white transition cursor-pointer"
                  >
                    <option value="" disabled>እባክዎ ይምረጡ...</option>
                    <option value="Telegram">ቴሌግራም (Telegram)</option>
                    <option value="TikTok">ቲክቶክ (TikTok)</option>
                    <option value="Facebook">ፌስቡክ (Facebook)</option>
                    <option value="YouTube">ዩቲዩብ (YouTube)</option>
                    <option value="Friend">ከጓደኛ ወይም ከሰው ጥቆማ (Friend / Referral)</option>
                    <option value="Google">Google Search</option>
                    <option value="Other">ሌላ (Other)</option>
                  </select>
                </div>
              </>
            )}

            {/* Email Field (Disabled if authenticated through Google) */}
            <div>
              <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">
                ኢሜል (Email) <span className="text-red-500">*</span>
              </label>
              <input 
                type="email" 
                value={pendingGoogleAuth ? pendingGoogleAuth.email || "" : email} 
                onChange={(e) => setEmail(e.target.value)} 
                required 
                placeholder="email@example.com" 
                disabled={!!pendingGoogleAuth} 
                className="w-full bg-gray-50 dark:bg-dark border border-gray-200 dark:border-gray-800 rounded-xl py-3 px-4 text-sm outline-none focus:border-secondary dark:focus:border-primary dark:text-white transition disabled:opacity-60 disabled:cursor-not-allowed" 
              />
            </div>

            {/* Password Field (Shown for Email/Password mode, hidden for Google Auth and Reset Mode) */}
            {!pendingGoogleAuth && !isResetMode && (
              <div>
                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">
                  {isSignupMode ? 'አዲስ የይለፍ ቃል (Create Password)' : 'የይለፍ ቃል (Password)'} <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input 
                    type={showPassword ? "text" : "password"} 
                    value={password} 
                    onChange={(e) => setPassword(e.target.value)} 
                    required 
                    placeholder="•••••••• (ቢያንስ 6 ፊደላት)" 
                    minLength={6} 
                    className="w-full bg-gray-50 dark:bg-dark border border-gray-200 dark:border-gray-800 rounded-xl py-3 pl-4 pr-11 text-sm outline-none focus:border-secondary dark:focus:border-primary dark:text-white transition" 
                  />
                  <button 
                    type="button" 
                    onClick={() => setShowPassword(!showPassword)} 
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition text-sm p-1"
                  >
                    <i className={`fa-solid ${showPassword ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                  </button>
                </div>
              </div>
            )}
            
            {/* Forgot Password Link in Login Mode */}
            {!isSignupMode && !pendingGoogleAuth && !isResetMode && (
              <div className="flex justify-end pt-1">
                <button 
                  type="button" 
                  onClick={() => setIsResetMode(true)} 
                  className="text-xs font-bold text-secondary dark:text-primary hover:underline cursor-pointer"
                >
                  የይለፍ ቃል ረሱ? (Forgot Password?)
                </button>
              </div>
            )}

            {/* Terms and Privacy Checkbox */}
            {(isSignupMode || pendingGoogleAuth) && !isResetMode && (
              <div className="flex items-start gap-3 mt-4 text-sm bg-gray-50/50 dark:bg-dark/50 p-3 rounded-xl border border-gray-100 dark:border-gray-800">
                <input 
                  type="checkbox" 
                  id="terms" 
                  checked={agreedToTerms} 
                  onChange={(e) => setAgreedToTerms(e.target.checked)} 
                  required
                  className="mt-0.5 min-w-[18px] w-4.5 h-4.5 text-primary bg-white border-gray-300 rounded focus:ring-primary dark:bg-gray-800 dark:border-gray-600 cursor-pointer accent-[#f9b03c]" 
                />
                <label htmlFor="terms" className="text-gray-600 dark:text-gray-400 leading-snug cursor-pointer text-xs sm:text-sm select-none">
                  አካውንት በመክፈት የTsehay Campus <button type="button" onClick={() => window.dispatchEvent(new Event('open-terms-modal'))} className="text-secondary dark:text-primary hover:underline font-bold">የአጠቃቀም ህግ እና የግላዊነት ፖሊሲ (Terms & Privacy)</button> ለመቀበል እስማማለሁ።
                </label>
              </div>
            )}

            {/* Submit Button */}
            <button 
              type="submit" 
              disabled={loading} 
              className="w-full bg-primary text-dark font-black py-3.5 rounded-2xl hover:bg-yellow-400 active:scale-[0.99] transition shadow-md mt-5 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <i className="fa-solid fa-spinner fa-spin"></i>
                  <span>እባክዎ ይጠብቁ...</span>
                </>
              ) : pendingGoogleAuth ? (
                <>
                  <i className="fa-solid fa-circle-check"></i>
                  <span>ምዝገባውን አጠናቅቅ (Complete Registration)</span>
                </>
              ) : isResetMode ? (
                'ሊንክ ላክ (Send Link)'
              ) : isSignupMode ? (
                <>
                  <i className="fa-solid fa-user-plus"></i>
                  <span>አካውንት ክፈት (Create Account)</span>
                </>
              ) : (
                <>
                  <i className="fa-solid fa-right-to-bracket"></i>
                  <span>ግባ (Login)</span>
                </>
              )}
            </button>

            {/* Back to Login Button from Reset Mode */}
            {isResetMode && (
              <button 
                type="button" 
                onClick={() => setIsResetMode(false)} 
                className="w-full bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 font-bold py-3.5 rounded-2xl hover:bg-gray-200 dark:hover:bg-gray-700 transition mt-2 cursor-pointer"
              >
                ተመለስ (Back to Login)
              </button>
            )}
          </form>
          
          {/* Bottom Switcher (Sign Up <-> Login) */}
          {!pendingGoogleAuth && !isResetMode && (
            <div className="mt-6 pt-5 border-t border-gray-100 dark:border-gray-800 flex flex-col items-center gap-3 text-sm text-gray-600 dark:text-gray-400 shrink-0">
              <div>
                <span>{isSignupMode ? 'አካውንት አስቀድሞ አለዎት?' : 'አካውንት የለዎትም?'}</span> 
                <button 
                  type="button" 
                  onClick={() => {
                    setIsSignupMode(!isSignupMode);
                    setError("");
                  }} 
                  className="text-secondary dark:text-primary font-bold hover:underline ml-1.5 cursor-pointer"
                >
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
