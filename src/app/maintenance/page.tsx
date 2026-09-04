import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'ማሻሻያ ላይ ነን (Under Maintenance) • Tsehay Campus',
  description: 'የበለጠ ጥራት ያለው እና የተሻለ አገልግሎት ለመስጠት ዌብሳይታችንን በማሻሻል ላይ እንገኛለን። በቅርቡ እንመለሳለን!',
  icons: {
    icon: '/tc-logo.jpg',
    apple: '/tc-logo.jpg',
  },
};

export default function MaintenancePage() {
  return (
    <main className="min-h-screen bg-[#030509] text-white flex flex-col justify-between relative overflow-hidden select-none font-sans">
      {/* 🌌 Dynamic Ambient Background Glows */}
      <div 
        aria-hidden="true" 
        className="absolute top-[-15%] left-[-10%] w-[650px] h-[650px] rounded-full bg-[#f9b03c]/15 blur-[160px] pointer-events-none animate-pulse duration-[7000ms]" 
      />
      <div 
        aria-hidden="true" 
        className="absolute bottom-[-15%] right-[-10%] w-[700px] h-[700px] rounded-full bg-[#3268ba]/20 blur-[180px] pointer-events-none animate-pulse duration-[9000ms]" 
      />
      <div 
        aria-hidden="true" 
        className="absolute top-[40%] left-[30%] w-[450px] h-[450px] rounded-full bg-amber-500/5 blur-[140px] pointer-events-none" 
      />

      {/* 🕸️ Subtle Blueprint/Matrix Grid Overlay */}
      <div 
        aria-hidden="true"
        className="absolute inset-0 opacity-[0.035] pointer-events-none" 
        style={{
          backgroundImage: `linear-gradient(#ffffff 1px, transparent 1px), linear-gradient(to right, #ffffff 1px, transparent 1px)`,
          backgroundSize: '48px 48px'
        }} 
      />

      {/* 🌟 Top Navigation / Status Header */}
      <header className="relative z-10 w-full max-w-7xl mx-auto px-6 py-6 sm:py-8 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-gradient-to-tr from-[#f9b03c] via-amber-400 to-[#3268ba] p-[2px] shadow-[0_0_25px_rgba(249,176,60,0.35)]">
            <div className="w-full h-full bg-[#070b16] rounded-2xl flex items-center justify-center overflow-hidden">
              <span className="text-[#f9b03c] font-black text-lg sm:text-xl tracking-tighter">TC</span>
            </div>
          </div>
          <div>
            <h2 className="text-sm sm:text-base font-black tracking-tight text-white flex items-center gap-1.5">
              <span>TSEHAY</span>
              <span className="text-[#f9b03c]">CAMPUS</span>
            </h2>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">ፀሐይ ካምፓስ • ኢ-ለርኒንግ</p>
          </div>
        </div>

        {/* Live Status Pill */}
        <div className="inline-flex items-center gap-2.5 px-3.5 sm:px-4 py-1.5 rounded-full bg-[#0a101f]/80 border border-amber-500/30 backdrop-blur-xl shadow-[0_0_20px_rgba(249,176,60,0.15)]">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-400"></span>
          </span>
          <span className="text-[11px] sm:text-xs font-bold text-amber-300 tracking-wide">
            ሲስተም ማሻሻያ (Maintenance Mode)
          </span>
        </div>
      </header>

      {/* 🚀 Main Hero Section */}
      <section className="relative z-10 w-full max-w-4xl mx-auto px-6 py-8 sm:py-12 flex flex-col items-center text-center">
        
        {/* 💫 3D Animated Gyroscope & Centered Logo Container */}
        <div className="relative mb-6 group">
          {/* Pulsing Outer Glow Ring */}
          <div className="absolute -inset-4 rounded-3xl bg-gradient-to-r from-[#f9b03c]/30 via-[#3268ba]/30 to-[#f9b03c]/30 blur-xl opacity-75 animate-pulse group-hover:opacity-100 transition duration-1000"></div>
          
          {/* Rotating 3D Accent Rings */}
          <div 
            aria-hidden="true"
            className="absolute -inset-3 rounded-3xl border border-dashed border-[#f9b03c]/40 animate-[spin_20s_linear_infinite] pointer-events-none"
          />
          <div 
            aria-hidden="true"
            className="absolute -inset-6 rounded-full border border-dotted border-[#3268ba]/30 animate-[spin_30s_linear_infinite_reverse] pointer-events-none"
          />

          {/* Centered Official Logo */}
          <img 
            src="/tc-logo.jpg" 
            alt="Tsehay Campus" 
            className="w-24 h-24 mb-6 rounded-2xl mx-auto relative z-10 shadow-[0_0_40px_rgba(249,176,60,0.4)] ring-2 ring-[#f9b03c]/50 object-cover" 
          />
        </div>

        {/* 3D Animated Spinner Element */}
        <div className="flex items-center justify-center gap-2 mb-6">
          <div className="relative w-8 h-8 flex items-center justify-center">
            <div className="absolute inset-0 rounded-full border-2 border-t-[#f9b03c] border-r-transparent border-b-[#3268ba] border-l-transparent animate-spin" />
            <div className="w-2.5 h-2.5 rounded-full bg-[#f9b03c] shadow-[0_0_10px_#f9b03c] animate-pulse" />
          </div>
          <span className="text-xs font-extrabold uppercase tracking-widest text-amber-300/90 bg-[#f9b03c]/10 px-3 py-1 rounded-full border border-[#f9b03c]/20">
            System Upgrading & Optimizing
          </span>
        </div>

        {/* Heading */}
        <h1 className="text-3xl sm:text-5xl md:text-6xl font-black tracking-tight leading-[1.15] mb-5 max-w-3xl">
          <span className="text-white">ማሻሻያ ላይ ነን</span>{' '}
          <span className="bg-gradient-to-r from-[#f9b03c] via-amber-300 to-[#f9b03c] bg-clip-text text-transparent drop-shadow-[0_0_35px_rgba(249,176,60,0.45)]">
            (Under Maintenance)
          </span>
        </h1>

        {/* Description Paragraph */}
        <p className="text-base sm:text-xl text-slate-300 font-medium max-w-2xl leading-relaxed mb-10">
          የበለጠ ጥራት ያለው እና የተሻለ አገልግሎት ለመስጠት ዌብሳይታችንን በማሻሻል ላይ እንገኛለን። በቅርቡ እንመለሳለን!
        </p>

        {/* 🛠️ Glassmorphism Diagnostic & Progress Card */}
        <div className="w-full max-w-2xl bg-[#090e1b]/80 backdrop-blur-2xl border border-white/[0.1] rounded-3xl p-6 sm:p-8 shadow-[0_25px_60px_rgba(0,0,0,0.7)] mb-10">
          
          <div className="flex items-center justify-between mb-3 text-left">
            <span className="text-xs sm:text-sm font-bold text-slate-300 flex items-center gap-2">
              <i className="fa-solid fa-gears text-[#f9b03c] animate-spin"></i>
              የማሻሻያ ሂደት (Upgrade Progress)
            </span>
            <span className="text-xs sm:text-sm font-black text-amber-300 bg-amber-400/10 px-2.5 py-0.5 rounded-md border border-amber-400/20">
              90% ተጠናቋል
            </span>
          </div>

          {/* Glowing Animated Loading Bar */}
          <div className="w-full h-3.5 bg-[#03060f] rounded-full overflow-hidden p-0.5 border border-white/[0.08] shadow-inner mb-6 relative">
            <div 
              className="h-full bg-gradient-to-r from-[#3268ba] via-[#f9b03c] to-amber-300 rounded-full relative overflow-hidden transition-all duration-1000 shadow-[0_0_15px_rgba(249,176,60,0.5)]" 
              style={{ width: '90%' }}
            >
              {/* Shimmer Light Scanner */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent -translate-x-full animate-[shimmer_2s_infinite]" />
            </div>
          </div>

          {/* System Check Status Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-left">
            <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/[0.06] flex items-center gap-3">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-[0_0_10px_#34d399] shrink-0" />
              <div>
                <p className="text-[11px] font-bold text-slate-400">Core Engine</p>
                <p className="text-xs font-black text-white">Ultra-Fast 100%</p>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/[0.06] flex items-center gap-3">
              <span className="w-2.5 h-2.5 rounded-full bg-[#f9b03c] animate-ping shrink-0" />
              <div>
                <p className="text-[11px] font-bold text-slate-400">Database & Cloud</p>
                <p className="text-xs font-black text-amber-300">Syncing & Tuning...</p>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/[0.06] flex items-center gap-3">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-[0_0_10px_#34d399] shrink-0" />
              <div>
                <p className="text-[11px] font-bold text-slate-400">Security & 2FA</p>
                <p className="text-xs font-black text-white">Protected & Safe</p>
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
            className="px-7 py-3.5 rounded-2xl bg-gradient-to-r from-[#229ED9] to-[#1785B8] hover:from-[#1ea1dd] hover:to-[#1a93cc] text-white font-black text-sm sm:text-base flex items-center justify-center gap-2.5 shadow-[0_0_30px_rgba(34,158,217,0.35)] hover:shadow-[0_0_45px_rgba(34,158,217,0.55)] transition-all duration-300 hover:scale-[1.03] active:scale-[0.98] cursor-pointer"
          >
            <i className="fa-brands fa-telegram text-lg"></i>
            <span>በቴሌግራም ያግኙን (@EyoubSahle)</span>
          </a>

          <a
            href="https://t.me/TsehayCampus"
            target="_blank"
            rel="noopener noreferrer"
            className="px-7 py-3.5 rounded-2xl bg-white/[0.06] hover:bg-white/[0.12] border border-white/[0.12] hover:border-[#f9b03c]/60 text-slate-200 hover:text-white font-bold text-sm sm:text-base flex items-center justify-center gap-2.5 backdrop-blur-xl transition-all duration-300 hover:scale-[1.03] active:scale-[0.98] cursor-pointer shadow-lg"
          >
            <i className="fa-solid fa-bullhorn text-[#f9b03c]"></i>
            <span>የቴሌግራም ቻናላችን</span>
          </a>
        </div>
      </section>

      {/* 📌 Clean Footer Section */}
      <footer className="relative z-10 w-full max-w-7xl mx-auto px-6 py-6 border-t border-white/[0.06] flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500 font-medium">
        <p>© {new Date().getFullYear()} Tsehay Campus. መብቱ በህግ የተጠበቀ ነው።</p>
        <div className="flex items-center gap-6">
          <a href="mailto:contact@tsehaycampus.com" className="hover:text-amber-400 transition">
            <i className="fa-solid fa-envelope mr-1.5 text-slate-400"></i>contact@tsehaycampus.com
          </a>
          <span className="text-slate-700">•</span>
          <span className="text-slate-400">Addis Ababa, Ethiopia</span>
        </div>
      </footer>
    </main>
  );
}
