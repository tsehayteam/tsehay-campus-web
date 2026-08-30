import React from 'react';
import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'ማሻሻያ ላይ ነን (Under Maintenance) • Tsehay Campus',
  description: 'የበለጠ ጥራት ያለው እና የተሻለ አገልግሎት ለመስጠት ዌብሳይታችንን በማሻሻል ላይ እንገኛለን። በቅርቡ እንመለሳለን!',
};

export default function MaintenancePage() {
  return (
    <main className="min-h-screen bg-[#030509] text-white flex flex-col justify-between relative overflow-hidden select-none font-sans">
      {/* 🌌 Dynamic Ambient Background Glows */}
      <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] rounded-full bg-[#f9b03c]/10 blur-[140px] pointer-events-none animate-pulse duration-[8000ms]" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[650px] h-[650px] rounded-full bg-[#3268ba]/15 blur-[160px] pointer-events-none animate-pulse duration-[10000ms]" />
      <div className="absolute top-[40%] right-[20%] w-[400px] h-[400px] rounded-full bg-amber-500/5 blur-[120px] pointer-events-none" />

      {/* 🕸️ Subtle Matrix/Grid Overlay */}
      <div 
        className="absolute inset-0 opacity-[0.03] pointer-events-none" 
        style={{
          backgroundImage: `linear-gradient(#ffffff 1px, transparent 1px), linear-gradient(to right, #ffffff 1px, transparent 1px)`,
          backgroundSize: '40px 40px'
        }} 
      />

      {/* 🌟 Header Section */}
      <header className="relative z-10 w-full max-w-7xl mx-auto px-6 py-8 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-[#f9b03c] via-amber-400 to-[#3268ba] p-[2px] shadow-[0_0_25px_rgba(249,176,60,0.35)]">
            <div className="w-full h-full bg-[#070b16] rounded-2xl flex items-center justify-center overflow-hidden">
              <span className="text-[#f9b03c] font-black text-xl tracking-tighter">TC</span>
            </div>
          </div>
          <div>
            <h2 className="text-base font-black tracking-tight text-white flex items-center gap-2">
              <span>TSEHAY</span>
              <span className="text-[#f9b03c]">CAMPUS</span>
            </h2>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">ፀሐይ ካምፓስ • ኢ-ለርኒንግ</p>
          </div>
        </div>

        {/* Live Status Pill */}
        <div className="hidden sm:flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/[0.04] border border-white/[0.08] backdrop-blur-md">
          <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
          <span className="w-2 h-2 rounded-full bg-amber-400 -ml-4" />
          <span className="text-xs font-semibold text-amber-300">ሲስተም ማሻሻያ (Upgrading)</span>
        </div>
      </header>

      {/* 🚀 Main Hero Content */}
      <section className="relative z-10 w-full max-w-4xl mx-auto px-6 py-12 flex flex-col items-center text-center">
        
        {/* Animated Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-[#f9b03c]/15 via-[#3268ba]/15 to-[#f9b03c]/15 border border-[#f9b03c]/30 shadow-[0_0_30px_rgba(249,176,60,0.2)] mb-8 animate-bounce duration-[3000ms]">
          <i className="fa-solid fa-screwdriver-wrench text-[#f9b03c] text-xs"></i>
          <span className="text-xs sm:text-sm font-black tracking-wide text-amber-200 uppercase">
            ⚡ በቅርቡ በአዲስ ገጽታ እንመለሳለን • System Upgrade
          </span>
        </div>

        {/* Big Heading */}
        <h1 className="text-3xl sm:text-5xl md:text-6xl font-black tracking-tight leading-[1.2] mb-6 max-w-3xl">
          <span className="text-white">ማሻሻያ ላይ ነን</span>{' '}
          <span className="bg-gradient-to-r from-[#f9b03c] via-amber-300 to-[#e09825] bg-clip-text text-transparent drop-shadow-[0_0_35px_rgba(249,176,60,0.4)]">
            (Under Maintenance)
          </span>
        </h1>

        {/* Description Paragraph */}
        <p className="text-base sm:text-xl text-slate-300 font-medium max-w-2xl leading-relaxed mb-10">
          የበለጠ ጥራት ያለው እና የተሻለ አገልግሎት ለመስጠት ዌብሳይታችንን በማሻሻል ላይ እንገኛለን። በቅርቡ እንመለሳለን!
        </p>

        {/* 🛠️ Glassmorphism Status Card */}
        <div className="w-full max-w-2xl bg-[#0a0f1d]/75 backdrop-blur-2xl border border-white/[0.1] rounded-3xl p-6 sm:p-8 shadow-[0_20px_50px_rgba(0,0,0,0.6)] mb-10">
          
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs sm:text-sm font-bold text-slate-400 flex items-center gap-2">
              <i className="fa-solid fa-server text-[#3268ba]"></i>
              የማሻሻያ ሂደት (Upgrade Progress)
            </span>
            <span className="text-xs sm:text-sm font-black text-[#f9b03c]">85% ተጠናቋል</span>
          </div>

          {/* Progress Bar */}
          <div className="w-full h-3 bg-slate-900 rounded-full overflow-hidden p-0.5 border border-white/[0.06] mb-6">
            <div 
              className="h-full bg-gradient-to-r from-[#3268ba] via-[#f9b03c] to-amber-300 rounded-full animate-pulse" 
              style={{ width: '85%' }}
            />
          </div>

          {/* System Check Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-left">
            <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/[0.05] flex items-center gap-3">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-[0_0_10px_#34d399]" />
              <div>
                <p className="text-[11px] font-bold text-slate-400">Core Engine</p>
                <p className="text-xs font-black text-white">Ultra-Fast</p>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/[0.05] flex items-center gap-3">
              <span className="w-2.5 h-2.5 rounded-full bg-[#f9b03c] animate-ping" />
              <div>
                <p className="text-[11px] font-bold text-slate-400">Database Sync</p>
                <p className="text-xs font-black text-amber-300">Finalizing...</p>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/[0.05] flex items-center gap-3">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-[0_0_10px_#34d399]" />
              <div>
                <p className="text-[11px] font-bold text-slate-400">Security & 2FA</p>
                <p className="text-xs font-black text-white">Protected</p>
              </div>
            </div>
          </div>
        </div>

        {/* 📞 Contact & Direct Channel Actions */}
        <div className="flex flex-wrap items-center justify-center gap-4 w-full">
          <a
            href="https://t.me/EyoubSahle"
            target="_blank"
            rel="noopener noreferrer"
            className="px-8 py-4 rounded-2xl bg-gradient-to-r from-[#229ED9] to-[#1785B8] hover:from-[#1ea1dd] hover:to-[#1a93cc] text-white font-black text-sm sm:text-base flex items-center justify-center gap-3 shadow-[0_0_30px_rgba(34,158,217,0.35)] hover:shadow-[0_0_45px_rgba(34,158,217,0.55)] transition-all duration-300 hover:scale-[1.03] active:scale-[0.98] cursor-pointer"
          >
            <i className="fa-brands fa-telegram text-lg"></i>
            <span>በቴሌግራም ያግኙን (@EyoubSahle)</span>
          </a>

          <a
            href="https://t.me/TsehayCampus"
            target="_blank"
            rel="noopener noreferrer"
            className="px-8 py-4 rounded-2xl bg-white/[0.06] hover:bg-white/[0.12] border border-white/[0.12] hover:border-[#f9b03c]/60 text-slate-200 hover:text-white font-bold text-sm sm:text-base flex items-center justify-center gap-3 backdrop-blur-xl transition-all duration-300 hover:scale-[1.03] active:scale-[0.98] cursor-pointer shadow-lg"
          >
            <i className="fa-solid fa-bullhorn text-[#f9b03c]"></i>
            <span>የቴሌግራም ቻናላችን</span>
          </a>
        </div>
      </section>

      {/* 📌 Footer Section */}
      <footer className="relative z-10 w-full max-w-7xl mx-auto px-6 py-6 border-t border-white/[0.06] flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500 font-medium">
        <p>© {new Date().getFullYear()} Tsehay Campus. መብቱ በህግ የተጠበቀ ነው።</p>
        <div className="flex items-center gap-6">
          <a href="mailto:contact@tsehaycampus.com" className="hover:text-amber-400 transition">
            <i className="fa-solid fa-envelope mr-1.5"></i>contact@tsehaycampus.com
          </a>
          <span className="text-slate-700">•</span>
          <span className="text-slate-400">Addis Ababa, Ethiopia</span>
        </div>
      </footer>
    </main>
  );
}
