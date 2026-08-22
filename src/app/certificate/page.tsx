'use client';

import React, { useState, useRef, useEffect } from 'react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { useLanguage } from '@/context/LanguageContext';
import { useAuth } from '@/context/AuthContext';

const DEFAULT_COURSES = [
  'ዲጂታል ማርኬቲንግ እና የኦንላይን ቢዝነስ ማስተርክላስ (Digital Marketing)',
  'ከቻይና 1688 እቃ ማስመጣት እና ኢ-ኮሜርስ (China 1688 Importation)',
  'የፌስቡክ እና የቲክቶክ ማስታወቂያ ስልጠና (FB & TikTok Ads)',
  'ክሪፕቶ ከረንሲ እና የፋይናንስ ትሬዲንግ (Crypto & Financial Markets)',
  'በ AI የታገዘ የቢዝነስ እና የኮንቴንት ማበልፀጊያ (AI for Business)',
];

export default function CertificateGeneratorPage() {
  const { t } = useLanguage();
  const { user } = useAuth();

  const [studentName, setStudentName] = useState(user?.displayName || 'Abebe Kebede');
  const [selectedCourse, setSelectedCourse] = useState(DEFAULT_COURSES[0]);
  const [certLanguage, setCertLanguage] = useState<'en' | 'am'>('en');
  const [certId, setCertId] = useState('TC-2026-X8F9');
  const [issueDate, setIssueDate] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [scale, setScale] = useState(1);

  const certRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Generate unique ID and formatted date on mount
    const randomHex = Math.random().toString(36).substring(2, 6).toUpperCase();
    const currentYear = new Date().getFullYear();
    setCertId(`TC-${currentYear}-${randomHex}`);

    const today = new Date();
    const options: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'long', day: 'numeric' };
    setIssueDate(today.toLocaleDateString('en-US', options));
  }, []);

  // Responsive scaling for the 1123px wide certificate preview
  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current) {
        const containerWidth = containerRef.current.offsetWidth - 32;
        if (containerWidth < 1123) {
          setScale(containerWidth / 1123);
        } else {
          setScale(1);
        }
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleDownloadPNG = async () => {
    if (!certRef.current) return;
    setIsGenerating(true);

    try {
      // Ensure html2canvas is loaded via CDN without build dependencies
      if (typeof window !== 'undefined' && !(window as any).html2canvas) {
        await new Promise<void>((resolve, reject) => {
          const script = document.createElement('script');
          script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js';
          script.onload = () => resolve();
          script.onerror = () => reject(new Error('Failed to load html2canvas CDN'));
          document.head.appendChild(script);
        });
      }

      const html2canvas = (window as any).html2canvas;
      if (html2canvas) {
        const canvas = await html2canvas(certRef.current, {
          scale: 2.5, // Ultra-high resolution 2.5x
          useCORS: true,
          allowTaint: true,
          backgroundColor: '#ffffff',
          logging: false,
        });

        const image = canvas.toDataURL('image/png');
        const link = document.createElement('a');
        link.href = image;
        const cleanFileName = (studentName || 'Student').trim().replace(/[^a-zA-Z0-9_-]/g, '_');
        link.download = `Tsehay_Campus_Certificate_${cleanFileName}.png`;
        link.click();
      } else {
        window.print();
      }
    } catch (error) {
      console.error('Error generating certificate PNG:', error);
      window.print();
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-[#030509] text-white flex flex-col selection:bg-[#f9b03c]/30">
      {/* Google Fonts for prestigious Certificate Typography */}
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      <link
        href="https://fonts.googleapis.com/css2?family=Alex+Brush&family=Cinzel:wght@500;700;900&family=Great+Vibes&family=Playfair+Display:ital,wght@0,600;0,800;0,900;1,400;1,700&family=Montserrat:wght@400;600;700;900&display=swap"
        rel="stylesheet"
      />

      <Navbar />

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 pt-28 pb-20">
        {/* Header Title */}
        <div className="text-center max-w-3xl mx-auto mb-10">
          <div className="inline-flex items-center gap-2.5 bg-[#f9b03c]/10 border border-[#f9b03c]/30 px-5 py-2 rounded-full mb-4">
            <i className="fa-solid fa-award text-[#f9b03c]"></i>
            <span className="text-xs font-black uppercase tracking-widest text-[#f9b03c]">OFFICIAL CREDENTIAL GENERATOR</span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-black font-heading text-white mb-4">
            የእውቅና ሰርተፍኬት <span className="hero-headline-shift">ማመንጫ</span>
          </h1>
          <p className="text-slate-300 font-body text-sm sm:text-base">
            ስምዎን እና የወሰዱትን ኮርስ በማስገባት በይፋ የተረጋገጠ፣ በከፍተኛ ጥራት የሚታተም እና የሚወርድ የ Tsehay Campus ሰርተፍኬት ያመንጩ።
          </p>
        </div>

        {/* Generator Form Controls (Glassmorphic Box) */}
        <div className="bg-[#050811]/95 backdrop-blur-2xl border border-white/[0.1] rounded-3xl p-6 sm:p-8 mb-12 shadow-[0_20px_60px_rgba(0,0,0,0.7)] max-w-4xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            {/* Input 1: Student Full Name */}
            <div>
              <label className="block text-xs font-black uppercase tracking-wider text-gray-300 mb-2">
                <i className="fa-solid fa-user-pen text-[#f9b03c] mr-2"></i>የተማሪው ሙሉ ስም (Full Name for Certificate)
              </label>
              <input
                type="text"
                value={studentName}
                onChange={(e) => setStudentName(e.target.value)}
                placeholder="उदा. Abebe Kebede / እዮብ ሳህሌ"
                className="w-full bg-white/[0.04] border border-white/[0.1] rounded-xl px-4 py-3.5 text-white font-semibold text-base focus:border-[#f9b03c] focus:ring-1 focus:ring-[#f9b03c] outline-none transition"
              />
            </div>

            {/* Input 2: Course Selector */}
            <div>
              <label className="block text-xs font-black uppercase tracking-wider text-gray-300 mb-2">
                <i className="fa-solid fa-graduation-cap text-[#3268ba] mr-2"></i>የኮርሱ ስም (Course Name)
              </label>
              <select
                value={selectedCourse}
                onChange={(e) => setSelectedCourse(e.target.value)}
                className="w-full bg-[#0d1222] border border-white/[0.1] rounded-xl px-4 py-3.5 text-white font-semibold text-sm focus:border-[#f9b03c] focus:ring-1 focus:ring-[#f9b03c] outline-none transition cursor-pointer"
              >
                {DEFAULT_COURSES.map((c, i) => (
                  <option key={i} value={c} className="bg-[#0d1222] text-white">
                    {c}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Action Row: Language Switch + Download Buttons */}
          <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-white/[0.08]">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-gray-400">የሰርተፍኬት ቋንቋ፡</span>
              <div className="flex bg-white/[0.05] p-1 rounded-xl border border-white/[0.08]">
                <button
                  onClick={() => setCertLanguage('en')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-black transition cursor-pointer ${
                    certLanguage === 'en' ? 'bg-[#f9b03c] text-black shadow-sm' : 'text-gray-400 hover:text-white'
                  }`}
                >
                  English
                </button>
                <button
                  onClick={() => setCertLanguage('am')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-black transition cursor-pointer ${
                    certLanguage === 'am' ? 'bg-[#f9b03c] text-black shadow-sm' : 'text-gray-400 hover:text-white'
                  }`}
                >
                  አማርኛ
                </button>
              </div>
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto">
              <button
                onClick={handlePrint}
                className="flex-1 sm:flex-none px-5 py-3 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] text-white border border-white/10 font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition cursor-pointer"
              >
                <i className="fa-solid fa-print"></i>
                <span>Print / PDF</span>
              </button>

              <button
                onClick={handleDownloadPNG}
                disabled={isGenerating}
                className="flex-1 sm:flex-none px-7 py-3 rounded-xl bg-[#f9b03c] hover:bg-[#ffbe53] text-black font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-[0_0_25px_rgba(249,176,60,0.4)] transition cursor-pointer disabled:opacity-50 active:scale-98"
              >
                {isGenerating ? (
                  <>
                    <i className="fa-solid fa-spinner fa-spin"></i>
                    <span>በማዘጋጀት ላይ...</span>
                  </>
                ) : (
                  <>
                    <i className="fa-solid fa-download"></i>
                    <span>Download High-Res PNG</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* =========================================================================
            ✨ LIVE PRINTABLE CERTIFICATE PREVIEW CONTAINER
            ========================================================================= */}
        <div ref={containerRef} className="w-full flex justify-center items-center overflow-hidden py-4">
          <div
            style={{
              width: '1123px',
              height: '794px',
              transform: `scale(${scale})`,
              transformOrigin: 'top center',
              marginBottom: scale < 1 ? `-${794 * (1 - scale)}px` : '0px',
            }}
          >
            {/* The Raw Printable Certificate (A4 Landscape 1123 x 794) */}
            <div
              ref={certRef}
              id="printable-certificate-node"
              className="w-[1123px] h-[794px] bg-[#ffffff] text-[#0f172a] relative select-none p-10 overflow-hidden shadow-2xl flex flex-col justify-between"
              style={{
                boxSizing: 'border-box',
                fontFamily: "'Montserrat', sans-serif",
                backgroundImage:
                  'radial-gradient(circle at 50% 50%, rgba(249, 176, 60, 0.04) 0%, rgba(50, 104, 186, 0.02) 60%, #ffffff 100%)',
              }}
            >
              {/* Outer Luxury Royal Blue Border */}
              <div className="absolute inset-4 border-[6px] border-[#3268ba] pointer-events-none rounded-sm"></div>

              {/* Inner Luxury Golden Yellow Border with Corner Ribbon Geometry */}
              <div className="absolute inset-7 border-[2px] border-[#f9b03c] pointer-events-none"></div>

              {/* Decorative Corner Ornaments */}
              <div className="absolute top-8 left-8 w-10 h-10 border-t-4 border-l-4 border-[#3268ba] pointer-events-none"></div>
              <div className="absolute top-8 right-8 w-10 h-10 border-t-4 border-r-4 border-[#3268ba] pointer-events-none"></div>
              <div className="absolute bottom-8 left-8 w-10 h-10 border-b-4 border-l-4 border-[#3268ba] pointer-events-none"></div>
              <div className="absolute bottom-8 right-8 w-10 h-10 border-b-4 border-r-4 border-[#3268ba] pointer-events-none"></div>

              {/* Subtle Guilloche Pattern Background */}
              <div className="absolute inset-10 opacity-[0.025] pointer-events-none bg-[radial-gradient(#3268ba_1px,transparent_1px)] [background-size:16px_16px]"></div>

              {/* SECTION 1: HEADER & LOGO */}
              <div className="relative z-10 text-center pt-2">
                <div className="flex items-center justify-center gap-3 mb-2">
                  <div className="w-12 h-12 rounded-xl bg-white p-1 shadow-md border border-gray-200 flex items-center justify-center">
                    <img src="/tc-logo.jpg" alt="Tsehay Campus" className="w-full h-full object-contain rounded-lg" />
                  </div>
                  <div className="text-left">
                    <span className="text-2xl font-black tracking-tight" style={{ fontFamily: "'Cinzel', serif" }}>
                      <span className="text-[#f9b03c]">TSEHAY</span> <span className="text-[#3268ba]">CAMPUS</span>
                    </span>
                    <p className="text-[9px] font-bold text-gray-500 tracking-[0.25em] uppercase -mt-1">
                      ACADEMY OF MODERN SKILLS
                    </p>
                  </div>
                </div>

                {/* Massive Elegant Title */}
                <h2
                  className="text-4xl font-black tracking-wider text-[#0f172a] uppercase mt-4 mb-1"
                  style={{ fontFamily: "'Cinzel', serif" }}
                >
                  {certLanguage === 'en' ? 'CERTIFICATE OF COMPLETION' : 'የማጠናቀቂያ የምስክር ወረቀት'}
                </h2>
                <div className="flex items-center justify-center gap-4 my-2">
                  <span className="w-20 h-[1.5px] bg-[#f9b03c]"></span>
                  <span className="text-xs font-bold uppercase tracking-[0.3em] text-[#3268ba]">
                    {certLanguage === 'en' ? 'PROUDLY PRESENTED TO' : 'ይህ የምስክር ወረቀት የተበረከተው ለ'}
                  </span>
                  <span className="w-20 h-[1.5px] bg-[#f9b03c]"></span>
                </div>
              </div>

              {/* SECTION 2: STUDENT NAME & RECOGNITION */}
              <div className="relative z-10 text-center my-auto py-2">
                {/* Dynamic Student Name */}
                <h3
                  className="text-5xl sm:text-6xl font-black text-[#1e293b] tracking-tight pb-2 border-b-2 border-[#f9b03c]/60 inline-block px-12 capitalize"
                  style={{ fontFamily: "'Playfair Display', serif" }}
                >
                  {studentName || 'Student Name'}
                </h3>

                {/* Achievement Subtext */}
                <p className="text-[15px] text-[#475569] max-w-2xl mx-auto mt-6 leading-relaxed font-normal">
                  {certLanguage === 'en' ? (
                    <>
                      for successfully completing all curriculum requirements, practical projects, and masterclass examinations for the comprehensive course in
                    </>
                  ) : (
                    <>
                      በፀሐይ ካምፓስ የተዘጋጀውን የተግባር ስልጠና እና ማጠቃለያ ፈተናዎችን በከፍተኛ ብቃት በማጠናቀቃቸው ይህ ይፋዊ ሰርተፍኬት ተበርክቶላቸዋል።
                    </>
                  )}
                </p>

                {/* Course Name Title */}
                <div className="mt-3">
                  <h4
                    className="text-2xl font-black text-[#3268ba] max-w-3xl mx-auto leading-snug"
                    style={{ fontFamily: "'Playfair Display', serif" }}
                  >
                    « {selectedCourse} »
                  </h4>
                </div>
              </div>

              {/* SECTION 3: SIGNATURE, SEAL & VERIFICATION DETAILS */}
              <div className="relative z-10 grid grid-cols-3 items-end pb-3 px-8 text-center">
                {/* Bottom Left: Eyoub Sahle Signature */}
                <div className="text-left">
                  <div className="h-14 flex items-end">
                    <span
                      className="text-4xl text-[#0f172a] font-normal"
                      style={{ fontFamily: "'Great Vibes', cursive", letterSpacing: '1px' }}
                    >
                      Eyoub Sahle
                    </span>
                  </div>
                  <div className="w-48 h-[2px] bg-[#3268ba] mb-1.5 mt-1"></div>
                  <p className="text-xs font-black text-[#0f172a] uppercase tracking-wider">EYOUB SAHLE</p>
                  <p className="text-[10px] text-gray-500 font-semibold">Founder & Lead Instructor</p>
                </div>

                {/* Center: Stylized Official Golden Seal of Excellence */}
                <div className="flex justify-center items-center">
                  <div className="relative w-28 h-28 flex items-center justify-center">
                    {/* Golden Starburst / Ribbon Stamp */}
                    <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-[#e59b20] via-[#f9b03c] to-[#ffcc66] p-1 shadow-xl flex items-center justify-center border-2 border-white">
                      <div className="w-full h-full rounded-full border-2 border-dashed border-[#855302] flex flex-col items-center justify-center text-center p-1 bg-[#f9b03c]">
                        <i className="fa-solid fa-award text-2xl text-[#683f00] mb-0.5"></i>
                        <span className="text-[8px] font-black text-[#4d2f00] tracking-widest uppercase leading-none">
                          OFFICIAL
                        </span>
                        <span className="text-[7px] font-black text-[#4d2f00] tracking-tighter uppercase leading-none">
                          SEAL OF MASTERY
                        </span>
                      </div>
                    </div>
                    {/* Seal Ribbons */}
                    <div className="absolute -bottom-2 w-8 h-4 bg-[#3268ba] -z-10 transform -rotate-12 rounded-xs"></div>
                    <div className="absolute -bottom-2 w-8 h-4 bg-[#3268ba] -z-10 transform rotate-12 rounded-xs"></div>
                  </div>
                </div>

                {/* Bottom Right: Date & Verification ID */}
                <div className="text-right">
                  <div className="h-14 flex flex-col justify-end text-right">
                    <p className="text-sm font-bold text-[#0f172a]">{issueDate}</p>
                    <div className="w-48 h-[2px] bg-[#3268ba] mb-1.5 mt-1 ml-auto"></div>
                  </div>
                  <p className="text-xs font-black text-[#0f172a] uppercase tracking-wider">ISSUE DATE</p>
                  <p className="text-[10px] text-[#3268ba] font-mono font-bold tracking-wider">ID: {certId}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
