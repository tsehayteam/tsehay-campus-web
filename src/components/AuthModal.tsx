'use client';

import { useState, useEffect, useRef, useCallback } from "react";
import { auth, db } from "@/lib/firebase/config";
import { 
  signInWithEmailAndPassword, 
  signInWithCustomToken,
  createUserWithEmailAndPassword, 
  sendPasswordResetEmail,
  sendEmailVerification, 
  signOut, 
  updateProfile, 
  GoogleAuthProvider, 
  signInWithPopup, 
  User 
} from "firebase/auth";
import { doc, setDoc, serverTimestamp, getDoc } from "firebase/firestore";
import { useRouter } from "next/navigation";
import { validateEmailForSignup } from "@/lib/disposableEmailBlocker";
import { recordReferralUsage } from "@/lib/referralService";
import { getStoredReferrerUid, clearStoredReferrerUid } from "@/lib/referralTrackingService";
import { generateOtpCode, saveOtpForEmail, verifyOtpForEmail } from "@/lib/otpService";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  isSignupMode: boolean;
  setIsSignupMode: (val: boolean) => void;
}

const isProfileDataComplete = (data: any): boolean => {
  return Boolean(data && (data.name || data.fullName) && (data.phone || data.phoneNumber));
};

export default function AuthModal({ isOpen, onClose, isSignupMode, setIsSignupMode }: AuthModalProps) {
  const [isResetMode, setIsResetMode] = useState(false);
  const [resetStep, setResetStep] = useState<'request' | 'otp' | 'new_password' | 'success'>('request');
  const [resetOtpDigits, setResetOtpDigits] = useState<string[]>(['', '', '', '', '', '']);
  const [resetOtpError, setResetOtpError] = useState("");
  const [isVerifyingResetOtp, setIsVerifyingResetOtp] = useState(false);
  const [resetResendCountdown, setResetResendCountdown] = useState<number>(60);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmittingNewPassword, setIsSubmittingNewPassword] = useState(false);
  const resetOtpInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const [showPassword, setShowPassword] = useState(false);
  
  // 🌟 Smart User Existence Detection States
  const [isCheckingEmail, setIsCheckingEmail] = useState(false);
  const [smartUserStatus, setSmartUserStatus] = useState<{
    checkedEmail: string;
    exists: boolean;
    displayName?: string;
    photoURL?: string;
  } | null>(null);
  const checkEmailDebounceRef = useRef<NodeJS.Timeout | null>(null);

  // 🌟 Multi-Step Onboarding State for Sign-Up
  const [signupStep, setSignupStep] = useState<number>(1);
  const [slideDirection, setSlideDirection] = useState<'next' | 'back'>('next');

  // 🌟 6-Digit OTP Verification Screen State
  const [isOtpMode, setIsOtpMode] = useState(false);
  const [otpDigits, setOtpDigits] = useState<string[]>(['', '', '', '', '', '']);
  const [otpError, setOtpError] = useState("");
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const [resendCountdown, setResendCountdown] = useState<number>(60);
  const [pendingSignupData, setPendingSignupData] = useState<any>(null);
  const otpInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Verification Screen State
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
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [pendingGoogleAuth, setPendingGoogleAuth] = useState<User | null>(null);
  const router = useRouter();

  // Reset modal state on open/close
  useEffect(() => {
    if (!isOpen) {
      setPendingGoogleAuth(null);
      setError("");
      setEmailError("");
      setOtpError("");
      setResetOtpError("");
      setResendSuccessMessage("");
      setIsResetMode(false);
      setResetStep('request');
      setResetOtpDigits(['', '', '', '', '', '']);
      setNewPassword("");
      setConfirmPassword("");
      setShowNewPassword(false);
      setShowConfirmPassword(false);
      setShowPassword(false);
      setIsOtpMode(false);
      setOtpDigits(['', '', '', '', '', '']);
      setRegisteredEmail("");
      setUnverifiedEmail("");
      setPendingSignupData(null);
      setSignupStep(1);
      setSmartUserStatus(null);
      setIsCheckingEmail(false);
    }
  }, [isOpen]);

  // Resend Countdown Timer (for Signup OTP and Reset Password OTP)
  useEffect(() => {
    let timer: any;
    if ((isOtpMode || (isResetMode && resetStep === 'otp')) && (resendCountdown > 0 || resetResendCountdown > 0)) {
      timer = setInterval(() => {
        setResendCountdown(prev => Math.max(0, prev - 1));
        setResetResendCountdown(prev => Math.max(0, prev - 1));
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [isOtpMode, isResetMode, resetStep, resendCountdown, resetResendCountdown]);

  // 🌟 Seamless "Return to Action" Post-Auth Handler
  const handlePostAuthSuccess = useCallback((authenticatedUser: User) => {
    if (typeof window !== 'undefined') {
      try {
        const serialized = {
          uid: authenticatedUser.uid,
          email: authenticatedUser.email,
          displayName: authenticatedUser.displayName,
          photoURL: authenticatedUser.photoURL,
        };
        localStorage.setItem('tsehay_auth_user_cache', JSON.stringify(serialized));
      } catch (e) {}

      // Broadcast immediate auth event to all components
      window.dispatchEvent(new CustomEvent('tsehay_auth_state_changed', { detail: authenticatedUser }));
      window.dispatchEvent(new CustomEvent('tsehay_user_logged_in', { detail: authenticatedUser }));

      // Check for pending action in sessionStorage
      try {
        const pendingActionRaw = sessionStorage.getItem('tsehay_pending_action') ||
                                 sessionStorage.getItem('tsehay_pending_course_action') ||
                                 sessionStorage.getItem('tsehay_pending_event_reg') ||
                                 sessionStorage.getItem('tsehay_pending_mentorship_action');

        if (pendingActionRaw) {
          const pending = JSON.parse(pendingActionRaw);

          // Broadcast general resume event
          window.dispatchEvent(new CustomEvent('tsehay_resume_pending_action', { detail: pending }));

          // Immediate Action-Specific Resumes
          if (pending.type === 'buy' || pending.type === 'buy_course') {
            const courseObj = pending.course || pending;
            setTimeout(() => {
              window.dispatchEvent(new CustomEvent('open-payment-modal', { detail: { course: courseObj } }));
            }, 250);
          } else if (pending.type === 'enroll_free') {
            window.dispatchEvent(new CustomEvent('tsehay_enroll_free_course', { detail: pending }));
          } else if (pending.type === 'book_mentorship') {
            window.dispatchEvent(new CustomEvent('open-mentorship-payment', { detail: pending }));
          } else if (pending.type === 'buy_event_ticket' || pending.type === 'event_reg') {
            window.dispatchEvent(new CustomEvent('open-event-booking', { detail: pending }));
          }
        }
      } catch (e) {
        console.warn("Error resuming pending action:", e);
      }
    }

    onClose();
  }, [onClose]);

  // 🌟 Smart User Existence Detection (API Call with debounce)
  const performSmartEmailCheck = async (targetEmail: string) => {
    const cleanEmail = targetEmail.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@') || cleanEmail.split('@')[0].length < 2) {
      return;
    }

    setIsCheckingEmail(true);
    try {
      const res = await fetch('/api/auth/check-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: cleanEmail })
      });
      const data = await res.json();

      if (data) {
        setSmartUserStatus({
          checkedEmail: cleanEmail,
          exists: Boolean(data.exists),
          displayName: data.displayName,
          photoURL: data.photoURL
        });

        // Automatically switch mode based on existence if user hasn't completed full multi-step
        if (data.exists && isSignupMode && signupStep === 1) {
          setIsSignupMode(false);
          setError("");
        } else if (!data.exists && !isSignupMode && cleanEmail.endsWith('@gmail.com')) {
          setIsSignupMode(true);
          setSignupStep(1);
          setError("");
        }
      }
    } catch (e) {
      console.warn("Smart email check warning:", e);
    } finally {
      setIsCheckingEmail(false);
    }
  };

  // Real-time Gmail validation & Smart check trigger
  const handleEmailChange = (val: string) => {
    setEmail(val);
    setError("");
    setResendSuccessMessage("");

    const clean = val.trim().toLowerCase();
    if ((isSignupMode || pendingGoogleAuth) && clean.includes("@")) {
      if (!clean.endsWith("@gmail.com")) {
        setEmailError("ይቅርታ! የፀሐይ ካምፓስ የሚቀበለው ትክክለኛ የ Gmail (@gmail.com) አድራሻዎችን ብቻ ነው።");
      } else {
        setEmailError("");
      }
    } else {
      setEmailError("");
    }

    // Debounce smart check
    if (checkEmailDebounceRef.current) {
      clearTimeout(checkEmailDebounceRef.current);
    }

    if (clean.includes('@') && clean.length > 5) {
      checkEmailDebounceRef.current = setTimeout(() => {
        performSmartEmailCheck(clean);
      }, 450);
    } else {
      setSmartUserStatus(null);
    }
  };

  const getFriendlyErrorMessage = (err: any) => {
    const errorCode = err?.code || '';
    if (
      errorCode === 'auth/wrong-password' || 
      errorCode === 'auth/user-not-found' || 
      errorCode === 'auth/invalid-credential' || 
      errorCode === 'auth/invalid-login-credentials'
    ) {
      return 'የተሳሳተ የ Gmail አድራሻ ወይም የይለፍ ቃል አስገብተዋል። እባክዎ በትክክል ያረጋግጡ።';
    }
    if (errorCode === 'auth/email-already-in-use') {
      return 'ይህ የ Gmail አድራሻ አስቀድሞ ተመዝግቧል። እባክዎ የይለፍ ቃልዎን አስገብተው ይግቡ።';
    }
    if (errorCode === 'auth/weak-password') {
      return 'የይለፍ ቃሉ በጣም አጭር ወይም ደካማ ነው። እባክዎ ቢያንስ 6 ፊደላት ወይም ቁጥሮች ይጠቀሙ።';
    }
    if (errorCode === 'auth/invalid-email') {
      return 'እባክዎ ትክክለኛ የ Gmail (@gmail.com) አድራሻ ያስገቡ።';
    }
    if (errorCode === 'auth/network-request-failed') {
      return 'የኢንተርኔት ግንኙነት ችግር አጋጥሟል። እባክዎ የኢንተርኔትዎን ሁኔታ አረጋግጠው በድጋሚ ይሞክሩ።';
    }
    if (errorCode === 'auth/too-many-requests') {
      return 'ብዙ ያልተሳኩ ሙከራዎች ተደርገዋል። እባክዎ ጥቂት ደቂቃዎችን ቆይተው በድጋሚ ይሞክሩ።';
    }
    if (errorCode === 'auth/user-disabled') {
      return 'ይህ አካውንት ታግዷል። እባክዎ የካምፓሱን ድጋፍ ሰጪ ያነጋግሩ (@TsehayTeam)።';
    }
    if (errorCode === 'auth/popup-closed-by-user') {
      return '';
    }
    if (errorCode === 'auth/popup-blocked') {
      return 'የ Google መግቢያ መስኮት በብሮውዘርዎ ታግዷል። እባክዎ Pop-up ይፍቀዱ።';
    }
    return err?.message || 'የሆነ ችግር አጋጥሟል። እባክዎ በድጋሚ ይሞክሩ።';
  };

  if (!isOpen) return null;

  // Handle Forgot Password
  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setResendSuccessMessage("");
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) {
      setError('እባክዎ መጀመሪያ የ Gmail አድራሻዎን ያስገቡ።');
      return;
    }
    if (!cleanEmail.endsWith('@gmail.com')) {
      setError('ይቅርታ! የፀሐይ ካምፓስ የሚቀበለው ትክክለኛ የ Gmail (@gmail.com) አድራሻዎችን ብቻ ነው።');
      return;
    }

    setLoading(true);
    try {
      // 1. Firebase Native Password Reset Email Link
      try {
        await sendPasswordResetEmail(auth, cleanEmail);
      } catch (fbResetErr: any) {
        console.warn("Firebase sendPasswordResetEmail notice:", fbResetErr);
      }

      // 2. Custom 6-Digit OTP Email
      try {
        const localCode = generateOtpCode();
        await saveOtpForEmail(cleanEmail, localCode).catch(() => {});
        await fetch('/api/auth/send-reset-otp', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: cleanEmail })
        });
      } catch (otpErr) {
        console.warn("OTP send notice:", otpErr);
      }

      setRegisteredEmail(cleanEmail);
      setResetStep('otp');
      setResetResendCountdown(60);
      setResetOtpDigits(['', '', '', '', '', '']);
      setResendSuccessMessage(`የይለፍ ቃል መቀየሪያ ሊንክ እና የ 6-አሃዝ ማረጋገጫ ኮድ ወደ ${cleanEmail} ተልኳል!`);
    } catch (err: any) {
      console.error("Reset password error:", err);
      setError(getFriendlyErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  // Google Authentication Flow (Enforcing @gmail.com)
  const handleGoogleAuth = async () => {
    setError("");
    setLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      const userEmail = (user.email || "").trim().toLowerCase();

      // Strict Check: Ensure Google Account is @gmail.com
      if (!userEmail.endsWith('@gmail.com')) {
        await signOut(auth);
        setError('ይቅርታ! የፀሐይ ካምፓስ የሚቀበለው ትክክለኛ የ Gmail (@gmail.com) አድራሻዎችን ብቻ ነው። እባክዎ በ @gmail.com አካውንትዎ ይግቡ።');
        setLoading(false);
        return;
      }

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
        handlePostAuthSuccess(user);
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

  // Multi-Step Navigation Controls
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
        setError('እባክዎ የ Gmail አድራሻዎን ያስገቡ።');
        return;
      }
      const emailValidation = validateEmailForSignup(cleanEmail);
      if (!emailValidation.isValid) {
        setError(emailValidation.errorMessage || 'ይቅርታ! የፀሐይ ካምፓስ የሚቀበለው ትክክለኛ የ Gmail (@gmail.com) አድራሻዎችን ብቻ ነው።');
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

  // Handle OTP 6-Digit Changes, Paste, and Auto-Advance
  const handleOtpDigitChange = (index: number, val: string) => {
    setOtpError("");
    const cleanVal = val.replace(/[^0-9]/g, '').slice(-1);
    const newDigits = [...otpDigits];
    newDigits[index] = cleanVal;
    setOtpDigits(newDigits);

    if (cleanVal && index < 5) {
      otpInputRefs.current[index + 1]?.focus();
    }

    const fullCode = newDigits.join('');
    if (fullCode.length === 6 && !newDigits.includes('')) {
      handleVerifyOtpCode(fullCode);
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otpDigits[index] && index > 0) {
      otpInputRefs.current[index - 1]?.focus();
    }
  };

  const handleOtpPaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/[^0-9]/g, '').slice(0, 6);
    if (pasted) {
      const newDigits = ['', '', '', '', '', ''];
      for (let i = 0; i < pasted.length; i++) {
        newDigits[i] = pasted[i];
      }
      setOtpDigits(newDigits);
      if (pasted.length === 6) {
        handleVerifyOtpCode(pasted);
      } else {
        otpInputRefs.current[pasted.length]?.focus();
      }
    }
  };

  // Verify 6-Digit OTP Code
  const handleVerifyOtpCode = async (codeToVerify?: string) => {
    const targetEmail = registeredEmail || email;
    const code = (codeToVerify || otpDigits.join('')).trim();

    if (!code || code.length !== 6) {
      setOtpError('እባክዎ 6ቱን አሃዞች በትክክል ያስገቡ።');
      return;
    }

    setIsVerifyingOtp(true);
    setOtpError("");

    try {
      const res = await verifyOtpForEmail(targetEmail, code);

      if (!res.success) {
        setOtpError(res.message);
        setIsVerifyingOtp(false);
        return;
      }

      let authedUser: User | null = null;

      if (pendingSignupData) {
        const { cred, userData, password: pass } = pendingSignupData;
        try {
          await setDoc(doc(db, 'artifacts', 'tsehaycampus-e1a6d', 'users', cred.user.uid, 'profile', 'info'), {
            ...userData,
            emailVerified: true
          }, { merge: true });
        } catch (e) {}

        try {
          const reAuth = await signInWithEmailAndPassword(auth, targetEmail, pass);
          authedUser = reAuth.user;
        } catch (e) {
          authedUser = cred.user;
        }

        // Welcome Email
        fetch('/api/email/automation', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'welcome',
            userEmail: targetEmail,
            userName: userData?.name || targetEmail.split('@')[0]
          })
        }).catch(() => {});

        // Referral Attribution
        const storedReferrerUid = getStoredReferrerUid();
        if (storedReferrerUid && storedReferrerUid !== cred.user.uid) {
          fetch('/api/referrals/record', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              newUserUid: cred.user.uid,
              newUserName: userData?.name || targetEmail.split('@')[0],
              newUserEmail: targetEmail,
              referrerUid: storedReferrerUid
            })
          }).catch(() => {});
          clearStoredReferrerUid();
        }
      }

      setResendSuccessMessage("🎉 ኢሜልዎ በተሳካ ሁኔታ ተረጋግጧል! እንኳን ደህና መጡ!");
      setTimeout(() => {
        setIsOtpMode(false);
        if (authedUser || auth.currentUser) {
          handlePostAuthSuccess(authedUser || auth.currentUser!);
        } else {
          onClose();
        }
      }, 700);
    } catch (err: any) {
      console.error("OTP verification error:", err);
      setOtpError("ኮዱን ማረጋገጥ አልተቻለም። እባክዎ በድጋሚ ይሞክሩ።");
    } finally {
      setIsVerifyingOtp(false);
    }
  };

  // Resend 6-Digit OTP Code
  const handleResendOtpCode = async () => {
    const targetEmail = registeredEmail || email;
    if (!targetEmail) return;

    setIsResendingEmail(true);
    setOtpError("");
    setResendSuccessMessage("");

    try {
      const newCode = generateOtpCode();
      await saveOtpForEmail(targetEmail, newCode);

      fetch('/api/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: targetEmail })
      }).catch(() => {});

      setResendCountdown(60);
      setOtpDigits(['', '', '', '', '', '']);
      setResendSuccessMessage(`አዲስ የ 6-አሃዝ ማረጋገጫ ኮድ ወደ ${targetEmail} ተልኳል!`);
    } catch (err: any) {
      setOtpError("አዲስ ኮድ መላክ አልተቻለም። እባክዎ በድጋሚ ይሞክሩ።");
    } finally {
      setIsResendingEmail(false);
    }
  };

  // Reset OTP handlers
  const handleResetOtpDigitChange = (index: number, val: string) => {
    setResetOtpError("");
    const cleanVal = val.replace(/[^0-9]/g, '').slice(-1);
    const newDigits = [...resetOtpDigits];
    newDigits[index] = cleanVal;
    setResetOtpDigits(newDigits);

    if (cleanVal && index < 5) {
      resetOtpInputRefs.current[index + 1]?.focus();
    }

    const fullCode = newDigits.join('');
    if (fullCode.length === 6 && !newDigits.includes('')) {
      handleVerifyResetOtpCode(fullCode);
    }
  };

  const handleResetOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !resetOtpDigits[index] && index > 0) {
      resetOtpInputRefs.current[index - 1]?.focus();
    }
  };

  const handleResetOtpPaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/[^0-9]/g, '').slice(0, 6);
    if (pasted) {
      const newDigits = ['', '', '', '', '', ''];
      for (let i = 0; i < pasted.length; i++) {
        newDigits[i] = pasted[i];
      }
      setResetOtpDigits(newDigits);
      if (pasted.length === 6) {
        handleVerifyResetOtpCode(pasted);
      } else {
        resetOtpInputRefs.current[pasted.length]?.focus();
      }
    }
  };

  // Verify Reset 6-Digit OTP Code
  const handleVerifyResetOtpCode = async (codeToVerify?: string) => {
    const targetEmail = registeredEmail || email;
    const code = (codeToVerify || resetOtpDigits.join('')).trim();

    if (!code || code.length !== 6) {
      setResetOtpError('እባክዎ 6ቱን አሃዞች በትክክል ያስገቡ።');
      return;
    }

    setIsVerifyingResetOtp(true);
    setResetOtpError("");

    try {
      const res = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: targetEmail, code })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setResetStep('new_password');
        setResetOtpError("");
        return;
      }

      const clientVerify = await verifyOtpForEmail(targetEmail, code);
      if (clientVerify.success) {
        setResetStep('new_password');
        setResetOtpError("");
        return;
      }

      setResetOtpError(data.error || clientVerify.message || 'የተሳሳተ የማረጋገጫ ኮድ ነው።');
    } catch (err: any) {
      setResetOtpError('ኮዱን ማረጋገጥ አልተቻለም። እባክዎ በድጋሚ ይሞክሩ።');
    } finally {
      setIsVerifyingResetOtp(false);
    }
  };

  // Send Reset Code (Step 1 -> Step 2)
  const handleSendResetCode = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) {
      setError('እባክዎ የ Gmail አድራሻዎን ያስገቡ።');
      return;
    }
    if (!cleanEmail.endsWith('@gmail.com')) {
      setError('ይቅርታ! የፀሐይ ካምፓስ የሚቀበለው ትክክለኛ የ Gmail (@gmail.com) አድራሻዎችን ብቻ ነው።');
      return;
    }

    setLoading(true);
    setError("");
    setResendSuccessMessage("");

    try {
      // 1. Firebase Native Password Reset Email Link
      try {
        await sendPasswordResetEmail(auth, cleanEmail);
      } catch (fbResetErr: any) {
        console.warn("Firebase sendPasswordResetEmail notice:", fbResetErr);
      }

      // 2. Custom 6-Digit OTP Email
      try {
        const localCode = generateOtpCode();
        await saveOtpForEmail(cleanEmail, localCode).catch(() => {});

        await fetch('/api/auth/send-reset-otp', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: cleanEmail })
        }).catch(() => {});
      } catch (otpErr) {}

      setRegisteredEmail(cleanEmail);
      setResetStep('otp');
      setResetResendCountdown(60);
      setResetOtpDigits(['', '', '', '', '', '']);
      setResendSuccessMessage(`የይለፍ ቃል መቀየሪያ ሊንክ እና የ 6-አሃዝ ማረጋገጫ ኮድ ወደ ${cleanEmail} ተልኳል!`);
    } catch (err: any) {
      setRegisteredEmail(cleanEmail);
      setResetStep('otp');
      setResetResendCountdown(60);
      setResetOtpDigits(['', '', '', '', '', '']);
      setResendSuccessMessage(`የይለፍ ቃል መቀየሪያ ሊንክ እና የ 6-አሃዝ ማረጋገጫ ኮድ ወደ ${cleanEmail} ተልኳል!`);
    } finally {
      setLoading(false);
    }
  };

  // Save New Password (Step 3 -> Step 4 / Complete & Auto Sign-in)
  const handleSaveNewPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanPass = newPassword.trim();
    const cleanConfirm = confirmPassword.trim();
    const targetEmail = (registeredEmail || email).trim().toLowerCase();

    if (!cleanPass || cleanPass.length < 6) {
      setError('አዲሱ የይለፍ ቃል ቢያንስ 6 ፊደላት ወይም ቁጥሮች መሆን አለበት።');
      return;
    }
    if (cleanPass !== cleanConfirm) {
      setError('ያስገቧቸው የይለፍ ቃሎች አይመሳሰሉም (Passwords do not match)።');
      return;
    }

    setIsSubmittingNewPassword(true);
    setError("");

    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: targetEmail,
          code: resetOtpDigits.join(''),
          newPassword: cleanPass
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.error || 'የይለፍ ቃል መቀየር አልተቻለም።');
        setIsSubmittingNewPassword(false);
        return;
      }

      // Auto sign-in with customToken or newly set password
      let authedUser: User | null = null;
      if (data.customToken) {
        try {
          const customCred = await signInWithCustomToken(auth, data.customToken);
          authedUser = customCred.user;
        } catch (tokenErr) {
          try {
            const passCred = await signInWithEmailAndPassword(auth, targetEmail, cleanPass);
            authedUser = passCred.user;
          } catch (e) {}
        }
      } else {
        try {
          const passCred = await signInWithEmailAndPassword(auth, targetEmail, cleanPass);
          authedUser = passCred.user;
        } catch (e) {}
      }

      setResetStep('success');
      setResendSuccessMessage('የይለፍ ቃልዎ በተሳካ ሁኔታ ተቀይሯል!');
      setTimeout(() => {
        setIsResetMode(false);
        if (authedUser || auth.currentUser) {
          handlePostAuthSuccess(authedUser || auth.currentUser!);
        } else {
          onClose();
        }
      }, 1400);
    } catch (err: any) {
      console.error("Save new password error:", err);
      setError('የይለፍ ቃል መቀየር አልተቻለም። እባክዎ በድጋሚ ይሞክሩ።');
    } finally {
      setIsSubmittingNewPassword(false);
    }
  };

  // Main Submit Handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setResendSuccessMessage("");

    if (isResetMode) {
      if (resetStep === 'request') {
        handleSendResetCode(e);
      } else if (resetStep === 'new_password') {
        handleSaveNewPassword(e);
      }
      return;
    }

    const cleanEmail = (email || pendingGoogleAuth?.email || "").trim().toLowerCase();

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
        const storedReferrerUid = getStoredReferrerUid();
        const userData = {
          name: name.trim() || pendingGoogleAuth.displayName || "ተጠቃሚ",
          email: pendingGoogleAuth.email || cleanEmail,
          phone: phone.trim(),
          city: city.trim(),
          source: source || "Google",
          photoURL: pendingGoogleAuth.photoURL || null,
          referredBy: storedReferrerUid || null,
          createdAt: serverTimestamp(),
          lastLogin: serverTimestamp(),
          isAdmin: false,
        };

        const docRef = doc(db, 'artifacts', 'tsehaycampus-e1a6d', 'users', pendingGoogleAuth.uid, 'profile', 'info');
        await setDoc(docRef, userData, { merge: true });

        if (storedReferrerUid && storedReferrerUid !== pendingGoogleAuth.uid) {
          fetch('/api/referrals/record', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              newUserUid: pendingGoogleAuth.uid,
              newUserName: userData.name,
              newUserEmail: userData.email,
              referrerUid: storedReferrerUid
            })
          }).catch(() => {});
          clearStoredReferrerUid();
        }

        if (name.trim()) {
          try {
            await updateProfile(pendingGoogleAuth, { displayName: name.trim() });
          } catch (e) {}
        }

        setPendingGoogleAuth(null);
        setError("");
        handlePostAuthSuccess(pendingGoogleAuth);
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
        setError(emailValidation.errorMessage || 'ይቅርታ! የፀሐይ ካምፓስ የሚቀበለው ትክክለኛ የ Gmail (@gmail.com) አድራሻዎችን ብቻ ነው።');
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

        const storedReferrerUid = getStoredReferrerUid();
        const userData = {
          name: name.trim(),
          email: cleanEmail,
          phone: phone.trim(),
          city: city.trim(),
          source: source || "Direct",
          referralCode: referralCode.trim().toUpperCase() || null,
          referredBy: storedReferrerUid || null,
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

        await setDoc(doc(db, 'artifacts', 'tsehaycampus-e1a6d', 'users', cred.user.uid, 'profile', 'info'), userData, { merge: true });

        const otpCode = generateOtpCode();
        await saveOtpForEmail(cleanEmail, otpCode);

        fetch('/api/auth/send-otp', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: cleanEmail })
        }).catch(() => {});

        try {
          await sendEmailVerification(cred.user);
        } catch (e) {}

        setPendingSignupData({ cred, userData, password });
        setRegisteredEmail(cleanEmail);
        setIsOtpMode(true);
        setResendCountdown(60);
        setOtpDigits(['', '', '', '', '', '']);
        setError("");
      } catch (err: any) {
        console.error("Email signup error:", err);
        const code = err?.code || '';
        if (code === 'auth/email-already-in-use') {
          setIsSignupMode(false);
          setError('ይህ የ Gmail አድራሻ አስቀድሞ ተመዝግቧል! እባክዎ የይለፍ ቃልዎን አስገብተው በቀጥታ ይግቡ።');
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
      setError('እባክዎ የ Gmail አድራሻዎን ያስገቡ።');
      return;
    }
    if (!password) {
      setError('እባክዎ የይለፍ ቃልዎን ያስገቡ።');
      return;
    }

    setLoading(true);
    try {
      const cred = await signInWithEmailAndPassword(auth, cleanEmail, password);

      // Record last login in background
      setDoc(doc(db, 'artifacts', 'tsehaycampus-e1a6d', 'users', cred.user.uid, 'profile', 'info'), {
        lastLogin: serverTimestamp()
      }, { merge: true }).catch(() => {});

      setError("");
      handlePostAuthSuccess(cred.user);
    } catch (err: any) {
      console.error("Email login error:", err);
      const code = err?.code || '';
      if (code === 'auth/user-not-found' || code === 'auth/invalid-credential' || code === 'auth/wrong-password') {
        setError('የተሳሳተ የ Gmail አድራሻ ወይም የይለፍ ቃል አስገብተዋል። አዲስ ከሆኑ "አዲስ ይመዝገቡ" የሚለውን ይጫኑ።');
      } else {
        setError(getFriendlyErrorMessage(err));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div 
      className="fixed inset-0 bg-black/85 z-[99999] flex items-center justify-center backdrop-blur-md p-4 animate-in fade-in duration-200" 
      onClick={(e) => { if (e.target === e.currentTarget && !loading) onClose(); }}
    >
      <div className="bg-white dark:bg-[#050811] w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden flex flex-col relative modal-animate border border-amber-400/30 dark:border-white/[0.1] max-h-[92vh]">
        
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-[#182a4d] to-[#0a1224] dark:bg-[#030509] p-5 sm:p-6 text-white text-center relative border-b border-amber-400/20 dark:border-white/[0.08] shrink-0">
          <button 
            type="button" 
            onClick={onClose} 
            disabled={loading}
            className="absolute top-4 right-4 text-white/70 hover:text-white transition text-2xl z-50 p-2 cursor-pointer"
            title="ዝጋ (Close)"
          >
            <i className="fa-solid fa-xmark"></i>
          </button>
          
          <div className="w-14 h-14 sm:w-16 sm:h-16 bg-white rounded-2xl mx-auto flex items-center justify-center mb-2.5 shadow-lg p-1.5 border border-amber-400/40">
            <img src="/tc-logo.jpg" alt="Logo" className="w-full h-full object-contain rounded-xl" />
          </div>

          <h2 className="font-black font-heading text-lg sm:text-xl text-white">
            {isOtpMode
              ? 'የ 6-አሃዝ ማረጋገጫ ኮድ'
              : isResetMode
              ? (resetStep === 'request' ? 'የይለፍ ቃል መቀየሪያ' : resetStep === 'otp' ? 'የ 6-አሃዝ ማረጋገጫ ኮድ' : resetStep === 'new_password' ? 'አዲስ የይለፍ ቃል ይፍጠሩ' : 'ተጠናቋል! 🎉')
              : pendingGoogleAuth 
              ? 'ምዝገባዎን ያጠናቅቁ' 
              : isSignupMode 
              ? `ወደ ካምፓስ ይቀላቀሉ (${signupStep}/3)` 
              : 'ወደ ካምፓስ ይግቡ'}
          </h2>
          
          <p className="text-blue-100 dark:text-gray-400 text-xs sm:text-sm mt-0.5">
            {isOtpMode
              ? 'ወደ Gmailዎ የተላከውን 6-አሃዝ ኮድ ያስገቡ'
              : isResetMode
              ? (resetStep === 'request' ? 'የ Gmail አድራሻዎን ያስገቡ፤ 6-አሃዝ የማረጋገጫ ኮድ እንልክልዎታለን' : resetStep === 'otp' ? `ወደ ${registeredEmail || email} የተላከውን 6-አሃዝ ኮድ ያስገቡ` : resetStep === 'new_password' ? 'እባክዎ አዲሱን የይለፍ ቃልዎን አስገብተው ያረጋግጡ' : 'የይለፍ ቃልዎ በተሳካ ሁኔታ ተቀይሯል!')
              : pendingGoogleAuth 
              ? 'በ Google ተገናኝተዋል! የቀሩትን መረጃዎች ሞልተው ምዝገባዎን ያጠናቅቁ' 
              : isSignupMode 
              ? (signupStep === 1 ? 'ደረጃ 1፡ ስለ እርስዎ ይንገሩን 👋' : signupStep === 2 ? 'ደረጃ 2፡ የ Gmail እና የይለፍ ቃል 🔐' : 'ደረጃ 3፡ የመጨረሻ ማጠቃለያ 🚀')
              : 'በ Google ወይም በ Gmail እና የይለፍ ቃል ይግቡ'}
          </p>
        </div>
        
        {/* Modal Body */}
        <div className="p-5 sm:p-7 overflow-y-auto custom-modal-scroll flex-1">
          
          {/* =========================================================================
              🌟 0. DEDICATED PASSWORD RESET FLOW (Request -> OTP -> New Password -> Success)
              ========================================================================= */}
          {isResetMode ? (
            <div className="space-y-5 animate-in fade-in zoom-in-95 duration-300 py-1">
              
              {/* Step 1: Request OTP Code */}
              {resetStep === 'request' && (
                <form onSubmit={handleSendResetCode} className="space-y-4">
                  <div className="text-center space-y-2 mb-2">
                    <div className="w-16 h-16 bg-amber-500/10 border-2 border-[#f9b03c] rounded-2xl mx-auto flex items-center justify-center text-3xl text-[#f9b03c] shadow-[0_0_25px_rgba(249,176,60,0.3)]">
                      <i className="fa-solid fa-key"></i>
                    </div>
                    <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300">
                      የይለፍ ቃልዎን ለመቀየር የተመዘገቡበትን የ Gmail አድራሻ ያስገቡ።
                    </p>
                  </div>

                  {error && (
                    <div className="bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800 text-xs sm:text-sm p-3.5 rounded-2xl font-bold text-center animate-in fade-in">
                      <i className="fa-solid fa-circle-exclamation mr-2"></i>
                      {error}
                    </div>
                  )}

                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-xs font-black uppercase tracking-wider text-gray-700 dark:text-gray-300">
                        የ Gmail አድራሻ (Gmail) <span className="text-red-500">*</span>
                      </label>
                      {!email.includes('@') && email.trim().length > 0 && (
                        <button
                          type="button"
                          onClick={() => handleEmailChange(`${email.trim()}@gmail.com`)}
                          className="text-[11px] font-black text-amber-600 dark:text-[#f9b03c] bg-amber-500/10 hover:bg-amber-500/20 px-2 py-0.5 rounded-md transition cursor-pointer"
                        >
                          + @gmail.com
                        </button>
                      )}
                    </div>
                    <input 
                      type="email" 
                      value={email} 
                      onChange={(e) => handleEmailChange(e.target.value)} 
                      required 
                      autoFocus
                      placeholder="eyoubsahle1@gmail.com" 
                      className="w-full bg-gray-50 dark:bg-white/[0.04] border border-gray-200 dark:border-white/[0.1] rounded-xl py-3 px-4 text-sm outline-none focus:border-[#f9b03c] dark:text-white transition" 
                    />
                  </div>

                  <button 
                    type="submit" 
                    disabled={loading || !email.trim()} 
                    className="w-full bg-[#f9b03c] hover:bg-[#ffbe53] text-black font-black py-3.5 rounded-2xl transition shadow-[0_0_20px_rgba(249,176,60,0.35)] mt-4 flex items-center justify-center gap-2 cursor-pointer active:scale-[0.99] disabled:opacity-50"
                  >
                    {loading ? (
                      <>
                        <i className="fa-solid fa-spinner fa-spin"></i>
                        <span>ኮዱን በመላክ ላይ...</span>
                      </>
                    ) : (
                      <>
                        <i className="fa-solid fa-paper-plane"></i>
                        <span>የማረጋገጫ ኮድ ላክ (Send Code)</span>
                      </>
                    )}
                  </button>

                  <button 
                    type="button" 
                    onClick={() => { setIsResetMode(false); setError(""); }} 
                    className="w-full text-center text-xs font-bold text-gray-500 dark:text-gray-400 hover:text-dark dark:hover:text-white transition pt-2 cursor-pointer"
                  >
                    <i className="fa-solid fa-arrow-left mr-1"></i> ወደ መግቢያ ተመለስ (Back to Login)
                  </button>
                </form>
              )}

              {/* Step 2: Enter 6-Digit OTP Code */}
              {resetStep === 'otp' && (
                <div className="text-center py-2 space-y-5">
                  <div className="w-18 h-18 bg-amber-500/10 border-2 border-[#f9b03c] rounded-3xl mx-auto flex items-center justify-center text-3xl text-[#f9b03c] shadow-[0_0_30px_rgba(249,176,60,0.35)] animate-pulse">
                    <i className="fa-solid fa-shield-halved"></i>
                  </div>

                  <div className="space-y-1.5">
                    <h3 className="text-lg font-black font-heading text-dark dark:text-white">
                      የማረጋገጫ ኮድ ያስገቡ
                    </h3>
                    <p className="text-xs text-gray-600 dark:text-slate-300 max-w-sm mx-auto leading-relaxed">
                      ወደ Gmail አድራሻዎ (<span className="text-[#f9b03c] font-black">{registeredEmail || email}</span>) የተላከውን 6-አሃዝ ኮድ ያስገቡ።
                    </p>
                  </div>

                  {/* 6-Digit Box Inputs */}
                  <div className="py-2">
                    <div className="flex items-center justify-center gap-2 sm:gap-3" onPaste={handleResetOtpPaste}>
                      {resetOtpDigits.map((digit, idx) => (
                        <input
                          key={idx}
                          ref={(el) => { resetOtpInputRefs.current[idx] = el; }}
                          type="text"
                          inputMode="numeric"
                          maxLength={1}
                          value={digit}
                          onChange={(e) => handleResetOtpDigitChange(idx, e.target.value)}
                          onKeyDown={(e) => handleResetOtpKeyDown(idx, e)}
                          autoFocus={idx === 0}
                          className={`w-11 h-13 sm:w-12 sm:h-14 text-center text-2xl font-black rounded-2xl bg-gray-50 dark:bg-white/[0.05] border-2 outline-none transition-all ${
                            digit 
                              ? 'border-[#f9b03c] text-slate-950 dark:text-white bg-amber-400/10 shadow-[0_0_15px_rgba(249,176,60,0.3)]' 
                              : 'border-gray-200 dark:border-white/10 text-slate-950 dark:text-white focus:border-[#f9b03c]'
                          }`}
                        />
                      ))}
                    </div>

                    {resetOtpError && (
                      <p className="text-red-500 text-xs font-bold mt-3 animate-in fade-in">
                        <i className="fa-solid fa-circle-exclamation mr-1.5"></i>
                        {resetOtpError}
                      </p>
                    )}

                    {resendSuccessMessage && (
                      <p className="text-emerald-500 text-xs font-bold mt-3 animate-in fade-in">
                        <i className="fa-solid fa-circle-check mr-1.5"></i>
                        {resendSuccessMessage}
                      </p>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => handleVerifyResetOtpCode()}
                    disabled={isVerifyingResetOtp || resetOtpDigits.join('').length !== 6}
                    className="w-full btn-buy-now-vibe py-3.5 rounded-2xl text-base transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 active:scale-[0.98] shadow-[0_0_30px_rgba(249,176,60,0.4)]"
                  >
                    {isVerifyingResetOtp ? (
                      <>
                        <i className="fa-solid fa-spinner fa-spin"></i>
                        <span>በማረጋገጥ ላይ...</span>
                      </>
                    ) : (
                      <>
                        <i className="fa-solid fa-arrow-right"></i>
                        <span>ቀጣይ (Next: አዲስ የይለፍ ቃል)</span>
                      </>
                    )}
                  </button>

                  <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 pt-2 border-t border-gray-100 dark:border-white/[0.08]">
                    <span>ኮዱ አልደረሰዎትም?</span>
                    {resetResendCountdown > 0 ? (
                      <span className="font-bold text-amber-600 dark:text-[#f9b03c]">
                        በድጋሚ ለመላክ {resetResendCountdown}s ይጠብቁ
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={handleSendResetCode}
                        disabled={isResendingEmail}
                        className="font-black text-amber-600 dark:text-[#f9b03c] hover:underline cursor-pointer"
                      >
                        {isResendingEmail ? 'በመላክ ላይ...' : 'ኮዱን በድጋሚ ላክ (Resend Code)'}
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Step 3: Enter New Password */}
              {resetStep === 'new_password' && (
                <form onSubmit={handleSaveNewPassword} className="space-y-4">
                  <div className="text-center space-y-1 mb-3">
                    <div className="w-16 h-16 bg-emerald-500/10 border-2 border-emerald-500 rounded-2xl mx-auto flex items-center justify-center text-3xl text-emerald-500 shadow-[0_0_25px_rgba(16,185,129,0.3)]">
                      <i className="fa-solid fa-lock-open"></i>
                    </div>
                    <h3 className="text-base font-black text-dark dark:text-white">
                      አዲስ የይለፍ ቃል ያስገቡ
                    </h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      የማረጋገጫ ኮዱ ተረጋግጧል! አሁን አዲስ የይለፍ ቃል ይፍጠሩ።
                    </p>
                  </div>

                  {error && (
                    <div className="bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800 text-xs sm:text-sm p-3.5 rounded-2xl font-bold text-center animate-in fade-in">
                      <i className="fa-solid fa-circle-exclamation mr-2"></i>
                      {error}
                    </div>
                  )}

                  {/* New Password */}
                  <div>
                    <label className="block text-xs font-black uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-1.5">
                      አዲስ የይለፍ ቃል (New Password) <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <input 
                        type={showNewPassword ? "text" : "password"} 
                        value={newPassword} 
                        onChange={(e) => setNewPassword(e.target.value)} 
                        required 
                        autoFocus
                        placeholder="ቢያንስ 6 ፊደላት ወይም ቁጥሮች" 
                        className="w-full bg-gray-50 dark:bg-white/[0.04] border border-gray-200 dark:border-white/[0.1] rounded-xl py-3 pl-4 pr-11 text-sm outline-none focus:border-[#f9b03c] dark:text-white transition" 
                      />
                      <button 
                        type="button" 
                        onClick={() => setShowNewPassword(!showNewPassword)} 
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition text-sm p-1 cursor-pointer"
                      >
                        <i className={`fa-solid ${showNewPassword ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                      </button>
                    </div>
                  </div>

                  {/* Confirm Password */}
                  <div>
                    <label className="block text-xs font-black uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-1.5">
                      የይለፍ ቃል ማረጋገጫ (Confirm Password) <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <input 
                        type={showConfirmPassword ? "text" : "password"} 
                        value={confirmPassword} 
                        onChange={(e) => setConfirmPassword(e.target.value)} 
                        required 
                        placeholder="የይለፍ ቃሉን በድጋሚ ያስገቡ" 
                        className="w-full bg-gray-50 dark:bg-white/[0.04] border border-gray-200 dark:border-white/[0.1] rounded-xl py-3 pl-4 pr-11 text-sm outline-none focus:border-[#f9b03c] dark:text-white transition" 
                      />
                      <button 
                        type="button" 
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)} 
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition text-sm p-1 cursor-pointer"
                      >
                        <i className={`fa-solid ${showConfirmPassword ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                      </button>
                    </div>
                  </div>

                  <button 
                    type="submit" 
                    disabled={isSubmittingNewPassword || !newPassword || !confirmPassword} 
                    className="w-full bg-[#f9b03c] hover:bg-[#ffbe53] text-black font-black py-3.5 rounded-2xl transition shadow-[0_0_20px_rgba(249,176,60,0.35)] mt-4 flex items-center justify-center gap-2 cursor-pointer active:scale-[0.99] disabled:opacity-50"
                  >
                    {isSubmittingNewPassword ? (
                      <>
                        <i className="fa-solid fa-spinner fa-spin"></i>
                        <span>የይለፍ ቃል በመቀየር ላይ...</span>
                      </>
                    ) : (
                      <>
                        <i className="fa-solid fa-check"></i>
                        <span>የይለፍ ቃል ቀይር እና ግባ (Save & Login)</span>
                      </>
                    )}
                  </button>
                </form>
              )}

              {/* Step 4: Success */}
              {resetStep === 'success' && (
                <div className="text-center py-6 space-y-4">
                  <div className="w-20 h-20 bg-emerald-500/10 border-2 border-emerald-500 rounded-3xl mx-auto flex items-center justify-center text-4xl text-emerald-500 shadow-[0_0_30px_rgba(16,185,129,0.4)] animate-bounce">
                    <i className="fa-solid fa-check"></i>
                  </div>
                  <h3 className="text-xl font-black text-dark dark:text-white">
                    የይለፍ ቃልዎ ተቀይሯል!
                  </h3>
                  <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-300">
                    በአዲሱ የይለፍ ቃልዎ ወደ ካምፓስ ገብተዋል። ወደ ገጽዎ እየተመለሱ ነው...
                  </p>
                </div>
              )}

            </div>
          ) : isOtpMode ? (
            <div className="text-center py-2 space-y-5 animate-in fade-in zoom-in-95 duration-300">
              <div className="w-20 h-20 bg-amber-500/10 border-2 border-[#f9b03c] rounded-3xl mx-auto flex items-center justify-center text-4xl text-[#f9b03c] shadow-[0_0_30px_rgba(249,176,60,0.35)] animate-pulse">
                <i className="fa-solid fa-shield-halved"></i>
              </div>

              <div className="space-y-1.5">
                <h3 className="text-xl font-black font-heading text-dark dark:text-white">
                  ኢሜልዎን ያረጋግጡ
                </h3>
                <p className="text-xs sm:text-sm text-gray-600 dark:text-slate-300 max-w-sm mx-auto leading-relaxed">
                  ወደ Gmail አድራሻዎ (<span className="text-[#f9b03c] font-black">{registeredEmail}</span>) የ 6-አሃዝ ማረጋገጫ ኮድ ተልኳል።
                </p>
              </div>

              {/* 6-Digit Box Inputs */}
              <div className="py-2">
                <div className="flex items-center justify-center gap-2 sm:gap-3" onPaste={handleOtpPaste}>
                  {otpDigits.map((digit, idx) => (
                    <input
                      key={idx}
                      ref={(el) => { otpInputRefs.current[idx] = el; }}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleOtpDigitChange(idx, e.target.value)}
                      onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                      autoFocus={idx === 0}
                      className={`w-11 h-13 sm:w-12 sm:h-14 text-center text-2xl font-black rounded-2xl bg-gray-50 dark:bg-white/[0.05] border-2 outline-none transition-all ${
                        digit 
                          ? 'border-[#f9b03c] text-slate-950 dark:text-white bg-amber-400/10 shadow-[0_0_15px_rgba(249,176,60,0.3)]' 
                          : 'border-gray-200 dark:border-white/10 text-slate-950 dark:text-white focus:border-[#f9b03c]'
                      }`}
                    />
                  ))}
                </div>

                {otpError && (
                  <p className="text-red-500 text-xs font-bold mt-3 animate-in fade-in">
                    <i className="fa-solid fa-circle-exclamation mr-1.5"></i>
                    {otpError}
                  </p>
                )}

                {resendSuccessMessage && (
                  <p className="text-emerald-500 text-xs font-bold mt-3 animate-in fade-in">
                    <i className="fa-solid fa-circle-check mr-1.5"></i>
                    {resendSuccessMessage}
                  </p>
                )}
              </div>

              {/* Verify Button */}
              <button
                type="button"
                onClick={() => handleVerifyOtpCode()}
                disabled={isVerifyingOtp || otpDigits.join('').length !== 6}
                className="w-full btn-buy-now-vibe py-3.5 rounded-2xl text-base transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 active:scale-[0.98] shadow-[0_0_30px_rgba(249,176,60,0.4)]"
              >
                {isVerifyingOtp ? (
                  <>
                    <i className="fa-solid fa-spinner fa-spin"></i>
                    <span>በማረጋገጥ ላይ...</span>
                  </>
                ) : (
                  <>
                    <i className="fa-solid fa-circle-check"></i>
                    <span>አካውንቴን አረጋግጥ (Verify & Activate)</span>
                  </>
                )}
              </button>

              {/* Resend Code Button & Countdown */}
              <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 pt-2 border-t border-gray-100 dark:border-white/[0.08]">
                <span>ኮዱ አልደረሰዎትም?</span>
                {resendCountdown > 0 ? (
                  <span className="font-bold text-amber-600 dark:text-[#f9b03c]">
                    በድጋሚ ለመላክ {resendCountdown}s ይጠብቁ
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={handleResendOtpCode}
                    disabled={isResendingEmail}
                    className="font-black text-amber-600 dark:text-[#f9b03c] hover:underline cursor-pointer"
                  >
                    {isResendingEmail ? 'በመላክ ላይ...' : 'ኮዱን በድጋሚ ላክ (Resend Code)'}
                  </button>
                )}
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

              {/* 🌟 Smart Auto-Detection Status Toast */}
              {smartUserStatus && (
                <div className={`p-3 rounded-2xl mb-4 text-xs font-bold flex items-center justify-between gap-2.5 animate-in fade-in duration-200 ${
                  smartUserStatus.exists
                    ? 'bg-amber-400/10 border border-amber-400/30 text-amber-300'
                    : 'bg-blue-500/10 border border-blue-500/30 text-blue-300'
                }`}>
                  <div className="flex items-center gap-2 truncate">
                    <i className={`fa-solid ${smartUserStatus.exists ? 'fa-user-check text-[#f9b03c]' : 'fa-sparkles text-blue-400'}`}></i>
                    <span className="truncate">
                      {smartUserStatus.exists
                        ? `👋 እንኳን ደህና መጡ${smartUserStatus.displayName ? ` ${smartUserStatus.displayName}` : ''}! የይለፍ ቃልዎን ያስገቡ`
                        : '✨ አዲስ ተጠቃሚ — በ 10 ሰከንዶች ውስጥ አካውንትዎን ይፍጠሩ'}
                    </span>
                  </div>
                  {isCheckingEmail && (
                    <i className="fa-solid fa-circle-notch fa-spin text-xs text-[#f9b03c]"></i>
                  )}
                </div>
              )}

              {/* Multi-Step Stepper (for signup) */}
              {isSignupMode && !pendingGoogleAuth && !isResetMode && (
                <div className="mb-6 px-1">
                  <div className="flex items-center justify-between relative">
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 h-1 w-full bg-gray-200 dark:bg-white/10 rounded-full z-0" />
                    <div 
                      className="absolute left-0 top-1/2 -translate-y-1/2 h-1 bg-gradient-to-r from-[#f9b03c] via-amber-400 to-[#f9b03c] rounded-full z-0 transition-all duration-500 shadow-[0_0_10px_rgba(249,176,60,0.5)]" 
                      style={{ width: signupStep === 1 ? '16%' : signupStep === 2 ? '50%' : '100%' }}
                    />
                    
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

              {/* Top Quick Google Sign-In / Sign-Up Button */}
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
                      {isSignupMode ? 'ወይም ደረጃ በደረጃ ይመዝገቡ' : 'ወይም በ Gmail ይግቡ'}
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
                            placeholder="ለምሳሌ፡ ኢዮብ ሳህሌ (Eyoub Sahle)" 
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
                          <div className="flex items-center justify-between mb-1.5">
                            <label className="block text-xs font-black uppercase tracking-wider text-gray-700 dark:text-gray-300">
                              የ Gmail አድራሻ (Gmail Only) <span className="text-red-500">*</span>
                            </label>
                            {!email.includes('@') && email.trim().length > 0 && (
                              <button
                                type="button"
                                onClick={() => handleEmailChange(`${email.trim()}@gmail.com`)}
                                className="text-[11px] font-black text-amber-600 dark:text-[#f9b03c] bg-amber-500/10 hover:bg-amber-500/20 px-2 py-0.5 rounded-md transition cursor-pointer"
                              >
                                + @gmail.com
                              </button>
                            )}
                          </div>
                          <div className="relative">
                            <input 
                              type="email" 
                              value={email} 
                              onChange={(e) => handleEmailChange(e.target.value)} 
                              required 
                              placeholder="eyoubsahle1@gmail.com" 
                              className={`w-full bg-gray-50 dark:bg-white/[0.04] border rounded-xl py-3 px-4 text-sm outline-none transition dark:text-white ${
                                emailError 
                                  ? 'border-red-500 focus:border-red-500 bg-red-500/5' 
                                  : 'border-gray-200 dark:border-white/[0.1] focus:border-secondary dark:focus:border-[#f9b03c]'
                              }`} 
                            />
                            {isCheckingEmail && (
                              <i className="fa-solid fa-circle-notch fa-spin absolute right-3.5 top-1/2 -translate-y-1/2 text-[#f9b03c] text-xs"></i>
                            )}
                          </div>
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
                            className="mt-0.5 min-w-[18px] w-4.5 h-4.5 accent-[#f9b03c] cursor-pointer" 
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
                  /* 🌟 2. LOGIN / GOOGLE COMPLETION FLOW */
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
                            placeholder="ለምሳሌ፡ ኢዮብ ሳህሌ (Eyoub Sahle)" 
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

                    {/* Email Input for Login */}
                    {!pendingGoogleAuth && (
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <label className="block text-xs font-black uppercase tracking-wider text-gray-700 dark:text-gray-300">
                            የ Gmail አድራሻ (Gmail) <span className="text-red-500">*</span>
                          </label>
                          {!email.includes('@') && email.trim().length > 0 && (
                            <button
                              type="button"
                              onClick={() => handleEmailChange(`${email.trim()}@gmail.com`)}
                              className="text-[11px] font-black text-amber-600 dark:text-[#f9b03c] bg-amber-500/10 hover:bg-amber-500/20 px-2 py-0.5 rounded-md transition cursor-pointer"
                            >
                              + @gmail.com
                            </button>
                          )}
                        </div>
                        <div className="relative">
                          <input 
                            type="email" 
                            value={email} 
                            onChange={(e) => handleEmailChange(e.target.value)} 
                            required 
                            placeholder="eyoubsahle1@gmail.com" 
                            className="w-full bg-gray-50 dark:bg-white/[0.04] border border-gray-200 dark:border-white/[0.1] rounded-xl py-3 px-4 text-sm outline-none focus:border-[#f9b03c] dark:text-white transition pr-10" 
                          />
                          {isCheckingEmail && (
                            <i className="fa-solid fa-circle-notch fa-spin absolute right-3.5 top-1/2 -translate-y-1/2 text-[#f9b03c] text-xs"></i>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Password Input for Login */}
                    {!pendingGoogleAuth && (
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
                    
                    {/* Forgot Password Link */}
                    {!pendingGoogleAuth && (
                      <div className="flex justify-end pt-0.5">
                        <button 
                          type="button" 
                          onClick={() => {
                            setIsResetMode(true);
                            setResetStep('request');
                            setError("");
                            setEmailError("");
                          }} 
                          className="text-xs font-bold text-[#f9b03c] hover:underline cursor-pointer"
                        >
                          የይለፍ ቃል ረሱ? (Forgot Password?)
                        </button>
                      </div>
                    )}

                    {/* Submit Button for Login / Google Completion */}
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
                      ) : (
                        <>
                          <i className="fa-solid fa-right-to-bracket"></i>
                          <span>ግባ (Login)</span>
                        </>
                      )}
                    </button>
                  </>
                )}
              </form>

              {/* Bottom Switch between Login & Signup */}
              {!pendingGoogleAuth && (
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
