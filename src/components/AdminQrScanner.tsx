'use client';

import React, { useState, useRef, useEffect } from 'react';
import { EventTicket } from '@/lib/eventCache';

interface AdminQrScannerProps {
  onTicketScanned?: (ticket: EventTicket) => void;
}

export default function AdminQrScanner({ onTicketScanned }: AdminQrScannerProps) {
  const [isScanning, setIsScanning] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [manualTicketId, setManualTicketId] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [scanResult, setScanResult] = useState<{
    status: 'success' | 'already_used' | 'not_found' | 'error';
    message: string;
    ticket?: EventTicket;
  } | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanIntervalRef = useRef<any>(null);

  const startCamera = async () => {
    setCameraError(null);
    setScanResult(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } }
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      setIsScanning(true);
      startScannerLoop();
    } catch (err: any) {
      console.warn("Camera access error:", err);
      setCameraError('የካሜራ ፈቃድ አልተገኘም ወይም መሳሪያዎ ካሜራ የለውም። እባክዎ ከታች የትኬት ቁጥሩን በጽሁፍ ያስገቡ።');
      setIsScanning(false);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }
    setIsScanning(false);
  };

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  const playBeep = (isSuccess: boolean) => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = isSuccess ? 'sine' : 'sawtooth';
      osc.frequency.setValueAtTime(isSuccess ? 880 : 220, audioCtx.currentTime);
      gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + (isSuccess ? 0.18 : 0.35));
    } catch (e) {}
  };

  const verifyTicketData = async (rawQrString: string) => {
    if (isVerifying) return;
    setIsVerifying(true);
    try {
      const res = await fetch('/api/events/verify-ticket', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ qrData: rawQrString, ticketId: rawQrString })
      });
      const data = await res.json();

      if (data.success && data.status === 'verified_success') {
        playBeep(true);
        setScanResult({
          status: 'success',
          message: '✅ ትኬቱ በትክክል ተረጋግጧል! (Access Granted)',
          ticket: data.ticket
        });
        if (onTicketScanned && data.ticket) onTicketScanned(data.ticket);
      } else if (data.status === 'already_used') {
        playBeep(false);
        setScanResult({
          status: 'already_used',
          message: data.message || '⚠️ ይህ ትኬት አስቀድሞ አገልግሎት ላይ ውሏል!',
          ticket: data.ticket
        });
      } else {
        playBeep(false);
        setScanResult({
          status: 'not_found',
          message: data.error || '❌ ትኬቱ በዳታቤዝ ውስጥ አልተገኘም!'
        });
      }
    } catch (e: any) {
      playBeep(false);
      setScanResult({
        status: 'error',
        message: 'የማረጋገጫ ስህተት አጋጥሟል። እባክዎ በድጋሚ ይሞክሩ።'
      });
    } finally {
      setIsVerifying(false);
    }
  };

  const startScannerLoop = () => {
    // Check if BarcodeDetector is available natively in browser
    const BarcodeDetectorClass = (window as any).BarcodeDetector;
    if (BarcodeDetectorClass) {
      const detector = new BarcodeDetectorClass({ formats: ['qr_code'] });
      scanIntervalRef.current = setInterval(async () => {
        if (!videoRef.current || videoRef.current.readyState < 2 || isVerifying) return;
        try {
          const barcodes = await detector.detect(videoRef.current);
          if (barcodes && barcodes.length > 0) {
            const rawValue = barcodes[0].rawValue;
            if (rawValue) {
              stopCamera();
              verifyTicketData(rawValue);
            }
          }
        } catch (e) {}
      }, 350);
    }
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualTicketId.trim()) return;
    verifyTicketData(manualTicketId.trim());
  };

  return (
    <div className="space-y-6">
      
      {/* Scanner Control Deck */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl text-white">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div>
            <h3 className="text-xl font-black font-heading text-white flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#f9b03c] to-amber-400 text-slate-950 flex items-center justify-center text-sm shadow-[0_0_15px_rgba(249,176,60,0.4)]">
                <i className="fa-solid fa-qrcode"></i>
              </div>
              <span>የበር ላይ የቀጥታ QR ስካነር (Door Scanner)</span>
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              የተማሪውን ትኬት በስልክዎ ወይም በላፕቶፕ ካሜራ በመቃኘት ትክክለኛነቱን በሰከንዶች ያረጋግጡ።
            </p>
          </div>

          <div className="flex items-center gap-2">
            {!isScanning ? (
              <button
                type="button"
                onClick={startCamera}
                className="btn-buy-now-vibe px-5 py-2.5 rounded-xl text-xs font-black flex items-center gap-2 cursor-pointer active:scale-95 shadow-lg"
              >
                <i className="fa-solid fa-camera"></i>
                <span>ካሜራ ክፈት (Start Camera)</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={stopCamera}
                className="bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/40 px-5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 cursor-pointer active:scale-95"
              >
                <i className="fa-solid fa-stop"></i>
                <span>ካሜራ ዝጋ (Stop)</span>
              </button>
            )}
          </div>
        </div>

        {/* Video Viewport Stage */}
        {isScanning && (
          <div className="relative w-full max-w-md mx-auto aspect-square rounded-3xl overflow-hidden bg-black border-2 border-amber-400/50 shadow-[0_0_40px_rgba(249,176,60,0.2)] mb-6">
            <video ref={videoRef} className="w-full h-full object-cover" playsInline muted />
            
            {/* Holographic Scanner Overlay Target */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="relative w-56 h-56 border-2 border-dashed border-[#f9b03c] rounded-2xl animate-pulse flex items-center justify-center">
                {/* Laser scanning beam line */}
                <div className="absolute left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-[#f9b03c] to-transparent shadow-[0_0_15px_#f9b03c] animate-[scannerLaser_2s_ease-in-out_infinite]" />
              </div>
            </div>

            <div className="absolute bottom-3 left-0 right-0 text-center">
              <span className="px-3 py-1 rounded-full bg-black/70 backdrop-blur-md text-[#f9b03c] text-xs font-bold border border-amber-400/30">
                የ QR ኮዱን በመስመሩ መሃል ያድርጉ
              </span>
            </div>
          </div>
        )}

        {cameraError && (
          <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs mb-6 flex items-center gap-3">
            <i className="fa-solid fa-triangle-exclamation text-lg shrink-0 text-[#f9b03c]"></i>
            <span>{cameraError}</span>
          </div>
        )}

        {/* Manual Ticket ID Search Form */}
        <form onSubmit={handleManualSubmit} className="flex gap-2 max-w-lg mx-auto">
          <input
            type="text"
            value={manualTicketId}
            onChange={(e) => setManualTicketId(e.target.value)}
            placeholder="የትኬት ቁጥር አስገባ (ለምሳሌ፡ TC-EVT-...)"
            className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-[#f9b03c]"
          />
          <button
            type="submit"
            disabled={isVerifying || !manualTicketId.trim()}
            className="btn-buy-now-vibe px-5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer active:scale-95 disabled:opacity-50"
          >
            <i className="fa-solid fa-magnifying-glass"></i>
            <span>{isVerifying ? 'በማረጋገጥ ላይ...' : 'አረጋግጥ'}</span>
          </button>
        </form>
      </div>

      {/* Instant Scan Result Card */}
      {scanResult && (
        <div className={`p-6 rounded-3xl border animate-in zoom-in-95 duration-200 shadow-2xl ${
          scanResult.status === 'success' 
            ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-100'
            : scanResult.status === 'already_used'
            ? 'bg-amber-950/40 border-amber-500/40 text-amber-100'
            : 'bg-red-950/40 border-red-500/40 text-red-100'
        }`}>
          <div className="flex items-start gap-4">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-xl shrink-0 ${
              scanResult.status === 'success'
                ? 'bg-emerald-500 text-slate-950 shadow-[0_0_20px_rgba(16,185,129,0.5)]'
                : scanResult.status === 'already_used'
                ? 'bg-amber-500 text-slate-950 shadow-[0_0_20px_rgba(245,158,11,0.5)]'
                : 'bg-red-500 text-white shadow-[0_0_20px_rgba(239,68,68,0.5)]'
            }`}>
              <i className={
                scanResult.status === 'success' 
                  ? 'fa-solid fa-check' 
                  : scanResult.status === 'already_used' 
                  ? 'fa-solid fa-clock-rotate-left' 
                  : 'fa-solid fa-xmark'
              }></i>
            </div>

            <div className="flex-1">
              <h4 className="text-lg font-black">{scanResult.message}</h4>
              
              {scanResult.ticket && (
                <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3 bg-black/40 p-4 rounded-2xl border border-white/10 text-xs">
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase">ተሳታፊ (Attendee)</span>
                    <strong className="text-white text-sm">{scanResult.ticket.attendeeName}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase">ክስተት (Event)</span>
                    <strong className="text-white truncate block">{scanResult.ticket.eventTitle}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase">ደረጃ (Tier)</span>
                    <strong className="text-[#f9b03c]">{scanResult.ticket.tier || 'VIP Pass'}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase">የትኬት ቁጥር (ID)</span>
                    <span className="font-mono text-white text-[11px]">{scanResult.ticket.ticketId}</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
