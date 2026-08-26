'use client';

import React, { useState, useRef, useEffect } from 'react';
import { EventTicket } from '@/lib/eventCache';
import { generateTicketQrSvg, drawQrToCanvas } from '@/lib/qrCodeGenerator';

interface DigitalTicketModalProps {
  isOpen: boolean;
  onClose: () => void;
  ticket: EventTicket | null;
}

export default function DigitalTicketModal({ isOpen, onClose, ticket }: DigitalTicketModalProps) {
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [emailStatus, setEmailStatus] = useState<string | null>(null);
  const ticketRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Lock body scroll
  useEffect(() => {
    if (isOpen && typeof document !== 'undefined') {
      document.body.style.overflow = 'hidden';
    } else if (typeof document !== 'undefined') {
      document.body.style.overflow = '';
    }
    return () => {
      if (typeof document !== 'undefined') {
        document.body.style.overflow = '';
      }
    };
  }, [isOpen]);

  if (!isOpen || !ticket) return null;

  const qrSvg = generateTicketQrSvg(ticket.qrCodeData || ticket.ticketId, {
    width: 180,
    height: 180,
    colorDark: '#0c1017',
    colorLight: '#ffffff'
  });

  const handleDownloadTicket = () => {
    if (!canvasRef.current) return;
    const dataUrl = drawQrToCanvas(canvasRef.current, ticket.qrCodeData || ticket.ticketId, {
      width: 400,
      height: 400,
      colorDark: '#000000',
      colorLight: '#ffffff'
    });

    const link = document.createElement('a');
    link.download = `TSEHAY-TICKET-${ticket.ticketId}.png`;
    link.href = dataUrl;
    link.click();
  };

  const handleSendToEmail = async () => {
    setIsSendingEmail(true);
    setEmailStatus(null);
    try {
      const res = await fetch('/api/events/send-ticket-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ticket: ticket,
          email: ticket.attendeeEmail
        })
      });
      const data = await res.json();
      if (data.success) {
        setEmailStatus(`✅ ትኬቱ ወደ ${ticket.attendeeEmail} ተልኳል!`);
      } else {
        setEmailStatus('⚠️ ወደ ኢሜይል መላክ አልተቻለም፤ እባክዎ ትኬቱን በቀጥታ ያውርዱ።');
      }
    } catch (e) {
      setEmailStatus('⚠️ ወደ ኢሜይል መላክ አልተቻለም፤ እባክዎ ትኬቱን በቀጥታ ያውርዱ።');
    } finally {
      setIsSendingEmail(false);
    }
  };

  return (
    <div 
      className="fixed inset-0 z-[999999] flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/85 backdrop-blur-xl transition-opacity animate-in fade-in duration-300"
        onClick={onClose}
      />

      {/* Hidden Canvas for High-Res PNG Download */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Modal Container */}
      <div className="relative w-full max-w-sm sm:max-w-md my-auto z-10 animate-in zoom-in-95 duration-300">
        
        {/* Apple Wallet Style Cinema Pass */}
        <div 
          ref={ticketRef}
          className="relative bg-gradient-to-b from-[#111726] via-[#0c1017] to-[#080b11] border-2 border-amber-400/50 rounded-[2rem] p-6 shadow-[0_25px_90px_rgba(0,0,0,0.95),0_0_50px_rgba(249,176,60,0.25)] text-white overflow-hidden"
        >
          {/* Ambient Glowing Aura */}
          <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-64 h-64 bg-[#f9b03c]/25 rounded-full blur-3xl pointer-events-none" />
          
          {/* Close Button */}
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/5 hover:bg-white/15 text-gray-400 hover:text-white flex items-center justify-center transition cursor-pointer z-20 border border-white/10"
            title="ዝጋ"
          >
            <i className="fa-solid fa-xmark text-sm"></i>
          </button>

          {/* Top Header & Holographic Seal */}
          <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-[#f9b03c] to-amber-400 text-slate-950 flex items-center justify-center font-black text-xs shadow-[0_0_15px_rgba(249,176,60,0.5)]">
                TC
              </div>
              <div>
                <p className="text-[11px] font-black tracking-widest text-[#f9b03c] uppercase">Tsehay Campus</p>
                <p className="text-[10px] text-slate-400">Official Event Digital Pass</p>
              </div>
            </div>
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-[10px] font-black">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              <span>{ticket.isUsed ? 'ተጠቅመዋል' : 'VALID PASS'}</span>
            </div>
          </div>

          {/* Event Title & Tier */}
          <div className="mb-4">
            <div className="inline-block px-2 py-0.5 rounded bg-amber-400/15 text-[#f9b03c] text-[10px] font-black uppercase mb-1">
              {ticket.tier || 'VIP Access'}
            </div>
            <h3 className="text-lg font-black text-white font-heading leading-snug">
              {ticket.eventTitle}
            </h3>
          </div>

          {/* Details Grid */}
          <div className="grid grid-cols-2 gap-3 p-3.5 rounded-2xl bg-white/[0.03] border border-white/[0.06] mb-4 text-xs">
            <div>
              <p className="text-[10px] text-slate-400 uppercase font-semibold">ተሳታፊ (Attendee)</p>
              <p className="font-bold text-white truncate mt-0.5">{ticket.attendeeName}</p>
            </div>
            <div>
              <p className="text-[10px] text-slate-400 uppercase font-semibold">የተከፈለበት ዋጋ (Price)</p>
              <p className="font-bold text-[#f9b03c] mt-0.5">
                {ticket.pricePaid === 0 ? 'ነፃ (Free)' : `${ticket.pricePaid.toLocaleString()} ብር`}
              </p>
            </div>
            <div>
              <p className="text-[10px] text-slate-400 uppercase font-semibold">ቀን (Date)</p>
              <p className="font-bold text-slate-200 mt-0.5">{ticket.eventDate}</p>
            </div>
            <div>
              <p className="text-[10px] text-slate-400 uppercase font-semibold">ሰዓት (Time)</p>
              <p className="font-bold text-slate-200 mt-0.5">{ticket.eventTime}</p>
            </div>
            <div className="col-span-2">
              <p className="text-[10px] text-slate-400 uppercase font-semibold">ቦታ (Venue / Location)</p>
              <p className="font-bold text-slate-200 truncate mt-0.5 flex items-center gap-1">
                <i className="fa-solid fa-location-dot text-[#f9b03c] text-[10px]"></i>
                <span>{ticket.eventLocation}</span>
              </p>
            </div>
          </div>

          {/* Perforation Divider with Notches */}
          <div className="relative my-4 flex items-center justify-between">
            <div className="absolute -left-8 w-5 h-5 rounded-full bg-black/90 border-r border-amber-400/40" />
            <div className="w-full border-t border-dashed border-white/20" />
            <div className="absolute -right-8 w-5 h-5 rounded-full bg-black/90 border-l border-amber-400/40" />
          </div>

          {/* QR Code Section */}
          <div className="flex flex-col items-center justify-center p-4 bg-white rounded-2xl text-slate-950 text-center shadow-inner">
            <div 
              className="w-40 h-40 flex items-center justify-center"
              dangerouslySetInnerHTML={{ __html: qrSvg }}
            />
            <p className="text-[11px] font-mono font-black tracking-widest text-slate-900 mt-2">
              {ticket.ticketId}
            </p>
            <p className="text-[10px] text-slate-500 mt-0.5">
              በመግቢያው በር ላይ ይህንን QR Code ያሳዩ
            </p>
          </div>

          {/* Email Status Alert */}
          {emailStatus && (
            <div className="mt-3 p-2.5 rounded-xl bg-amber-400/10 border border-amber-400/30 text-xs text-amber-200 text-center">
              {emailStatus}
            </div>
          )}

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-2 mt-4">
            <button
              type="button"
              onClick={handleDownloadTicket}
              className="bg-white/10 hover:bg-white/20 text-white font-bold py-2.5 px-3 rounded-xl text-xs flex items-center justify-center gap-1.5 transition border border-white/10 cursor-pointer active:scale-95"
            >
              <i className="fa-solid fa-download text-[#f9b03c]"></i>
              <span>ትኬት አውርድ</span>
            </button>
            <button
              type="button"
              onClick={handleSendToEmail}
              disabled={isSendingEmail}
              className="btn-buy-now-vibe py-2.5 px-3 rounded-xl text-xs flex items-center justify-center gap-1.5 font-bold cursor-pointer active:scale-95 disabled:opacity-50"
            >
              <i className="fa-solid fa-envelope"></i>
              <span>{isSendingEmail ? 'በመላክ ላይ...' : 'ኢሜይል ላክ'}</span>
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}
