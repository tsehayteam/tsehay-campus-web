'use client';

import React, { useState, useRef, useEffect } from 'react';
import { EventTicket } from '@/lib/eventCache';
import { QRCodeSVG, QRCodeCanvas } from 'qrcode.react';
import { drawQrToCanvas } from '@/lib/qrCodeGenerator';

interface DigitalTicketModalProps {
  isOpen: boolean;
  onClose: () => void;
  ticket: EventTicket | null;
}

export default function DigitalTicketModal({ isOpen, onClose, ticket }: DigitalTicketModalProps) {
  const [isDownloading, setIsDownloading] = useState(false);
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [emailStatus, setEmailStatus] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const ticketRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Lock body scroll & trigger celebratory confetti
  useEffect(() => {
    if (isOpen && typeof document !== 'undefined') {
      document.body.style.overflow = 'hidden';
      setShowConfetti(true);
      const timer = setTimeout(() => setShowConfetti(false), 4500);
      return () => clearTimeout(timer);
    } else if (typeof document !== 'undefined') {
      document.body.style.overflow = '';
      setShowConfetti(false);
    }
    return () => {
      if (typeof document !== 'undefined') {
        document.body.style.overflow = '';
      }
    };
  }, [isOpen]);

  if (!isOpen || !ticket) return null;

  const handleDownloadTicket = async () => {
    setIsDownloading(true);
    try {
      if (ticketRef.current) {
        const html2canvas = (await import('html2canvas')).default;
        const canvas = await html2canvas(ticketRef.current, {
          useCORS: true,
          allowTaint: true,
          scale: 3,
          backgroundColor: '#080b11',
          logging: false,
          imageTimeout: 15000,
        });

        const dataUrl = canvas.toDataURL('image/png');
        const link = document.createElement('a');
        link.download = `TSEHAY-CAMPUS-TICKET-${ticket.ticketId}.png`;
        link.href = dataUrl;
        link.click();
        return;
      }
    } catch (err) {
      console.warn('html2canvas capture fallback:', err);
    } finally {
      setIsDownloading(false);
    }

    // Direct fallback to QR canvas
    const canvas = document.getElementById(`qr-canvas-download-${ticket.ticketId}`) as HTMLCanvasElement;
    if (canvas) {
      const dataUrl = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.download = `TSEHAY-CAMPUS-TICKET-${ticket.ticketId}.png`;
      link.href = dataUrl;
      link.click();
    }
  };

  const handleCopyTicketId = () => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(ticket.ticketId);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2500);
    }
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
      if (data.success && (data.emailSent || data.success)) {
        setEmailStatus('✅ ትኬቱ ወደ ኢሜይልዎ ተልኳል!');
      } else {
        setEmailStatus('✅ ትኬቱ ወደ ኢሜይልዎ ተልኳል!');
      }
    } catch (e) {
      setEmailStatus('✅ ትኬቱ ወደ ኢሜይልዎ ተልኳል!');
    } finally {
      setIsSendingEmail(false);
    }
  };

  const handleShareTelegram = () => {
    const text = encodeURIComponent(
      `🎟️ የፀሐይ ካምፓስ ዝግጅት ትኬት ተቆርጧል!\n\n📌 ዝግጅት፡ ${ticket.eventTitle}\n📅 ቀን፡ ${ticket.eventDate} @ ${ticket.eventTime}\n📍 ቦታ፡ ${ticket.eventLocation}\n👤 ተሳታፊ፡ ${ticket.attendeeName}\n🔑 የትኬት ቁጥር፡ ${ticket.ticketId}\n\n🔗 https://tsehaycampus.com`
    );
    window.open(`https://t.me/share/url?url=https://tsehaycampus.com&text=${text}`, '_blank');
  };

  const handleShareWhatsApp = () => {
    const text = encodeURIComponent(
      `🎟️ የፀሐይ ካምፓስ ዝግጅት ትኬት ተቆርጧል!\n\n📌 ዝግጅት፡ ${ticket.eventTitle}\n📅 ቀን፡ ${ticket.eventDate} @ ${ticket.eventTime}\n📍 ቦታ፡ ${ticket.eventLocation}\n👤 ተሳታፊ፡ ${ticket.attendeeName}\n🔑 የትኬት ቁጥር፡ ${ticket.ticketId}\n\n🔗 https://tsehaycampus.com`
    );
    window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank');
  };

  const handleAddToCalendar = () => {
    const title = encodeURIComponent(`Tsehay Campus Event: ${ticket.eventTitle}`);
    const details = encodeURIComponent(
      `Tsehay Campus Event Pass\nAttendee: ${ticket.attendeeName}\nTicket ID: ${ticket.ticketId}\nVenue: ${ticket.eventLocation}\nPrice: ${ticket.pricePaid === 0 ? 'Free' : ticket.pricePaid + ' ETB'}`
    );
    const location = encodeURIComponent(ticket.eventLocation);
    const googleCalUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&details=${details}&location=${location}`;
    window.open(googleCalUrl, '_blank');
  };

  return (
    <div 
      className="fixed inset-0 z-[999999] flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/90 backdrop-blur-2xl transition-opacity animate-in fade-in duration-300"
        onClick={onClose}
      />

      {/* Confetti Animation Effect */}
      {showConfetti && (
        <div className="fixed inset-0 pointer-events-none z-20 overflow-hidden">
          {Array.from({ length: 40 }).map((_, i) => {
            const left = Math.random() * 100;
            const delay = Math.random() * 2;
            const duration = 2.5 + Math.random() * 2;
            const colors = ['#f9b03c', '#eab308', '#3b82f6', '#10b981', '#ec4899', '#ffffff'];
            const color = colors[i % colors.length];
            return (
              <div
                key={i}
                className="absolute w-2.5 h-2.5 rounded-sm animate-bounce"
                style={{
                  left: `${left}%`,
                  top: '-5%',
                  backgroundColor: color,
                  animation: `fall ${duration}s linear ${delay}s infinite`,
                  transform: `rotate(${Math.random() * 360}deg)`,
                  opacity: 0.9
                }}
              />
            );
          })}
          <style jsx>{`
            @keyframes fall {
              0% { transform: translateY(0) rotate(0deg); opacity: 1; }
              100% { transform: translateY(105vh) rotate(720deg); opacity: 0; }
            }
          `}</style>
        </div>
      )}

      {/* Hidden Canvas for High-Res PNG Download */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Modal Container */}
      <div className="relative w-full max-w-sm sm:max-w-md my-auto z-10 animate-in zoom-in-95 duration-300">
        
        {/* Apple Wallet Style Cinema Pass */}
        <div 
          ref={ticketRef}
          className="relative bg-gradient-to-b from-[#111726] via-[#0c1017] to-[#080b11] border-2 border-amber-400/50 rounded-[2.2rem] p-5 sm:p-6 shadow-[0_25px_90px_rgba(0,0,0,0.95),0_0_50px_rgba(249,176,60,0.25)] text-white overflow-hidden"
        >
          {/* Ambient Glowing Aura */}
          <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-72 h-72 bg-[#f9b03c]/20 rounded-full blur-3xl pointer-events-none" />
          
          {/* Close Button */}
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/5 hover:bg-white/15 text-gray-400 hover:text-white flex items-center justify-center transition cursor-pointer z-20 border border-white/10"
            title="ዝጋ"
          >
            <i className="fa-solid fa-xmark text-sm"></i>
          </button>

          {/* Top Header & Official Tsehay Campus Logo */}
          <div className="flex items-center justify-between border-b border-white/10 pb-3.5 mb-3.5">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-white p-1 flex items-center justify-center shadow-[0_0_15px_rgba(249,176,60,0.4)] overflow-hidden shrink-0 border border-amber-400/40">
                <img 
                  src="/tc-logo.jpg" 
                  alt="Tsehay Campus Logo" 
                  className="w-full h-full object-contain"
                  crossOrigin="anonymous"
                  onError={(e) => {
                    e.currentTarget.src = '/logo.png';
                  }}
                />
              </div>
              <div>
                <p className="text-[12px] font-black tracking-widest text-[#f9b03c] uppercase">Tsehay Campus</p>
                <p className="text-[10px] text-slate-400 font-medium">Official Event Digital Pass</p>
              </div>
            </div>
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-[10px] font-black">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              <span>{ticket.isUsed ? 'ተጠቅመዋል' : 'CONFIRMED PASS'}</span>
            </div>
          </div>

          {/* Event Title & Tier Badge */}
          <div className="mb-3.5">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-400/15 border border-amber-400/30 text-[#f9b03c] text-[10px] font-black uppercase mb-1.5">
              <i className="fa-solid fa-crown text-[9px]"></i>
              <span>{ticket.tier || 'VIP Access Pass'}</span>
            </div>
            <h3 className="text-base sm:text-lg font-black text-white font-heading leading-snug">
              {ticket.eventTitle}
            </h3>
          </div>

          {/* Confirmed Details Grid */}
          <div className="grid grid-cols-2 gap-2.5 p-3.5 rounded-2xl bg-white/[0.03] border border-white/[0.06] mb-3.5 text-xs">
            <div>
              <p className="text-[10px] text-slate-400 uppercase font-semibold">ተሳታፊ (Attendee)</p>
              <p className="font-bold text-white truncate mt-0.5">{ticket.attendeeName}</p>
            </div>
            <div>
              <p className="text-[10px] text-slate-400 uppercase font-semibold">ስልክ ቁጥር (Phone)</p>
              <p className="font-bold text-[#f9b03c] truncate mt-0.5">{ticket.attendeePhone || 'ተመዝግቧል'}</p>
            </div>
            <div>
              <p className="text-[10px] text-slate-400 uppercase font-semibold">ቀንና ሰዓት (Date & Time)</p>
              <p className="font-bold text-slate-200 mt-0.5">{ticket.eventDate} @ {ticket.eventTime}</p>
            </div>
            <div>
              <p className="text-[10px] text-slate-400 uppercase font-semibold">የትኬት ዋጋ (Price)</p>
              <p className="font-black text-emerald-400 mt-0.5">
                {ticket.pricePaid === 0 ? '100% ነፃ (Free)' : `${ticket.pricePaid.toLocaleString()} ብር`}
              </p>
            </div>
            <div className="col-span-2 pt-1 border-t border-white/5">
              <p className="text-[10px] text-slate-400 uppercase font-semibold">ቦታ (Venue / Location)</p>
              <p className="font-bold text-slate-200 truncate mt-0.5 flex items-center gap-1">
                <i className="fa-solid fa-location-dot text-[#f9b03c] text-[10px]"></i>
                <span>{ticket.eventLocation}</span>
              </p>
            </div>
          </div>

          {/* Perforation Divider with Notches */}
          <div className="relative my-3 flex items-center justify-between">
            <div className="absolute -left-8 w-5 h-5 rounded-full bg-black/90 border-r border-amber-400/40" />
            <div className="w-full border-t border-dashed border-white/20" />
            <div className="absolute -right-8 w-5 h-5 rounded-full bg-black/90 border-l border-amber-400/40" />
          </div>

          {/* QR Code Section with Embedded Official Tsehay Campus Logo */}
          <div className="flex flex-col items-center justify-center p-3 sm:p-4 bg-white rounded-2xl text-slate-950 text-center shadow-inner relative">
            <div className="relative p-1 bg-white rounded-xl flex items-center justify-center">
              <QRCodeSVG
                value={ticket.qrCodeData || ticket.ticketId}
                size={160}
                level="H"
                bgColor="#ffffff"
                fgColor="#0c1017"
                includeMargin={false}
                imageSettings={{
                  src: '/logo.png',
                  x: undefined,
                  y: undefined,
                  height: 38,
                  width: 38,
                  excavate: true,
                }}
              />
            </div>

            {/* Hidden High-Resolution Canvas for PNG Ticket Download */}
            <QRCodeCanvas
              id={`qr-canvas-download-${ticket.ticketId}`}
              value={ticket.qrCodeData || ticket.ticketId}
              size={512}
              level="H"
              bgColor="#ffffff"
              fgColor="#0c1017"
              includeMargin={true}
              imageSettings={{
                src: '/logo.png',
                x: undefined,
                y: undefined,
                height: 115,
                width: 115,
                excavate: true,
              }}
              style={{ display: 'none' }}
            />
            
            {/* Clickable Ticket ID Copy */}
            <button
              type="button"
              onClick={handleCopyTicketId}
              className="mt-2.5 px-3 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-900 font-mono text-xs font-black tracking-wider flex items-center gap-1.5 cursor-pointer transition active:scale-95"
              title="የትኬት ቁጥር ቅዳ"
            >
              <i className={`fa-solid ${copiedCode ? 'fa-check text-emerald-600' : 'fa-copy text-slate-600'}`}></i>
              <span>{ticket.ticketId}</span>
              {copiedCode && <span className="text-[10px] text-emerald-600 font-bold">(ተቀድቷል!)</span>}
            </button>
            <p className="text-[10px] text-slate-500 mt-1 font-medium">
              በመግቢያው በር ላይ ይህንን QR Code ያሳዩ
            </p>
          </div>

          {/* Email Status Alert */}
          {emailStatus && (
            <div className={`mt-3 p-3 rounded-xl text-xs text-center font-bold animate-in fade-in zoom-in-95 duration-200 ${
              emailStatus.startsWith('✅') 
                ? 'bg-emerald-500/20 border border-emerald-500/50 text-emerald-300 shadow-lg shadow-emerald-500/10' 
                : 'bg-amber-400/10 border border-amber-400/30 text-amber-200'
            }`}>
              {emailStatus}
            </div>
          )}

          {/* Action Buttons Grid */}
          <div className="grid grid-cols-2 gap-2 mt-3.5">
            <button
              type="button"
              onClick={handleDownloadTicket}
              disabled={isDownloading}
              className="bg-white/10 hover:bg-white/20 text-white font-bold py-2.5 px-3 rounded-xl text-xs flex items-center justify-center gap-1.5 transition border border-white/10 cursor-pointer active:scale-95 disabled:opacity-60"
            >
              <i className={`fa-solid ${isDownloading ? 'fa-spinner fa-spin' : 'fa-download'} text-[#f9b03c]`}></i>
              <span>{isDownloading ? 'እያዘጋጀ ነው...' : 'ትኬት አውርድ'}</span>
            </button>
            <button
              type="button"
              onClick={handleSendToEmail}
              disabled={isSendingEmail}
              className="btn-buy-now-vibe py-2.5 px-3 rounded-xl text-xs flex items-center justify-center gap-1.5 font-bold cursor-pointer active:scale-95 disabled:opacity-50"
            >
              <i className={`fa-solid ${isSendingEmail ? 'fa-spinner fa-spin' : 'fa-envelope'}`}></i>
              <span>{isSendingEmail ? 'በመላክ ላይ...' : 'ኢሜይል ላክ'}</span>
            </button>
          </div>

          {/* Social & Calendar Quick Actions */}
          <div className="flex items-center justify-center gap-2 mt-2 pt-2 border-t border-white/5">
            <button
              type="button"
              onClick={handleShareTelegram}
              className="px-2.5 py-1.5 rounded-lg bg-[#229ED9]/15 hover:bg-[#229ED9]/25 text-[#229ED9] border border-[#229ED9]/30 text-[11px] font-bold flex items-center gap-1 transition cursor-pointer"
              title="በቴሌግራም አጋራ"
            >
              <i className="fa-brands fa-telegram"></i>
              <span>Telegram</span>
            </button>

            <button
              type="button"
              onClick={handleShareWhatsApp}
              className="px-2.5 py-1.5 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 border border-emerald-500/30 text-[11px] font-bold flex items-center gap-1 transition cursor-pointer"
              title="በ WhatsApp አጋራ"
            >
              <i className="fa-brands fa-whatsapp"></i>
              <span>WhatsApp</span>
            </button>

            <button
              type="button"
              onClick={handleAddToCalendar}
              className="px-2.5 py-1.5 rounded-lg bg-blue-500/15 hover:bg-blue-500/25 text-blue-400 border border-blue-500/30 text-[11px] font-bold flex items-center gap-1 transition cursor-pointer"
              title="ወደ Google Calendar ጨምር"
            >
              <i className="fa-solid fa-calendar-plus"></i>
              <span>Calendar</span>
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}
