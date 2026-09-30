"use client";

import React, { useState, useEffect, useRef } from "react";
import { Copy, Check, X, Tag } from "lucide-react";

export default function SheinCouponPopup() {
  const [isOpen, setIsOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [rotate, setRotate] = useState({ x: 0, y: 0 });
  const cardRef = useRef<HTMLDivElement | null>(null);
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

  // Listen for programmatic test trigger
  useEffect(() => {
    const handleOpen = () => setIsOpen(true);
    window.addEventListener("tsehay_open_coupon_modal", handleOpen);
    return () => window.removeEventListener("tsehay_open_coupon_modal", handleOpen);
  }, []);

  // Handle ESC key dismissal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleClose();
    };
    if (isOpen) {
      window.addEventListener("keydown", handleKeyDown);
      return () => window.removeEventListener("keydown", handleKeyDown);
    }
  }, [isOpen]);

  // Subtle 3D Tilt calculation
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left - rect.width / 2;
    const y = e.clientY - rect.top - rect.height / 2;
    // Constrain tilt to max 10 degrees for refined smooth feel
    setRotate({
      x: -((y / rect.height) * 10),
      y: (x / rect.width) * 10,
    });
  };

  const handleMouseLeave = () => {
    setRotate({ x: 0, y: 0 });
  };

  const handleCopy = () => {
    try {
      if (navigator?.clipboard?.writeText) {
        navigator.clipboard.writeText(couponCode);
      }
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
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4 transition-all duration-300 animate-fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) handleClose();
      }}
      style={{ perspective: "1200px" }}
    >
      <div className="animate-popup-float w-full max-w-sm sm:max-w-md">
        {/* 3D Glassmorphic Card Container */}
        <div
          ref={cardRef}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          style={{
            boxShadow:
              "0 25px 50px -12px rgba(0, 0, 0, 0.7), 0 0 40px rgba(249, 176, 60, 0.15)",
            transform: `rotateX(${rotate.x.toFixed(2)}deg) rotateY(${rotate.y.toFixed(2)}deg)`,
            transition: "transform 0.15s ease-out, box-shadow 0.3s ease",
            transformStyle: "preserve-3d",
          }}
          className="relative w-full overflow-hidden rounded-3xl border border-amber-500/25 bg-neutral-900/85 pt-7 pb-6 px-6 sm:pt-8 sm:pb-7 sm:px-8 text-center backdrop-blur-xl shadow-2xl transition-transform"
        >
          {/* Ambient Lighting & Specular Reflection Flairs */}
          <div className="pointer-events-none absolute -top-24 -left-24 h-48 w-48 rounded-full bg-[#f9b03c]/15 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-24 -right-24 h-48 w-48 rounded-full bg-[#3268ba]/15 blur-3xl" />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/[0.07] via-transparent to-black/20" />

          {/* Crisp Minimal Close (X) Button */}
          <button
            type="button"
            onClick={handleClose}
            className="absolute right-4 top-4 z-20 flex h-8 w-8 items-center justify-center rounded-full bg-white/5 text-neutral-400 border border-white/5 hover:bg-white/10 hover:text-white hover:border-white/15 transition-all duration-200 cursor-pointer"
            aria-label="ዝጋ (Close)"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Top Pill Badge (Direct Clean Opening) */}
          <div className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-3.5 py-1 text-xs font-bold text-[#f9b03c] mb-3">
            <Tag className="w-3.5 h-3.5 stroke-[2.2] text-[#f9b03c]" />
            <span className="tracking-wide">20% ልዩ ቅናሽ • LIMITED TIME</span>
          </div>

          {/* Clean Amharic Header Typography */}
          <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight font-heading">
            ልዩ የቅናሽ ስጦታ! 🎁
          </h3>
          <p className="mt-2 text-xs sm:text-sm text-neutral-300 font-normal leading-relaxed max-w-[320px] mx-auto">
            የ 20% ቅናሽ ለማግኘት ኮዱን ኮፒ በማድረግ በማንኛውም ኮርስ መግዣ ላይ ይጠቀሙበት።
          </p>

          {/* Interactive Coupon Voucher Slot */}
          <div className="relative mt-5 overflow-hidden rounded-2xl border-2 border-dashed border-amber-500/40 bg-black/40 p-3 sm:p-3.5 shadow-[inset_0_2px_8px_rgba(0,0,0,0.6)] backdrop-blur-md">
            {/* Left & Right Decorative Ticket Notches */}
            <div className="absolute -left-2.5 top-1/2 -translate-y-1/2 h-5 w-5 rounded-full bg-neutral-900 border-r border-amber-500/40 shadow-inner" />
            <div className="absolute -right-2.5 top-1/2 -translate-y-1/2 h-5 w-5 rounded-full bg-neutral-900 border-l border-amber-500/40 shadow-inner" />

            <div className="flex items-center justify-between gap-3 px-2">
              <div className="flex flex-col text-left pl-1">
                <span className="text-[10px] font-bold uppercase tracking-widest text-amber-400/80">
                  PROMO CODE
                </span>
                <span className="font-mono text-xl sm:text-2xl font-black tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-[#f9b03c] to-amber-200 drop-shadow-sm select-all">
                  {couponCode}
                </span>
              </div>

              {/* Tactile Copy Button */}
              <button
                type="button"
                onClick={handleCopy}
                className={`relative flex items-center justify-center gap-1.5 rounded-xl px-4 py-2 text-xs sm:text-sm font-semibold transition-all duration-200 transform cursor-pointer active:scale-95 ${
                  copied
                    ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/30 scale-102"
                    : "bg-[#f9b03c] text-neutral-950 font-bold hover:bg-[#ffb947] hover:scale-105 shadow-lg shadow-amber-500/20"
                }`}
              >
                {copied ? (
                  <>
                    <Check className="w-4 h-4 stroke-[3]" />
                    <span>ተቀድቷል! ✓</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    <span>ኮፒ አድርግ</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Minimal Distraction-Free Dismissal Link */}
          <button
            type="button"
            onClick={handleClose}
            className="mt-4 text-xs text-neutral-500 hover:text-neutral-300 transition-colors cursor-pointer py-1 inline-block"
          >
            አሁን አልፈልግም፤ ዝጋ
          </button>
        </div>
      </div>

      {/* Floating Keyframe Animation Style */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
        @keyframes popupFloat {
          0%, 100% {
            transform: translateY(0px);
          }
          50% {
            transform: translateY(-6px);
          }
        }
        .animate-popup-float {
          animation: popupFloat 4.5s ease-in-out infinite;
        }
      `,
        }}
      />
    </div>
  );
}
