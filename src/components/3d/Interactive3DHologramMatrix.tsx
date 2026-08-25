'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import Tilt3DCard from './Tilt3DCard';

interface SkillPillar {
  id: string;
  title: string;
  titleAm: string;
  badge: string;
  icon: string;
  accent: string;
  glow: string;
  description: string;
  metrics: { label: string; value: string }[];
  highlight: string;
}

const PILLARS: SkillPillar[] = [
  {
    id: 'ai-tutor',
    title: 'Tsehay AI Intelligence',
    titleAm: '24/7 የግል AI መምህር',
    badge: 'EXCLUSIVE AI ENGINE',
    icon: 'fa-solid fa-robot',
    accent: '#f9b03c',
    glow: 'rgba(249, 176, 60, 0.4)',
    description: 'በማንኛውም ሰዓት ጥያቄዎችዎን በሰከንዶች ውስጥ የሚመልስ፣ ኮዲንግ የሚያርም እና የቢዝነስ ስትራቴጂ ደረጃ በደረጃ የሚያስተምር ዘመናዊ AI ረዳት።',
    metrics: [
      { label: 'የምላሽ ፍጥነት', value: '0.8 ሰከንድ' },
      { label: 'የቋንቋ ድጋፍ', value: 'አማርኛ + English' },
      { label: 'ድጋፍ', value: '24/7 ቀጥታ' },
    ],
    highlight: 'በክፍል ውስጥ ያለገደብ ይገኛል',
  },
  {
    id: 'fullstack',
    title: 'Full-Stack & Python Mastery',
    titleAm: 'ተግባራዊ የቴክኖሎጂ ስልጠና',
    badge: 'CAREER READY',
    icon: 'fa-solid fa-code',
    accent: '#3268ba',
    glow: 'rgba(50, 104, 186, 0.45)',
    description: 'ከዜሮ እስከ ከፍተኛ ደረጃ ድረስ በገበያ ላይ ተፈላጊ የሆኑ የዌብሳይት፣ የዳታቤዝ እና የሶፍትዌር ግንባታ ክህሎቶችን በተጨባጭ ፕሮጀክቶች ይማሩ።',
    metrics: [
      { label: 'የፕሮጀክት ብዛት', value: '12+ እውነተኛ' },
      { label: 'የስራ ዕድል', value: 'ከፍተኛ ተፈላጊ' },
      { label: 'ሰርተፍኬት', value: 'የተረጋገጠ' },
    ],
    highlight: 'ለጀማሪዎችም ሆነ ለከፍተኛ ደረጃ',
  },
  {
    id: 'digital-marketing',
    title: 'Digital Marketing & TikTok',
    titleAm: 'የዲጂታል ገበያ እና ቲክቶክ ስኬት',
    badge: 'REVENUE FOCUSED',
    icon: 'fa-brands fa-tiktok',
    accent: '#ff0050',
    glow: 'rgba(255, 0, 80, 0.4)',
    description: 'ያለምንም የፊት ገጽታ (100% Faceless) በቲክቶክ፣ ዩቲዩብ እና ፌስቡክ ላይ ተደራሽነትን በመፍጠር ቋሚ ገቢ የሚያስገኙ የዲጂታል ገበያ ስልቶች።',
    metrics: [
      { label: 'የተደራሽነት ስልት', value: 'Viral Growth' },
      { label: 'የገቢ ማግኛ', value: 'Monetization' },
      { label: 'ተግባራዊነት', value: '100% Live Case' },
    ],
    highlight: 'በተጨባጭ የተረጋገጡ ውጤቶች',
  },
  {
    id: 'ecommerce-import',
    title: 'E-Commerce & Global Import',
    titleAm: 'የኢ-ኮሜርስ እና ሼን (Shein) ኢምፖርት',
    badge: 'HIGH PROFIT',
    icon: 'fa-solid fa-cart-shopping',
    accent: '#10b981',
    glow: 'rgba(16, 185, 129, 0.4)',
    description: 'የሼን፣ አሊባባ እና ዓለም አቀፍ የኢ-ኮሜርስ እቃዎችን በቀላሉ ወደ ሀገር ውስጥ በማስገባት እና በኦንላይን በመሸጥ ትርፋማ የሚሆኑበት የደረጃ በደረጃ ስርዓት።',
    metrics: [
      { label: 'የመነሻ ካፒታል', value: 'ዝቅተኛ' },
      { label: 'የማስረከቢያ መንገድ', value: 'Door-to-Door' },
      { label: 'ትርፋማነት', value: 'ከ 40-70%+' },
    ],
    highlight: 'ቀጥታ የግብይት እና የማጓጓዣ ምስጢሮች',
  },
];

