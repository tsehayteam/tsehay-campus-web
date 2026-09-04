'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { db } from '@/lib/firebase/config';
import { collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { EventTicket } from '@/lib/eventCache';

export default function AdminGateScannerPage() {
  const router = useRouter();
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [manualCode, setManualCode] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');

  // Stats for the current gate session
  const [sessionStats, setSessionStats] = useState({
    totalScanned: 0,
    valid: 0,
    alreadyUsed: 0,
    invalid: 0,
  });

  const [scanHistory, setScanHistory] = useState<Array<{
    ticketId: string;
    name: string;
    tier: string;
    time: string;
    status: 'valid' | 'already_used' | 'invalid';
  }>>([]);

  const [activeResult, setActiveResult] = useState<{
    status: 'valid' | 'already_used' | 'invalid' | 'error';
    message: string;
    ticket?: any;
    usedAt?: string;
  } | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanIntervalRef = useRef<any>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Audio tone generator
  const playSound = (type: 'valid' | 'already_used' | 'invalid') => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      if (type === 'valid') {
        // High double chime
        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, ctx.currentTime); // A5
        osc.frequency.setValueAtTime(1174.66, ctx.currentTime + 0.1); // D6
        gain.gain.setValueAtTime(0.25, ctx.currentTime);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.28);
      } else if (type === 'already_used') {
        // Warning buzz
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(440, ctx.currentTime);
        osc.frequency.setValueAtTime(370, ctx.currentTime + 0.15);
        gain.gain.setValueAtTime(0.3, ctx.currentTime);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.35);
      } else {
        // Low error beep
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(220, ctx.currentTime);
        gain.gain.setValueAtTime(0.3, ctx.currentTime);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.4);
      }
    } catch (e) {}
  };

  // Start Camera
  const startCamera = async (mode = facingMode) => {
    setCameraError(null);
    stopCamera();

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: mode,
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(() => {});
      }
      setIsCameraActive(true);
      startScanningLoop();
    } catch (err: any) {
      console.warn('Camera stream error:', err);
      setCameraError('የካሜራ ፈቃድ አልተገኘም ወይም መሳሪያዎ ካሜራ የለውም። ከታች ያለውን የኮድ ማስገቢያ ይጠቀሙ።');
      setIsCameraActive(false);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }
    setIsCameraActive(false);
  };

  const switchCamera = () => {
    const nextMode = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(nextMode);
    if (isCameraActive) {
      startCamera(nextMode);
    }
  };

  useEffect(() => {
    startCamera('environment');
    return () => {
      stopCamera();
    };
  }, []);

  // Frame processing loop with BarcodeDetector or Canvas fallback
  const startScanningLoop = () => {
    if (scanIntervalRef.current) clearInterval(scanIntervalRef.current);

    scanIntervalRef.current = setInterval(async () => {
      if (!videoRef.current || videoRef.current.readyState < 2 || isVerifying) return;

      // 1. Try native Web BarcodeDetector API if available
      if ('BarcodeDetector' in window) {
        try {
          const barcodeDetector = new (window as any).BarcodeDetector({
            formats: ['qr_code', 'code_128', 'code_39', 'data_matrix'],
          });
          const barcodes = await barcodeDetector.detect(videoRef.current);
          if (barcodes && barcodes.length > 0) {
            const rawValue = barcodes[0].rawValue;
            if (rawValue) {
              handleVerify(rawValue);
            }
          }
        } catch (e) {}
      }
    }, 400);
  };

  // Helper to extract clean Ticket ID
  const extractTicketId = (rawInput: string): string => {
    const trimmed = (rawInput || '').trim();
    try {
      const parsed = JSON.parse(trimmed);
      if (parsed.ticketId) return parsed.ticketId.toUpperCase();
      if (parsed.tId) return parsed.tId.toUpperCase();
      if (parsed.code) return parsed.code.toUpperCase();
    } catch (e) {
      const match = trimmed.match(/TC-EVT-[A-Z0-9]+-[A-Z0-9]+/i) || trimmed.match(/TKT-[A-Z0-9-]+/i);
      if (match) return match[0].toUpperCase();
    }
    return trimmed.toUpperCase();
  };

  // 🛡️ Verify Ticket against Server API
  const handleVerify = async (rawInput: string, action?: 'check_in' | 'reset') => {
    const ticketId = extractTicketId(rawInput);
    if (!ticketId || isVerifying) return;

    setIsVerifying(true);
    setActiveResult(null);

    try {
      const res = await fetch('/api/events/verify-ticket', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          qrData: rawInput,
          ticketId,
          action: action || 'check_in',
          adminEmail: 'Gate Scanner Staff',
        }),
      });

      const data = await res.json();
      const timeStr = new Date().toLocaleTimeString();

      if (data.status === 'verified_success' || data.success) {
        playSound('valid');
        setActiveResult({
          status: 'valid',
          message: '🟢 ትክክለኛ ቲኬት! ተሳታፊውን ማሳለፍ ይችላሉ (Access Granted)',
          ticket: data.ticket,
        });

        setSessionStats((prev) => ({
          ...prev,
          totalScanned: prev.totalScanned + 1,
          valid: prev.valid + 1,
        }));

        setScanHistory((prev) => [
          {
            ticketId: data.ticket?.ticketId || ticketId,
            name: data.ticket?.attendeeName || 'ተሳታፊ',
            tier: data.ticket?.tier || 'General Admission',
            time: timeStr,
            status: 'valid',
          },
          ...prev.slice(0, 19),
        ]);
      } else if (data.status === 'already_used') {
        playSound('already_used');
        setActiveResult({
          status: 'already_used',
          message: '🔴 ይህ ቲኬት ቀደም ሲል ጥቅም ላይ ውሏል! (Already Scanned)',
          ticket: data.ticket,
          usedAt: data.ticket?.usedAt,
        });

        setSessionStats((prev) => ({
          ...prev,
          totalScanned: prev.totalScanned + 1,
          alreadyUsed: prev.alreadyUsed + 1,
        }));

        setScanHistory((prev) => [
          {
            ticketId: data.ticket?.ticketId || ticketId,
            name: data.ticket?.attendeeName || 'ተሳታፊ',
            tier: data.ticket?.tier || 'General Admission',
            time: timeStr,
            status: 'already_used',
          },
          ...prev.slice(0, 19),
        ]);
      } else {
        playSound('invalid');
        setActiveResult({
          status: 'invalid',
          message: '❌ ልክ ያልሆነ ቲኬት! (Invalid or Fake Ticket)',
        });

        setSessionStats((prev) => ({
          ...prev,
          totalScanned: prev.totalScanned + 1,
          invalid: prev.invalid + 1,
        }));

        setScanHistory((prev) => [
          {
            ticketId,
            name: 'ያልታወቀ',
            tier: '-',
            time: timeStr,
            status: 'invalid',
          },
          ...prev.slice(0, 19),
        ]);
      }
    } catch (err) {
      console.error('Verification error:', err);
      playSound('invalid');
      setActiveResult({
        status: 'error',
        message: 'የኔትወርክ ግንኙነት ችግር አጋጥሟል። እባክዎ እንደገና ይሞክሩ።',
      });
    } finally {
      setIsVerifying(false);
      setManualCode('');
    }
  };

  return (
    <div className="min-h-screen bg-[#030611] text-white flex flex-col font-sans select-none pb-12">
      {/* Top Header Bar */}
      <header className="bg-[#080d1e]/90 backdrop-blur-xl border-b border-white/10 px-4 py-3.5 sticky top-0 z-40 flex items-center justify-between shadow-lg">
        <div className="flex items-center gap-3">
          <Link
            href="/admin"
            className="w-9 h-9 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center text-slate-300 hover:text-white transition active:scale-95"
            title="ወደ አስተዳዳሪ ገጽ ተመለስ"
          >
            <i className="fa-solid fa-arrow-left text-sm"></i>
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping"></span>
              <h1 className="text-sm sm:text-base font-black font-heading text-white">
                የበር ላይ QR ትኬት ስካነር (Gate Scanner)
              </h1>
            </div>
            <p className="text-[10px] text-slate-400">Tsehay Campus Event Check-in System</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Flip Camera Button */}
          <button
            onClick={switchCamera}
            className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold text-slate-300 flex items-center gap-1.5 active:scale-95 transition"
            title="ካሜራ ቀይር"
          >
            <i className="fa-solid fa-camera-rotate"></i>
            <span className="hidden sm:inline">ካሜራ ቀይር</span>
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-xl mx-auto w-full px-4 pt-4 flex-1 flex flex-col space-y-4">
        {/* KPI Counter Stats */}
        <div className="grid grid-cols-4 gap-2 text-center">
          <div className="bg-white/5 border border-white/10 rounded-2xl p-2.5">
            <span className="block text-slate-400 text-[10px] uppercase font-bold">ጠቅላላ</span>
            <span className="text-base sm:text-lg font-black text-white">{sessionStats.totalScanned}</span>
          </div>
          <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-2.5">
            <span className="block text-emerald-400 text-[10px] uppercase font-bold">ትክክለኛ</span>
            <span className="text-base sm:text-lg font-black text-emerald-400">{sessionStats.valid}</span>
          </div>
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-2.5">
            <span className="block text-amber-400 text-[10px] uppercase font-bold">የተደገመ</span>
            <span className="text-base sm:text-lg font-black text-amber-400">{sessionStats.alreadyUsed}</span>
          </div>
          <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-2.5">
            <span className="block text-red-400 text-[10px] uppercase font-bold">ልክ ያልሆነ</span>
            <span className="text-base sm:text-lg font-black text-red-400">{sessionStats.invalid}</span>
          </div>
        </div>

        {/* 📷 Live Camera Scanner Viewport */}
        <div className="relative rounded-3xl overflow-hidden border-2 border-white/15 bg-slate-950 aspect-[4/3] sm:aspect-[16/11] shadow-2xl flex items-center justify-center">
          {/* Video stream element */}
          <video
            ref={videoRef}
            playsInline
            muted
            className={`w-full h-full object-cover transition-opacity duration-300 ${
              isCameraActive ? 'opacity-100' : 'opacity-0'
            }`}
          />

          {/* Fallback if camera is off or denied */}
          {!isCameraActive && (
            <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center space-y-3 bg-slate-950">
              <div className="w-16 h-16 rounded-full bg-[#f9b03c]/10 border border-[#f9b03c]/30 flex items-center justify-center text-[#f9b03c] text-2xl">
                <i className="fa-solid fa-qrcode"></i>
              </div>
              <p className="text-xs text-slate-400 max-w-xs leading-relaxed">
                {cameraError || 'ካሜራው አልበራም። ከታች ያለውን ቁልፍ በመጫን ካሜራውን ያብሩ።'}
              </p>
              <button
                onClick={() => startCamera()}
                className="px-5 py-2 rounded-xl bg-gradient-to-r from-[#f9b03c] to-amber-500 text-slate-950 font-black text-xs shadow-lg active:scale-95 transition"
              >
                <i className="fa-solid fa-video mr-1.5"></i> ካሜራውን አብራ (Enable Camera)
              </button>
            </div>
          )}

          {/* 🌟 Futuristic Scanner Target Overlay with Animated Laser Line */}
          {isCameraActive && (
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
              <div className="w-56 h-56 sm:w-64 sm:h-64 border-2 border-dashed border-[#f9b03c]/70 rounded-3xl relative shadow-[0_0_50px_rgba(249,176,60,0.25)] flex items-center justify-center">
                {/* 4 Glowing Corner brackets */}
                <div className="absolute -top-1 -left-1 w-6 h-6 border-t-4 border-l-4 border-[#f9b03c] rounded-tl-xl"></div>
                <div className="absolute -top-1 -right-1 w-6 h-6 border-t-4 border-r-4 border-[#f9b03c] rounded-tr-xl"></div>
                <div className="absolute -bottom-1 -left-1 w-6 h-6 border-b-4 border-l-4 border-[#f9b03c] rounded-bl-xl"></div>
                <div className="absolute -bottom-1 -right-1 w-6 h-6 border-b-4 border-r-4 border-[#f9b03c] rounded-br-xl"></div>

                {/* Animated Horizontal Laser Scan Line */}
                <div className="w-full h-0.5 bg-gradient-to-r from-transparent via-[#f9b03c] to-transparent shadow-[0_0_15px_#f9b03c] animate-pulse"></div>
              </div>
            </div>
          )}

          {/* Verifying Spinner Overlay */}
          {isVerifying && (
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm flex flex-col items-center justify-center space-y-2 z-30 animate-in fade-in">
              <i className="fa-solid fa-spinner fa-spin text-3xl text-[#f9b03c]"></i>
              <span className="text-xs font-black text-amber-300">ቲኬቱን በማረጋገጥ ላይ...</span>
            </div>
          )}
        </div>

        {/* 🌟 SCAN RESULT POPUP BANNER & ATTENDEE BADGE */}
        {activeResult && (
          <div
            className={`rounded-3xl border p-5 shadow-2xl space-y-4 animate-in zoom-in-95 duration-300 ${
              activeResult.status === 'valid'
                ? 'bg-emerald-950/80 border-emerald-500/50 shadow-emerald-500/20'
                : activeResult.status === 'already_used'
                ? 'bg-amber-950/80 border-amber-500/50 shadow-amber-500/20'
                : 'bg-red-950/80 border-red-500/50 shadow-red-500/20'
            }`}
          >
            {/* Status Heading */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xl">
                  {activeResult.status === 'valid' ? '🟢' : activeResult.status === 'already_used' ? '🔴' : '❌'}
                </span>
                <span className="font-heading font-black text-sm text-white">
                  {activeResult.message}
                </span>
              </div>
              <button
                onClick={() => setActiveResult(null)}
                className="text-xs text-slate-400 hover:text-white px-2 py-1 bg-white/10 rounded-lg cursor-pointer"
              >
                ✕ ዝጋ
              </button>
            </div>

            {/* Attendee Info Card */}
            {activeResult.ticket && (
              <div className="bg-black/40 rounded-2xl p-4 border border-white/10 space-y-2.5 text-xs">
                <div className="flex items-center justify-between border-b border-white/10 pb-2">
                  <span className="text-slate-400">የተሳታፊ ስም፦</span>
                  <span className="font-black text-white text-sm">{activeResult.ticket.attendeeName}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">የትኬት ደረጃ (Tier)፦</span>
                  <span className="font-black text-amber-300 bg-amber-400/20 px-2 py-0.5 rounded-full border border-amber-400/30">
                    ⭐ {activeResult.ticket.tier || 'General Admission'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">የኢቨንቱ ርዕስ፦</span>
                  <span className="font-bold text-slate-200">{activeResult.ticket.eventTitle || 'Tsehay Event'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">የትኬት ኮድ፦</span>
                  <span className="font-mono text-[#f9b03c] font-bold">{activeResult.ticket.ticketId}</span>
                </div>
                {activeResult.usedAt && (
                  <div className="flex items-center justify-between text-red-300 bg-red-900/30 p-2 rounded-xl border border-red-500/30">
                    <span>ቀደም ሲል የገባበት ሰዓት፦</span>
                    <span className="font-bold">{new Date(activeResult.usedAt).toLocaleString()}</span>
                  </div>
                )}
              </div>
            )}

            {/* Action Bar */}
            <div className="flex items-center justify-end gap-2 pt-1">
              {activeResult.status === 'already_used' && activeResult.ticket && (
                <button
                  onClick={() => handleVerify(activeResult.ticket.ticketId, 'reset')}
                  className="px-3.5 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 font-bold text-xs cursor-pointer"
                >
                  <i className="fa-solid fa-rotate-left mr-1"></i> ዳግም ፍቀድ (Reset / Allow)
                </button>
              )}
              <button
                onClick={() => setActiveResult(null)}
                className="px-4 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs cursor-pointer"
              >
                ቀጣይ ቃኝ (Scan Next)
              </button>
            </div>
          </div>
        )}

        {/* ⌨️ Manual Ticket Code Entry Fallback */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (manualCode.trim()) handleVerify(manualCode);
          }}
          className="bg-[#0c1122] border border-white/10 rounded-2xl p-3.5 shadow-xl flex items-center gap-2"
        >
          <div className="relative flex-1">
            <i className="fa-solid fa-keyboard absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs"></i>
            <input
              type="text"
              value={manualCode}
              onChange={(e) => setManualCode(e.target.value)}
              placeholder="የትኬት ኮድ እዚህ ያስገቡ (e.g. TC-EVT-...)"
              className="w-full bg-slate-900/90 border border-white/10 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 outline-none focus:border-[#f9b03c] transition"
            />
          </div>
          <button
            type="submit"
            disabled={!manualCode.trim() || isVerifying}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#f9b03c] to-amber-500 text-slate-950 font-black text-xs shadow-md disabled:opacity-40 cursor-pointer active:scale-95 transition shrink-0"
          >
            አረጋግጥ (Verify)
          </button>
        </form>

        {/* 📋 Recent Gate Scans Log */}
        {scanHistory.length > 0 && (
          <div className="bg-[#080d1e]/80 border border-white/10 rounded-3xl p-4 space-y-3">
            <h3 className="text-xs font-black uppercase text-slate-400 tracking-wider flex items-center justify-between">
              <span>የቅርብ ጊዜ ቼክ-ኢኖች (Recent Scans)</span>
              <span className="text-[10px] text-slate-500">{scanHistory.length} ተመዝግበዋል</span>
            </h3>
            <div className="space-y-2 max-h-56 overflow-y-auto no-scrollbar">
              {scanHistory.map((item, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-2.5 rounded-xl bg-white/[0.03] border border-white/5 text-xs"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="text-sm">
                      {item.status === 'valid' ? '🟢' : item.status === 'already_used' ? '🔴' : '❌'}
                    </span>
                    <div>
                      <p className="font-bold text-white leading-tight">{item.name}</p>
                      <p className="font-mono text-[10px] text-slate-400">{item.ticketId}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] font-bold text-amber-300 block">{item.tier}</span>
                    <span className="text-[9px] text-slate-500">{item.time}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
