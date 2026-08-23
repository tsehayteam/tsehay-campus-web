'use client';

import { useState, useEffect } from "react";
import { auth, db } from "@/lib/firebase/config";
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  sendEmailVerification,
  sendPasswordResetEmail,
  signOut,
  updateProfile, 
  GoogleAuthProvider, 
  signInWithPopup, 
  User 
} from "firebase/auth";
import { doc, setDoc, serverTimestamp, getDoc } from "firebase/firestore";
import { useRouter } from "next/navigation";
import { validateEmailForSignup, isDisposableEmail } from "@/lib/disposableEmailBlocker";
import { validateReferralCode, recordReferralUsage } from "@/lib/referralService";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  isSignupMode: boolean;
  setIsSignupMode: (val: boolean) => void;
}

export default function AuthModal({ isOpen, onClose, isSignupMode, setIsSignupMode }: AuthModalProps) {
  const [isResetMode, setIsResetMode] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
  // 🌟 Multi-Step Onboarding State for Sign-Up
  const [signupStep, setSignupStep] = useState<number>(1);
  const [slideDirection, setSlideDirection] = useState<'next' | 'back'>('next');

  // Verification Sent Screen State
  const [verificationSent, setVerificationSent] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState("");
  const [unverifiedEmail, setUnverifiedEmail] = useState("");
  const [isResendingEmail, setIsResendingEmail] = useState(false);
  const [resendSuccessMessage, setResendSuccessMessage] = useState("");

  // Form fields
  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [city, setCity] = useState("");
  const [source, setSource] = useState("");
  const [referralCode, setReferralCode] = useState("");
  const [referralDiscountInfo, setReferralDiscountInfo] = useState("");
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [pendingGoogleAuth, setPendingGoogleAuth] = useState<User | null>(null);
  const router = useRouter();

  useEffect(() => {
    if (!isOpen) {
      setPendingGoogleAuth(null);
      setError("");
      setEmailError("");
      setResendSuccessMessage("");
      setIsResetMode(false);
      setShowPassword(false);
      setVerificationSent(false);
      setRegisteredEmail("");
      setUnverifiedEmail("");
      setSignupStep(1);
    }
  }, [isOpen]);

  // Real-time disposable email check
  const handleEmailChange = (val: string) => {
    setEmail(val);
    setError("");
    setResendSuccessMessage("");
    if ((isSignupMode || pendingGoogleAuth) && val.trim().includes("@")) {
      if (isDisposableEmail(val)) {
        setEmailError("ይቅርታ! እባክዎ ትክክለኛ እና ቋሚ የኢሜይል አድራሻ (እንደ Gmail, Yahoo) ይጠቀሙ።");
      } else {
        setEmailError("");
      }
    } else {
      setEmailError("");
    }
  };

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
    if (errorCode === 'auth/too-many-requests') {
      return 'ብዙ ሙከራዎች ተደርገዋል። እባክዎ ጥቂት ደቂቃዎችን ቆይተው በድጋሚ ይሞክሩ።';
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
    setResendSuccessMessage("");
    if (!email.trim()) {
      setError('እባክዎ መጀመሪያ የኢሜል አድራሻዎን ያስገቡ።');
      return;
    }
    setLoading(true);
    try {
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

  // Handle Resending Email Verification Link
  const handleResendVerification = async () => {
    const targetEmail = unverifiedEmail || registeredEmail || email;
    if (!targetEmail || !password) {
      setError("የማረጋገጫ ሊንክ በድጋሚ ለመላክ እባክዎ የይለፍ ቃልዎን ያስገቡ።");
      return;
    }

    setIsResendingEmail(true);
    setError("");
    setResendSuccessMessage("");

    try {
      const cred = await signInWithEmailAndPassword(auth, targetEmail.trim(), password);
      await sendEmailVerification(cred.user);
      await signOut(auth);
      setResendSuccessMessage(`አዲስ የማረጋገጫ ሊንክ ወደ ${targetEmail} በተሳካ ሁኔታ ተልኳል!`);
    } catch (err: any) {
      console.error("Resend verification error:", err);
      setError(getFriendlyErrorMessage(err));
    } finally {
      setIsResendingEmail(false);
    }
  };

  // Check if profile is complete in Firestore
  const isProfileDataComplete = (data: any) => {
    if (!data) return false;
    const hasPhone = typeof data.phone === 'string' && data.phone.trim().length >= 7;
    const hasCity = typeof data.city === 'string' && data.city.trim().length > 0;
    return hasPhone && hasCity;
  };

  // Google Authentication Flow
  const handleGoogleAuth = async () => {
    setError("");
    setLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      const docRef = doc(db, 'artifacts', 'tsehaycampus-e1a6d', 'users', user.uid, 'profile', 'info');
      const docSnap = await getDoc(docRef);
      const existingData = docSnap.exists() ? docSnap.data() : null;

      if (existingData && isProfileDataComplete(existingData)) {
        await setDoc(docRef, {
          lastLogin: serverTimestamp(),
          photoURL: user.photoURL || existingData.photoURL || null,
          email: user.email || existingData.email || "",
        }, { merge: true });

        setPendingGoogleAuth(null);
        setError("");
        onClose();
      } else {
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

  // 🌟 Multi-Step Navigation Controls
  const handleNextStep = () => {
    setError("");
    if (signupStep === 1) {
      if (!name.trim()) {
        setError('እባክዎ ሙሉ ስምዎን ያስገቡ።');
        return;
      }
      if (!phone.trim() || phone.trim().length < 7) {
        setError('እባክዎ ትክክለኛ ስልክ ቁጥር ያስገቡ (ቢያንስ 7 አሃዞች)።');
        return;
      }
      if (!city.trim()) {
        setError('እባክዎ የሚኖሩበትን ከተማ ወይም ሀገር ያስገቡ።');
        return;
      }
      setSlideDirection('next');
      setSignupStep(2);
    } else if (signupStep === 2) {
      const cleanEmail = (email || "").trim();
      if (!cleanEmail) {
        setError('እባክዎ የኢሜል አድራሻዎን ያስገቡ።');
        return;
      }
      const emailValidation = validateEmailForSignup(cleanEmail);
      if (!emailValidation.isValid) {
        setError(emailValidation.errorMessage || 'ይቅርታ! እባክዎ ትክክለኛ እና ቋሚ የኢሜይል አድራሻ (እንደ Gmail, Yahoo) ይጠቀሙ።');
        return;
      }
      if (!password || password.length < 6) {
        setError('የይለፍ ቃል ቢያንስ 6 ፊደላት ወይም ቁጥሮች መሆን አለበት።');
        return;
      }
      setSlideDirection('next');
      setSignupStep(3);
    }
  };

  const handlePrevStep = () => {
    setError("");
    setSlideDirection('back');
    setSignupStep(prev => Math.max(1, prev - 1));
  };

  // Submit Handler: Email/Password (Login & Multi-Step Signup) and Google Profile Completion
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setResendSuccessMessage("");

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

    // 2. Email & Password Sign Up (Step 3 Final Submission)
    if (isSignupMode) {
      if (signupStep < 3) {
        handleNextStep();
        return;
      }

      if (!name.trim()) {
        setError('እባክዎ ሙሉ ስምዎን ያስገቡ።');
        setSignupStep(1);
        return;
      }

      const emailValidation = validateEmailForSignup(cleanEmail);
      if (!emailValidation.isValid) {
        setError(emailValidation.errorMessage || 'ይቅርታ! እባክዎ ትክክለኛ እና ቋሚ የኢሜይል አድራሻ (እንደ Gmail, Yahoo) ይጠቀሙ።');
        setSignupStep(2);
        return;
      }

      if (!phone.trim() || phone.trim().length < 7) {
        setError('እባክዎ ትክክለኛ ስልክ ቁጥር ያስገቡ።');
        setSignupStep(1);
        return;
      }
      if (!city.trim()) {
        setError('እባክዎ የሚኖሩበትን ከተማ ወይም ሀገር ያስገቡ።');
        setSignupStep(1);
        return;
      }
      if (!password || password.length < 6) {
        setError('የይለፍ ቃል ቢያንስ 6 ፊደላት ወይም ቁጥሮች መሆን አለበት።');
        setSignupStep(2);
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
          referralCode: referralCode.trim().toUpperCase() || null,
          createdAt: serverTimestamp(),
          lastLogin: serverTimestamp(),
          isAdmin: false,
          photoURL: null
        };

        if (referralCode.trim()) {
          recordReferralUsage(referralCode.trim().toUpperCase());
          try {
            localStorage.setItem('tsehay_applied_referral_code', referralCode.trim().toUpperCase());
          } catch (e) {}
        }

        // Save Firestore profile info
        await setDoc(doc(db, 'artifacts', 'tsehaycampus-e1a6d', 'users', cred.user.uid, 'profile', 'info'), userData, { merge: true });

        // Send Email Verification Link
        await sendEmailVerification(cred.user);

        // PREVENT PREMATURE LOGIN: Immediately Sign Out the unverified user!
        await signOut(auth);
        try {
          localStorage.removeItem('tsehay_auth_user_cache');
          localStorage.removeItem('tsehay_auth_is_admin');
        } catch (e) {}

        setRegisteredEmail(cleanEmail);
        setVerificationSent(true);
        setError("");
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

    // 3. Email & Password Login (Strict Email Verification Check)
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

      // SECURITY CHECK: Enforce Email Verification on Login
      if (!cred.user.emailVerified) {
        await signOut(auth);
        try {
          localStorage.removeItem('tsehay_auth_user_cache');
          localStorage.removeItem('tsehay_auth_is_admin');
        } catch (e) {}
        
        setUnverifiedEmail(cleanEmail);
        setError('እባክዎ መጀመሪያ ወደ ኢሜልዎ የተላከውን የማረጋገጫ ሊንክ (Verification Link) ተጭነው አካውንትዎን ያረጋግጡ።');
        return;
      }

      // Record last login in background
      setDoc(doc(db, 'artifacts', 'tsehaycampus-e1a6d', 'users', cred.user.uid, 'profile', 'info'), {
        lastLogin: serverTimestamp()
      }, { merge: true }).catch(() => {});

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
      <div className="bg-white dark:bg-[#050811] w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden flex flex-col relative modal-animate border border-gray-100 dark:border-white/[0.1] max-h-[92vh]">
        
        {/* Modal Header */}
        <div className="bg-secondary dark:bg-[#030509] p-5 sm:p-6 text-white text-center relative border-b border-secondary/50 dark:border-white/[0.08] shrink-0">
          <button 
            type="button" 
            onClick={onClose} 
            disabled={loading}
            className="absolute top-4 right-4 text-white/70 hover:text-white transition text-2xl z-50 p-2 cursor-pointer"
          >
            <i className="fa-solid fa-xmark"></i>
          </button>
          
          <div className="w-14 h-14 sm:w-16 sm:h-16 bg-white rounded-2xl mx-auto flex items-center justify-center mb-2.5 shadow-lg p-1.5 border border-white/20">
            <img src="/tc-logo.jpg" alt="Logo" className="w-full h-full object-contain rounded-xl" />
          </div>

          <h2 className="font-black font-heading text-lg sm:text-xl">
            {verificationSent
              ? 'ኢሜልዎን ያረጋግጡ'
              : pendingGoogleAuth 
              ? 'ምዝገባዎን ያጠናቅቁ' 
              : isResetMode 
              ? 'የይለፍ ቃል መቀየሪያ' 
              : isSignupMode 
              ? `ወደ ካምፓስ ይቀላቀሉ (${signupStep}/3)` 
              : 'ወደ ካምፓስ ይግቡ'}
          </h2>
          
          <p className="text-blue-100 dark:text-gray-400 text-xs sm:text-sm mt-0.5">
            {verificationSent
              ? 'የማረጋገጫ ሊንክ ወደ ኢሜልዎ ተልኳል'
              : pendingGoogleAuth 
              ? 'በ Google ተገናኝተዋል! የቀሩትን መረጃዎች ሞልተው ምዝገባዎን ያጠናቅቁ' 
              : isResetMode 
              ? 'የኢሜል አድራሻዎን ያስገቡ፤ ሊንክ እንልክልዎታለን' 
              : isSignupMode 
              ? (signupStep === 1 ? 'ደረጃ 1፡ ስለ እርስዎ ይንገሩን 👋' : signupStep === 2 ? 'ደረጃ 2፡ የኢሜል እና የይለፍ ቃል 🔐' : 'ደረጃ 3፡ የመጨረሻ ማጠቃለያ 🚀')
              : 'በ Google ወይም በኢሜል እና የይለፍ ቃል ይግቡ'}
          </p>
        </div>
        
        {/* Modal Body */}
        <div className="p-5 sm:p-7 overflow-y-auto custom-modal-scroll flex-1">
          
          {/* =========================================================================
              ✨ 1. VERIFICATION EMAIL SENT SUCCESS SCREEN
              ========================================================================= */}
          {verificationSent ? (
            <div className="text-center py-4 space-y-5 animate-in fade-in zoom-in-95 duration-300">
              <div className="w-20 h-20 bg-amber-500/10 border-2 border-[#f9b03c] rounded-3xl mx-auto flex items-center justify-center text-4xl text-[#f9b03c] shadow-[0_0_30px_rgba(249,176,60,0.3)]">
                <i className="fa-solid fa-envelope-circle-check"></i>
              </div>

              <div className="space-y-2">
                <h3 className="text-xl font-black font-heading text-dark dark:text-white">
                  የማረጋገጫ ሊንክ ወደ ኢሜልዎ ተልኳል!
                </h3>
                <p className="text-sm text-gray-600 dark:text-slate-300 max-w-sm mx-auto leading-relaxed">
                  አካውንትዎ እንዲነቃ ወደ ኢሜል አድራሻዎ (<span className="text-[#f9b03c] font-black">{registeredEmail}</span>) የተላከውን የማረጋገጫ ሊንክ ይጫኑ።
                </p>
              </div>

              <div className="bg-[#030509] border border-white/[0.08] rounded-2xl p-4 text-xs text-slate-300 text-left space-y-2">
                <p className="flex items-start gap-2">
                  <i className="fa-solid fa-circle-info text-[#f9b03c] mt-0.5"></i>
                  <span>ኢሜሉ በ Inbox ውስጥ ካልታየዎት እባክዎ <strong>Spam / Junk</strong> ፎልደርዎን ይመልከቱ።</span>
                </p>
                <p className="flex items-start gap-2">
                  <i className="fa-solid fa-shield-halved text-[#3268ba] mt-0.5"></i>
                  <span>ሊንኩን ከተጫኑ በኋላ በቀጥታ ወደ አካውንትዎ መግባት ይችላሉ።</span>
                </p>
              </div>

              <div className="pt-3 space-y-3">
                <button
                  type="button"
                  onClick={() => {
                    setVerificationSent(false);
                    setIsSignupMode(false);
                    setEmail(registeredEmail);
                    setError("");
                  }}
                  className="w-full bg-[#f9b03c] hover:bg-[#ffbe53] text-slate-950 font-black py-3.5 rounded-2xl transition shadow-[0_0_20px_rgba(249,176,60,0.35)] cursor-pointer active:scale-[0.99]"
                >
                  <i className="fa-solid fa-right-to-bracket mr-2"></i>
                  ወደ መግቢያ ተመለስ (Go to Login)
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Error Message Display */}
              {error && (
                <div className="bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800 text-xs sm:text-sm p-3.5 rounded-2xl mb-4 font-bold text-center animate-in fade-in">
                  <i className="fa-solid fa-circle-exclamation mr-2"></i>
                  {error}
                </div>
              )}

              {/* Success Message Display */}
              {resendSuccessMessage && (
                <div className="bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/60 text-xs sm:text-sm p-3.5 rounded-2xl mb-4 font-bold text-center animate-in fade-in">
                  <i className="fa-solid fa-circle-check mr-2"></i>
                  {resendSuccessMessage}
                </div>
              )}

              {/* Unverified Email Warning & Quick Resend Banner */}
              {unverifiedEmail && (
                <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 mb-4 text-xs text-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 animate-in fade-in">
                  <div className="flex items-center gap-2">
                    <i className="fa-solid fa-envelope text-[#f9b03c] text-base"></i>
                    <span>የማረጋገጫ ሊንኩ አልደረሰዎትም?</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleResendVerification}
                    disabled={isResendingEmail}
                    className="bg-[#f9b03c] hover:bg-[#ffbe53] text-slate-950 font-black px-3.5 py-2 rounded-xl text-xs transition cursor-pointer disabled:opacity-50 shrink-0"
                  >
                    {isResendingEmail ? 'በመላክ ላይ...' : 'ሊንክ በድጋሚ ላክ'}
                  </button>
                </div>
              )}

              {/* 🌟 MULTI-STEP PROGRESS STEPPER (Animated Bar for Sign-Up) */}
              {isSignupMode && !pendingGoogleAuth && !isResetMode && (
                <div className="mb-6 px-1">
                  <div className="flex items-center justify-between relative">
                    {/* Background Track */}
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 h-1 w-full bg-gray-200 dark:bg-white/10 rounded-full z-0" />
                    {/* Active Gradient Fill Track */}
                    <div 
                      className="absolute left-0 top-1/2 -translate-y-1/2 h-1 bg-gradient-to-r from-[#f9b03c] via-amber-400 to-[#f9b03c] rounded-full z-0 transition-all duration-500 shadow-[0_0_10px_rgba(249,176,60,0.5)]" 
                      style={{ width: signupStep === 1 ? '16%' : signupStep === 2 ? '50%' : '100%' }}
                    />
                    
                    {/* Step 1 Node */}
                    <button 
                      type="button"
                      onClick={() => { if (signupStep > 1) { setSlideDirection('back'); setSignupStep(1); } }}
                      className={`relative z-10 w-8 h-8 rounded-full flex items-center justify-center font-black text-xs transition-all duration-300 ${
                        signupStep === 1 
                          ? 'bg-[#f9b03c] text-black ring-4 ring-[#f9b03c]/20 shadow-[0_0_15px_rgba(249,176,60,0.6)] scale-110' 
                          : signupStep > 1 
                          ? 'bg-[#3268ba] text-white cursor-pointer' 
                          : 'bg-gray-200 dark:bg-white/10 text-gray-500'
                      }`}
                    >
                      {signupStep > 1 ? <i className="fa-solid fa-check text-[10px]"></i> : <span>1</span>}
                    </button>

                    {/* Step 2 Node */}
                    <button 
                      type="button"
                      onClick={() => { if (signupStep > 2) { setSlideDirection('back'); setSignupStep(2); } }}
                      className={`relative z-10 w-8 h-8 rounded-full flex items-center justify-center font-black text-xs transition-all duration-300 ${
                        signupStep === 2 
                          ? 'bg-[#f9b03c] text-black ring-4 ring-[#f9b03c]/20 shadow-[0_0_15px_rgba(249,176,60,0.6)] scale-110' 
                          : signupStep > 2 
                          ? 'bg-[#3268ba] text-white cursor-pointer' 
                          : 'bg-gray-200 dark:bg-white/10 text-gray-500'
                      }`}
                    >
                      {signupStep > 2 ? <i className="fa-solid fa-check text-[10px]"></i> : <span>2</span>}
                    </button>

                    {/* Step 3 Node */}
                    <div 
                      className={`relative z-10 w-8 h-8 rounded-full flex items-center justify-center font-black text-xs transition-all duration-300 ${
                        signupStep === 3 
                          ? 'bg-[#f9b03c] text-black ring-4 ring-[#f9b03c]/20 shadow-[0_0_15px_rgba(249,176,60,0.6)] scale-110' 
                          : 'bg-gray-200 dark:bg-white/10 text-gray-500'
                      }`}
                    >
                      <span>3</span>
                    </div>
                  </div>

                  {/* Step Labels */}
                  <div className="flex justify-between text-[11px] font-bold mt-2 text-gray-500 dark:text-gray-400">
                    <span className={signupStep === 1 ? 'text-[#f9b03c] font-black' : ''}>1. የግል መረጃ</span>
                    <span className={signupStep === 2 ? 'text-[#f9b03c] font-black' : ''}>2. አካውንት</span>
                    <span className={signupStep === 3 ? 'text-[#f9b03c] font-black' : ''}>3. ማጠናቀቂያ</span>
                  </div>
                </div>
              )}

              {/* Pending Google Connected Badge */}
              {pendingGoogleAuth && (
                <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800/60 rounded-2xl p-3.5 flex items-center gap-3 mb-4">
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

              {/* Top Quick Google Sign-In / Sign-Up Button (Available on Login and Signup Step 1) */}
              {!pendingGoogleAuth && !isResetMode && (!isSignupMode || signupStep === 1) && (
                <>
                  <button 
                    type="button" 
                    onClick={handleGoogleAuth} 
                    disabled={loading}
                    className="w-full bg-white dark:bg-[#0d1222] border border-gray-200 dark:border-white/[0.1] text-gray-900 dark:text-white font-bold py-3.5 px-4 rounded-2xl hover:bg-gray-50 dark:hover:bg-white/[0.05] transition shadow-sm flex items-center justify-center gap-3 mb-4 group cursor-pointer hover:border-primary/50"
                  >
                    <img src="https://www.svgrepo.com/show/475656/google-color.svg" alt="Google" className="w-5 h-5 group-hover:scale-110 transition-transform" />
                    <span>{isSignupMode ? 'በ Google (Gmail) በፍጥነት ይመዝገቡ' : 'በ Google (Gmail) ይግቡ'}</span>
                  </button>

                  <div className="flex items-center my-4">
                    <hr className="flex-1 border-gray-200 dark:border-white/[0.08]" />
                    <span className="px-3 text-xs text-gray-400 dark:text-gray-500 font-bold uppercase">
                      {isSignupMode ? 'ወይም ደረጃ በደረጃ ይመዝገቡ' : 'ወይም በኢሜል ይግቡ'}
                    </span>
                    <hr className="flex-1 border-gray-200 dark:border-white/[0.08]" />
                  </div>
                </>
              )}

              {/* Form Container */}
              <form onSubmit={isResetMode ? handlePasswordReset : handleSubmit} className="space-y-4 px-1">
                
                {/* 🌟 1. SIGN-UP MULTI-STEP FLOW */}
                {isSignupMode && !pendingGoogleAuth && !isResetMode ? (
                  <div key={`step-${signupStep}`} className={slideDirection === 'next' ? 'animate-in fade-in slide-in-from-right-4 duration-300 space-y-4' : 'animate-in fade-in slide-in-from-left-4 duration-300 space-y-4'}>
                    
                    {/* STEP 1: Personal Profile Info */}
                    {signupStep === 1 && (
                      <>
                        <div>
                          <label className="block text-xs font-black uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-1.5">
                            ሙሉ ስም (Full Name) <span className="text-red-500">*</span>
                          </label>
                          <input 
                            type="text" 
                            value={name} 
                            onChange={(e) => setName(e.target.value)} 
                            required 
                            placeholder="ለምሳሌ፡ ዮናስ አበበ" 
                            className="w-full bg-gray-50 dark:bg-white/[0.04] border border-gray-200 dark:border-white/[0.1] rounded-xl py-3 px-4 text-sm outline-none focus:border-secondary dark:focus:border-[#f9b03c] dark:text-white transition" 
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-black uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-1.5">
                            ስልክ ቁጥር (Phone Number) <span className="text-red-500">*</span>
                          </label>
                          <input 
                            type="tel" 
                            value={phone} 
                            onChange={(e) => setPhone(e.target.value)} 
                            required 
                            placeholder="ለምሳሌ፡ 0911234567 ወይም +251 9..." 
                            className="w-full bg-gray-50 dark:bg-white/[0.04] border border-gray-200 dark:border-white/[0.1] rounded-xl py-3 px-4 text-sm outline-none focus:border-secondary dark:focus:border-[#f9b03c] dark:text-white transition" 
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-black uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-1.5">
                            ከተማ / ሀገር (City / Country) <span className="text-red-500">*</span>
                          </label>
                          <input 
                            type="text" 
                            value={city} 
                            onChange={(e) => setCity(e.target.value)} 
                            required 
                            placeholder="ለምሳሌ፡ አዲስ አበባ, ኢትዮጵያ" 
                            className="w-full bg-gray-50 dark:bg-white/[0.04] border border-gray-200 dark:border-white/[0.1] rounded-xl py-3 px-4 text-sm outline-none focus:border-secondary dark:focus:border-[#f9b03c] dark:text-white transition" 
                          />
                        </div>

                        <button 
                          type="button" 
                          onClick={handleNextStep}
                          className="w-full bg-[#f9b03c] hover:bg-[#ffbe53] text-black font-black py-3.5 rounded-2xl transition shadow-[0_0_20px_rgba(249,176,60,0.35)] flex items-center justify-center gap-2 mt-5 cursor-pointer active:scale-[0.99]"
                        >
                          <span>ቀጣይ (Next: ኢሜል እና ቃል)</span>
                          <i className="fa-solid fa-arrow-right text-xs"></i>
                        </button>
                      </>
                    )}

                    {/* STEP 2: Account Credentials (Email & Password) */}
                    {signupStep === 2 && (
                      <>
                        <div>
                          <label className="block text-xs font-black uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-1.5">
                            ኢሜል አድራሻ (Email) <span className="text-red-500">*</span>
                          </label>
                          <input 
                            type="email" 
                            value={email} 
                            onChange={(e) => handleEmailChange(e.target.value)} 
                            required 
                            placeholder="email@gmail.com" 
                            className={`w-full bg-gray-50 dark:bg-white/[0.04] border rounded-xl py-3 px-4 text-sm outline-none transition dark:text-white ${
                              emailError 
                                ? 'border-red-500 focus:border-red-500 bg-red-500/5' 
                                : 'border-gray-200 dark:border-white/[0.1] focus:border-secondary dark:focus:border-[#f9b03c]'
                            }`} 
                          />
                          {emailError && (
                            <p className="text-red-500 text-xs font-bold mt-1.5 leading-relaxed animate-in fade-in">
                              <i className="fa-solid fa-triangle-exclamation mr-1"></i>
                              {emailError}
                            </p>
                          )}
                        </div>

                        <div>
                          <label className="block text-xs font-black uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-1.5">
                            አዲስ የይለፍ ቃል (Create Password) <span className="text-red-500">*</span>
                          </label>
                          <div className="relative">
                            <input 
                              type={showPassword ? "text" : "password"} 
                              value={password} 
                              onChange={(e) => setPassword(e.target.value)} 
                              required 
                              placeholder="•••••••• (ቢያንስ 6 ፊደላት)" 
                              minLength={6} 
                              className="w-full bg-gray-50 dark:bg-white/[0.04] border border-gray-200 dark:border-white/[0.1] rounded-xl py-3 pl-4 pr-11 text-sm outline-none focus:border-secondary dark:focus:border-[#f9b03c] dark:text-white transition" 
                            />
                            <button 
                              type="button" 
                              onClick={() => setShowPassword(!showPassword)} 
                              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition text-sm p-1 cursor-pointer"
                            >
                              <i className={`fa-solid ${showPassword ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                            </button>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 pt-2">
                          <button 
                            type="button" 
                            onClick={handlePrevStep}
                            className="w-1/3 bg-gray-100 dark:bg-white/[0.06] text-gray-700 dark:text-gray-300 font-bold py-3.5 rounded-2xl hover:bg-gray-200 dark:hover:bg-white/[0.1] transition flex items-center justify-center gap-1.5 text-xs cursor-pointer"
                          >
                            <i className="fa-solid fa-arrow-left text-[10px]"></i>
                            <span>ተመለስ</span>
                          </button>
                          <button 
                            type="button" 
                            onClick={handleNextStep}
                            className="w-2/3 bg-[#f9b03c] hover:bg-[#ffbe53] text-black font-black py-3.5 rounded-2xl transition shadow-[0_0_20px_rgba(249,176,60,0.35)] flex items-center justify-center gap-2 text-xs sm:text-sm cursor-pointer active:scale-[0.99]"
                          >
                            <span>ቀጣይ (Next: ማጠቃለያ)</span>
                            <i className="fa-solid fa-arrow-right text-xs"></i>
                          </button>
                        </div>
                      </>
                    )}

                    {/* STEP 3: Source and Terms & Final Submit */}
                    {signupStep === 3 && (
                      <>
                        <div>
                          <label className="block text-xs font-black uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-1.5">
                            ስለ እኛ ከየት ሰሙ? (How did you hear about us?) <span className="text-red-500">*</span>
                          </label>
                          <select 
                            value={source} 
                            onChange={(e) => setSource(e.target.value)} 
                            required 
                            className="w-full bg-gray-50 dark:bg-[#0d1222] border border-gray-200 dark:border-white/[0.1] rounded-xl py-3 px-4 text-sm outline-none focus:border-secondary dark:focus:border-[#f9b03c] dark:text-white transition cursor-pointer"
                          >
                            <option value="" disabled className="bg-[#0d1222] text-gray-400">እባክዎ ይምረጡ...</option>
                            <option value="Telegram" className="bg-[#0d1222] text-white">ቴሌግራም (Telegram)</option>
                            <option value="TikTok" className="bg-[#0d1222] text-white">ቲክቶክ (TikTok)</option>
                            <option value="Facebook" className="bg-[#0d1222] text-white">ፌስቡክ (Facebook)</option>
                            <option value="YouTube" className="bg-[#0d1222] text-white">ዩቲዩብ (YouTube)</option>
                            <option value="Friend" className="bg-[#0d1222] text-white">ከጓደኛ ወይም ከሰው ጥቆማ (Friend / Referral)</option>
                            <option value="Google" className="bg-[#0d1222] text-white">Google Search</option>
                            <option value="Other" className="bg-[#0d1222] text-white">ሌላ (Other)</option>
                          </select>
                        </div>

                        {/* Summary Pill */}
                        <div className="bg-[#3268ba]/10 border border-[#3268ba]/30 rounded-2xl p-3 text-xs space-y-1">
                          <div className="flex justify-between text-slate-300">
                            <span>ስም፦</span> <strong className="text-white">{name}</strong>
                          </div>
                          <div className="flex justify-between text-slate-300">
                            <span>ኢሜል፦</span> <strong className="text-[#f9b03c]">{email}</strong>
                          </div>
                        </div>

                        {/* Terms and Privacy Checkbox */}
                        <div className="flex items-start gap-3 text-sm bg-gray-50/50 dark:bg-white/[0.02] p-3 rounded-2xl border border-gray-100 dark:border-white/[0.08]">
                          <input 
                            type="checkbox" 
                            id="terms" 
                            checked={agreedToTerms} 
                            onChange={(e) => setAgreedToTerms(e.target.checked)} 
                            required
                            className="mt-0.5 min-w-[18px] w-4.5 h-4.5 text-primary bg-white border-gray-300 rounded focus:ring-primary dark:bg-gray-800 dark:border-gray-600 cursor-pointer accent-[#f9b03c]" 
                          />
                          <label htmlFor="terms" className="text-gray-600 dark:text-gray-400 leading-snug cursor-pointer text-xs select-none">
                            አካውንት በመክፈት የTsehay Campus <button type="button" onClick={() => window.dispatchEvent(new Event('open-terms-modal'))} className="text-secondary dark:text-[#f9b03c] hover:underline font-bold">የአጠቃቀም ህግ እና የግላዊነት ፖሊሲ (Terms & Privacy)</button> ለመቀበል እስማማለሁ።
                          </label>
                        </div>

                        <div className="flex items-center gap-3 pt-2">
                          <button 
                            type="button" 
                            onClick={handlePrevStep}
                            disabled={loading}
                            className="w-1/3 bg-gray-100 dark:bg-white/[0.06] text-gray-700 dark:text-gray-300 font-bold py-3.5 rounded-2xl hover:bg-gray-200 dark:hover:bg-white/[0.1] transition flex items-center justify-center gap-1.5 text-xs cursor-pointer disabled:opacity-50"
                          >
                            <i className="fa-solid fa-arrow-left text-[10px]"></i>
                            <span>ተመለስ</span>
                          </button>
                          <button 
                            type="submit" 
                            disabled={loading || !agreedToTerms}
                            className="w-2/3 bg-[#f9b03c] hover:bg-[#ffbe53] text-black font-black py-3.5 rounded-2xl transition shadow-[0_0_20px_rgba(249,176,60,0.35)] flex items-center justify-center gap-2 text-xs sm:text-sm cursor-pointer disabled:opacity-50 active:scale-[0.99]"
                          >
                            {loading ? (
                              <>
                                <i className="fa-solid fa-spinner fa-spin"></i>
                                <span>በመመዝገብ ላይ...</span>
                              </>
                            ) : (
                              <>
                                <i className="fa-solid fa-user-plus"></i>
                                <span>ምዝገባውን አጠናቅቅ 🎉</span>
                              </>
                            )}
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                ) : (
                  /* 🌟 2. LOGIN / GOOGLE COMPLETION / RESET MODE FLOW */
                  <>
                    {/* Google Profile Completion Extra Fields */}
                    {pendingGoogleAuth && (
                      <>
                        <div>
                          <label className="block text-xs font-black uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-1.5">
                            ሙሉ ስም (Full Name) <span className="text-red-500">*</span>
                          </label>
                          <input 
                            type="text" 
                            value={name} 
                            onChange={(e) => setName(e.target.value)} 
                            required 
                            placeholder="ሙሉ ስምዎን ያስገቡ" 
                            className="w-full bg-gray-50 dark:bg-white/[0.04] border border-gray-200 dark:border-white/[0.1] rounded-xl py-3 px-4 text-sm outline-none focus:border-[#f9b03c] dark:text-white transition" 
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-black uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-1.5">
                            ስልክ ቁጥር (Phone Number) <span className="text-red-500">*</span>
                          </label>
                          <input 
                            type="tel" 
                            value={phone} 
                            onChange={(e) => setPhone(e.target.value)} 
                            required 
                            placeholder="ለምሳሌ፡ 0911234567" 
                            className="w-full bg-gray-50 dark:bg-white/[0.04] border border-gray-200 dark:border-white/[0.1] rounded-xl py-3 px-4 text-sm outline-none focus:border-[#f9b03c] dark:text-white transition" 
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-black uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-1.5">
                            ከተማ / ሀገር (City / Country) <span className="text-red-500">*</span>
                          </label>
                          <input 
                            type="text" 
                            value={city} 
                            onChange={(e) => setCity(e.target.value)} 
                            required 
                            placeholder="ለምሳሌ፡ አዲስ አበባ, ኢትዮጵያ" 
                            className="w-full bg-gray-50 dark:bg-white/[0.04] border border-gray-200 dark:border-white/[0.1] rounded-xl py-3 px-4 text-sm outline-none focus:border-[#f9b03c] dark:text-white transition" 
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-black uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-1.5">
                            ስለ እኛ ከየት ሰሙ? <span className="text-red-500">*</span>
                          </label>
                          <select 
                            value={source} 
                            onChange={(e) => setSource(e.target.value)} 
                            required 
                            className="w-full bg-gray-50 dark:bg-[#0d1222] border border-gray-200 dark:border-white/[0.1] rounded-xl py-3 px-4 text-sm outline-none focus:border-[#f9b03c] dark:text-white transition cursor-pointer"
                          >
                            <option value="" disabled className="bg-[#0d1222] text-gray-400">እባክዎ ይምረጡ...</option>
                            <option value="Telegram" className="bg-[#0d1222] text-white">ቴሌግራም (Telegram)</option>
                            <option value="TikTok" className="bg-[#0d1222] text-white">ቲክቶክ (TikTok)</option>
                            <option value="Facebook" className="bg-[#0d1222] text-white">ፌስቡክ (Facebook)</option>
                            <option value="YouTube" className="bg-[#0d1222] text-white">ዩቲዩብ (YouTube)</option>
                            <option value="Friend" className="bg-[#0d1222] text-white">ከጓደኛ ወይም ከሰው ጥቆማ (Friend / Referral)</option>
                            <option value="Google" className="bg-[#0d1222] text-white">Google Search</option>
                            <option value="Other" className="bg-[#0d1222] text-white">ሌላ (Other)</option>
                          </select>
                        </div>

                        <div className="flex items-start gap-3 text-sm bg-gray-50/50 dark:bg-white/[0.02] p-3 rounded-2xl border border-gray-100 dark:border-white/[0.08]">
                          <input 
                            type="checkbox" 
                            id="terms-google" 
                            checked={agreedToTerms} 
                            onChange={(e) => setAgreedToTerms(e.target.checked)} 
                            required
                            className="mt-0.5 min-w-[18px] w-4.5 h-4.5 accent-[#f9b03c] cursor-pointer" 
                          />
                          <label htmlFor="terms-google" className="text-gray-600 dark:text-gray-400 leading-snug cursor-pointer text-xs select-none">
                            የTsehay Campus <button type="button" onClick={() => window.dispatchEvent(new Event('open-terms-modal'))} className="text-[#f9b03c] hover:underline font-bold">የአጠቃቀም ህግ እና የግላዊነት ፖሊሲ (Terms & Privacy)</button> ለመቀበል እስማማለሁ።
                          </label>
                        </div>
                      </>
                    )}

                    {/* Email Input for Login and Reset */}
                    {!pendingGoogleAuth && (
                      <div>
                        <label className="block text-xs font-black uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-1.5">
                          ኢሜል (Email) <span className="text-red-500">*</span>
                        </label>
                        <input 
                          type="email" 
                          value={email} 
                          onChange={(e) => handleEmailChange(e.target.value)} 
                          required 
                          placeholder="email@gmail.com" 
                          className="w-full bg-gray-50 dark:bg-white/[0.04] border border-gray-200 dark:border-white/[0.1] rounded-xl py-3 px-4 text-sm outline-none focus:border-[#f9b03c] dark:text-white transition" 
                        />
                      </div>
                    )}

                    {/* Password Input for Login */}
                    {!pendingGoogleAuth && !isResetMode && (
                      <div>
                        <label className="block text-xs font-black uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-1.5">
                          የይለፍ ቃል (Password) <span className="text-red-500">*</span>
                        </label>
                        <div className="relative">
                          <input 
                            type={showPassword ? "text" : "password"} 
                            value={password} 
                            onChange={(e) => setPassword(e.target.value)} 
                            required 
                            placeholder="••••••••" 
                            className="w-full bg-gray-50 dark:bg-white/[0.04] border border-gray-200 dark:border-white/[0.1] rounded-xl py-3 pl-4 pr-11 text-sm outline-none focus:border-[#f9b03c] dark:text-white transition" 
                          />
                          <button 
                            type="button" 
                            onClick={() => setShowPassword(!showPassword)} 
                            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition text-sm p-1 cursor-pointer"
                          >
                            <i className={`fa-solid ${showPassword ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                          </button>
                        </div>
                      </div>
                    )}
                    
                    {/* Forgot Password Link in Login Mode */}
                    {!pendingGoogleAuth && !isResetMode && (
                      <div className="flex justify-end pt-0.5">
                        <button 
                          type="button" 
                          onClick={() => setIsResetMode(true)} 
                          className="text-xs font-bold text-[#f9b03c] hover:underline cursor-pointer"
                        >
                          የይለፍ ቃል ረሱ? (Forgot Password?)
                        </button>
                      </div>
                    )}

                    {/* Submit Button for Login / Google Completion / Reset */}
                    <button 
                      type="submit" 
                      disabled={loading} 
                      className="w-full bg-[#f9b03c] hover:bg-[#ffbe53] text-black font-black py-3.5 rounded-2xl transition shadow-[0_0_20px_rgba(249,176,60,0.35)] mt-4 flex items-center justify-center gap-2 cursor-pointer active:scale-[0.99]"
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
                      ) : (
                        <>
                          <i className="fa-solid fa-right-to-bracket"></i>
                          <span>ግባ (Login)</span>
                        </>
                      )}
                    </button>

                    {/* Back to Login from Reset Mode */}
                    {isResetMode && (
                      <button 
                        type="button" 
                        onClick={() => setIsResetMode(false)} 
                        className="w-full text-center text-xs font-bold text-gray-500 dark:text-gray-400 hover:text-dark dark:hover:text-white transition pt-2 cursor-pointer"
                      >
                        <i className="fa-solid fa-arrow-left mr-1"></i> ወደ መግቢያ ተመለስ (Back to Login)
                      </button>
                    )}
                  </>
                )}
              </form>

              {/* Bottom Switch between Login & Signup */}
              {!isResetMode && !pendingGoogleAuth && (
                <div className="text-center mt-5 pt-4 border-t border-gray-100 dark:border-white/[0.08] text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                  {isSignupMode ? (
                    <p>
                      አስቀድመው አካውንት አለዎት?{' '}
                      <button 
                        type="button" 
                        onClick={() => { setIsSignupMode(false); setError(""); setEmailError(""); setSignupStep(1); }} 
                        className="text-secondary dark:text-[#f9b03c] font-black hover:underline ml-1 cursor-pointer"
                      >
                        ይግቡ (Login)
                      </button>
                    </p>
                  ) : (
                    <p>
                      አዲስ ተማሪ ነዎት?{' '}
                      <button 
                        type="button" 
                        onClick={() => { setIsSignupMode(true); setError(""); setEmailError(""); setSignupStep(1); }} 
                        className="text-secondary dark:text-[#f9b03c] font-black hover:underline ml-1 cursor-pointer"
                      >
                        አዲስ ይመዝገቡ (Sign Up)
                      </button>
                    </p>
                  )}
                </div>
              )}
            </>
          )}

        </div>
      </div>
    </div>
  );
}
