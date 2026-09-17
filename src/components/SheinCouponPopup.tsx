"use client";

import { useState, useEffect } from "react";
import { Copy, Check, X, Sparkles } from "lucide-react";

export default function SheinCouponPopup() {
  const [isOpen, setIsOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const couponCode = "TSEHAY20"; // የኩፖን ኮድ

  useEffect(() => {
    try {
      const hasSeenPopup = localStorage.getItem("shein_popup_dismissed");
      if (!hasSeenPopup) {
        const timer = setTimeout(() => {
          setIsOpen(true);
        }, 7000); // 7 ሰከንድ ጠብቆ እንዲወጣ
        return () => clearTimeout(timer);
      }
    } catch (e) {}
  }, []);

  const handleCopy = () => {
    try {
      navigator.clipboard.writeText(couponCode);
      localStorage.setItem("tsehay_applied_referral_code", couponCode);
    } catch (e) {}
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleClose = () => {
    setIsOpen(false);
    try {
      localStorage.setItem("shein_popup_dismissed", "true");
    } catch (e) {}
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
      <div className="relative w-full max-w-sm rounded-2xl bg-neutral-900 border border-neutral-800 p-6 text-center shadow-2xl">
        {/* Close Button */}
        <button
          onClick={handleClose}
          className="absolute right-4 top-4 text-neutral-400 hover:text-white transition-colors cursor-pointer"
          aria-label="Close"
        >
          <X className="w-5 h-5"/>
        </button>

        {/* Icon */}
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-[#f9b03c]/10 text-[#f9b03c]">
          <Sparkles className="w-6 h-6"/>
        </div>

        {/* Header */}
        <h3 className="text-xl font-bold text-white tracking-wide">
          ልዩ የቅናሽ ስጦታ! 🎁
        </h3>
        <p className="mt-1 text-sm text-neutral-400">
          የ Shein ግዢዎን በልዩ ቅናሽ ለማድረግ ይህንን ኩፖን ኮድ ይጠቀሙ።
        </p>

        {/* Coupon Box */}
        <div className="mt-5 flex items-center justify-between rounded-xl border border-dashed border-[#f9b03c]/40 bg-neutral-800/60 px-4 py-3">
          <span className="font-mono text-lg font-bold tracking-wider text-[#f9b03c]">
            {couponCode}
          </span>
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 rounded-lg bg-[#3268ba] px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-600 transition-colors cursor-pointer"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400"/>
                <span>ተቀድቷል!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5"/>
                <span>ኮፒ አድርግ</span>
              </>
            )}
          </button>
        </div>

        {/* Dismiss Link */}
        <button
          onClick={handleClose}
          className="mt-4 text-xs text-neutral-500 hover:text-neutral-400 underline transition-colors cursor-pointer"
        >
          አሁን አልፈልግም፣ ዝጋ
        </button>
      </div>
    </div>
  );
}
