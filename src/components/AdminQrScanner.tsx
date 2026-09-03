'use client';

import React, { useState, useRef, useEffect } from 'react';
import { db } from '@/lib/firebase/config';
import { doc, getDoc, updateDoc, setDoc, collection, query, where, getDocs } from 'firebase/firestore';
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
    status: 'success' | 'already_used' | 'not_found' | 'network_error';
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

  const playBeep = (type: 'success' | 'warning' | 'error') => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();

      if (type === 'success') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, audioCtx.currentTime); // A5
        gain.gain.setValueAtTime(0.18, audioCtx.currentTime);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.18);
      } else if (type === 'warning') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(440, audioCtx.currentTime);
        gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.25);
      } else {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(220, audioCtx.currentTime);
        gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.35);
      }
    } catch (e) {}
  };

  // Helper to extract clean Ticket ID from QR codes or text
  const extractTicketId = (rawInput: string): string => {
    const trimmed = (rawInput || '').trim();
    try {
      const parsed = JSON.parse(trimmed);
      if (parsed.tId) return parsed.tId.toUpperCase();
      if (parsed.ticketId) return parsed.ticketId.toUpperCase();
    } catch (e) {
      // Regex check
      const match = trimmed.match(/TC-EVT-[A-Z0-9]+-[A-Z0-9]+/i) || trimmed.match(/TKT-[A-Z0-9-]+/i);
      if (match) return match[0].toUpperCase();
    }
    return trimmed.toUpperCase();
  };

  // 🛡️ Comprehensive Verification Engine (Server API + Direct Client Firestore Fallback)
  const verifyTicketData = async (rawInput: string) => {
    const ticketId = extractTicketId(rawInput);
    if (!ticketId || isVerifying) return;

    setIsVerifying(true);
    setScanResult(null);

    try {
      // 1. Try Server API
      let apiSuccess = false;
      try {
        const res = await fetch('/api/events/verify-ticket', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ qrData: rawInput, ticketId })
        });

        const contentType = res.headers.get('content-type') || '';
        if (contentType.includes('application/json')) {
          const data = await res.json();
          apiSuccess = true;

          if (data.status === 'verified_success' || data.success) {
            playBeep('success');
            setScanResult({
              status: 'success',
              message: 'ትክክለኛ ቲኬት! ተማሪውን ማሳለፍ ይችላሉ (Valid Ticket, Access Granted).',
              ticket: data.ticket
            });
            if (onTicketScanned && data.ticket) onTicketScanned(data.ticket);
          } else if (data.status === 'already_used') {
            playBeep('warning');
            setScanResult({
              status: 'already_used',
              message: 'ይህ ቲኬት ከዚህ በፊት ጥቅም ላይ ውሏል (Ticket already used).',
              ticket: data.ticket
            });
          } else if (data.status === 'not_found') {
            playBeep('error');
            setScanResult({
              status: 'not_found',
              message: 'ይቅርታ፣ ይህ ቲኬት አልተገኘም (Invalid Ticket).'
            });
          } else {
            apiSuccess = false; // Fallback to client Firestore check
          }
        }
      } catch (apiErr) {
        console.warn('Server API verification notice, switching to direct client Firestore query:', apiErr);
      }

      // 2. Direct Client Firestore Fallback if server API did not complete
      if (!apiSuccess && db) {
        try {
          let foundDocRef: any = null;
          let foundTicketData: any = null;

          // Candidate collections in Firestore
          const candidateCollections = [
            'event_registrations',
            'event_tickets',
            'tickets'
          ];

          // A. Try direct document lookup
          for (const colName of candidateCollections) {
            const docRef = doc(db, colName, ticketId);
            const snap = await getDoc(docRef);
            if (snap.exists()) {
              foundDocRef = docRef;
              foundTicketData = { id: snap.id, ...snap.data() };
              break;
            }
          }

          // B. Try nested collection lookup
          if (!foundTicketData) {
            const nestedRef = doc(db, 'artifacts', 'tsehaycampus-e1a6d', 'event_tickets', ticketId);
            const nestedSnap = await getDoc(nestedRef);
            if (nestedSnap.exists()) {
              foundDocRef = nestedRef;
              foundTicketData = { id: nestedSnap.id, ...nestedSnap.data() };
            }
          }

          // C. Try where('ticketId', '==', ticketId) query
          if (!foundTicketData) {
            for (const colName of candidateCollections) {
              const q = query(collection(db, colName), where('ticketId', '==', ticketId));
              const qSnap = await getDocs(q);
              if (!qSnap.empty) {
                const first = qSnap.docs[0];
                foundDocRef = first.ref;
                foundTicketData = { id: first.id, ...first.data() };
                break;
              }
            }
          }

          // State 1: NOT FOUND
          if (!foundTicketData) {
            playBeep('error');
            setScanResult({
              status: 'not_found',
              message: 'ይቅርታ፣ ይህ ቲኬት አልተገኘም (Invalid Ticket).'
            });
            return;
          }

          // State 2: ALREADY USED
          if (foundTicketData.isUsed) {
            playBeep('warning');
            setScanResult({
              status: 'already_used',
              message: 'ይህ ቲኬት ከዚህ በፊት ጥቅም ላይ ውሏል (Ticket already used).',
              ticket: foundTicketData
            });
            return;
          }

          // State 3: SUCCESS (VALID)
          const nowIso = new Date().toISOString();
          const updateData = {
            isUsed: true,
            checkedIn: true,
            usedAt: nowIso,
            verifiedBy: 'Admin Scanner (Client)'
          };

          if (foundDocRef) {
            await setDoc(foundDocRef, updateData, { merge: true });
          }

          try {
            await setDoc(doc(db, 'event_registrations', ticketId), updateData, { merge: true });
          } catch (e) {}

          const updated = {
            ...foundTicketData,
            isUsed: true,
            checkedIn: true,
            usedAt: nowIso
          };

          playBeep('success');
          setScanResult({
            status: 'success',
            message: 'ትክክለኛ ቲኬት! ተማሪውን ማሳለፍ ይችላሉ (Valid Ticket, Access Granted).',
            ticket: updated
          });

          if (onTicketScanned) onTicketScanned(updated);
        } catch (clientDbErr: any) {
          console.error('Client Firestore Verification Error:', clientDbErr);
          playBeep('error');
          setScanResult({
            status: 'network_error',
            message: 'የኔትወርክ ወይም የዳታቤዝ ግንኙነት ችግር አጋጥሟል (Network error).'
          });
        }
      }
    } catch (outerErr: any) {
      console.error('Unhandled Verification Exception:', outerErr);
      playBeep('error');
      setScanResult({
        status: 'network_error',
        message: 'የኔትወርክ ወይም የዳታቤዝ ግንኙነት ችግር አጋጥሟል (Network error).'
      });
    } finally {
      setIsVerifying(false);
    }
  };

  const startScannerLoop = () => {
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
              የተማሪውን ትኬት በካሜራ በመቃኘት ወይም የቲኬት መለያ ቁጥሩን በማስገባት ትክክለኛነቱን በቅጽበት ያረጋግጡ።
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
            placeholder="የትኬት ቁጥር አስገባ (ለምሳሌ፡ TC-EVT-L7UG-S96K)"
            className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-500 uppercase focus:outline-hidden focus:border-[#f9b03c]"
          />
          <button
            type="submit"
            disabled={isVerifying || !manualTicketId.trim()}
            className="btn-buy-now-vibe px-5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer active:scale-95 disabled:opacity-50"
          >
            <i className="fa-solid fa-shield-halved"></i>
            <span>{isVerifying ? 'በማረጋገጥ ላይ...' : 'አረጋግጥ (Verify)'}</span>
          </button>
        </form>
      </div>

      {/* 3 Explicit States UI Cards */}
      {scanResult && (
        <div className={`p-6 rounded-3xl border animate-in zoom-in-95 duration-200 shadow-2xl ${
          scanResult.status === 'success' 
            ? 'bg-emerald-950/60 border-emerald-500/50 text-emerald-100 shadow-[0_15px_45px_rgba(16,185,129,0.25)]'
            : scanResult.status === 'already_used'
            ? 'bg-amber-950/60 border-amber-500/50 text-amber-100 shadow-[0_15px_45px_rgba(245,158,11,0.25)]'
            : 'bg-red-950/60 border-red-500/50 text-red-100 shadow-[0_15px_45px_rgba(239,68,68,0.25)]'
        }`}>
          <div className="flex items-start gap-4">
            
            {/* Status Icon Badge */}
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-xl shrink-0 ${
              scanResult.status === 'success'
                ? 'bg-emerald-500 text-slate-950 shadow-[0_0_25px_rgba(16,185,129,0.6)]'
                : scanResult.status === 'already_used'
                ? 'bg-amber-400 text-slate-950 shadow-[0_0_25px_rgba(245,158,11,0.6)]'
                : 'bg-red-500 text-white shadow-[0_0_25px_rgba(239,68,68,0.6)]'
            }`}>
              <i className={
                scanResult.status === 'success' 
                  ? 'fa-solid fa-check text-2xl font-black' 
                  : scanResult.status === 'already_used' 
                  ? 'fa-solid fa-triangle-exclamation text-xl' 
                  : 'fa-solid fa-xmark text-2xl font-black'
              }></i>
            </div>

            <div className="flex-1">
              <h4 className="text-lg font-black leading-snug">{scanResult.message}</h4>
              
              {/* Attendee Details Card when ticket is present */}
              {scanResult.ticket && (
                <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3 bg-black/50 p-4 rounded-2xl border border-white/10 text-xs">
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-semibold">ተሳታፊ (Attendee)</span>
                    <strong className="text-white text-sm block mt-0.5">{scanResult.ticket.attendeeName}</strong>
                    {scanResult.ticket.attendeeEmail && (
                      <span className="text-[11px] text-slate-400 truncate block">{scanResult.ticket.attendeeEmail}</span>
                    )}
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-semibold">ክንውን (Event)</span>
                    <strong className="text-white truncate block mt-0.5">{scanResult.ticket.eventTitle}</strong>
                    <span className="text-[11px] text-[#f9b03c] block">{scanResult.ticket.eventDate}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-semibold">ደረጃ (Tier)</span>
                    <strong className="text-[#f9b03c] block mt-0.5">{scanResult.ticket.tier || 'VIP Pass'}</strong>
                    <span className="text-[11px] text-slate-400 block">
                      {scanResult.ticket.pricePaid === 0 ? 'ነፃ (Free)' : `${scanResult.ticket.pricePaid} ብር`}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-semibold">የትኬት መለያ (ID)</span>
                    <span className="font-mono text-white text-[12px] font-bold block mt-0.5">{scanResult.ticket.ticketId}</span>
                    {scanResult.ticket.usedAt && (
                      <span className="text-[10px] text-amber-300 block">
                        ተረጋግጧል፡ {new Date(scanResult.ticket.usedAt).toLocaleTimeString()}
                      </span>
                    )}
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
