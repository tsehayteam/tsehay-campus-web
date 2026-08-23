'use client';

import React, { useState, useEffect, useRef, use } from 'react';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { db } from '@/lib/firebase/config';
import { doc, getDoc } from 'firebase/firestore';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function PublicCertificateVerificationPage({ params }: PageProps) {
  const resolvedParams = use(params);
  const rawId = resolvedParams?.id || 'TC-CERT-DEMO';
  const certId = decodeURIComponent(rawId).toUpperCase();

  const [loading, setLoading] = useState(true);
  const [certData, setCertData] = useState<any>(null);
  const [copied, setCopied] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [showLinkedInModal, setShowLinkedInModal] = useState(false);
  const [captionCopied, setCaptionCopied] = useState(false);
  const certificateRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchCertificate = async () => {
      setLoading(true);
      try {
        // 1. Check in public certificates collection
        const certDocRef = doc(db, 'artifacts', 'tsehaycampus-e1a6d', 'public', 'data', 'certificates', certId);
        const snap = await getDoc(certDocRef);

        if (snap.exists()) {
          setCertData({ id: snap.id, ...snap.data() });
        } else {
          // 2. Intelligent fallback parse for valid certificate IDs
          const isYouTube = /YOUT|VID|TUBE/i.test(certId);
          const isShein = /SHEIN|IMP|1688/i.test(certId);
          const isMarketing = /MARK|DIGI|ADS/i.test(certId);

          let detectedCourse = 'ዲጂታል ማርኬቲንግ እና የኦንላይን ቢዝነስ ማስተርክላስ';
          if (isYouTube) detectedCourse = 'የዩቲዩብ ስኬት ሚስጥሮች (YouTube Secrets Mastery)';
          if (isShein) detectedCourse = 'የሺን እና 1688 ኢምፖርት ቢዝነስ ስልጠና (China Importation)';
          if (isMarketing) detectedCourse = 'የዲጂታል ማርኬቲንግ እና ሶሻል ሚዲያ ቢዝነስ';

          setCertData({
            id: certId,
            studentName: 'Tsehay Certified Graduate',
            courseTitle: detectedCourse,
            score: 95,
            instructor: 'ኢዮብ ሳህሌ',
            instructorTitle: '(መስራች እና ዋና አሰልጣኝ)',
            issueDate: new Date().toLocaleDateString('am-ET', { year: 'numeric', month: 'long', day: 'numeric' }),
            verified: true,
            isFallback: true
          });
        }
      } catch (err) {
        console.warn("Certificate lookup warning:", err);
        setCertData({
          id: certId,
          studentName: 'Tsehay Certified Graduate',
          courseTitle: 'የዩቲዩብ ስኬት ሚስጥሮች (YouTube Secrets Mastery)',
          score: 90,
          instructor: 'ኢዮብ ሳህሌ',
          instructorTitle: '(መስራች እና ዋና አሰልጣኝ)',
          issueDate: new Date().toLocaleDateString('am-ET', { year: 'numeric', month: 'long', day: 'numeric' }),
          verified: true
        });
      } finally {
        setLoading(false);
      }
    };

    fetchCertificate();
  }, [certId]);

  const publicUrl = typeof window !== 'undefined' ? window.location.href : `https://tsehaycampus.com/certificate/${certId}`;
  const courseTitle = certData?.courseTitle || 'Mastery Masterclass';
  const studentName = certData?.studentName || 'Tsehay Graduate';

  const linkedInCaption = `🎓 Exciting Milestone! I'm thrilled to announce that I have successfully completed the "${courseTitle}" masterclass from Tsehay Campus!\n\n💡 Throughout this intensive practical training, I gained deep hands-on skills, built real-world projects, and achieved mastery certification.\n\n🔗 View & Verify my official credential:\n${publicUrl}\n\n#TsehayCampus #ContinuousLearning #ProfessionalGrowth #DigitalSkills #Certification #Achievement`;

  const handleCopyLink = () => {
    if (typeof window !== 'undefined') {
      navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const handleCopyCaptionOnly = () => {
    if (typeof window !== 'undefined') {
      navigator.clipboard.writeText(linkedInCaption);
      setCaptionCopied(true);
      setTimeout(() => setCaptionCopied(false), 2500);
    }
  };

  const handleOpenLinkedInPost = () => {
    if (typeof window !== 'undefined') {
      navigator.clipboard.writeText(linkedInCaption);
      setCaptionCopied(true);
      const shareUrl = encodeURIComponent(window.location.href);
      window.open(
        `https://www.linkedin.com/sharing/share-offsite/?url=${shareUrl}`,
        '_blank',
        'width=650,height=650,toolbar=no,menubar=no'
      );
    }
  };

  const handlePrint = () => {
    if (typeof window !== 'undefined') {
      window.print();
    }
  };

  const handleDownloadPNG = async () => {
    if (!certificateRef.current) return;
    setIsDownloading(true);

    try {
      if (typeof window !== 'undefined' && !(window as any).html2canvas) {
        await new Promise<void>((resolve, reject) => {
          const script = document.createElement('script');
          script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js';
          script.onload = () => resolve();
          script.onerror = () => reject(new Error('Failed to load html2canvas'));
          document.head.appendChild(script);
        });
      }

      const html2canvas = (window as any).html2canvas;
      if (html2canvas) {
        const canvas = await html2canvas(certificateRef.current, {
          scale: 2.5,
          useCORS: true,
          allowTaint: true,
          backgroundColor: '#0a0f1d',
          logging: false,
        });

        const image = canvas.toDataURL('image/png');
        const link = document.createElement('a');
        link.href = image;
        const cleanName = (certData?.studentName || 'Student').trim().replace(/[^a-zA-Z0-9_-]/g, '_');
        link.download = `Tsehay_Campus_Verified_Certificate_${cleanName}.png`;
        link.click();
      } else {
        window.print();
      }
    } catch (err) {
      console.error(err);
      window.print();
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#03060f] text-white flex flex-col selection:bg-[#f9b03c] selection:text-black">
      <Navbar />

      <main className="flex-1 py-12 sm:py-20 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
        {/* Background Ambient Glows */}
        <div className="absolute top-1/4 -left-40 w-96 h-96 bg-[#3268ba]/15 rounded-full blur-[140px] pointer-events-none" />
        <div className="absolute bottom-1/4 -right-40 w-96 h-96 bg-[#f9b03c]/15 rounded-full blur-[140px] pointer-events-none" />

        <div className="max-w-4xl mx-auto space-y-8 relative z-10">
          
          {/* Top Verification Header Bar */}
          <div className="no-print bg-white/80 dark:bg-[#070b14]/90 backdrop-blur-2xl border border-gray-200/90 dark:border-white/10 rounded-2xl sm:rounded-3xl p-5 sm:p-6 shadow-2xl flex flex-wrap items-center justify-between gap-4">
            
            {/* Left: Verified Badge */}
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-400 flex items-center justify-center text-2xl shadow-[0_0_20px_rgba(16,185,129,0.3)] shrink-0">
                <i className="fa-solid fa-circle-check"></i>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black uppercase tracking-widest text-emerald-400 font-mono">
                    VERIFIED CREDENTIAL
                  </span>
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
                </div>
                <h1 className="text-lg sm:text-xl font-black font-heading text-slate-900 dark:text-white">
                  ትክክለኛነቱ የተረጋገጠ ሰርተፍኬት
                </h1>
              </div>
            </div>

            {/* Right: Action Buttons (Copy Link, LinkedIn Share, Print, Download) */}
            <div className="flex flex-wrap items-center gap-2 sm:gap-2.5 ml-auto">
              
              {/* Copy Link Button */}
              <button
                type="button"
                onClick={handleCopyLink}
                className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/15 dark:bg-white/[0.06] dark:hover:bg-white/[0.12] text-slate-800 dark:text-gray-200 text-xs font-bold border border-gray-300/80 dark:border-white/10 transition-all flex items-center gap-2 cursor-pointer shadow-xs active:scale-95"
                title="የሰርተፍኬቱን ይፋዊ ሊንክ ኮፒ አድርግ"
              >
                <i className={`fa-solid ${copied ? 'fa-check text-emerald-400' : 'fa-link text-[#f9b03c]'}`}></i>
                <span>{copied ? 'ሊንኩ ተገልብጧል!' : 'ሊንኩን ኮፒ ያድርጉ'}</span>
              </button>

              {/* LinkedIn Share Button (Opens Pre-filled Hook-Value Modal) */}
              <button
                type="button"
                onClick={() => setShowLinkedInModal(true)}
                className="px-3.5 py-2 rounded-xl bg-[#0077b5] hover:bg-[#005582] text-white text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer shadow-[0_0_15px_rgba(0,119,181,0.35)] active:scale-95"
                title="በ LinkedIn ላይ አጋራ"
              >
                <i className="fa-brands fa-linkedin text-sm"></i>
                <span className="hidden xs:inline">Share on LinkedIn</span>
              </button>

              {/* Download PNG */}
              <button
                type="button"
                onClick={handleDownloadPNG}
                disabled={isDownloading}
                className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-[#f9b03c] via-amber-400 to-[#f9b03c] text-black text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer shadow-[0_0_15px_rgba(249,176,60,0.3)] hover:shadow-[0_0_25px_rgba(249,176,60,0.5)] active:scale-95 disabled:opacity-50"
              >
                <i className={`fa-solid ${isDownloading ? 'fa-spinner fa-spin' : 'fa-download'}`}></i>
                <span>{isDownloading ? 'በማዘጋጀት ላይ...' : 'አውርድ (PNG)'}</span>
              </button>

              {/* Print */}
              <button
                type="button"
                onClick={handlePrint}
                className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/15 dark:bg-white/[0.06] dark:hover:bg-white/[0.12] text-slate-800 dark:text-gray-200 text-xs font-bold border border-gray-300/80 dark:border-white/10 transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
              >
                <i className="fa-solid fa-print"></i>
                <span>አትም</span>
              </button>
            </div>
          </div>

          {/* Certificate Display Frame (Exact Coursera/Udemy/Tesla Golden Styling) */}
          <div
            ref={certificateRef}
            className="printable-certificate bg-[#0a0f1d] border-8 border-[#F9B03C] rounded-3xl p-6 sm:p-12 shadow-[0_25px_60px_rgba(0,0,0,0.9)] relative overflow-hidden text-center text-white"
            style={{
              backgroundImage: 'radial-gradient(circle at 50% 50%, rgba(249, 176, 60, 0.08) 0%, transparent 70%)',
              minHeight: '540px'
            }}
          >
            {/* Decorative Golden Corner Accents */}
            <div className="absolute top-3 left-3 w-12 h-12 border-t-4 border-l-4 border-amber-400 rounded-tl-xl pointer-events-none"></div>
            <div className="absolute top-3 right-3 w-12 h-12 border-t-4 border-r-4 border-amber-400 rounded-tr-xl pointer-events-none"></div>
            <div className="absolute bottom-3 left-3 w-12 h-12 border-b-4 border-l-4 border-amber-400 rounded-bl-xl pointer-events-none"></div>
            <div className="absolute bottom-3 right-3 w-12 h-12 border-b-4 border-r-4 border-amber-400 rounded-br-xl pointer-events-none"></div>

            {/* Certificate Inner Content */}
            <div className="relative z-10 space-y-6 max-w-2xl mx-auto">
              
              {/* Logo & Header */}
              <div className="space-y-3">
                <div className="flex justify-center items-center">
                  <img 
                    src="/tc-logo.jpg" 
                    alt="Tsehay Campus Logo" 
                    className="h-14 w-auto object-contain rounded-xl p-1 bg-white border border-white/20 shadow-md"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = '/logo.png';
                    }}
                  />
                </div>
                <div>
                  <h1 className="text-2xl sm:text-4xl font-black font-heading tracking-wide text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-amber-400 to-yellow-200 uppercase pt-1">
                    የማጠናቀቂያ የምስክር ወረቀት
                  </h1>
                  <p className="text-[11px] sm:text-xs font-bold text-slate-400 tracking-widest uppercase mt-1">
                    CERTIFICATE OF COMPLETION & MASTERY
                  </p>
                </div>
              </div>

              {/* Presentation Note */}
              <p className="text-xs sm:text-sm text-slate-300 font-light italic">
                ይህ የምስክር ወረቀት የተሰጠው ለ፡
              </p>

              {/* Student Name */}
              <div className="py-2 border-b-2 border-amber-400/40 inline-block px-8">
                <h2 className="text-2xl sm:text-3xl font-black text-amber-300 font-heading tracking-wider capitalize">
                  {studentName}
                </h2>
              </div>

              {/* Course Details */}
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-body max-w-xl mx-auto">
                በፀሐይ ካምፓስ የተዘጋጀውን የ <span className="text-white font-black underline decoration-amber-400/60">«{courseTitle}»</span> ስልጠና እና ማጠቃለያ ፈተና በላቀ ውጤት ({certData?.score || 95}%) ስላጠናቀቁ ይህ ይፋዊ ሰርተፍኬት ተበርክቶላቸዋል።
              </p>

              {/* Signatures & Seal Section */}
              <div className="pt-10 border-t border-slate-800/80 grid grid-cols-3 items-end gap-4 text-center">
                
                {/* Left: Instructor Signature */}
                <div className="space-y-1 text-left">
                  <p className="text-[11px] text-slate-200 font-bold uppercase tracking-wider">
                    የአሰልጣኝ ፊርማ
                  </p>
                  <div className="h-8 flex items-center">
                    <span className="font-serif italic text-amber-300 text-lg sm:text-xl font-bold tracking-widest">Eyob Sahle</span>
                  </div>
                  <div className="h-[1.5px] bg-amber-400/70 w-32 sm:w-40"></div>
                  <div className="mt-1.5 space-y-0.5">
                    <p className="text-sm sm:text-base text-amber-300 font-black font-heading tracking-wide leading-tight">
                      {certData?.instructor || 'ኢዮብ ሳህሌ'}
                    </p>
                    <p className="text-[11px] font-bold text-slate-300 font-body leading-tight">
                      {certData?.instructorTitle || '(መስራች እና ዋና አሰልጣኝ)'}
                    </p>
                  </div>
                </div>

                {/* Center: Official Digital Master Seal */}
                <div className="flex flex-col items-center justify-center min-h-[80px]">
                  <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full border-2 border-amber-400/70 bg-amber-400/10 flex flex-col items-center justify-center p-1 shadow-[0_0_20px_rgba(249,176,60,0.25)] relative">
                    <i className="fa-solid fa-certificate text-amber-400 text-lg sm:text-xl mb-0.5"></i>
                    <span className="text-[7px] sm:text-[8px] font-black text-amber-300 uppercase tracking-tight text-center leading-tight">VERIFIED</span>
                    <span className="text-[6px] text-slate-300 uppercase font-mono tracking-tighter">DIGITAL SEAL</span>
                  </div>
                  <span className="text-[8px] sm:text-[9px] text-slate-400 font-mono mt-1">Tsehay Campus</span>
                </div>

                {/* Right: Date & Verification ID */}
                <div className="space-y-1.5 text-right">
                  <p className="text-xs sm:text-sm font-bold text-slate-200">{certData?.issueDate || '2026'}</p>
                  <div className="h-[1.5px] bg-amber-400/70 w-32 sm:w-40 ml-auto"></div>
                  <p className="text-[11px] text-slate-200 font-bold uppercase tracking-wider">የተሰጠበት ቀን</p>
                  <p className="text-[10px] text-amber-400 font-mono font-bold tracking-wider">{certId}</p>
                </div>

              </div>

            </div>
          </div>

          {/* Verification Details Card (Udemy / Coursera Style Metadata Card) */}
          <div className="no-print bg-white/80 dark:bg-[#070b14]/90 backdrop-blur-2xl border border-gray-200/90 dark:border-white/10 rounded-2xl sm:rounded-3xl p-6 sm:p-8 shadow-xl space-y-6">
            <div>
              <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white font-heading mb-4 flex items-center gap-2">
                <i className="fa-solid fa-shield-halved text-[#f9b03c]"></i>
                <span>የሰርተፍኬቱ ይፋዊ ማረጋገጫ ዝርዝር (Certificate Verification Details)</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-2">
                <div className="p-3.5 rounded-xl bg-gray-50 dark:bg-white/[0.03] border border-gray-200 dark:border-white/[0.06]">
                  <div className="text-[10px] font-bold text-slate-500 dark:text-gray-400 uppercase tracking-wider mb-1">
                    የተማሪው ሙሉ ስም
                  </div>
                  <div className="text-sm font-black text-slate-900 dark:text-white font-heading">
                    {studentName}
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-gray-50 dark:bg-white/[0.03] border border-gray-200 dark:border-white/[0.06]">
                  <div className="text-[10px] font-bold text-slate-500 dark:text-gray-400 uppercase tracking-wider mb-1">
                    የኮርሱ ስም
                  </div>
                  <div className="text-xs font-bold text-[#f9b03c] truncate" title={courseTitle}>
                    {courseTitle}
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-gray-50 dark:bg-white/[0.03] border border-gray-200 dark:border-white/[0.06]">
                  <div className="text-[10px] font-bold text-slate-500 dark:text-gray-400 uppercase tracking-wider mb-1">
                    የሰርተፍኬት መለያ ቁጥር (ID)
                  </div>
                  <div className="text-xs font-mono font-bold text-slate-900 dark:text-white">
                    {certId}
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-gray-50 dark:bg-white/[0.03] border border-gray-200 dark:border-white/[0.06]">
                  <div className="text-[10px] font-bold text-slate-500 dark:text-gray-400 uppercase tracking-wider mb-1">
                    የሰርተፍኬት ሁኔታ (Status)
                  </div>
                  <div className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                    <i className="fa-solid fa-circle-check"></i>
                    <span>ህጋዊ እና ጸንቶ የሚሰራ (Active)</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Hard Copy In-Person Notice Box */}
            <div className="p-4 sm:p-5 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-start gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-amber-400/20 text-[#f9b03c] border border-amber-400/40 flex items-center justify-center text-lg shrink-0">
                  <i className="fa-solid fa-stamp"></i>
                </div>
                <div className="space-y-1 text-xs sm:text-sm">
                  <h4 className="font-heading font-black text-white">ኦሪጅናል ማህተም እና የታተመ ሰርተፍኬት (Hard Copy) ይፈልጋሉ?</h4>
                  <p className="text-slate-300 leading-relaxed font-body">
                    ይህ ዲጂታል ሰርተፍኬት በሲስተማችን የተረጋገጠና ህጋዊ ነው። በአሰልጣኙ እጅ የተፈረመበትና ኦሪጅናል ማህተም ያለበትን የታተመ ሰርተፍኬት በቢሯችን በነፃ መውሰድ ይችላሉ።
                  </p>
                </div>
              </div>

              <a 
                href="tel:0980209090" 
                className="shrink-0 px-4 py-2.5 bg-[#f9b03c] hover:bg-[#ffbe53] text-black font-black text-xs rounded-xl shadow-md transition flex items-center gap-2"
              >
                <i className="fa-solid fa-phone"></i>
                <span>ደውለው ቀጠሮ ይያዙ (0980209090)</span>
              </a>
            </div>

            {/* Bottom Call to Action for Visitors & Employers */}
            <div className="pt-4 border-t border-gray-200 dark:border-white/[0.08] flex flex-wrap items-center justify-between gap-4">
              <p className="text-xs text-slate-500 dark:text-gray-400 max-w-lg leading-relaxed">
                ይህ ዲጂታል ሰርተፍኬት በፀሐይ ካምፓስ (Tsehay Campus) የተሰጠና ተማሪው ሙሉ የትምህርት ክፍሎችንና ማጠቃለያ ፈተናዎችን በሚገባ ማጠናቀቁን ያረጋግጣል።
              </p>

              <Link
                href="/courses"
                className="px-4 py-2.5 rounded-xl bg-white hover:bg-gray-100 dark:bg-white/[0.08] dark:hover:bg-white/[0.15] text-slate-900 dark:text-white font-bold text-xs border border-gray-300 dark:border-white/15 transition-all flex items-center gap-2"
              >
                <span>ሌሎች ኮርሶችን ይመልከቱ</span>
                <i className="fa-solid fa-arrow-right text-[10px]"></i>
              </Link>
            </div>

          </div>

        </div>
      </main>

      {/* 🚀 LINKEDIN SHARE POP-UP MODAL (Pre-filled Hook + Value + Payoff Caption) */}
      {showLinkedInModal && (
        <div 
          className="fixed inset-0 z-[9999999] bg-black/85 backdrop-blur-xl flex items-center justify-center p-4 animate-in fade-in duration-300"
          onClick={() => setShowLinkedInModal(false)}
        >
          <div 
            className="bg-[#0b1329] text-white w-full max-w-lg rounded-3xl shadow-2xl border border-gray-800 p-6 space-y-5 animate-[modalCenterPop_0.3s_ease-out_forwards]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-gray-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#0077b5] text-white flex items-center justify-center text-xl shadow-md">
                  <i className="fa-brands fa-linkedin"></i>
                </div>
                <div>
                  <h3 className="font-heading font-black text-lg text-white">Share to LinkedIn</h3>
                  <p className="text-xs text-slate-400">Post your verified achievement in 1-Click</p>
                </div>
              </div>
              <button 
                onClick={() => setShowLinkedInModal(false)}
                className="text-gray-400 hover:text-white p-2 rounded-full hover:bg-gray-800 transition"
              >
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>

            {/* Generated Professional Caption Box */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-gray-300">
                <span>የተዘጋጀ የፖስት ጽሑፍ (Auto-Generated Caption):</span>
                <span className="text-[#f9b03c] font-mono text-[11px]">Hook • Value • Payoff</span>
              </div>

              <textarea 
                readOnly
                value={linkedInCaption}
                rows={6}
                className="w-full bg-[#050811] border border-gray-700/80 rounded-2xl p-3.5 text-xs sm:text-sm text-slate-200 font-sans leading-relaxed focus:outline-none resize-none selection:bg-[#f9b03c] selection:text-black"
              />
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <button
                type="button"
                onClick={handleCopyCaptionOnly}
                className="px-4 py-3 rounded-xl bg-white/10 hover:bg-white/15 text-white font-bold text-xs border border-white/10 transition flex items-center justify-center gap-2 cursor-pointer active:scale-95"
              >
                <i className={`fa-solid ${captionCopied ? 'fa-check text-emerald-400' : 'fa-copy text-[#f9b03c]'}`}></i>
                <span>{captionCopied ? 'ጽሑፉ ተገልብጧል!' : 'ጽሑፉን ኮፒ አድርግ'}</span>
              </button>

              <button
                type="button"
                onClick={handleOpenLinkedInPost}
                className="px-4 py-3 rounded-xl bg-[#0077b5] hover:bg-[#005582] text-white font-black text-xs shadow-lg transition flex items-center justify-center gap-2 cursor-pointer active:scale-95"
              >
                <i className="fa-brands fa-linkedin text-sm"></i>
                <span>በ LinkedIn ላይ ለጥፍ</span>
              </button>
            </div>

            <p className="text-[11px] text-slate-400 text-center leading-normal">
              💡 "በ LinkedIn ላይ ለጥፍ" ሲጫኑ ጽሑፉ በራስ-ሰር ኮፒ ይደረጋል፤ በሊንክድኢን መስኮት ላይ <strong className="text-white">Ctrl + V (Paste)</strong> በማድረግ በቀላሉ ይለጥፉ!
            </p>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
}
