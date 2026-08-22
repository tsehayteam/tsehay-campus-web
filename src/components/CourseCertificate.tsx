'use client';
import React, { useRef, useState } from 'react';

interface CourseCertificateProps {
  course: any;
  user: any;
  score?: number;
  issueDate?: string;
}

export default function CourseCertificate({ course, user, score = 90, issueDate }: CourseCertificateProps) {
  const certificateRef = useRef<HTMLDivElement>(null);
  const [downloadSuccess, setDownloadSuccess] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  const studentName = user?.displayName || user?.email?.split('@')[0] || 'Tsehay Student';
  const courseTitle = course?.title || 'ዲጂታል ማርኬቲንግ እና ኦንላይን ቢዝነስ';
  const formattedDate = issueDate || new Date().toLocaleDateString('am-ET', { year: 'numeric', month: 'long', day: 'numeric' });
  const certId = `TC-${course?.id ? course.id.slice(0, 4).toUpperCase() : 'CERT'}-${user?.uid ? user.uid.slice(0, 6).toUpperCase() : '894201'}`;

  const handlePrint = () => {
    window.print();
    setDownloadSuccess(true);
  };

  const handleDownloadPNG = async () => {
    if (!certificateRef.current) return;
    setIsGenerating(true);

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
        const cleanName = (studentName || 'Student').trim().replace(/[^a-zA-Z0-9_-]/g, '_');
        link.download = `Tsehay_Campus_Certificate_${cleanName}.png`;
        link.click();
      } else {
        window.print();
      }
      setDownloadSuccess(true);
    } catch (err) {
      console.error(err);
      window.print();
      setDownloadSuccess(true);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Top Action Bar */}
      <div className="no-print flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-900/90 border border-slate-800 p-4 rounded-2xl">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-400 text-dark flex items-center justify-center text-lg font-black shadow-md">
            <i className="fa-solid fa-award"></i>
          </div>
          <div>
            <h4 className="font-heading font-black text-sm text-white">እውቅና ያለው ይፋዊ ሰርተፍኬት</h4>
            <p className="text-xs text-amber-400 font-bold">የሰርተፍኬት መለያ፡ {certId}</p>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <button
            onClick={handlePrint}
            className="flex-1 sm:flex-none px-5 py-2.5 bg-white/10 hover:bg-white/20 text-white font-bold text-xs sm:text-sm rounded-xl transition flex items-center justify-center gap-2 cursor-pointer border border-white/10"
          >
            <i className="fa-solid fa-print"></i>
            <span>አትም / PDF</span>
          </button>

          <button
            onClick={handleDownloadPNG}
            disabled={isGenerating}
            className="flex-1 sm:flex-none px-6 py-2.5 bg-[#f9b03c] hover:bg-[#ffbe53] text-black font-black text-xs sm:text-sm rounded-xl shadow-lg hover:scale-105 transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {isGenerating ? (
              <>
                <i className="fa-solid fa-spinner fa-spin"></i>
                <span>በማዘጋጀት ላይ...</span>
              </>
            ) : (
              <>
                <i className="fa-solid fa-download"></i>
                <span>ሰርተፍኬቱን አውርድ (PNG)</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Printable Clean Official Certificate Frame */}
      <div
        ref={certificateRef}
        className="printable-certificate bg-[#0a0f1d] border-8 border-[#F9B03C] rounded-3xl p-6 sm:p-12 shadow-2xl relative overflow-hidden text-center text-white"
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
          
          {/* Logo & Header (Clean without divider line under logo) */}
          <div className="space-y-3">
            <div className="flex justify-center items-center">
              <img 
                src="/tc-logo.jpg" 
                alt="Tsehay Campus Logo" 
                className="h-12 w-auto object-contain rounded-xl p-0.5 bg-white border border-white/20 shadow-md"
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
            በፀሐይ ካምፓስ የተዘጋጀውን የ <span className="text-white font-black underline decoration-amber-400/60">«{courseTitle}»</span> ስልጠና እና ማጠቃለያ ፈተና በላቀ ውጤት ({score}%) ስላጠናቀቁ ይህ ይፋዊ ሰርተፍኬት ተበርክቶላቸዋል።
          </p>

          {/* Signatures & Seal Section (Ready for Physical Signature & Stamp) */}
          <div className="pt-10 border-t border-slate-800/80 grid grid-cols-3 items-end gap-4 text-center">
            
            {/* Left: Blank Line for Instructor Signature */}
            <div className="space-y-1.5 text-left">
              <div className="h-10"></div>
              <div className="h-[1.5px] bg-amber-400/70 w-32 sm:w-40"></div>
              <p className="text-[11px] text-slate-200 font-bold uppercase tracking-wider">የአሰልጣኙ ፊርማ</p>
              <p className="text-[10px] text-amber-400 font-semibold">ኢዮብ ሳህሌ (መስራች)</p>
            </div>

            {/* Center: Blank Designated Area for Official In-Person Stamp */}
            <div className="flex flex-col items-center justify-center">
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full border-2 border-dashed border-amber-400/40 flex flex-col items-center justify-center p-1 bg-white/[0.02]">
                <i className="fa-solid fa-stamp text-amber-400/60 text-base mb-0.5"></i>
                <span className="text-[8px] font-bold text-slate-400 uppercase tracking-tighter text-center leading-tight">ይፋዊ ማህተም</span>
              </div>
              <span className="text-[9px] text-slate-400 font-medium mt-1">Official Stamp</span>
            </div>

            {/* Right: Date & Verification ID */}
            <div className="space-y-1.5 text-right">
              <p className="text-xs sm:text-sm font-bold text-slate-200">{formattedDate}</p>
              <div className="h-[1.5px] bg-amber-400/70 w-32 sm:w-40 ml-auto"></div>
              <p className="text-[11px] text-slate-200 font-bold uppercase tracking-wider">የተሰጠበት ቀን</p>
              <p className="text-[9px] text-amber-400 font-mono font-bold">{certId}</p>
            </div>

          </div>

        </div>
      </div>

      {/* NEW FEATURE: In-Person Stamp & Physical Signature Notification Alert */}
      {downloadSuccess && (
        <div className="no-print bg-[#050811]/95 backdrop-blur-2xl border-2 border-[#f9b03c] rounded-2xl p-5 sm:p-6 shadow-[0_15px_40px_rgba(249,176,60,0.25)] animate-in fade-in slide-in-from-top-3 duration-300">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-[#f9b03c]/20 text-[#f9b03c] border border-[#f9b03c]/40 flex items-center justify-center text-xl shrink-0 shadow-[0_0_15px_rgba(249,176,60,0.3)]">
              <i className="fa-solid fa-circle-check"></i>
            </div>
            <div className="space-y-2 flex-1">
              <div className="flex items-center justify-between">
                <h4 className="font-heading font-black text-base sm:text-lg text-white">
                  እንኳን ደስ አለዎት! ሰርተፍኬትዎን በተሳካ ሁኔታ አውርደዋል።
                </h4>
                <button 
                  onClick={() => setDownloadSuccess(false)}
                  className="text-gray-400 hover:text-white text-xs px-2 py-1 rounded-lg bg-white/5"
                >
                  <i className="fa-solid fa-xmark"></i>
                </button>
              </div>
              <p className="text-xs sm:text-sm text-slate-200 font-body leading-relaxed">
                የሰርተፍኬትዎን ህጋዊነት ለማረጋገጥ እና ኦሪጅናል ማህተም እና ፊርማ ለማስመታት፣ እባክዎ በስልክ ቁጥር <span className="text-[#f9b03c] font-black underline font-mono">0980209090</span> በመደወል በአካል ቢሯችን ይምጡ።
              </p>
              <div className="pt-2 flex items-center gap-4 text-xs font-bold text-[#f9b03c]">
                <a href="tel:0980209090" className="inline-flex items-center gap-1.5 hover:underline">
                  <i className="fa-solid fa-phone"></i> ደውለው ቀጠሮ ይያዙ: 0980209090
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
