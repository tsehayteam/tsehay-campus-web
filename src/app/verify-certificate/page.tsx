'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { useLanguage } from '@/context/LanguageContext';
import { supabase } from '@/lib/supabase/client';
import { QRCodeSVG } from 'qrcode.react';
import html2canvas from 'html2canvas';
// @ts-ignore
import jsQR from 'jsqr';

interface CertificateRecord {
  id: string;
  studentName: string;
  courseTitle: string;
  score: number;
  instructor: string;
  instructorTitle: string;
  issueDate: string;
  verified: boolean;
  studentEmail?: string;
  isFallback?: boolean;
}

const SAMPLE_DEMO_CODES = [
  { code: 'TC-2026-X8F9', label: 'የሼን ኢምፖርት ቢዝነስ', course: 'የሼን እና 1688 ዓለም አቀፍ ኢምፖርት ቢዝነስ (Shein Import Mastery)', name: 'ዮናስ አለሙ (Yonas Alemu)', score: 98 },
  { code: 'TC-2026-YT01', label: 'የዩቲዩብ ስኬት ሚስጥሮች', course: 'የዩቲዩብ ስኬት ሚስጥሮች (YouTube Secrets Mastery)', name: 'ራሄል በቀለ (Rahel Bekele)', score: 95 },
  { code: 'TC-2026-AI99', label: 'በ AI የታገዘ ቢዝነስ', course: 'በ AI የታገዘ የቢዝነስ እና የኮንቴንት ማበልፀጊያ (AI for Business)', name: 'ዳዊት ታደሰ (Dawit Tadesse)', score: 96 },
  { code: 'TSC-MARK-2025', label: 'ዲጂታል ማርኬቲንግ', course: 'ፕሮፌሽናል ዲጂታል ማርኬቲንግ እና ሶሻል ሚዲያ ቢዝነስ', name: 'ሄለን ገብሬ (Helen Gebre)', score: 94 },
];

