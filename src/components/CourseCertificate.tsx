'use client';
import React, { useRef } from 'react';

interface CourseCertificateProps {
  course: any;
  user: any;
  score?: number;
  issueDate?: string;
}

export default function CourseCertificate({ course, user, score = 90, issueDate }: CourseCertificateProps) {
  const certificateRef = useRef<HTMLDivElement>(null);
  const studentName = user?.displayName || user?.email?.split('@')[0] || 'Tsehay Student';
  const courseTitle = course?.title || 'ዲጂታል ማርኬቲንግ እና ኦንላይን ቢዝነስ';
  const formattedDate = issueDate || new Date().toLocaleDateString('am-ET', { year: 'numeric', month: 'long', day: 'numeric' });
  const certId = `TC-${course?.id ? course.id.slice(0, 4).toUpperCase() : 'CERT'}-${user?.uid ? user.uid.slice(0, 6).toUpperCase() : '894201'}`;

  const handlePrint = () => {
    window.print();
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
            <h4 className="font-heading font-black text-sm text-white">እውቅና ያለው ዲጂታል ሰርተፍኬት</h4>
            <p className="text-xs text-amber-400 font-bold">የሰርተፍኬት መለያ፡ {certId}</p>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <button
            onClick={handlePrint}
            className="flex-1 sm:flex-none px-6 py-2.5 bg-gradient-to-r from-amber-400 via-primary to-yellow-400 text-dark font-black text-xs sm:text-sm rounded-xl shadow-lg hover:scale-105 transition flex items-center justify-center gap-2 cursor-pointer"
          >
            <i className="fa-solid fa-print"></i>
            <span>ሰርተፍኬቱን አትም / Save as PDF</span>
          </button>
        </div>
      </div>

      {/* Printable Certificate Frame */}
      <div
        ref={certificateRef}
        className="printable-certificate bg-[#0a0f1d] border-8 border-[#F9B03C] rounded-3xl p-6 sm:p-12 shadow-2xl relative overflow-hidden text-center text-white"
        style={{
          backgroundImage: 'radial-gradient(circle at 50% 50%, rgba(249, 176, 60, 0.08) 0%, transparent 70%)',
          minHeight: '520px'
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
          <div className="space-y-2">
            <div className="flex justify-center items-center mb-1">
              <img 
                src="/tc-logo.jpg" 
                alt="Tsehay Campus Logo" 
                className="h-11 sm:h-12 w-auto object-contain rounded-xl p-0.5 bg-white border border-white/20 shadow-md"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = '/logo.png';
                }}
              />
            </div>
            <h1 className="text-2xl sm:text-4xl font-black font-heading tracking-wide text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-amber-400 to-yellow-200 uppercase pt-1">
              የማጠናቀቂያ የምስክር ወረቀት
            </h1>
            <p className="text-[11px] sm:text-xs font-bold text-slate-400 tracking-widest uppercase">
              CERTIFICATE OF COMPLETION & MASTERY
            </p>
          </div>

          {/* Presentation Note */}
          <p className="text-xs sm:text-sm text-slate-300 font-light italic">
            ይህ የምስክር ወረቀት የተሰጠው ለ፡
          </p>

          {/* Student Name */}
          <div className="py-2 border-b-2 border-amber-400/40 inline-block px-8">
            <h2 className="text-2xl sm:text-3xl font-black text-amber-300 font-heading tracking-wider">
              {studentName}
            </h2>
          </div>

          {/* Course Details */}
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-body max-w-xl mx-auto">
            በፀሐይ ካምፓስ የተዘጋጀውን የ <span className="text-white font-black underline decoration-amber-400/60">«{courseTitle}»</span> ስልጠና እና ማጠቃለያ ፈተና በላቀ ውጤት ({score}%) ስላጠናቀቁ ይህ ይፋዊ ሰርተፍኬት ተበርክቶላቸዋል።
          </p>

          {/* Signatures & Seal Section */}
          <div className="pt-8 border-t border-slate-800 grid grid-cols-3 items-center gap-4 text-center">
            
            {/* Instructor Signature */}
            <div className="space-y-1">
              <p className="text-sm sm:text-base font-serif italic text-amber-400 font-bold">Eyoub Sahle</p>
              <div className="h-0.5 bg-slate-700 w-24 mx-auto"></div>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">ኢዮብ ሳህሌ (መስራች)</p>
              <p className="text-[9px] text-slate-500">Tsehay Campus</p>
            </div>

            {/* Official Custom Stamp */}
            <div className="flex justify-center items-center">
              <img 
                src="/logo.png" 
                alt="Official Verified Stamp" 
                className="h-20 w-20 object-contain drop-shadow-[0_0_15px_rgba(249,176,60,0.45)]"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = '/tc-logo.jpg';
                }}
              />
            </div>

            {/* Issue Date & ID */}
            <div className="space-y-1">
              <p className="text-xs sm:text-sm font-bold text-slate-200">{formattedDate}</p>
              <div className="h-0.5 bg-slate-700 w-24 mx-auto"></div>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">የተሰጠበት ቀን</p>
              <p className="text-[9px] text-amber-400 font-mono font-bold">{certId}</p>
            </div>

          </div>

        </div>
      </div>
    </div>
  );
}
