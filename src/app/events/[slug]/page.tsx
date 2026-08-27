'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import DigitalTicketModal from '@/components/DigitalTicketModal';
import ShareEventModal from '@/components/ShareEventModal';
import { TsehayEvent, EventTicket, DEFAULT_EVENTS, getCachedEvents, getEventBySlugOrId, getRemainingSeats } from '@/lib/eventCache';
import { useAuth } from '@/context/AuthContext';

export default function EventDetailPage() {
  const params = useParams();
  const router = useRouter();
  const slug = (params?.slug as string) || '';
  const { user } = useAuth();

  const [event, setEvent] = useState<TsehayEvent | null>(() => getEventBySlugOrId(slug, getCachedEvents()));
  const [loading, setLoading] = useState(true);

  // Booking & Payment Modal State
  const [isBookingOpen, setIsBookingOpen] = useState(false);
  const [attendeeName, setAttendeeName] = useState(user?.displayName || '');
  const [attendeeEmail, setAttendeeEmail] = useState(user?.email || '');
  const [attendeePhone, setAttendeePhone] = useState('');
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<'lakipay' | 'paypal'>('lakipay');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [bookingError, setBookingError] = useState<string | null>(null);

  // Active Ticket Pass Modal & Share Modal State
  const [activeTicket, setActiveTicket] = useState<EventTicket | null>(null);
  const [isTicketModalOpen, setIsTicketModalOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);

  // Fetch from server API
  useEffect(() => {
    const loadEvent = async () => {
      try {
        const res = await fetch('/api/events');
        if (res.ok) {
          const data = await res.json();
          if (data.events && Array.isArray(data.events)) {
            const found = getEventBySlugOrId(slug, data.events);
            if (found) {
              setEvent(found);
            }
          }
        }
      } catch (e) {
        console.warn("Event fetch error:", e);
      } finally {
        setLoading(false);
      }
    };
    loadEvent();
  }, [slug]);

  // Sync user info
  useEffect(() => {
    if (user) {
      if (user.displayName && !attendeeName) setAttendeeName(user.displayName);
      if (user.email && !attendeeEmail) setAttendeeEmail(user.email);
    }
  }, [user]);

  // 🌟 Issue Confirmed Ticket & Trigger Email Pass
  const issueConfirmedTicket = async (customPayload?: any) => {
    if (!event) return null;

    const payload = customPayload || {
      eventId: event.id,
      eventSlug: event.slug,
      eventTitle: event.title,
      eventDate: event.date,
      eventTime: event.time,
      eventLocation: event.location,
      isOnline: event.isOnline,
      meetingLink: event.meetingLink,
      mapsUrl: event.mapsUrl,
      name: attendeeName.trim(),
      email: attendeeEmail.trim(),
      phone: attendeePhone.trim(),
      attendeeName: attendeeName.trim(),
      attendeeEmail: attendeeEmail.trim(),
      attendeePhone: attendeePhone.trim(),
      userId: user?.uid || `guest_${Date.now()}`,
      pricePaid: event.price || 0,
      paymentMethod: event.price === 0 || event.isFree ? 'free' : selectedPaymentMethod,
      tier: event.price > 1200 ? 'VIP Pass' : 'General Admission'
    };

    let ticketObj: EventTicket | null = null;

    try {
      const res = await fetch('/api/events/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const contentType = res.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        const data = await res.json();
        if (data && (data.ticket || data.ticketId)) {
          ticketObj = data.ticket;
        }
      }
    } catch (apiErr) {
      console.warn('API register error:', apiErr);
    }

    if (!ticketObj) {
      const timeHex = Date.now().toString(36).substring(4).toUpperCase();
      const randHex = Math.random().toString(36).substring(2, 6).toUpperCase();
      const localId = `TC-EVT-${timeHex}-${randHex}`;
      ticketObj = {
        ticketId: localId,
        eventId: event.id,
        eventSlug: event.slug,
        eventTitle: event.title,
        eventDate: event.date,
        eventTime: event.time,
        eventLocation: event.location,
        isOnline: event.isOnline,
        meetingLink: event.meetingLink,
        mapsUrl: event.mapsUrl,
        attendeeName: payload.attendeeName,
        attendeeEmail: payload.attendeeEmail,
        attendeePhone: payload.attendeePhone,
        userId: payload.userId,
        tier: payload.tier as any,
        pricePaid: event.price || 0,
        paymentMethod: payload.paymentMethod,
        qrCodeData: JSON.stringify({ tId: localId, eId: event.id, name: payload.attendeeName }),
        isUsed: false,
        usedAt: null,
        issuedAt: new Date().toISOString()
      };
    }

    setActiveTicket(ticketObj);
    setIsBookingOpen(false);
    setIsTicketModalOpen(true);
    return ticketObj;
  };

  // 🌟 Post-Payment Return Listener (Auto-issue ticket after successful LakiPay redirect)
  useEffect(() => {
    if (typeof window !== 'undefined' && event) {
      const urlParams = new URLSearchParams(window.location.search);
      const isSuccess = urlParams.get('payment') === 'success' || urlParams.get('status') === 'success';
      const storedPending = sessionStorage.getItem('tsehay_pending_event_reg');
      
      if (isSuccess && storedPending) {
        try {
          const pendingData = JSON.parse(storedPending);
          if (pendingData.eventId === event.id || pendingData.eventSlug === event.slug) {
            sessionStorage.removeItem('tsehay_pending_event_reg');
            issueConfirmedTicket(pendingData);
          }
        } catch (e) {}
      }
    }
  }, [event]);

  const handleConfirmBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!event) return;

    if (!attendeeName.trim() || !attendeeEmail.trim()) {
      setBookingError('እባክዎ ሙሉ ስምዎን እና ኢሜይልዎን ያስገቡ።');
      return;
    }

    setIsSubmitting(true);
    setBookingError(null);

    try {
      // 1. If paid event: Initiate Payment Gateway (LakiPay / PayPal)
      if (event.price > 0 && !event.isFree) {
        const pendingPayload = {
          eventId: event.id,
          eventSlug: event.slug,
          eventTitle: event.title,
          eventDate: event.date,
          eventTime: event.time,
          eventLocation: event.location,
          isOnline: event.isOnline,
          meetingLink: event.meetingLink,
          mapsUrl: event.mapsUrl,
          name: attendeeName.trim(),
          email: attendeeEmail.trim(),
          phone: attendeePhone.trim(),
          attendeeName: attendeeName.trim(),
          attendeeEmail: attendeeEmail.trim(),
          attendeePhone: attendeePhone.trim(),
          userId: user?.uid || `guest_${Date.now()}`,
          pricePaid: event.price,
          paymentMethod: selectedPaymentMethod,
          tier: event.price > 1200 ? 'VIP Pass' : 'General Admission'
        };

        if (typeof window !== 'undefined') {
          sessionStorage.setItem('tsehay_pending_event_reg', JSON.stringify(pendingPayload));
        }

        const checkoutRes = await fetch('/api/initiate-payment', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            courseId: event.id,
            title: event.title,
            price: event.price,
            userEmail: attendeeEmail.trim(),
            userId: user?.uid || 'guest_user',
            paymethod: selectedPaymentMethod,
            returnUrl: typeof window !== 'undefined' ? `${window.location.origin}/events/${event.slug || event.id}?payment=success` : undefined
          })
        });

        if (checkoutRes.ok) {
          const checkoutData = await checkoutRes.json().catch(() => null);
          if (checkoutData && checkoutData.checkoutUrl) {
            window.location.href = checkoutData.checkoutUrl;
            return;
          }
        }
      }

      // 2. If free event: Immediately issue confirmed ticket pass & send email
      await issueConfirmedTicket();
    } catch (err: any) {
      console.error('Booking confirmation error:', err);
      setBookingError(err?.message || 'ትኬቱን ማዘጋጀት አልተቻለም፤ እባክዎ በድጋሚ ይሞክሩ።');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading && !event) {
    return (
      <div className="min-h-screen bg-[#06090e] text-white flex flex-col items-center justify-center p-4">
        <div className="w-12 h-12 rounded-full border-2 border-amber-400 border-t-transparent animate-spin mb-4" />
        <p className="text-sm font-bold text-slate-300">የክንውኑ መረጃ በመጫን ላይ ነው...</p>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-screen bg-[#06090e] text-white flex flex-col justify-between">
        <div className="max-w-xl mx-auto text-center px-4 py-32">
          <div className="w-16 h-16 rounded-2xl bg-amber-400/10 border border-amber-400/30 text-[#f9b03c] flex items-center justify-center text-2xl mx-auto mb-4">
            <i className="fa-solid fa-calendar-xmark"></i>
          </div>
          <h2 className="text-2xl font-black font-heading mb-2">ክንውኑ አልተገኘም (Event Not Found)</h2>
          <p className="text-slate-400 text-sm mb-6">የፈለጉት የቀጥታ ስልጠና ወይም ወርክሾፕ አልተገኘም ወይም ጊዜው አልፏል።</p>
          <Link href="/#events" className="btn-buy-now-vibe px-6 py-3 rounded-xl text-xs font-black inline-flex items-center gap-2">
            <i className="fa-solid fa-arrow-left"></i>
            <span>ወደ ሁሉም ክንውኖች ተመለስ</span>
          </Link>
        </div>
        <Footer />
      </div>
    );
  }

  const remainingSeats = getRemainingSeats(event);
  const percentTaken = Math.min(100, Math.round(((event.registeredCount || 0) / (event.capacity || 100)) * 100));

  return (
    <div className="min-h-screen bg-[#06090e] text-white flex flex-col justify-between selection:bg-[#f9b03c] selection:text-black">
      <main className="flex-1 pt-24 pb-20 relative overflow-hidden">
        
        {/* Ambient Glows */}
        <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[700px] h-[400px] bg-[#f9b03c]/10 rounded-full blur-[160px] pointer-events-none" />
        <div className="absolute top-96 right-10 w-96 h-96 bg-blue-600/10 rounded-full blur-[140px] pointer-events-none" />

        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          
          {/* Breadcrumb & Top Bar */}
          <div className="flex flex-wrap items-center justify-between gap-4 mb-8 pt-4">
            <Link 
              href="/#events" 
              className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-xs text-slate-300 transition"
            >
              <i className="fa-solid fa-arrow-left text-[#f9b03c] text-xs"></i>
              <span>ወደ ዋናው ገጽ (All Events)</span>
            </Link>

            <button
              type="button"
              onClick={() => setIsShareModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#3268ba] hover:bg-[#254f8e] text-white text-xs font-black transition shadow-[0_0_20px_rgba(50,104,186,0.4)] border border-[#4a85df]/50 cursor-pointer active:scale-95"
              title="ክንውኑን አጋራ (Share Event)"
            >
              <i className="fa-solid fa-share-nodes text-white text-xs"></i>
              <span>አጋራ (Share Event)</span>
            </button>
          </div>

          {/* Cinematic Hero Container */}
          <div 
            className="rounded-[2.5rem] p-6 sm:p-10 lg:p-12 mb-12 relative overflow-hidden"
            style={{
              background: 'rgba(3, 5, 9, 0.9)',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              boxShadow: '0 30px 100px rgba(0,0,0,0.85), 0 0 50px rgba(249,176,60,0.1)'
            }}
          >
            {/* Top Event Badge & Format */}
            <div className="flex flex-wrap items-center gap-3 mb-6">
              <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-400/10 border border-amber-400/30 text-[#f9b03c] text-xs font-black">
                <span className="w-2 h-2 rounded-full bg-[#f9b03c] animate-ping"></span>
                <span>ይፋዊ የቀጥታ ዝግጅት • Official Event</span>
              </span>

              {event.isOnline ? (
                <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-blue-500/15 border border-blue-500/30 text-blue-400 text-xs font-black">
                  <i className="fa-solid fa-video"></i>
                  <span>Online Google Meet (የቀጥታ ስብሰባ)</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-black">
                  <i className="fa-solid fa-location-dot"></i>
                  <span>In-Person (በአካል የሚካሄድ)</span>
                </span>
              )}
            </div>

            {/* Grid: Details (Left) + Banner Card (Right) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
              
              {/* Left Column (7 cols) */}
              <div className="lg:col-span-7 space-y-6">
                <h1 className="text-2xl sm:text-4xl lg:text-5xl font-black font-heading text-white tracking-tight leading-tight">
                  {event.title}
                </h1>

                {event.titleEn && (
                  <p className="text-sm font-semibold text-[#f9b03c] tracking-wide">
                    {event.titleEn}
                  </p>
                )}

                <p className="text-slate-300 text-sm sm:text-base leading-relaxed font-body">
                  {event.description}
                </p>

                {/* Key Event Badges Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-white/[0.03] border border-white/[0.07]">
                    <div className="w-10 h-10 rounded-xl bg-amber-400/10 text-[#f9b03c] flex items-center justify-center text-base shrink-0">
                      <i className="fa-regular fa-calendar"></i>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase font-bold text-slate-400">ቀን (Date)</p>
                      <p className="text-xs font-black text-white">{event.date}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-white/[0.03] border border-white/[0.07]">
                    <div className="w-10 h-10 rounded-xl bg-amber-400/10 text-[#f9b03c] flex items-center justify-center text-base shrink-0">
                      <i className="fa-regular fa-clock"></i>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase font-bold text-slate-400">ሰዓት (Time)</p>
                      <p className="text-xs font-black text-white">{event.time}</p>
                    </div>
                  </div>

                  <div className="sm:col-span-2 flex items-center justify-between p-3.5 rounded-2xl bg-white/[0.03] border border-white/[0.07]">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-amber-400/10 text-[#f9b03c] flex items-center justify-center text-base shrink-0">
                        <i className="fa-solid fa-location-dot"></i>
                      </div>
                      <div>
                        <p className="text-[10px] uppercase font-bold text-slate-400">ቦታ / አዳራሽ (Venue)</p>
                        <p className="text-xs font-black text-white">{event.location}</p>
                      </div>
                    </div>
                    {!event.isOnline && event.mapsUrl && (
                      <a
                        href={event.mapsUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/15 border border-white/10 text-[11px] text-[#f9b03c] font-bold inline-flex items-center gap-1.5 transition"
                      >
                        <i className="fa-solid fa-map-location-dot"></i>
                        <span>Maps ላይ እይ</span>
                      </a>
                    )}
                  </div>
                </div>

                {/* Speaker Spotlight */}
                <div className="flex items-center gap-4 p-4 rounded-2xl bg-gradient-to-r from-white/[0.04] to-transparent border border-white/10">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-400 to-[#f9b03c] text-slate-950 flex items-center justify-center text-xl font-black shadow-md">
                    <i className="fa-solid fa-microphone-lines"></i>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-400 uppercase font-bold">ዋና አሰልጣኝ / አቅራቢ</p>
                    <h4 className="text-sm sm:text-base font-black text-white">{event.speaker}</h4>
                    <p className="text-xs text-[#f9b03c] font-medium">{event.speakerRole || 'Lead Mentor'}</p>
                  </div>
                </div>

                {/* Action CTA & Progress Bar */}
                <div className="pt-4 space-y-4">
                  <div>
                    <div className="flex justify-between text-xs font-bold mb-1.5">
                      <span className="text-slate-300">የተያዙ ቦታዎች ({percentTaken}%)</span>
                      <span className="text-[#f9b03c]">{remainingSeats} ቦታዎች ብቻ ቀርተዋል!</span>
                    </div>
                    <div className="w-full h-2.5 bg-white/10 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-amber-500 to-[#f9b03c] rounded-full transition-all duration-1000"
                        style={{ width: `${percentTaken}%` }}
                      />
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row items-center gap-4 pt-2">
                    <button
                      type="button"
                      onClick={() => setIsBookingOpen(true)}
                      className="w-full sm:flex-1 btn-buy-now-vibe py-4 rounded-2xl text-base font-black flex items-center justify-center gap-2.5 cursor-pointer active:scale-98 shadow-[0_0_35px_rgba(249,176,60,0.4)]"
                    >
                      <i className="fa-solid fa-ticket text-lg"></i>
                      <span>
                        {event.price === 0 || event.isFree 
                          ? 'በነፃ ትኬት ይቁረጡ (Register Free)' 
                          : `ትኬት ይቁረጡ • ${event.price.toLocaleString()} ብር`}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setIsShareModalOpen(true)}
                      className="w-full sm:w-auto px-7 py-4 rounded-2xl bg-[#3268ba] hover:bg-[#254f8e] text-white text-sm font-black flex items-center justify-center gap-2.5 cursor-pointer transition active:scale-95 shadow-[0_0_25px_rgba(50,104,186,0.4)] border border-[#4a85df]/50"
                      title="ይህንን ክንውን አጋራ (Share Event)"
                    >
                      <i className="fa-solid fa-share-nodes text-base"></i>
                      <span>አጋራ (Share)</span>
                    </button>
                  </div>
                </div>

              </div>

              {/* Right Column (5 cols): Cinematic Banner Stage */}
              <div className="lg:col-span-5">
                <div className="relative rounded-3xl overflow-hidden border-2 border-white/15 shadow-[0_20px_60px_rgba(0,0,0,0.9)] group">
                  <img
                    src={event.image || 'https://images.unsplash.com/photo-1515187029135-18ee286d815b?q=80&w=1200'}
                    alt={event.title}
                    className="w-full aspect-[4/3] object-cover group-hover:scale-105 transition-transform duration-700"
                  />

                  {/* Gradient Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent pointer-events-none" />

                  {/* Floating Price Tag */}
                  <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between">
                    <div>
                      <p className="text-[10px] uppercase font-bold text-slate-300">የትኬት ዋጋ (Price)</p>
                      <p className="text-xl font-black text-[#f9b03c]">
                        {event.price === 0 || event.isFree ? '100% ነፃ (FREE)' : `${event.price.toLocaleString()} ብር`}
                      </p>
                    </div>

                    <div className="px-3.5 py-1.5 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 text-xs font-black flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                      <span>ቅበላ ክፍት ነው</span>
                    </div>
                  </div>
                </div>
              </div>

            </div>
          </div>

        </div>
      </main>

      {/* Direct Glassmorphism Booking & Checkout Modal */}
      {isBookingOpen && (
        <div 
          className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/85 backdrop-blur-xl animate-in fade-in duration-200"
          onClick={(e) => { if (e.target === e.currentTarget) setIsBookingOpen(false); }}
        >
          <div 
            className="relative w-full max-w-lg rounded-[2rem] p-6 sm:p-8 text-white animate-in zoom-in-95 duration-200"
            style={{
              background: 'rgba(12, 16, 23, 0.96)',
              border: '1px solid rgba(249, 176, 60, 0.4)',
              boxShadow: '0 30px 90px rgba(0,0,0,0.95), 0 0 40px rgba(249,176,60,0.2)'
            }}
          >
            {/* Close Button */}
            <button
              type="button"
              onClick={() => setIsBookingOpen(false)}
              className="absolute top-5 right-5 w-8 h-8 rounded-full bg-white/5 hover:bg-white/15 text-slate-400 hover:text-white flex items-center justify-center transition cursor-pointer border border-white/10"
            >
              <i className="fa-solid fa-xmark text-sm"></i>
            </button>

            <div className="text-center mb-6">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#f9b03c] to-amber-400 text-slate-950 flex items-center justify-center text-xl mx-auto mb-3 shadow-[0_0_20px_rgba(249,176,60,0.4)]">
                <i className="fa-solid fa-ticket"></i>
              </div>
              <h3 className="text-xl font-black font-heading text-white">የትኬት ምዝገባ ማረጋገጫ</h3>
              <p className="text-xs text-[#f9b03c] font-bold mt-1 line-clamp-1">{event.title}</p>
            </div>

            {bookingError && (
              <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-xs text-red-300 mb-4">
                {bookingError}
              </div>
            )}

            <form onSubmit={handleConfirmBooking} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">ሙሉ ስም (Full Name) *</label>
                <input
                  type="text"
                  required
                  value={attendeeName}
                  onChange={(e) => setAttendeeName(e.target.value)}
                  placeholder="ለምሳሌ፡ አበበ ከበደ"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-hidden focus:border-[#f9b03c]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">ኢሜይል (Email Address) *</label>
                <input
                  type="email"
                  required
                  value={attendeeEmail}
                  onChange={(e) => setAttendeeEmail(e.target.value)}
                  placeholder="name@gmail.com (ቲኬቱ የሚላክበት)"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-hidden focus:border-[#f9b03c]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">ስልክ ቁጥር (Phone Number)</label>
                <input
                  type="tel"
                  value={attendeePhone}
                  onChange={(e) => setAttendeePhone(e.target.value)}
                  placeholder="09..."
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-hidden focus:border-[#f9b03c]"
                />
              </div>

              {/* Payment Method Selector for Paid Events */}
              {event.price > 0 && !event.isFree && (
                <div className="space-y-2 pt-1">
                  <label className="block text-xs font-bold text-slate-300">የክፍያ ዘዴ ይምረጡ (Payment Method)</label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setSelectedPaymentMethod('lakipay')}
                      className={`p-3 rounded-xl border text-left transition flex items-center gap-2.5 cursor-pointer ${
                        selectedPaymentMethod === 'lakipay'
                          ? 'bg-amber-400/15 border-[#f9b03c] text-white'
                          : 'bg-white/5 border-white/10 text-slate-400 hover:bg-white/10'
                      }`}
                    >
                      <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-xs font-black">
                        ET
                      </div>
                      <div>
                        <p className="text-xs font-bold">LakiPay / Telebirr</p>
                        <p className="text-[10px] text-slate-400">ሀገር ውስጥ ክፍያ</p>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setSelectedPaymentMethod('paypal')}
                      className={`p-3 rounded-xl border text-left transition flex items-center gap-2.5 cursor-pointer ${
                        selectedPaymentMethod === 'paypal'
                          ? 'bg-amber-400/15 border-[#f9b03c] text-white'
                          : 'bg-white/5 border-white/10 text-slate-400 hover:bg-white/10'
                      }`}
                    >
                      <div className="w-7 h-7 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center text-xs font-black">
                        💳
                      </div>
                      <div>
                        <p className="text-xs font-bold">PayPal / Cards</p>
                        <p className="text-[10px] text-slate-400">International</p>
                      </div>
                    </button>
                  </div>
                </div>
              )}

              {/* Price summary row */}
              <div className="p-4 rounded-xl bg-white/[0.04] border border-white/[0.08] text-xs flex justify-between items-center">
                <span className="text-slate-300 font-semibold">የትኬት ዋጋ</span>
                <span className="font-black text-[#f9b03c] text-base">
                  {event.price === 0 || event.isFree ? '100% ነፃ (Free)' : `${event.price.toLocaleString()} ብር`}
                </span>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full btn-buy-now-vibe py-4 rounded-xl text-sm font-black flex items-center justify-center gap-2 cursor-pointer active:scale-98 disabled:opacity-50 mt-3"
              >
                <span>
                  {isSubmitting 
                    ? 'በማዘጋጀት ላይ...' 
                    : event.price === 0 || event.isFree 
                    ? 'ትኬቴን አዘጋጅልኝ (Get Free Ticket)' 
                    : 'ወደ ክፍያ ቀጥል (Proceed to Pay)'}
                </span>
                <i className="fa-solid fa-arrow-right text-xs"></i>
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Apple Wallet Pass Modal */}
      <DigitalTicketModal
        isOpen={isTicketModalOpen}
        onClose={() => setIsTicketModalOpen(false)}
        ticket={activeTicket}
      />

      {/* Sleek Glassmorphism Share Modal */}
      <ShareEventModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        eventTitle={event.title}
        eventSlug={event.slug || event.id}
        eventDate={event.date}
        eventLocation={event.location}
      />

      <Footer />
    </div>
  );
}