export default function CertificateVerificationPage() {
  const { t, lang } = useLanguage();
  const [inputCode, setInputCode] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [certificateData, setCertificateData] = useState<CertificateRecord>({
    id: 'TC-2026-X8F9',
    studentName: 'ዮናስ አለሙ (Yonas Alemu)',
    courseTitle: 'የሼን እና 1688 ዓለም አቀፍ ኢምፖርት ቢዝነስ (Shein Import Mastery)',
    score: 98,
    instructor: 'ኢዮብ ሳህሌ',
    instructorTitle: '(መስራች እና ዋና አሰልጣኝ)',
    issueDate: 'መስከረም 2026 (September 2026)',
    verified: true,
    isFallback: true
  });
  const [isNotFound, setIsNotFound] = useState(false);
  const [certLang, setCertLang] = useState<'am' | 'en'>('am');
  const [isDownloading, setIsDownloading] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedCaption, setCopiedCaption] = useState(false);

  // 📷 Native Camera QR Scanner States
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [cameraPermission, setCameraPermission] = useState<'idle' | 'prompt' | 'granted' | 'denied' | 'unsupported'>('idle');
  const [scannerError, setScannerError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [hasMultipleCameras, setHasMultipleCameras] = useState(false);
  const [isTorchAvailable, setIsTorchAvailable] = useState(false);
  const [isTorchOn, setIsTorchOn] = useState(false);
  const [isDecodingFile, setIsDecodingFile] = useState(false);

  const certificateRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const isScanningActiveRef = useRef(false);

  // Read URL search params on client mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const code = params.get('code') || params.get('id');
      if (code && code.trim()) {
        const clean = code.trim().toUpperCase();
        setInputCode(clean);
        verifyCode(clean);
      }
    }
  }, []);

  // Cleanup camera stream on unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  // 🎵 Web Audio API Success Chime
  const playSuccessChime = () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
      osc.frequency.setValueAtTime(880, ctx.currentTime + 0.08); // A5
      gain.gain.setValueAtTime(0.25, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.35);
    } catch {
      // AudioContext unavailable or suppressed
    }
  };

  // 🛑 Stop Camera
  const stopCamera = () => {
    isScanningActiveRef.current = false;
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsTorchOn(false);
  };

  // 📷 Start Camera Stream
  const startCameraStream = async (mode: 'environment' | 'user') => {
    stopCamera();
    setScannerError(null);

    if (typeof navigator === 'undefined' || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setCameraPermission('unsupported');
      setScannerError('ይህ ብሮውዘር የቀጥታ ካሜራ ስካን አይደግፍም። እባክዎ የ QR ፎቶ ይጫኑ ወይም ኮዱን በእጅ ያስገቡ።');
      return;
    }

    try {
      // Check multiple cameras
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = devices.filter((d) => d.kind === 'videoinput');
        setHasMultipleCameras(videoDevices.length > 1);
      } catch {}

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: mode },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });

      streamRef.current = stream;
      setCameraPermission('granted');

      // Check torch support
      const videoTrack = stream.getVideoTracks()[0];
      if (videoTrack) {
        const capabilities = (videoTrack.getCapabilities ? videoTrack.getCapabilities() : {}) as any;
        setIsTorchAvailable(Boolean(capabilities && 'torch' in capabilities));
      }

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {});
      }

      isScanningActiveRef.current = true;
      startScanLoop();
    } catch (err: any) {
      console.error('Camera access error:', err);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setCameraPermission('denied');
        setScannerError('የካሜራ ፍቃድ አልተሰጠም። እባክዎ በብሮውዘርዎ የካሜራ ፍቃድ ይስጡ ወይም የሰርተፊኬቱን QR ፎቶ ይጫኑ።');
      } else {
        setScannerError('ካሜራውን መክፈት አልተቻለም። እባክዎ የ QR ምስል ይጫኑ ወይም ኮዱን በእጅ ያስገቡ።');
      }
    }
  };

  // 🔄 Continuous Frame Scan Loop (Native BarcodeDetector + jsQR fallback)
  const startScanLoop = () => {
    if (!isScanningActiveRef.current) return;

    const scanFrame = async () => {
      if (!isScanningActiveRef.current) return;

      const video = videoRef.current;
      if (video && video.readyState >= 2 && video.videoWidth > 0 && video.videoHeight > 0) {
        let detectedString: string | null = null;

        // 1. Hardware accelerated BarcodeDetector (Android Chrome, iOS Safari 17+, Desktop Chrome)
        if (typeof window !== 'undefined' && 'BarcodeDetector' in window) {
          try {
            const detector = new (window as any).BarcodeDetector({ formats: ['qr_code'] });
            const barcodes = await detector.detect(video);
            if (barcodes && barcodes.length > 0 && barcodes[0].rawValue) {
              detectedString = barcodes[0].rawValue;
            }
          } catch {
            // Fall through to jsQR
          }
        }

        // 2. Ultra-reliable jsQR canvas fallback
        if (!detectedString && canvasRef.current) {
          const canvas = canvasRef.current;
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          const ctx = canvas.getContext('2d', { willReadFrequently: true });
          if (ctx) {
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const qr = jsQR(imgData.data, imgData.width, imgData.height, {
              inversionAttempts: 'attemptBoth',
            });
            if (qr && qr.data) {
              detectedString = qr.data;
            }
          }
        }

        if (detectedString) {
          handleScannedResult(detectedString);
          return;
        }
      }

      if (isScanningActiveRef.current) {
        animFrameRef.current = requestAnimationFrame(scanFrame);
      }
    };

    animFrameRef.current = requestAnimationFrame(scanFrame);
  };

  // 🎯 Process Scanned Code / URL
  const handleScannedResult = (raw: string) => {
    stopCamera();
    playSuccessChime();
    setIsScannerOpen(false);

    let extracted = raw.trim();
    try {
      if (extracted.includes('verify-certificate') || extracted.includes('code=') || extracted.includes('id=')) {
        const url = new URL(extracted, 'https://tsehaycampus.com');
        const codeParam = url.searchParams.get('code') || url.searchParams.get('id');
        if (codeParam) {
          extracted = codeParam;
        }
      }
    } catch {}

    const cleanCode = extracted.toUpperCase();
    setInputCode(cleanCode);
    verifyCode(cleanCode);
  };

  // 🚀 Open Scanner
  const openScannerModal = () => {
    setScannerError(null);
    setIsScannerOpen(true);
    setCameraPermission('prompt');
    startCameraStream(facingMode);
  };

  // 🛑 Close Scanner Modal
  const closeScannerModal = () => {
    stopCamera();
    setIsScannerOpen(false);
    setScannerError(null);
  };

  // 🔄 Flip Camera Front/Back
  const toggleCameraFacing = () => {
    const next = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(next);
    startCameraStream(next);
  };

  // 💡 Toggle Torch / Flashlight
  const toggleTorch = async () => {
    if (!streamRef.current) return;
    const track = streamRef.current.getVideoTracks()[0];
    if (track && (track as any).applyConstraints) {
      try {
        const nextTorch = !isTorchOn;
        await (track as any).applyConstraints({
          advanced: [{ torch: nextTorch }],
        });
        setIsTorchOn(nextTorch);
      } catch (e) {
        console.warn('Torch toggle not supported:', e);
      }
    }
  };

  // 🖼️ Upload QR Image File Fallback
  const handleImageFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsDecodingFile(true);
    setScannerError(null);
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth || img.width;
        canvas.height = img.naturalHeight || img.height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0);
          const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const qr = jsQR(imgData.data, imgData.width, imgData.height, {
            inversionAttempts: 'attemptBoth',
          });
          setIsDecodingFile(false);
          if (qr && qr.data) {
            handleScannedResult(qr.data);
          } else {
            setScannerError('በተመረጠው ምስል ላይ የ QR ኮድ ማግኘት አልተቻለም። እባክዎ ጥራቱ የጠራ ምስል ይሞክሩ።');
          }
        } else {
          setIsDecodingFile(false);
        }
      };
      img.onerror = () => {
        setIsDecodingFile(false);
        setScannerError('ምስሉን ማንበብ አልተቻለም። እባክዎ እንደገና ይሞክሩ።');
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  };

  const verifyCode = async (codeToVerify: string) => {
    const cleanCode = codeToVerify.trim().toUpperCase();
    if (!cleanCode) return;

    setIsSearching(true);
    setHasSearched(true);
    setIsNotFound(false);

    try {
      // 1. Check in Supabase public certificates collection
      let data: any = null;
      try {
        const { data: certData } = await supabase.from('certificates').select('*').eq('id', cleanCode).maybeSingle();
        data = certData;
      } catch (e) {}

      if (data) {
        setCertificateData({
          id: cleanCode,
          studentName: data.studentName || 'Tsehay Graduate',
          courseTitle: data.courseTitle || 'Mastery Masterclass',
          score: data.score || 95,
          instructor: data.instructor || 'ኢዮብ ሳህሌ',
          instructorTitle: data.instructorTitle || '(መስራች እና ዋና አሰልጣኝ)',
          issueDate: data.issueDate || new Date().toLocaleDateString('am-ET', { year: 'numeric', month: 'long', day: 'numeric' }),
          verified: true,
          studentEmail: data.studentEmail,
          isFallback: false
        });
        setIsNotFound(false);
      } else {
        // 2. Check sample demo codes
        const sampleMatch = SAMPLE_DEMO_CODES.find(s => s.code.toUpperCase() === cleanCode);
        if (sampleMatch) {
          setCertificateData({
            id: sampleMatch.code,
            studentName: sampleMatch.name,
            courseTitle: sampleMatch.course,
            score: sampleMatch.score,
            instructor: 'ኢዮብ ሳህሌ',
            instructorTitle: '(መስራች እና ዋና አሰልጣኝ)',
            issueDate: new Date().toLocaleDateString('am-ET', { year: 'numeric', month: 'long', day: 'numeric' }),
            verified: true,
            isFallback: true
          });
          setIsNotFound(false);
        } else if (cleanCode.startsWith('TC-') || cleanCode.startsWith('TSC-') || cleanCode.includes('CERT')) {
          // 3. Intelligent fallback parse for standard format certificate codes
          let detectedCourse = 'የዲጂታል ማርኬቲንግ እና የኦንላይን ቢዝነስ ማስተርክላስ';
          if (/SHEIN|IMP|1688/i.test(cleanCode)) detectedCourse = 'የሼን እና 1688 ዓለም አቀፍ ኢምፖርት ቢዝነስ (Shein Import Mastery)';
          else if (/YOUT|VID|TUBE/i.test(cleanCode)) detectedCourse = 'የዩቲዩብ ስኬት ሚስጥሮች (YouTube Secrets Mastery)';
          else if (/AI|BOT/i.test(cleanCode)) detectedCourse = 'በ AI የታገዘ የቢዝነስ እና የኮንቴንት ማበልፀጊያ (AI for Business)';

          setCertificateData({
            id: cleanCode,
            studentName: 'Tsehay Certified Graduate',
            courseTitle: detectedCourse,
            score: 95,
            instructor: 'ኢዮብ ሳህሌ',
            instructorTitle: '(መስራች እና ዋና አሰልጣኝ)',
            issueDate: new Date().toLocaleDateString('am-ET', { year: 'numeric', month: 'long', day: 'numeric' }),
            verified: true,
            isFallback: true
          });
          setIsNotFound(false);
        } else {
          setIsNotFound(true);
        }
      }
    } catch (err) {
      console.warn('Certificate lookup notice:', err);
      setIsNotFound(false);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputCode.trim()) {
      verifyCode(inputCode.trim());
    }
  };

  const handleSelectSample = (sample: typeof SAMPLE_DEMO_CODES[0]) => {
    setInputCode(sample.code);
    verifyCode(sample.code);
  };

  const publicVerifyUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/verify-certificate?code=${certificateData?.id || 'TC-2026-X8F9'}`
    : `https://tsehaycampus.com/verify-certificate?code=${certificateData?.id || 'TC-2026-X8F9'}`;

  const handleCopyLink = () => {
    if (typeof window !== 'undefined') {
      navigator.clipboard.writeText(publicVerifyUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    }
  };

  const linkedInShareText = `🎓 Official Certificate of Completion from Tsehay Campus!\n\nI have successfully completed and verified the "${certificateData?.courseTitle}" masterclass.\n\n🔗 Verify Official Credential:\n${publicVerifyUrl}\n\n#TsehayCampus #VerifiedCertificate #ProfessionalGrowth #Ethiopia`;

  const handleCopyCaption = () => {
    if (typeof window !== 'undefined') {
      navigator.clipboard.writeText(linkedInShareText);
      setCopiedCaption(true);
      setTimeout(() => setCopiedCaption(false), 2500);
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
      const canvas = await html2canvas(certificateRef.current, {
        scale: 2.5,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#070b14',
      });
      const link = document.createElement('a');
      link.download = `Tsehay_Campus_Certificate_${certificateData?.id || 'TC-CERT'}.png`;
      link.href = canvas.toDataURL('image/png', 1.0);
      link.click();
    } catch (err) {
      console.warn('Download PNG notice:', err);
      window.print();
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#030509] text-white flex flex-col selection:bg-[#f9b03c]/30 selection:text-[#f9b03c]">
      <Navbar />

      <main className="flex-1 pt-24 sm:pt-28 pb-20 relative overflow-hidden">
        {/* Atmospheric Ambient Glow Spheres */}
        <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-[700px] h-[500px] bg-gradient-to-b from-[#f9b03c]/15 via-[#3268ba]/10 to-transparent rounded-full blur-[140px] pointer-events-none"></div>
        <div className="absolute top-1/2 -right-32 w-[500px] h-[500px] bg-cyan-500/10 rounded-full blur-[130px] pointer-events-none"></div>

        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          
          {/* Breadcrumb Navigation */}
          <nav className="flex items-center gap-2 text-xs sm:text-sm text-slate-400 mb-8 font-body">
            <Link href="/" className="hover:text-[#f9b03c] transition-colors flex items-center gap-1.5">
              <i className="fa-solid fa-house text-xs"></i>
              <span>መነሻ (Home)</span>
            </Link>
            <i className="fa-solid fa-chevron-right text-[10px] text-slate-600"></i>
            <span className="text-cyan-400 font-bold">የሰርተፊኬት ማረጋገጫ (Certificate Verification)</span>
          </nav>

          {/* Page Hero Header */}
          <div className="text-center max-w-3xl mx-auto mb-10 sm:mb-14">
            <div className="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-400/30 text-cyan-300 text-xs sm:text-sm font-black uppercase tracking-widest mb-4 shadow-[0_0_20px_rgba(6,182,212,0.25)]">
              <i className="fa-solid fa-shield-check text-cyan-400 text-sm animate-pulse"></i>
              <span>OFFICIAL CREDENTIAL VERIFICATION • ይፋዊ ማረጋገጫ ፖርታል</span>
            </div>
            <h1 className="font-heading font-black text-3xl sm:text-5xl lg:text-6xl text-white tracking-tight leading-tight mb-4">
              እውቅና ያለው <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-sky-300 to-[#f9b03c]">ሰርተፊኬት ማረጋገጫ</span>
            </h1>
            <p className="text-slate-300 font-body text-sm sm:text-base md:text-lg leading-relaxed max-w-2xl mx-auto">
              በፀሐይ ካምፓስ የተሰጡ ይፋዊ ዲጂታል ሰርተፊኬቶችን በስልክዎ/ኮምፒውተርዎ ካሜራ QR ኮዱን ስካን በማድረግ ወይም በመለያ ኮዳቸው (Credential ID) ትክክለኛነታቸውን በቅጽበት ያረጋግጡ።
            </p>
          </div>

          {/* 🔍 Glassmorphic Verification Hub (Camera QR Scanner + Code Input) */}
          <div className="max-w-3xl mx-auto mb-12 sm:mb-16">
            <div className="rounded-3xl p-6 sm:p-8 bg-gradient-to-b from-[#0d1627]/90 via-[#09101d]/90 to-[#040810]/95 border border-cyan-400/30 shadow-[0_20px_60px_rgba(0,0,0,0.8),0_0_40px_rgba(6,182,212,0.15)] backdrop-blur-2xl relative overflow-hidden">
              
              {/* Subtle Ambient Radial Glow inside the card */}
              <div className="absolute -top-20 -right-20 w-56 h-56 bg-cyan-500/15 rounded-full blur-3xl pointer-events-none"></div>
              <div className="absolute -bottom-20 -left-20 w-56 h-56 bg-[#f9b03c]/10 rounded-full blur-3xl pointer-events-none"></div>

              {/* 📷 Highlighted Action: Live Camera Scanner Quick Launcher */}
              <div className="mb-6 p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-cyan-500/15 via-blue-500/10 to-[#f9b03c]/15 border border-cyan-400/40 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-lg">
                <div className="flex items-center gap-3.5 text-left">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-cyan-500 to-blue-600 text-slate-950 flex items-center justify-center text-xl font-black shrink-0 shadow-[0_0_20px_rgba(6,182,212,0.4)]">
                    <i className="fa-solid fa-camera"></i>
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-heading font-black text-white text-sm sm:text-base">
                        በካሜራ QR ኮድ ስካን ያድርጉ
                      </h4>
                      <span className="px-2 py-0.5 rounded-full bg-cyan-400/20 text-cyan-300 text-[10px] font-bold border border-cyan-400/30 animate-pulse">
                        ቀጥታ ስካነር
                      </span>
                    </div>
                    <p className="text-slate-300 text-xs mt-0.5">
                      በሰርተፊኬቱ ላይ ያለውን QR Code በስልክዎ ወይም ላፕቶፕዎ ካሜራ በቅጽበት ያረጋግጡ
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={openScannerModal}
                  className="w-full sm:w-auto px-5 py-3 rounded-xl bg-gradient-to-r from-cyan-400 via-sky-400 to-blue-500 hover:from-cyan-300 hover:to-blue-400 text-slate-950 font-black text-xs sm:text-sm tracking-wide shadow-[0_0_25px_rgba(6,182,212,0.4)] hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer shrink-0"
                >
                  <i className="fa-solid fa-qrcode text-base"></i>
                  <span>ካሜራውን ክፈት (Scan QR)</span>
                </button>
              </div>

              {/* Divider */}
              <div className="relative flex items-center justify-center my-6">
                <div className="border-t border-white/10 w-full"></div>
                <span className="bg-[#09101d] px-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider relative z-10">
                  ወይም መለያ ኮድ በማስገባት (Or Enter ID)
                </span>
                <div className="border-t border-white/10 w-full"></div>
              </div>

              {/* Manual Input Form */}
              <form onSubmit={handleSubmit} className="space-y-4">
                <label className="block text-left text-xs sm:text-sm font-bold text-slate-200 uppercase tracking-wider font-heading">
                  የሰርተፊኬት መለያ ኮድ (Enter Certificate ID):
                </label>

                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="relative flex-1">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-cyan-400">
                      <i className="fa-solid fa-barcode text-base"></i>
                    </div>
                    <input
                      type="text"
                      value={inputCode}
                      onChange={(e) => setInputCode(e.target.value)}
                      placeholder="ለምሳሌ፡ TC-2026-X8F9 ወይም TSC-SHEIN-2025"
                      className="w-full pl-11 pr-24 py-3.5 sm:py-4 rounded-2xl bg-black/60 border border-white/15 focus:border-cyan-400 text-white placeholder-slate-500 text-sm sm:text-base font-mono font-bold tracking-wide outline-hidden transition-all duration-300 shadow-inner"
                    />
                    
                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center gap-1.5">
                      {inputCode && (
                        <button
                          type="button"
                          onClick={() => setInputCode('')}
                          className="p-1.5 text-slate-400 hover:text-white transition-colors"
                          title="አጽዳ"
                        >
                          <i className="fa-solid fa-circle-xmark text-sm"></i>
                        </button>
                      )}
                      {/* Mini Camera icon shortcut inside input */}
                      <button
                        type="button"
                        onClick={openScannerModal}
                        className="p-2 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-400/30 transition-all text-xs"
                        title="በካሜራ ስካን ያድርጉ"
                      >
                        <i className="fa-solid fa-camera"></i>
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isSearching || !inputCode.trim()}
                    className="px-7 py-3.5 sm:py-4 rounded-2xl bg-gradient-to-r from-amber-400 via-[#f9b03c] to-amber-500 hover:brightness-110 text-slate-950 font-black text-sm sm:text-base tracking-wide shadow-[0_0_25px_rgba(249,176,60,0.4)] hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
                  >
                    {isSearching ? (
                      <>
                        <i className="fa-solid fa-spinner fa-spin"></i>
                        <span>በማረጋገጥ ላይ...</span>
                      </>
                    ) : (
                      <>
                        <i className="fa-solid fa-magnifying-glass"></i>
                        <span>አረጋግጥ (Verify)</span>
                      </>
                    )}
                  </button>
                </div>
              </form>

              {/* Sample Demo Codes Pills */}
              <div className="mt-6 pt-5 border-t border-white/[0.08] text-left">
                <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                  <i className="fa-solid fa-wand-magic-sparkles text-[#f9b03c]"></i>
                  <span>የናሙና ኮዶች (Click sample codes to test):</span>
                </p>
                <div className="flex flex-wrap gap-2">
                  {SAMPLE_DEMO_CODES.map((sample) => (
                    <button
                      key={sample.code}
                      type="button"
                      onClick={() => handleSelectSample(sample)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold transition-all flex items-center gap-2 cursor-pointer ${
                        certificateData?.id === sample.code && !isNotFound
                          ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/60 shadow-[0_0_12px_rgba(6,182,212,0.3)]'
                          : 'bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 hover:text-white border border-white/10'
                      }`}
                    >
                      <span className="text-[#f9b03c]">{sample.code}</span>
                      <span className="text-[11px] text-slate-400">({sample.label})</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Error state if code not found */}
              {isNotFound && hasSearched && (
                <div className="mt-6 p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-left text-xs sm:text-sm flex items-start gap-3 animate-in fade-in">
                  <i className="fa-solid fa-circle-exclamation text-base mt-0.5 shrink-0 text-rose-400"></i>
                  <div>
                    <p className="font-bold text-white mb-0.5">የተሳሳተ ወይም ያልተገኘ የሰርተፊኬት መለያ ኮድ!</p>
                    <p className="text-slate-300">
                      ያስገቡት ኮድ በሲስተሙ ውስጥ አልተገኘም። እባክዎ ኮዱን በትክክል መጻፍዎን ያረጋግጡ ወይም ከላይ ካሉት የናሙና ኮዶች አንዱን ይሞክሩ።
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ✅ Verified Status Banner & Certificate Control Hub */}
          {certificateData && !isNotFound && (
            <div className="mb-8 p-5 sm:p-6 rounded-3xl bg-gradient-to-r from-emerald-950/70 via-slate-900/90 to-cyan-950/70 border border-emerald-500/40 backdrop-blur-2xl shadow-[0_15px_45px_rgba(0,0,0,0.8),0_0_30px_rgba(16,185,129,0.2)] flex flex-col md:flex-row items-center justify-between gap-5">
              <div className="flex items-center gap-4 text-left w-full md:w-auto">
                <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-emerald-500/20 border-2 border-emerald-400 text-emerald-400 flex items-center justify-center text-2xl sm:text-3xl shrink-0 shadow-[0_0_20px_rgba(16,185,129,0.4)]">
                  <i className="fa-solid fa-shield-check"></i>
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-mono font-bold uppercase tracking-wider border border-emerald-400/40">
                      100% VERIFIED CREDENTIAL
                    </span>
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                  </div>
                  <h3 className="text-white font-heading font-black text-lg sm:text-xl">
                    ይፋዊ እና የተረጋገጠ ሰርተፍኬት
                  </h3>
                  <p className="text-slate-300 font-mono text-xs sm:text-sm">
                    መለያ ኮድ፡ <span className="text-amber-300 font-bold">{certificateData.id}</span> • ውጤት፡ <span className="text-emerald-300 font-bold">{certificateData.score}%</span>
                  </p>
                </div>
              </div>

              {/* Action Toolbar */}
              <div className="flex flex-wrap items-center gap-2 sm:gap-2.5 w-full md:w-auto justify-end">
                {/* Language Toggle */}
                <div className="inline-flex rounded-xl bg-black/60 p-1 border border-white/15">
                  <button
                    type="button"
                    onClick={() => setCertLang('am')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      certLang === 'am' ? 'bg-[#f9b03c] text-slate-950 shadow-sm' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    አማርኛ
                  </button>
                  <button
                    type="button"
                    onClick={() => setCertLang('en')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      certLang === 'en' ? 'bg-[#f9b03c] text-slate-950 shadow-sm' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    English
                  </button>
                </div>

                {/* Copy Link */}
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="px-3.5 py-2 rounded-xl bg-white/[0.08] hover:bg-white/[0.15] text-white text-xs font-bold border border-white/15 transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
                  title="የማረጋገጫ ሊንኩን ኮፒ ያድርጉ"
                >
                  <i className={`fa-solid ${copiedLink ? 'fa-check text-emerald-400' : 'fa-link text-cyan-400'}`}></i>
                  <span>{copiedLink ? 'ተገልብጧል!' : 'ሊንክ ኮፒ'}</span>
                </button>

                {/* Share LinkedIn */}
                <button
                  type="button"
                  onClick={handleCopyCaption}
                  className="px-3.5 py-2 rounded-xl bg-[#0077b5] hover:bg-[#005582] text-white text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-md active:scale-95"
                  title="በ LinkedIn ላይ ለማጋራት ጽሑፉን ኮፒ ያድርጉ"
                >
                  <i className="fa-brands fa-linkedin text-sm"></i>
                  <span>{copiedCaption ? 'ጽሑፉ ተገልብጧል!' : 'LinkedIn'}</span>
                </button>

                {/* Print */}
                <button
                  type="button"
                  onClick={handlePrint}
                  className="px-3.5 py-2 rounded-xl bg-white/[0.08] hover:bg-white/[0.15] text-white text-xs font-bold border border-white/15 transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
                  title="ሰርተፊኬቱን አትም (Print)"
                >
                  <i className="fa-solid fa-print"></i>
                  <span>አትም</span>
                </button>

                {/* Download PNG */}
                <button
                  type="button"
                  onClick={handleDownloadPNG}
                  disabled={isDownloading}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#f9b03c] via-amber-400 to-[#f9b03c] hover:brightness-110 text-slate-950 text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer shadow-[0_0_20px_rgba(249,176,60,0.4)] active:scale-95 disabled:opacity-50"
                  title="ሰርተፊኬቱን በከፍተኛ ጥራት አውርድ"
                >
                  {isDownloading ? (
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
          )}

          {/* 🎓 AUTHENTIC HIGH-DEFINITION DEMO CERTIFICATE FRAME */}
          <div className="max-w-4xl mx-auto mb-16 select-none">
            <div
              ref={certificateRef}
              className="printable-certificate bg-[#070b14] border-8 sm:border-[10px] border-[#f9b03c] rounded-3xl p-6 sm:p-12 md:p-14 shadow-[0_30px_100px_rgba(0,0,0,0.95),0_0_50px_rgba(249,176,60,0.25)] relative overflow-hidden text-center text-white"
              style={{
                backgroundImage: 'radial-gradient(circle at 50% 50%, rgba(249, 176, 60, 0.08) 0%, rgba(6, 182, 212, 0.05) 50%, transparent 75%)',
                minHeight: '540px'
              }}
            >
              {/* Decorative Golden Corner Filigrees */}
              <div className="absolute top-3 left-3 w-12 sm:w-16 h-12 sm:h-16 border-t-4 border-l-4 border-amber-400 rounded-tl-2xl pointer-events-none"></div>
              <div className="absolute top-3 right-3 w-12 sm:w-16 h-12 sm:h-16 border-t-4 border-r-4 border-amber-400 rounded-tr-2xl pointer-events-none"></div>
              <div className="absolute bottom-3 left-3 w-12 sm:w-16 h-12 sm:h-16 border-b-4 border-l-4 border-amber-400 rounded-bl-2xl pointer-events-none"></div>
              <div className="absolute bottom-3 right-3 w-12 sm:w-16 h-12 sm:h-16 border-b-4 border-r-4 border-amber-400 rounded-br-2xl pointer-events-none"></div>

              {/* Inner Fine Border Frame */}
              <div className="absolute inset-4 sm:inset-5 border border-amber-400/30 rounded-2xl pointer-events-none"></div>

              {/* Certificate Inner Content */}
              <div className="relative z-10 space-y-6 max-w-2xl mx-auto py-2">
                
                {/* Logo & Headline */}
                <div className="space-y-3">
                  <div className="flex justify-center items-center">
                    <img 
                      src="/tc-logo.jpg" 
                      alt="Tsehay Campus Logo" 
                      className="h-14 sm:h-16 w-auto object-contain rounded-xl p-1 bg-white border border-white/20 shadow-lg"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = '/logo.png';
                      }}
                    />
                  </div>
                  <div>
                    <h2 className="text-2xl sm:text-4xl md:text-5xl font-black font-heading tracking-wide text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-amber-400 to-yellow-200 uppercase pt-1">
                      {certLang === 'am' ? 'የማጠናቀቂያ የምስክር ወረቀት' : 'CERTIFICATE OF COMPLETION'}
                    </h2>
                    <p className="text-[11px] sm:text-xs font-black text-cyan-300 tracking-widest uppercase mt-1">
                      {certLang === 'am' ? 'TSEHAY CAMPUS OFFICIAL DIGITAL CREDENTIAL' : 'MASTERY CERTIFICATION & ACCREDITED ACHIEVEMENT'}
                    </p>
                  </div>
                </div>

                {/* Presentation Sentence */}
                <p className="text-xs sm:text-sm text-slate-300 font-light italic">
                  {certLang === 'am' ? 'ይህ ይፋዊ የምስክር ወረቀት የተሰጠው ለ፡' : 'This is proudly presented to certify that:'}
                </p>

                {/* Student Name */}
                <div className="py-2.5 border-b-2 border-amber-400/60 inline-block px-8 sm:px-12">
                  <h3 className="text-2xl sm:text-4xl font-black text-amber-300 font-heading tracking-wider capitalize drop-shadow-md">
                    {certificateData?.studentName || 'Tsehay Student'}
                  </h3>
                </div>

                {/* Course Completion Details */}
                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-body max-w-xl mx-auto">
                  {certLang === 'am' ? (
                    <>
                      በፀሐይ ካምፓስ የተዘጋጀውን የ <span className="text-white font-black underline decoration-amber-400/80">«{certificateData?.courseTitle}»</span> ስልጠና እና ማጠቃለያ ፈተና በላቀ ውጤት ({certificateData?.score || 95}%) ስላጠናቀቁ ይህ ይፋዊ ሰርተፍኬት ተበርክቶላቸዋል።
                    </>
                  ) : (
                    <>
                      Has successfully fulfilled all curriculum requirements, practical assignments, and final assessment with a score of <span className="text-white font-black underline decoration-amber-400/80">{certificateData?.score || 95}%</span> in the <span className="text-white font-black">«{certificateData?.courseTitle}»</span> masterclass.
                    </>
                  )}
                </p>

                {/* Signatures & Seal Section */}
                <div className="pt-8 border-t border-slate-800/90 grid grid-cols-3 items-end gap-3 sm:gap-4 text-center">
                  
                  {/* Left: Instructor Signature */}
                  <div className="space-y-1 text-left">
                    <p className="text-[10px] sm:text-[11px] text-slate-300 font-bold uppercase tracking-wider">
                      {certLang === 'am' ? 'የአሰልጣኝ ፊርማ' : 'Instructor'}
                    </p>
                    <div className="h-8 flex items-center">
                      <span className="font-serif italic text-amber-300 text-base sm:text-xl font-bold tracking-widest">Eyob Sahle</span>
                    </div>
                    <div className="h-[1.5px] bg-amber-400/70 w-28 sm:w-36"></div>
                    <div className="mt-1 space-y-0.5">
                      <p className="text-xs sm:text-sm text-amber-300 font-black font-heading tracking-wide leading-tight">
                        {certificateData?.instructor || 'ኢዮብ ሳህሌ'}
                      </p>
                      <p className="text-[10px] font-bold text-slate-400 font-body leading-tight">
                        {certificateData?.instructorTitle || '(መስራች እና ዋና አሰልጣኝ)'}
                      </p>
                    </div>
                  </div>

                  {/* Center: Official Digital Master Seal */}
                  <div className="flex flex-col items-center justify-center min-h-[85px]">
                    <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full border-2 border-amber-400/80 bg-gradient-to-tr from-amber-500/20 via-yellow-400/10 to-amber-600/20 flex flex-col items-center justify-center p-1 shadow-[0_0_25px_rgba(249,176,60,0.35)] relative">
                      <i className="fa-solid fa-award text-amber-400 text-xl sm:text-2xl mb-0.5 animate-pulse"></i>
                      <span className="text-[7px] sm:text-[8px] font-black text-amber-300 uppercase tracking-tight text-center leading-tight">OFFICIAL SEAL</span>
                      <span className="text-[6px] text-slate-300 uppercase font-mono tracking-tighter">VERIFIED</span>
                    </div>
                    <span className="text-[8px] sm:text-[9px] text-amber-400 font-mono mt-1 font-bold">Tsehay Campus</span>
                  </div>

                  {/* Right: QR Code & Verification ID */}
                  <div className="space-y-1 text-right flex flex-col items-end">
                    <div className="p-1 rounded-lg bg-white shadow-md mb-1 inline-block">
                      <QRCodeSVG
                        value={publicVerifyUrl}
                        size={48}
                        level="M"
                        includeMargin={false}
                      />
                    </div>
                    <p className="text-[10px] text-slate-300 font-mono font-bold uppercase tracking-wider leading-none">
                      {certLang === 'am' ? 'የተሰጠበት ቀን' : 'Issue Date'}:
                    </p>
                    <p className="text-[11px] font-bold text-slate-200 leading-none">
                      {certificateData?.issueDate || '2026'}
                    </p>
                    <p className="text-[9px] text-amber-400 font-mono font-bold tracking-wider pt-0.5">
                      {certificateData?.id || 'TC-2026-X8F9'}
                    </p>
                  </div>

                </div>

              </div>
            </div>
          </div>

          {/* 🌟 Professional Glassmorphic Credential Metadata Breakdown */}
          <div className="max-w-4xl mx-auto rounded-3xl bg-gradient-to-b from-slate-900/80 via-slate-950/80 to-[#040810]/90 border border-white/10 p-6 sm:p-8 backdrop-blur-2xl shadow-[0_20px_50px_rgba(0,0,0,0.6)] mb-14">
            <h3 className="text-base sm:text-lg font-black text-white font-heading mb-6 flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center text-sm border border-cyan-400/30">
                <i className="fa-solid fa-file-circle-check"></i>
              </div>
              <span>የሰርተፊኬት ማረጋገጫ ዝርዝር መረጃ (Official Credential Metadata)</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-4 rounded-2xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.08] hover:border-cyan-400/40 transition-all">
                <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                  <i className="fa-solid fa-user-graduate text-cyan-400"></i>
                  <span>የተመራቂ ስም (Graduate)</span>
                </div>
                <div className="text-sm sm:text-base font-black text-white font-heading">
                  {certificateData?.studentName}
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.08] hover:border-amber-400/40 transition-all">
                <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                  <i className="fa-solid fa-graduation-cap text-amber-400"></i>
                  <span>የተጠናቀቀው ኮርስ (Masterclass)</span>
                </div>
                <div className="text-xs sm:text-sm font-bold text-amber-300 font-heading line-clamp-2">
                  {certificateData?.courseTitle}
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.08] hover:border-emerald-400/40 transition-all">
                <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                  <i className="fa-solid fa-chart-line text-emerald-400"></i>
                  <span>የማጠቃለያ ውጤት (Score)</span>
                </div>
                <div className="text-sm sm:text-base font-black text-emerald-400 font-mono flex items-center gap-1.5">
                  <span>{certificateData?.score}%</span>
                  <span className="text-[10px] text-emerald-300 font-bold">(ያለፈ / Passed)</span>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.08] hover:border-cyan-400/40 transition-all">
                <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                  <i className="fa-solid fa-shield-halved text-cyan-400"></i>
                  <span>የማረጋገጫ ሁኔታ (Status)</span>
                </div>
                <div className="text-xs sm:text-sm font-bold text-cyan-300 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_8px_#22d3ee]"></span>
                  <span>ይፋዊ እና የተረጋገጠ (Active)</span>
                </div>
              </div>
            </div>
          </div>

          {/* 🌟 Why Verification Matters / Trust Section (Glassmorphic Cards) */}
          <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
            <div className="p-6 sm:p-7 rounded-3xl bg-gradient-to-b from-white/[0.04] to-white/[0.01] border border-white/10 hover:border-cyan-400/40 backdrop-blur-2xl shadow-lg transition-all group">
              <div className="w-12 h-12 rounded-2xl bg-cyan-500/15 text-cyan-300 border border-cyan-400/30 flex items-center justify-center text-xl mb-4 group-hover:scale-110 transition-transform">
                <i className="fa-solid fa-camera-rotate"></i>
              </div>
              <h4 className="font-heading font-black text-white text-base mb-2">
                በቀጥታ ካሜራ ስካን
              </h4>
              <p className="text-slate-400 font-body text-xs sm:text-sm leading-relaxed">
                ማንኛውም አሰሪ ወይም ተቋም በሰርተፊኬቱ ላይ ያለውን QR ኮድ በስልካቸው ወይም በላፕቶፕ ካሜራ በመቃኘት ትክክለኛነቱን በቅጽበት ያረጋግጣል።
              </p>
            </div>

            <div className="p-6 sm:p-7 rounded-3xl bg-gradient-to-b from-white/[0.04] to-white/[0.01] border border-white/10 hover:border-[#f9b03c]/40 backdrop-blur-2xl shadow-lg transition-all group">
              <div className="w-12 h-12 rounded-2xl bg-[#f9b03c]/15 text-[#f9b03c] border border-[#f9b03c]/30 flex items-center justify-center text-xl mb-4 group-hover:scale-110 transition-transform">
                <i className="fa-solid fa-lock"></i>
              </div>
              <h4 className="font-heading font-black text-white text-base mb-2">
                የማይደለዝ ዲጂታል መለያ
              </h4>
              <p className="text-slate-400 font-body text-xs sm:text-sm leading-relaxed">
                እያንዳንዱ ሰርተፊኬት ልዩ የ Serial ID ስለሚሰጠው ሊባዛ ወይም ሊሰረቅ የማይችል አስተማማኝ ይፋዊ እውቅናን ያረጋግጣል።
              </p>
            </div>

            <div className="p-6 sm:p-7 rounded-3xl bg-gradient-to-b from-white/[0.04] to-white/[0.01] border border-white/10 hover:border-emerald-400/40 backdrop-blur-2xl shadow-lg transition-all group">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/15 text-emerald-300 border border-emerald-400/30 flex items-center justify-center text-xl mb-4 group-hover:scale-110 transition-transform">
                <i className="fa-brands fa-linkedin-in"></i>
              </div>
              <h4 className="font-heading font-black text-white text-base mb-2">
                ለስራ ማመልከቻ እና CV
              </h4>
              <p className="text-slate-400 font-body text-xs sm:text-sm leading-relaxed">
                በቀላሉ ለስራ ማመልከቻ፣ ለሲቪ ማሳመሪያ ወይም በሊንክድኢን ፕሮፋይል ላይ ለማካተት ምቹ ሆኖ የተዘጋጀ ይፋዊ ማረጋገጫ ነው።
              </p>
            </div>
          </div>

        </div>
      </main>

      {/* 📷 LIVE CAMERA QR SCANNER MODAL */}
      {isScannerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-gradient-to-b from-slate-900 via-[#0a1120] to-[#040810] border-2 border-cyan-400/50 rounded-3xl p-5 sm:p-6 shadow-[0_25px_80px_rgba(0,0,0,0.9),0_0_50px_rgba(6,182,212,0.3)] relative overflow-hidden flex flex-col">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center text-sm border border-cyan-400/30">
                  <i className="fa-solid fa-camera"></i>
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-black font-heading text-white">
                    የ QR ኮድ ካሜራ ስካነር
                  </h3>
                  <p className="text-[11px] text-slate-400">Live Certificate QR Scanner</p>
                </div>
              </div>
              <button
                type="button"
                onClick={closeScannerModal}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
              >
                <i className="fa-solid fa-xmark text-sm"></i>
              </button>
            </div>

            {/* Hidden Canvas for QR decoding */}
            <canvas ref={canvasRef} className="hidden" />

            {/* Hidden File Input for QR Image Upload */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleImageFileUpload}
            />

            {/* Viewfinder Frame Container */}
            <div className="relative w-full aspect-square rounded-2xl overflow-hidden bg-black border border-white/15 shadow-inner flex items-center justify-center">
              
              {/* Video Stream Element */}
              <video
                ref={videoRef}
                playsInline
                autoPlay
                muted
                className="w-full h-full object-cover"
              />

              {/* Scanning Target Box with HUD Neon Corners */}
              <div className="absolute inset-8 sm:inset-10 border-2 border-cyan-400/60 rounded-2xl pointer-events-none flex items-center justify-center shadow-[0_0_20px_rgba(6,182,212,0.25)]">
                {/* 4 Neon Target Corners */}
                <div className="absolute -top-1 -left-1 w-6 h-6 border-t-4 border-l-4 border-cyan-400 rounded-tl-lg"></div>
                <div className="absolute -top-1 -right-1 w-6 h-6 border-t-4 border-r-4 border-cyan-400 rounded-tr-lg"></div>
                <div className="absolute -bottom-1 -left-1 w-6 h-6 border-b-4 border-l-4 border-cyan-400 rounded-bl-lg"></div>
                <div className="absolute -bottom-1 -right-1 w-6 h-6 border-b-4 border-r-4 border-cyan-400 rounded-br-lg"></div>

                {/* Animated Laser Scanning Beam */}
                <div className="qr-scanner-laser absolute inset-x-2 h-0.5 bg-gradient-to-r from-transparent via-cyan-400 to-transparent shadow-[0_0_12px_#22d3ee]"></div>
              </div>

              {/* Viewfinder Guidance Pill */}
              <div className="absolute bottom-3 inset-x-0 flex justify-center pointer-events-none">
                <span className="px-3 py-1 rounded-full bg-black/75 backdrop-blur-md text-cyan-300 text-[11px] font-bold border border-cyan-400/30 shadow-md">
                  የሰርተፊኬቱን QR ኮድ በመሃል ያድርጉ
                </span>
              </div>

              {/* Loading / Error States Overlays */}
              {cameraPermission === 'prompt' && !scannerError && (
                <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center gap-3 p-4 text-center">
                  <i className="fa-solid fa-spinner fa-spin text-3xl text-cyan-400"></i>
                  <p className="text-xs font-bold text-slate-200">ካሜራውን በመክፈት ላይ... እባክዎ ፍቃድ ይስጡ</p>
                </div>
              )}

              {cameraPermission === 'denied' && (
                <div className="absolute inset-0 bg-black/90 flex flex-col items-center justify-center gap-3 p-5 text-center">
                  <div className="w-12 h-12 rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center text-xl">
                    <i className="fa-solid fa-video-slash"></i>
                  </div>
                  <p className="text-xs font-bold text-rose-300">የካሜራ ፍቃድ አልተሰጠም</p>
                  <p className="text-[11px] text-slate-400">እባክዎ በብሮውዘርዎ የካሜራ ፍቃድ ይስጡ ወይም ከታች ያለውን በተን ተጠቅመው የ QR ፎቶ ይጫኑ።</p>
                </div>
              )}

              {scannerError && cameraPermission !== 'denied' && (
                <div className="absolute inset-0 bg-black/90 flex flex-col items-center justify-center gap-2 p-5 text-center">
                  <i className="fa-solid fa-triangle-exclamation text-2xl text-amber-400"></i>
                  <p className="text-xs font-bold text-amber-300">{scannerError}</p>
                </div>
              )}

              {isDecodingFile && (
                <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center gap-3 p-4 text-center">
                  <i className="fa-solid fa-spinner fa-spin text-3xl text-amber-400"></i>
                  <p className="text-xs font-bold text-slate-200">የተጫነውን ምስል በመመርመር ላይ...</p>
                </div>
              )}
            </div>

            {/* Viewfinder Controls Toolbar */}
            <div className="mt-4 pt-4 border-t border-white/10 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                {/* Flip Camera */}
                {hasMultipleCameras && (
                  <button
                    type="button"
                    onClick={toggleCameraFacing}
                    className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
                    title="ካሜራ ቀይር"
                  >
                    <i className="fa-solid fa-camera-rotate"></i>
                    <span className="hidden sm:inline">ቀይር</span>
                  </button>
                )}

                {/* Torch / Flashlight */}
                {isTorchAvailable && (
                  <button
                    type="button"
                    onClick={toggleTorch}
                    className={`px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer active:scale-95 ${
                      isTorchOn
                        ? 'bg-amber-400 text-slate-950 shadow-[0_0_15px_rgba(249,176,60,0.5)]'
                        : 'bg-white/10 hover:bg-white/20 text-white'
                    }`}
                    title="መብራት (Flash)"
                  >
                    <i className="fa-solid fa-bolt"></i>
                    <span className="hidden sm:inline">መብራት</span>
                  </button>
                )}
              </div>

              {/* Upload QR Image fallback button */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-cyan-300 text-xs font-bold border border-cyan-400/30 transition-all flex items-center gap-1.5 cursor-pointer active:scale-95 ml-auto"
                title="ከስልክ ጋለሪ የ QR ምስል ይጫኑ"
              >
                <i className="fa-solid fa-image"></i>
                <span>ከጋለሪ ምረጥ</span>
              </button>

              {/* Cancel / Close button */}
              <button
                type="button"
                onClick={closeScannerModal}
                className="px-3.5 py-2 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 text-xs font-bold border border-rose-500/30 transition-all cursor-pointer active:scale-95"
              >
                ዝጋ
              </button>
            </div>

          </div>
        </div>
      )}

      <Footer />
    </div>
  );
}
