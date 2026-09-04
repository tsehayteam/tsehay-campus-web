export {};

declare global {
  interface Window {
    safeRedirect: (url: string) => void;
    openAuthModal: (isSignUp: boolean) => void;
    closeAuthModal: () => void;
    toggleAuthMode: () => void;
    handleAuthSubmit: (event: any) => void;
    loginWithGoogle: () => void;
    resetPassword: () => void;
    openTermsModal: () => void;
    closeTermsModal: () => void;
    agreeToTermsFromModal: () => void;
    toggleLanguage: () => void;
    toggleTheme: () => void;
    searchCourses: (event: any, isMobile: boolean) => void;
    handleSearchEnter: (event: any) => void;
    auth: any;
  }
}
export {};

declare global {
  interface Window {
    processRealPayment?: (paymentDetails: any) => Promise<any>;
  }
}
