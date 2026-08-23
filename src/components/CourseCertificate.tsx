'use client';
import React, { useRef, useState, useEffect } from 'react';
import { db } from '@/lib/firebase/config';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';

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
  const [isRenderingForDownload, setIsRenderingForDownload] = useState(false);
  
  // Database fields
  const [physicalCopyClaimed, setPhysicalCopyClaimed] = useState<boolean | null>(null);
  const [isClaimingInDb, setIsClaimingInDb] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);

  // LinkedIn Share Modal States
  const [showLinkedInModal, setShowLinkedInModal] = useState(false);
  const [captionCopied, setCaptionCopied] = useState(false);

  const courseId = course?.id || 'default_course';
  const studentName = user?.displayName || user?.email?.split('@')[0] || 'Tsehay Student';
  const courseTitle = course?.title || 'ዲጂታል ማርኬቲንግ እና ኦንላይን ቢዝነስ';
  const formattedDate = issueDate || new Date().toLocaleDateString('am-ET', { year: 'numeric', month: 'long', day: 'numeric' });
  const certId = `TC-${course?.id ? course.id.slice(0, 4).toUpperCase() : 'CERT'}-${user?.uid ? user.uid.slice(0, 6).toUpperCase() : '894201'}`;

  // Fetch certificate status from Firestore & sync to public verification collection
  useEffect(() => {
    if (!user?.uid || !courseId) return;

    // Check session dismissal
    const sessionDismiss = sessionStorage.getItem(`dismiss_cert_claim_${courseId}`);
    if (sessionDismiss === 'true') {
      setIsDismissed(true);
    }

    const fetchCertData = async () => {
      try {
        const certDocRef = doc(db, 'artifacts', 'tsehaycampus-e1a6d', 'users', user.uid, 'certificates', courseId);
        const docSnap = await getDoc(certDocRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          setPhysicalCopyClaimed(data.physical_copy_claimed ?? false);
        } else {
          setPhysicalCopyClaimed(false);
        }

        // Also publish to public certificates collection for public verification
        const publicCertRef = doc(db, 'artifacts', 'tsehaycampus-e1a6d', 'public', 'data', 'certificates', certId);
        await setDoc(publicCertRef, {
          certId,
          studentName,
          studentEmail: user?.email || '',
          userId: user?.uid,
          courseId,
          courseTitle,
          instructor: course?.instructor || 'ኢዮብ ሳህሌ',
          instructorTitle: course?.instructorTitle || '(መስራች እና ዋና አሰልጣኝ)',
          issueDate: formattedDate,
          score,
          verified: true,
          updatedAt: serverTimestamp()
        }, { merge: true });
      } catch (err) {
        console.error('Error loading certificate claim state:', err);
        setPhysicalCopyClaimed(false);
      }
    };

    fetchCertData();
  }, [user?.uid, courseId, certId, studentName, courseTitle, formattedDate, score]);

  const publicUrl = typeof window !== 'undefined' ? `${window.location.origin}/certificate/${certId}` : `https://tsehaycampus.com/certificate/${certId}`;

  const linkedInCaption = `🎓 Exciting Milestone! I'm thrilled to announce that I have successfully completed the "${courseTitle}" masterclass from Tsehay Campus!\n\n💡 Throughout this intensive practical training, I gained deep hands-on skills, built real-world projects, and achieved mastery certification.\n\n🔗 View & Verify my official credential:\n${publicUrl}\n\n#TsehayCampus #ContinuousLearning #ProfessionalGrowth #DigitalSkills #Certification #Achievement`;

  const handleCopyPublicLink = () => {
    if (typeof window !== 'undefined') {
      navigator.clipboard.writeText(publicUrl);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2500);
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
      // Auto copy caption to clipboard so user can just paste into LinkedIn
      navigator.clipboard.writeText(linkedInCaption);
      setCaptionCopied(true);
      
      const shareUrl = encodeURIComponent(publicUrl);
      window.open(
        `https://www.linkedin.com/sharing/share-offsite/?url=${shareUrl}`,
        '_blank',
        'width=650,height=650,toolbar=no,menubar=no'
      );
    }
  };

  // Record download / print action in database
  const recordDownloadInDb = async () => {
    if (!user?.uid || !courseId) return;
    try {
      const certDocRef = doc(db, 'artifacts', 'tsehaycampus-e1a6d', 'users', user.uid, 'certificates', courseId);
      await setDoc(certDocRef, {
        courseId,
        courseTitle,
        certificate_downloaded: true,
        downloadedAt: serverTimestamp(),
        physical_copy_claimed: physicalCopyClaimed ?? false,
        score,
        updatedAt: serverTimestamp(),
      }, { merge: true });
    } catch (err) {
      console.error('Error saving certificate download action to firestore:', err);
    }
  };

  // Claim physical copy button handler
  const handleClaimPhysicalCopy = async () => {
    if (!user?.uid || !courseId) return;
    setIsClaimingInDb(true);
    try {
      const certDocRef = doc(db, 'artifacts', 'tsehaycampus-e1a6d', 'users', user.uid, 'certificates', courseId);
      await setDoc(certDocRef, {
        physical_copy_claimed: true,
        claimedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      }, { merge: true });
      setPhysicalCopyClaimed(true);
    } catch (err) {
      console.error('Error updating physical copy claimed status:', err);
    } finally {
      setIsClaimingInDb(false);
    }
  };

  const handleDismissSession = () => {
    sessionStorage.setItem(`dismiss_cert_claim_${courseId}`, 'true');
    setIsDismissed(true);
  };

  const handlePrint = () => {
    recordDownloadInDb();
    window.print();
    setDownloadSuccess(true);
  };

  const handleDownloadPNG = async () => {
    if (!certificateRef.current) return;
    setIsGenerating(true);
    setIsRenderingForDownload(true);

    try {
      await new Promise((r) => setTimeout(r, 60));

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
      
      await recordDownloadInDb();
      setDownloadSuccess(true);
    } catch (err) {
      console.error(err);
      window.print();
    } finally {
      setIsGenerating(false);
      setIsRenderingForDownload(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto p-4 sm:p-6">
      
      {/* Top Action Bar with Copy Link & LinkedIn Share */}
      <div className="no-print flex flex-col md:flex-row items-center justify-between gap-4 bg-slate-900/90 border border-slate-800 p-4 sm:p-5 rounded-2xl sm:rounded-3xl shadow-xl backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#f9b03c] text-dark flex items-center justify-center text-lg font-black shadow-[0_0_15px_rgba(249,176,60,0.4)]">
            <i className="fa-solid fa-award"></i>
          </div>
          <div>
            <h4 className="font-heading font-black text-sm text-white">እውቅና ያለው ይፋዊ ሰርተፍኬት</h4>
            <p className="text-xs text-[#f9b03c] font-bold font-mono">የሰርተፍኬት መለያ፡ {certId}</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:gap-2.5 w-full md:w-auto">
          {/* Glassmorphism Copy Link Button */}
          <button
            type="button"
            onClick={handleCopyPublicLink}
            className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/15 dark:bg-white/[0.06] dark:hover:bg-white/[0.12] text-white text-xs font-bold border border-white/10 transition-all flex items-center gap-2 cursor-pointer shadow-xs active:scale-95"
            title="ይፋዊውን የሰርተፍኬት ማረጋገጫ ሊንክ ኮፒ አድርግ"
          >
            <i className={`fa-solid ${linkCopied ? 'fa-check text-emerald-400' : 'fa-link text-[#f9b03c]'}`}></i>
            <span>{linkCopied ? 'ሊንኩ ተገልብጧል!' : 'ሊንኩን ኮፒ ያድርጉ'}</span>
          </button>

          {/* Share to LinkedIn (Opens Modal with Pre-filled Hook-Value Caption) */}
          <button
            type="button"
            onClick={() => setShowLinkedInModal(true)}
            className="px-3.5 py-2 rounded-xl bg-[#0077b5] hover:bg-[#005582] text-white text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer shadow-[0_0_15px_rgba(0,119,181,0.3)] active:scale-95"
            title="በ LinkedIn ላይ አጋራ"
          >
            <i className="fa-brands fa-linkedin text-sm"></i>
            <span>Share on LinkedIn</span>
          </button>

          {/* Print / PDF */}
          <button
            type="button"
            onClick={handlePrint}
            className="px-3.5 py-2 bg-white/10 hover:bg-white/20 text-white font-bold text-xs rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer border border-white/10 active:scale-95"
          >
            <i className="fa-solid fa-print"></i>
            <span>አትም</span>
          </button>

          {/* Download PNG */}
          <button
            type="button"
            onClick={handleDownloadPNG}
            disabled={isGenerating}
            className="px-4 py-2 bg-gradient-to-r from-[#f9b03c] via-amber-400 to-[#f9b03c] hover:brightness-110 text-black font-black text-xs rounded-xl shadow-lg transition flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 disabled:opacity-50"
          >
            {isGenerating ? (
              <>
                <i className="fa-solid fa-spinner fa-spin"></i>
                <span>በማዘጋጀት ላይ...</span>
              </>
            ) : (
              <>
                <i className="fa-solid fa-download"></i>
                <span>አውርድ (PNG)</span>
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
          
          {/* Logo & Header */}
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
                  {course?.instructor || 'ኢዮብ ሳህሌ'}
                </p>
                <p className="text-[11px] font-bold text-slate-300 font-body leading-tight">
                  {course?.instructorTitle || '(መስራች እና ዋና አሰልጣኝ)'}
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
              <p className="text-xs sm:text-sm font-bold text-slate-200">{formattedDate}</p>
              <div className="h-[1.5px] bg-amber-400/70 w-32 sm:w-40 ml-auto"></div>
              <p className="text-[11px] text-slate-200 font-bold uppercase tracking-wider">የተሰጠበት ቀን</p>
              <p className="text-[9px] text-amber-400 font-mono font-bold">{certId}</p>
            </div>

          </div>

        </div>
      </div>

      {/* Official Hard Copy Claim & Verification Notice Box */}
      <div className="no-print bg-[#050811]/90 backdrop-blur-2xl border border-amber-400/30 rounded-2xl sm:rounded-3xl p-5 sm:p-6 shadow-xl">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-[#f9b03c]/20 text-[#f9b03c] border border-[#f9b03c]/40 flex items-center justify-center text-xl shrink-0 shadow-[0_0_15px_rgba(249,176,60,0.25)]">
              <i className="fa-solid fa-stamp"></i>
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-400/20 text-[#f9b03c] border border-amber-400/40 uppercase tracking-wider">
                  ይፋዊ የምስክር ወረቀት
                </span>
                <span className="text-xs text-emerald-400 font-mono font-bold">● 100% Verifiable Online</span>
              </div>
              <h4 className="font-heading font-black text-base sm:text-lg text-white">
                ኦሪጅናል ማህተም የተመታበት የታተመ ሰርተፍኬት (Hard Copy) መውሰድ ይፈልጋሉ?
              </h4>
              <p className="text-xs sm:text-sm text-slate-300 font-body leading-relaxed max-w-2xl">
                ይህ ዲጂታል ሰርተፍኬት በሲስተማችን የተረጋገጠና ህጋዊ ነው። በአሰልጣኙ እጅ የተፈረመበትንና ኦሪጅናል ማህተም ያለበትን የታተመ ሰርተፍኬት በቢሯችን በነፃ መውሰድ ይችላሉ።
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0 w-full sm:w-auto pt-2 sm:pt-0">
            <a 
              href="tel:0980209090" 
              className="w-full sm:w-auto px-4 py-2.5 bg-[#f9b03c] hover:bg-[#ffbe53] text-black font-black text-xs sm:text-sm rounded-xl shadow-md transition flex items-center justify-center gap-2"
            >
              <i className="fa-solid fa-phone"></i>
              <span>ደውለው ቀጠሮ ይያዙ (0980209090)</span>
            </a>
          </div>
        </div>
      </div>

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

    </div>
  );
}
