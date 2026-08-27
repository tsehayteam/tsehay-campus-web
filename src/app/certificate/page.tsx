'use client';

import React, { useState, useRef, useEffect } from 'react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { useLanguage } from '@/context/LanguageContext';
import { useAuth } from '@/context/AuthContext';
import { db } from '@/lib/firebase/config';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';

const DEFAULT_COURSES = [
  'የዩቲዩብ ስኬት ሚስጥሮች (YouTube Secrets Masterclass)',
  'ዲጂታል ማርኬቲንግ ለጀማሪዎች (Digital Marketing Beginner)',
  'ፕሮፌሽናል ዲጂታል ማርኬቲንግ ማስተር ክላስ (Pro Digital Marketing)',
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
  const [isRenderingForDownload, setIsRenderingForDownload] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);
  
  // Database fields
  const [physicalCopyClaimed, setPhysicalCopyClaimed] = useState<boolean | null>(null);
  const [isClaimingInDb, setIsClaimingInDb] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const [scale, setScale] = useState(1);

  const certRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const courseKey = selectedCourse.slice(0, 20).replace(/[^a-zA-Z0-9_-]/g, '_');

  useEffect(() => {
    // Generate unique ID and formatted date on mount
    const randomHex = Math.random().toString(36).substring(2, 6).toUpperCase();
    const currentYear = new Date().getFullYear();
    setCertId(`TC-${currentYear}-${randomHex}`);

    const today = new Date();
    const options: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'long', day: 'numeric' };
    setIssueDate(today.toLocaleDateString('en-US', options));
  }, []);

  // Fetch claim state
  useEffect(() => {
    if (!user?.uid) return;

    const sessionDismiss = sessionStorage.getItem(`dismiss_cert_gen_${user.uid}`);
    if (sessionDismiss === 'true') {
      setIsDismissed(true);
    }

    const fetchCertStatus = async () => {
      try {
        const certDocRef = doc(db, 'artifacts', 'tsehaycampus-e1a6d', 'users', user.uid, 'certificates', courseKey);
        const docSnap = await getDoc(certDocRef);
        if (docSnap.exists()) {
          setPhysicalCopyClaimed(docSnap.data()?.physical_copy_claimed ?? false);
        } else {
          setPhysicalCopyClaimed(false);
        }
      } catch (err) {
        setPhysicalCopyClaimed(false);
      }
    };
    fetchCertStatus();
  }, [user?.uid, courseKey]);

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

  const recordDownloadInDb = async () => {
    if (!user?.uid) return;
    try {
      const certDocRef = doc(db, 'artifacts', 'tsehaycampus-e1a6d', 'users', user.uid, 'certificates', courseKey);
      await setDoc(certDocRef, {
        courseTitle: selectedCourse,
        studentName,
        certificate_downloaded: true,
        downloadedAt: serverTimestamp(),
        physical_copy_claimed: physicalCopyClaimed ?? false,
        updatedAt: serverTimestamp(),
      }, { merge: true });
    } catch (err) {
      console.error('Error tracking download action in DB:', err);
    }
  };

  const handleClaimPhysicalCopy = async () => {
    if (!user?.uid) {
      setPhysicalCopyClaimed(true);
      return;
    }
    setIsClaimingInDb(true);
    try {
      const certDocRef = doc(db, 'artifacts', 'tsehaycampus-e1a6d', 'users', user.uid, 'certificates', courseKey);
      await setDoc(certDocRef, {
        physical_copy_claimed: true,
        claimedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      }, { merge: true });
      setPhysicalCopyClaimed(true);
    } catch (err) {
      console.error('Error claiming physical copy:', err);
    } finally {
      setIsClaimingInDb(false);
    }
  };

  const handleDismissSession = () => {
    if (user?.uid) {
      sessionStorage.setItem(`dismiss_cert_gen_${user.uid}`, 'true');
    }
    setIsDismissed(true);
  };

  const handleDownloadPNG = async () => {
    if (!certRef.current) return;
    setIsGenerating(true);
    setIsRenderingForDownload(true);

    try {
      // Pause to remove placeholders from DOM before rasterizing canvas
      await new Promise((r) => setTimeout(r, 60));

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

      await recordDownloadInDb();
      setDownloadSuccess(true);
    } catch (error) {
      console.error('Error generating certificate PNG:', error);
      window.print();
      setDownloadSuccess(true);
    } finally {
      setIsRenderingForDownload(false);
      setIsGenerating(false);
    }
  };

  const handlePrint = () => {
    recordDownloadInDb();
    window.print();
    setDownloadSuccess(true);
  };

  return (
    <div className="min-h-screen bg-[#030509] text-white flex flex-col selection:bg-[#f9b03c]/30">
      {/* Google Fonts for prestigious Certificate Typography */}
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      <link
        href="https://fonts.googleapis.com/css2?family=Cinzel:wght@500;700;900&family=Playfair+Display:ital,wght@0,600;0,800;0,900;1,400;1,700&family=Montserrat:wght@400;600;700;900&display=swap"
        rel="stylesheet"
      />

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

        {/* PERSISTENT IN-PERSON STAMP POPUP / ALERT */}
        {physicalCopyClaimed === false && !isDismissed && (
          <div className="max-w-4xl mx-auto mb-8 bg-[#050811]/95 backdrop-blur-2xl border-2 border-[#f9b03c] rounded-3xl p-5 sm:p-7 shadow-[0_15px_40px_rgba(249,176,60,0.25)] relative overflow-hidden transition-all duration-300 animate-in fade-in slide-in-from-top-3">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-2xl bg-[#f9b03c]/20 text-[#f9b03c] border border-[#f9b03c]/40 flex items-center justify-center text-xl shrink-0 shadow-[0_0_15px_rgba(249,176,60,0.3)] mt-0.5">
                  <i className="fa-solid fa-stamp"></i>
                </div>
                <div className="space-y-1">
                  <h4 className="font-heading font-black text-sm sm:text-base text-white">
                    ማሳሰቢያ፦ የሰርተፍኬትዎን ኦሪጅናል ማህተም እና ፊርማ ለማስመታት፣ እባክዎ በአካል ቢሯችን ይምጡ።
                  </h4>
                  <p className="text-xs sm:text-sm text-slate-300 font-body leading-relaxed">
                    ይፋዊውን ማህተም እና ፊርማ በአካል ተገኝተው ካስመቱ በኋላ ሰርተፍኬትዎ ሙሉ በሙሉ ህጋዊ እና የተረጋገጠ ይሆናል።
                  </p>
                  <div className="pt-1">
                    <a href="tel:0980209090" className="inline-flex items-center gap-1.5 text-xs font-bold text-[#f9b03c] hover:underline">
                      <i className="fa-solid fa-phone"></i> ስልክ: 0980209090
                    </a>
                  </div>
                </div>
              </div>

              {/* Interactive Action Buttons */}
              <div className="flex flex-wrap sm:flex-nowrap items-center gap-2.5 w-full sm:w-auto shrink-0 pt-2 sm:pt-0">
                <button
                  onClick={handleClaimPhysicalCopy}
                  disabled={isClaimingInDb}
                  className="flex-1 sm:flex-none px-4 py-2.5 bg-[#f9b03c] hover:bg-[#ffbe53] text-black font-black text-xs sm:text-sm rounded-xl shadow-md transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {isClaimingInDb ? (
                    <>
                      <i className="fa-solid fa-spinner fa-spin"></i>
                      <span>በማረጋገጥ ላይ...</span>
                    </>
                  ) : (
                    <>
                      <i className="fa-solid fa-check-double"></i>
                      <span>ቢሮ መጥቼ ወስጃለሁ</span>
                    </>
                  )}
                </button>

                <button
                  onClick={handleDismissSession}
                  className="flex-1 sm:flex-none px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white font-bold text-xs sm:text-sm rounded-xl border border-white/10 transition flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <i className="fa-solid fa-clock"></i>
                  <span>በኋላ እመጣለሁ</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Generator Form Controls (Glassmorphic Box) */}
        <div className="bg-[#050811]/95 backdrop-blur-2xl border border-white/[0.1] rounded-3xl p-6 sm:p-8 mb-8 shadow-[0_20px_60px_rgba(0,0,0,0.7)] max-w-4xl mx-auto">
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
                placeholder="ለምሳሌ፡ Eyoub Sahle / ኢዮብ ሳህሌ"
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
                    <span>Generate & Download Certificate</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* IN-PERSON STAMP NOTIFICATION ALERT ON ACTION */}
        {downloadSuccess && (
          <div className="max-w-4xl mx-auto mb-10 bg-[#050811]/95 backdrop-blur-2xl border-2 border-[#f9b03c] rounded-3xl p-6 sm:p-7 shadow-[0_15px_50px_rgba(249,176,60,0.3)] animate-in fade-in slide-in-from-top-3 duration-300">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-[#f9b03c]/20 text-[#f9b03c] border border-[#f9b03c]/40 flex items-center justify-center text-xl shrink-0 shadow-[0_0_20px_rgba(249,176,60,0.35)]">
                <i className="fa-solid fa-circle-check"></i>
              </div>
              <div className="space-y-2 flex-1">
                <div className="flex items-center justify-between">
                  <h3 className="font-heading font-black text-lg sm:text-xl text-white">
                    እንኳን ደስ አለዎት! ሰርተፍኬትዎን በተሳካ ሁኔታ አውርደዋል።
                  </h3>
                  <button 
                    onClick={() => setDownloadSuccess(false)}
                    className="text-gray-400 hover:text-white text-xs px-2.5 py-1 rounded-lg bg-white/5"
                  >
                    <i className="fa-solid fa-xmark"></i>
                  </button>
                </div>
                <p className="text-sm sm:text-base text-slate-200 font-body leading-relaxed">
                  የሰርተፍኬትዎን ህጋዊነት ለማረጋገጥ እና ኦሪጅናል ማህተም እና ፊርማ ለማስመታት፣ እባክዎ በስልክ ቁጥር <span className="text-[#f9b03c] font-black underline font-mono text-base sm:text-lg">0980209090</span> በመደወል በአካል ቢሯችን ይምጡ።
                </p>
                <div className="pt-2 flex items-center gap-4 text-xs sm:text-sm font-bold text-[#f9b03c]">
                  <a href="tel:0980209090" className="inline-flex items-center gap-2 hover:underline">
                    <i className="fa-solid fa-phone"></i> ደውለው ቀጠሮ ይያዙ: 0980209090
                  </a>
                </div>
              </div>
            </div>
          </div>
        )}

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
                <div className="flex justify-center items-center mb-2">
                  <img 
                    src="/tc-logo.jpg" 
                    alt="Tsehay Campus Logo" 
                    className="h-12 w-auto object-contain rounded-xl p-0.5 bg-white border border-gray-200 shadow-md"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = '/logo.png';
                    }}
                  />
                </div>

                {/* Massive Elegant Title */}
                <h2
                  className="text-4xl font-black tracking-wider text-[#0f172a] uppercase mt-3 mb-1"
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

              {/* SECTION 3: PHYSICAL SIGNATURE & IN-PERSON STAMP DESIGNATED AREAS */}
              <div className="relative z-10 grid grid-cols-3 items-end pb-3 px-8 text-center">
                {/* Bottom Left: Blank Line for Official Physical Signature */}
                <div className="text-left">
                  <p className="text-xs font-black text-[#0f172a] uppercase tracking-wider">
                    የአሰልጣኝ ፊርማ (Signature)
                  </p>
                  <div className="h-10"></div>
                  <div className="w-48 h-[1.5px] bg-[#3268ba] mb-1.5 mt-1"></div>
                  {/* Instructor Name & Title Underneath Line - Always Visible in UI, Print, and PNG */}
                  <div className="space-y-0.5 mt-1">
                    <p className="text-sm font-black text-[#0f172a] font-heading tracking-wide leading-tight">
                      ኢዮብ ሳህሌ
                    </p>
                    <p className="text-[11px] font-bold text-[#3268ba] font-body leading-tight">
                      (መስራች)
                    </p>
                  </div>
                </div>

                {/* Center: Blank Designated Area for Official In-Person Stamp */}
                <div className="flex flex-col items-center justify-center min-h-[80px]">
                  {!isRenderingForDownload ? (
                    <div className="cert-stamp-box stamp-container-class flex flex-col items-center justify-center">
                      <div className="w-20 h-20 rounded-full border-2 border-dashed border-[#3268ba]/40 flex flex-col items-center justify-center p-1 bg-[#3268ba]/[0.02]">
                        <i className="fa-solid fa-stamp text-[#3268ba]/60 text-lg mb-0.5"></i>
                        <span className="text-[8px] font-black text-[#3268ba] uppercase tracking-tighter text-center leading-tight">ይፋዊ ማህተም</span>
                      </div>
                      <span className="text-[9px] text-gray-500 font-semibold mt-1">Official Stamp Area</span>
                    </div>
                  ) : (
                    <div className="w-20 h-20"></div>
                  )}
                </div>

                {/* Bottom Right: Date & Verification ID */}
                <div className="text-right">
                  <div className="h-12 flex flex-col justify-end text-right">
                    <p className="text-sm font-bold text-[#0f172a]">{issueDate}</p>
                    <div className="w-48 h-[1.5px] bg-[#3268ba] mb-1.5 mt-1 ml-auto"></div>
                  </div>
                  <p className="text-xs font-black text-[#0f172a] uppercase tracking-wider">የተሰጠበት ቀን (Issue Date)</p>
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