export default function Interactive3DHologramMatrix() {
  const [activeTab, setActiveTab] = useState<SkillPillar>(PILLARS[0]);
  const [rotationAngle, setRotationAngle] = useState(0);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // 3D Orbital Canvas Animation Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let angle = 0;
    const size = 380;
    canvas.width = size;
    canvas.height = size;

    const renderHologram = () => {
      ctx.clearRect(0, 0, size, size);
      const cx = size / 2;
      const cy = size / 2;

      angle += 0.015;
      setRotationAngle(angle);

      // Outer 3D Elliptical Orbit Ring 1 (Gold)
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(angle * 0.7);
      ctx.beginPath();
      ctx.ellipse(0, 0, 130, 48, Math.PI / 4, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(249, 176, 60, 0.55)';
      ctx.lineWidth = 1.8;
      ctx.shadowColor = '#f9b03c';
      ctx.shadowBlur = 15;
      ctx.stroke();

      // Orbiting Satellite Dot 1
      const satX1 = Math.cos(angle * 2) * 130;
      const satY1 = Math.sin(angle * 2) * 48;
      ctx.beginPath();
      ctx.arc(satX1, satY1, 4.5, 0, Math.PI * 2);
      ctx.fillStyle = '#f9b03c';
      ctx.fill();
      ctx.restore();

      // Outer 3D Elliptical Orbit Ring 2 (Royal Blue)
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(-angle * 0.9);
      ctx.beginPath();
      ctx.ellipse(0, 0, 125, 42, -Math.PI / 4, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(50, 104, 186, 0.65)';
      ctx.lineWidth = 1.8;
      ctx.shadowColor = '#3268ba';
      ctx.shadowBlur = 15;
      ctx.stroke();

      // Orbiting Satellite Dot 2
      const satX2 = Math.cos(-angle * 2.2) * 125;
      const satY2 = Math.sin(-angle * 2.2) * 42;
      ctx.beginPath();
      ctx.arc(satX2, satY2, 4.5, 0, Math.PI * 2);
      ctx.fillStyle = '#5a93e8';
      ctx.fill();
      ctx.restore();

      // Outer 3D Elliptical Orbit Ring 3 (Emerald/Cyan)
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(angle * 0.5);
      ctx.beginPath();
      ctx.ellipse(0, 0, 140, 36, Math.PI / 2.5, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(16, 185, 129, 0.45)';
      ctx.lineWidth = 1.4;
      ctx.stroke();
      ctx.restore();

      // Central Pulsing 3D Holographic Core
      const pulse = 1 + Math.sin(angle * 3) * 0.1;
      const grad = ctx.createRadialGradient(cx, cy, 5, cx, cy, 65 * pulse);
      grad.addColorStop(0, 'rgba(255, 255, 255, 0.95)');
      grad.addColorStop(0.3, 'rgba(249, 176, 60, 0.8)');
      grad.addColorStop(0.7, 'rgba(50, 104, 186, 0.35)');
      grad.addColorStop(1, 'transparent');

      ctx.beginPath();
      ctx.arc(cx, cy, 65 * pulse, 0, Math.PI * 2);
      ctx.fillStyle = grad;
      ctx.fill();

      // Core Geometric Wireframe Diamond
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(angle);
      ctx.beginPath();
      ctx.moveTo(0, -32);
      ctx.lineTo(32, 0);
      ctx.lineTo(0, 32);
      ctx.lineTo(-32, 0);
      ctx.closePath();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.shadowColor = '#ffffff';
      ctx.shadowBlur = 10;
      ctx.stroke();
      ctx.restore();

      animId = requestAnimationFrame(renderHologram);
    };

    animId = requestAnimationFrame(renderHologram);
    return () => cancelAnimationFrame(animId);
  }, []);

  return (
    <section 
      id="3d-ecosystem" 
      className="relative py-20 sm:py-28 overflow-hidden bg-slate-900/30 dark:bg-transparent border-b border-gray-200/80 dark:border-white/[0.06] select-none"
    >
      {/* Dynamic Ambient Mesh Behind 3D Hologram */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[650px] h-[450px] bg-gradient-to-r from-[#f9b03c]/10 via-[#3268ba]/12 to-[#f9b03c]/10 rounded-full blur-[160px] pointer-events-none" />

      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Section Header with 3D Holographic Tag */}
        <div className="text-center max-w-3xl mx-auto mb-14 sm:mb-18">
          <div className="inline-flex items-center gap-2.5 bg-[#f9b03c]/10 border border-[#f9b03c]/30 px-4 py-1.5 rounded-full mb-4 shadow-[0_0_20px_rgba(249,176,60,0.2)] backdrop-blur-md">
            <i className="fa-solid fa-cube text-[#f9b03c] text-xs animate-spin" style={{ animationDuration: '6s' }}></i>
            <span className="text-xs font-black uppercase tracking-widest text-[#f9b03c]">
              3D INTERACTIVE LEARNING MATRIX
            </span>
          </div>

          <h2 className="text-3xl sm:text-4xl md:text-5xl font-black font-heading text-slate-900 dark:text-white mb-4 tracking-tight leading-tight">
            በተግባር እና በ AI የታገዘ <span className="hero-headline-shift">የክህሎት ማዕከል</span>
          </h2>
          <p className="text-gray-600 dark:text-[#8a95a5] font-body text-base sm:text-lg">
            በዓለም አቀፍ ደረጃ ተፈላጊ የሆኑትን ዘመናዊ ሙያዎች በ 3D በይነገጽ ያስሱ
          </p>
        </div>

        {/* 3D Interactive Stage Layout: Left (Pillars Selector) + Right (3D Holographic Core & Deep Card) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          
          {/* Left Column (5 Cols): Interactive 3D Pillar Selector Buttons */}
          <div className="lg:col-span-5 space-y-3.5">
            {PILLARS.map((pillar) => {
              const isActive = activeTab.id === pillar.id;
              return (
                <button
                  key={pillar.id}
                  type="button"
                  onClick={() => setActiveTab(pillar)}
                  className={`w-full text-left p-4 sm:p-5 rounded-2xl border transition-all duration-400 cursor-pointer flex items-center justify-between group relative overflow-hidden ${
                    isActive
                      ? 'bg-gradient-to-r from-white/90 via-white/80 to-white/95 dark:from-white/[0.08] dark:via-white/[0.05] dark:to-white/[0.08] border-[#f9b03c] shadow-[0_10px_30px_rgba(249,176,60,0.25)] scale-[1.02]'
                      : 'bg-white/50 dark:bg-white/[0.02] border-gray-200/70 dark:border-white/[0.06] hover:border-gray-300 dark:hover:border-white/20 hover:scale-[1.01]'
                  }`}
                >
                  {/* Left Icon + Title Details */}
                  <div className="flex items-center gap-3.5 sm:gap-4 relative z-10">
                    <div 
                      className={`w-11 h-11 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center text-lg sm:text-xl transition-transform duration-300 group-hover:scale-110 shadow-sm ${
                        isActive 
                          ? 'bg-[#f9b03c] text-slate-950 font-black shadow-[0_0_15px_#f9b03c]'
                          : 'bg-gray-100 dark:bg-white/[0.06] text-gray-700 dark:text-gray-300'
                      }`}
                    >
                      <i className={pillar.icon}></i>
                    </div>
                    <div>
                      <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#f9b03c] block mb-0.5">
                        {pillar.badge}
                      </span>
                      <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white font-heading">
                        {pillar.titleAm}
                      </h3>
                      <p className="text-xs text-gray-500 dark:text-gray-400 font-mono">
                        {pillar.title}
                      </p>
                    </div>
                  </div>

                  {/* Right Active Glow Indicator */}
                  <div className="relative z-10 shrink-0">
                    <div 
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-xs transition-all duration-300 ${
                        isActive
                          ? 'bg-[#f9b03c] text-slate-950 rotate-[-45deg] shadow-[0_0_12px_#f9b03c]'
                          : 'bg-transparent text-gray-400 group-hover:text-white group-hover:translate-x-1'
                      }`}
                    >
                      <i className="fa-solid fa-arrow-right"></i>
                    </div>
                  </div>

                  {/* Active highlight side line */}
                  {isActive && (
                    <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-[#f9b03c] shadow-[0_0_10px_#f9b03c]" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Right Column (7 Cols): 3D Tilt Card with Central 3D Canvas Orbit & Pop-Out Details */}
          <div className="lg:col-span-7">
            <Tilt3DCard
              perspective={1200}
              maxTilt={10}
              scale={1.02}
              className="w-full"
            >
              <div className="relative rounded-3xl sm:rounded-[2.5rem] bg-gradient-to-br from-white/90 via-slate-50/80 to-white/95 dark:from-[#070b14] dark:via-[#04060a] dark:to-[#090d18] border-2 border-primary/50 dark:border-[#f9b03c]/40 p-6 sm:p-10 shadow-[0_30px_80px_rgba(0,0,0,0.7)] backdrop-blur-2xl overflow-hidden">
                
                {/* 3D Holographic Canvas in Background of the Card */}
                <div className="absolute top-1/2 right-0 -translate-y-1/2 translate-x-16 sm:translate-x-10 opacity-30 dark:opacity-45 pointer-events-none">
                  <canvas ref={canvasRef} className="w-[280px] sm:w-[360px] h-[280px] sm:h-[360px]" />
                </div>

                {/* Floating 3D Pop-Out Content Elements */}
                <div className="relative z-10" style={{ transform: 'translateZ(30px)' }}>
                  
                  {/* Top Badge & Category */}
                  <div className="flex items-center justify-between gap-3 mb-5">
                    <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#f9b03c]/15 border border-[#f9b03c]/40 text-[#f9b03c] text-xs font-black uppercase font-mono shadow-xs">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#f9b03c] animate-ping" />
                      <span>{activeTab.badge}</span>
                    </div>

                    <span className="text-xs font-mono font-bold text-gray-500 dark:text-gray-400">
                      {activeTab.highlight}
                    </span>
                  </div>

                  {/* Big Headline */}
                  <h3 className="text-2xl sm:text-3xl lg:text-4xl font-black text-slate-900 dark:text-white mb-3 font-heading">
                    {activeTab.titleAm}
                  </h3>

                  <p className="text-sm sm:text-base text-gray-600 dark:text-gray-300 font-body leading-relaxed mb-7 max-w-xl">
                    {activeTab.description}
                  </p>

                  {/* 3-Column 3D Hologram Metrics Cards (Pop-out at translateZ 50px) */}
                  <div 
                    className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 mb-8"
                    style={{ transform: 'translateZ(45px)' }}
                  >
                    {activeTab.metrics.map((metric, idx) => (
                      <div 
                        key={idx}
                        className="p-4 rounded-2xl bg-white/70 dark:bg-white/[0.04] border border-gray-200/70 dark:border-white/[0.08] backdrop-blur-md shadow-sm"
                      >
                        <p className="text-[11px] text-gray-500 dark:text-gray-400 font-bold uppercase mb-1">
                          {metric.label}
                        </p>
                        <p className="text-base sm:text-lg font-black text-slate-900 dark:text-white font-mono">
                          {metric.value}
                        </p>
                      </div>
                    ))}
                  </div>

                  {/* Action Row */}
                  <div className="flex flex-col sm:flex-row items-center gap-4">
                    <button
                      type="button"
                      onClick={() => document.getElementById('courses')?.scrollIntoView({ behavior: 'smooth' })}
                      className="w-full sm:w-auto px-7 py-3.5 rounded-xl bg-gradient-to-r from-[#f9b03c] to-amber-500 text-slate-950 font-black text-xs sm:text-sm cursor-pointer shadow-[0_0_25px_rgba(249,176,60,0.4)] hover:scale-105 active:scale-98 transition-all flex items-center justify-center gap-2.5"
                    >
                      <span>በዚህ ስልጠና ይመዝገቡ</span>
                      <i className="fa-solid fa-arrow-right text-xs"></i>
                    </button>

                    <button
                      type="button"
                      onClick={() => document.getElementById('ai-feature')?.scrollIntoView({ behavior: 'smooth' })}
                      className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-slate-800 dark:text-white font-bold text-xs sm:text-sm hover:border-[#f9b03c]/50 transition-all flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <i className="fa-solid fa-sparkles text-[#f9b03c] text-xs"></i>
                      <span>AI ረዳትን ይሞክሩ</span>
                    </button>
                  </div>
                </div>
              </div>
            </Tilt3DCard>
          </div>
        </div>
      </div>
    </section>
  );
}
