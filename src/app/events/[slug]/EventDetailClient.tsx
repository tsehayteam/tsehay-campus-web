'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import DigitalTicketModal from '@/components/DigitalTicketModal';
import TwoStageEventBookingModal from '@/components/TwoStageEventBookingModal';
import ShareEventModal from '@/components/ShareEventModal';
import { 
  TsehayEvent, 
  EventTicket, 
  DEFAULT_EVENTS, 
  DEFAULT_EVENT_BANNER,
  formatEventBannerUrl,
  getCachedEvents, 
  saveCachedEvents,
  getEventBySlugOrId, 
  getRemainingSeats, 
  formatDriveImageUrl,
  getCachedUserTickets,
  saveCachedUserTicket
} from '@/lib/eventCache';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase/client';
import { parseVideoEmbedUrl, parseImageUrl, isMediaVideo, getMediaThumbnail } from '@/lib/videoParser';

export default function EventDetailClient() {
  const params = useParams();
  const router = useRouter();
  const slug = (params?.slug as string) || '';
  const { user } = useAuth();

  const [event, setEvent] = useState<TsehayEvent | null>(() => getEventBySlugOrId(slug, getCachedEvents()));
  const [liveRegistrationsCount, setLiveRegistrationsCount] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [isPlayingVideo, setIsPlayingVideo] = useState(false);

  // Booking & Payment Modal State
  const [isBookingOpen, setIsBookingOpen] = useState(false);
  const [userBookedTickets, setUserBookedTickets] = useState<Record<string, EventTicket>>(() => getCachedUserTickets());
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

  // Fetch from server API & listen for real-time admin edits and registrations
  useEffect(() => {
    const handleEventsUpdate = (e: any) => {
      if (e.detail?.events && Array.isArray(e.detail.events)) {
        const found = getEventBySlugOrId(slug, e.detail.events);
        if (found) setEvent(found);
      }
    };
    window.addEventListener('tsehay_events_updated', handleEventsUpdate);

    // Cross-Tab BroadcastChannel synchronization
    let bc: BroadcastChannel | null = null;
    try {
      bc = new BroadcastChannel('tsehay_events_sync');
      bc.onmessage = (msg) => {
        if (msg.data?.events && Array.isArray(msg.data.events)) {
          const found = getEventBySlugOrId(slug, msg.data.events);
          if (found) setEvent(found);
        } else if (msg.data?.event) {
          const ev = msg.data.event;
          if (ev.slug === slug || ev.id === slug || (event && ev.id === event.id)) {
            setEvent(ev);
          }
        }
      };
    } catch (e) {}



    const loadEvent = async () => {
      try {
        const res = await fetch(`/api/events?id=${encodeURIComponent(slug)}&t=${Date.now()}`, {
          cache: 'no-store',
          headers: { 'Cache-Control': 'no-cache, no-store, must-revalidate' }
        });
        if (res.ok) {
          const data = await res.json();
          if (data.event) {
            setEvent(data.event);
          } else if (data.events && Array.isArray(data.events)) {
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

    // Supabase Realtime channel subscription
    let rtChannel: any = null;
    try {
      rtChannel = supabase
        .channel(`public_event_detail_${slug}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'events' }, () => {
          loadEvent();
        })
        .subscribe();
    } catch (e) {}

    return () => {
      window.removeEventListener('tsehay_events_updated', handleEventsUpdate);
      if (bc) {
        try { bc.close(); } catch (e) {}
      }
      if (rtChannel) {
        try { supabase.removeChannel(rtChannel); } catch (e) {}
      }
    };
  }, [slug, event?.id]);

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
      eventImage: event.image || event.eventImage || '',
      image: event.image || event.eventImage || '',
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
          if (ticketObj) {
            ticketObj.eventImage = ticketObj.eventImage || event.image || '';
            ticketObj.image = ticketObj.image || event.image || '';
          }
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
        eventImage: event.image || event.eventImage || '',
        image: event.image || event.eventImage || '',
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

    if (ticketObj) {
      saveCachedUserTicket(ticketObj);
    }

    // 🌟 Instantly update local React state and persistent cache (e.g. 105 -> 104)
    setEvent(prev => {
      if (!prev) return prev;
      const curRemaining = prev.remainingSeats !== undefined 
        ? prev.remainingSeats 
        : Math.max(0, (Number(prev.capacity) || 100) - (Number(prev.registeredCount) || 0));
      const nextRemaining = Math.max(0, curRemaining - 1);
      const nextRegCount = (Number(prev.registeredCount) || 0) + 1;
      const updated = {
        ...prev,
        remainingSeats: nextRemaining,
        seatsLeft: nextRemaining,
        availableTickets: nextRemaining,
        registeredCount: nextRegCount
      };
      try {
        const cached = getCachedEvents();
        const nextList = cached.map(e => (e.id === prev.id || e.slug === prev.slug) ? { ...e, remainingSeats: nextRemaining, seatsLeft: nextRemaining, availableTickets: nextRemaining, registeredCount: nextRegCount } : e);
        saveCachedEvents(nextList);
        window.dispatchEvent(new CustomEvent('tsehay_events_updated', { detail: { events: nextList, eventId: prev.id } }));
      } catch (e) {}
      return updated;
    });

    setActiveTicket(ticketObj);
    setIsBookingOpen(false);
    setIsTicketModalOpen(true);
    return ticketObj;
  };

  // 🌟 Post-Payment Return & Post-Login Action Resume Listener
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

    const handleResumeEvent = (e?: any) => {
      try {
        const storedPending = sessionStorage.getItem('tsehay_pending_event_reg') || sessionStorage.getItem('tsehay_pending_action');
        if (storedPending && event) {
          const parsed = JSON.parse(storedPending);
          if (parsed.eventId === event.id || parsed.eventSlug === event.slug) {
            if (parsed.attendeeName) setAttendeeName(parsed.attendeeName);
            if (parsed.attendeeEmail) setAttendeeEmail(parsed.attendeeEmail);
            if (parsed.attendeePhone) setAttendeePhone(parsed.attendeePhone);
            setIsBookingOpen(true);
          }
        }
      } catch (e) {}
    };

    window.addEventListener('tsehay_resume_pending_action', handleResumeEvent);
    window.addEventListener('open-event-booking', handleResumeEvent);
    window.addEventListener('tsehay_auth_state_changed', handleResumeEvent);

    return () => {
      window.removeEventListener('tsehay_resume_pending_action', handleResumeEvent);
      window.removeEventListener('open-event-booking', handleResumeEvent);
      window.removeEventListener('tsehay_auth_state_changed', handleResumeEvent);
    };
  }, [event]);

  const handleConfirmBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!event) return;

    if (!user) {
      try {
        sessionStorage.setItem('tsehay_pending_event_reg', JSON.stringify({
          eventId: event.id,
          eventSlug: event.slug,
          eventTitle: event.title,
          attendeeName: attendeeName.trim(),
          attendeeEmail: attendeeEmail.trim(),
          attendeePhone: attendeePhone.trim(),
          returnUrl: `/events/${event.slug || event.id}`
        }));
      } catch (e) {}
      setIsBookingOpen(false);
      window.dispatchEvent(new CustomEvent('open-auth-modal', { detail: { isSignupMode: false } }));
      return;
    }

    const trimmedName = attendeeName.trim();
    const trimmedEmail = attendeeEmail.trim();
    const trimmedPhone = attendeePhone.trim();

    if (!trimmedName) {
      setBookingError('እባክዎ ሙሉ ስምዎን ያስገቡ (ግዴታ ነው)።');
      return;
    }

    if (!trimmedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setBookingError('እባክዎ ትክክለኛ የኢሜይል አድራሻ ያስገቡ (ግዴታ ነው)።');
      return;
    }

    const cleanPhone = trimmedPhone.replace(/[\s\-()]/g, '');
    if (!cleanPhone || cleanPhone.length < 9) {
      setBookingError('እባክዎ ትክክለኛ ስልክ ቁጥር ያስገቡ (ግዴታ ነው - ለምሳሌ 0911223344 ወይም +251911223344)።');
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
            phone_number: attendeePhone.trim(),
            phoneNumber: attendeePhone.trim(),
            paymethod: selectedPaymentMethod,
            returnUrl: typeof window !== 'undefined' ? `${window.location.origin}/events/${event.slug || event.id}?payment=success` : undefined
          })
        });

        if (checkoutRes.ok) {
          const checkoutData = await checkoutRes.json().catch(() => null);
          const redirectUrl = checkoutData?.paymentUrl || checkoutData?.payment_url || checkoutData?.checkoutUrl || checkoutData?.checkout_url;
          if (redirectUrl) {
            window.location.href = redirectUrl;
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
  const capacity = Number(event.capacity) || 100;
  const effectiveRegCount = Math.max(
    Number(event.registeredCount) || 0,
    capacity - remainingSeats
  );
  const isSoldOut = remainingSeats <= 0;
  const percentTaken = Math.min(100, Math.round((effectiveRegCount / capacity) * 100));

  return (
    <div className="min-h-screen bg-[#06090e] text-white flex flex-col justify-between selection:bg-[#f9b03c] selection:text-black">
      <main className="flex-1 pt-24 pb-20 relative overflow-hidden">
        
        {/* Ambient Glows */}
        <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[700px] h-[400px] bg-[#f9b03c]/10 rounded-full blur-[160px] pointer-events-none" />
        <div className="absolute top-96 right-10 w-96 h-96 bg-blue-600/10 rounded-full blur-[140px] pointer-events-none" />

        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          
          {/* Breadcrumb & Top Bar */}
          <div className="flex items-center justify-between gap-4 mb-8 pt-4">
            <Link 
              href="/#events" 
              className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-xs text-slate-300 transition"
            >
              <i className="fa-solid fa-arrow-left text-[#f9b03c] text-xs"></i>
              <span>ወደ ዋናው ገጽ (All Events)</span>
            </Link>
          </div>

          {/* Cinematic Hero Container */}
          <div 
            className="rounded-[2.5rem] p-6 sm:p-10 lg:p-12 mb-12 relative overflow-hidden"
            style={{
              background: 'rgba(3, 5, 9, 0.9)',
              backdropFilter: 'blur(20px)',
              border: isSoldOut ? '1px solid rgba(239, 68, 68, 0.3)' : '1px solid rgba(255, 255, 255, 0.1)',
              boxShadow: '0 30px 100px rgba(0,0,0,0.85), 0 0 50px rgba(249,176,60,0.1)'
            }}
          >
            {/* Top Event Badge & Format */}
            <div className="flex flex-wrap items-center gap-3 mb-6">
              <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-400/10 border border-amber-400/30 text-[#f9b03c] text-xs font-black">
                <span className="w-2 h-2 rounded-full bg-[#f9b03c] animate-ping"></span>
                <span>ይፋዊ የቀጥታ ዝግጅት • Official Event</span>
              </span>

              <span className="px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-slate-300 text-xs font-bold">
                {event.isOnline ? '🌐 Virtual Live Stream (Online)' : `📍 በአካል (${event.location})`}
              </span>

              {isSoldOut && (
                <span className="px-3 py-1.5 rounded-full bg-red-600 text-white text-xs font-black uppercase tracking-wider animate-pulse shadow-lg">
                  ❌ ትኬቱ አልቋል (Sold Out)
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
                      {isSoldOut ? (
                        <span className="text-red-400 font-black">ትኬቱ ሙሉ በሙሉ አልቋል!</span>
                      ) : (
                        <span className="text-[#f9b03c]">{remainingSeats} ቦታዎች ብቻ ቀርተዋል!</span>
                      )}
                    </div>
                    <div className="w-full h-2.5 bg-white/10 rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full transition-all duration-1000 ${isSoldOut ? 'bg-red-500' : 'bg-gradient-to-r from-amber-500 to-[#f9b03c]'}`}
                        style={{ width: `${percentTaken}%` }}
                      />
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row items-center gap-4 pt-2">
                    {(() => {
                      const userTicket = userBookedTickets[event.id] || (event.slug ? userBookedTickets[event.slug] : null);
                      const isAlreadyRegistered = Boolean(userTicket);

                      if (isAlreadyRegistered) {
                        return (
                          <button
                            type="button"
                            onClick={() => {
                              setActiveTicket(userTicket);
                              setIsTicketModalOpen(true);
                            }}
                            className="w-full sm:flex-1 py-4 rounded-2xl text-base font-black flex items-center justify-center gap-2.5 transition-all cursor-pointer bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-[0_0_35px_rgba(16,185,129,0.4)] border border-emerald-400/40 active:scale-98"
                          >
                            <i className="fa-solid fa-circle-check text-white text-lg"></i>
                            <span>ቲኬት ቆርጠዋል (Already Registered) • ትኬትህን እይ</span>
                          </button>
                        );
                      }

                      if (isSoldOut) {
                        return (
                          <button
                            type="button"
                            disabled
                            className="w-full sm:flex-1 py-4 rounded-2xl text-base font-black flex items-center justify-center gap-2.5 bg-slate-800/80 text-slate-500 border border-white/5 cursor-not-allowed"
                          >
                            <i className="fa-solid fa-lock text-lg"></i>
                            <span>ትኬቱ አልቋል (Sold Out)</span>
                          </button>
                        );
                      }

                      return (
                        <button
                          type="button"
                          onClick={() => setIsBookingOpen(true)}
                          className="w-full sm:flex-1 py-4 rounded-2xl text-base font-black flex items-center justify-center gap-2.5 transition-all btn-buy-now-vibe cursor-pointer active:scale-98 shadow-[0_0_35px_rgba(249,176,60,0.4)]"
                        >
                          <i className="fa-solid fa-ticket text-lg"></i>
                          <span>
                            {event.price === 0 || event.isFree 
                              ? 'በነፃ ትኬት ይቁረጡ (Register Free)' 
                              : `ትኬት ይቁረጡ • ${event.price.toLocaleString()} ብር`}
                          </span>
                        </button>
                      );
                    })()}

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

              {/* Right Column (5 cols): Cinematic Banner & Universal Video Stage */}
              <div className="lg:col-span-5">
                {(() => {
                  const hasVideo = Boolean(event.videoUrl || (event.image && isMediaVideo(event.image)));
                  const effectiveVideoUrl = event.videoUrl || (event.image && isMediaVideo(event.image) ? event.image : '');
                  const parsedVideo = effectiveVideoUrl ? parseVideoEmbedUrl(effectiveVideoUrl, true) : null;
                  const posterUrl = formatEventBannerUrl(event.image) || (effectiveVideoUrl ? getMediaThumbnail(effectiveVideoUrl) : '') || DEFAULT_EVENT_BANNER;

                  if (hasVideo && isPlayingVideo && parsedVideo && parsedVideo.src) {
                    return (
                      <div className="relative rounded-3xl overflow-hidden border-2 border-[#f9b03c]/40 shadow-[0_20px_60px_rgba(0,0,0,0.95)] aspect-[16/9] bg-black group">
                        {parsedVideo.type === 'video' ? (
                          <video 
                            src={parsedVideo.src} 
                            controls 
                            autoPlay 
                            playsInline
                            className="w-full h-full object-contain"
                          />
                        ) : (
                          <iframe
                            src={parsedVideo.src}
                            title={event.title || 'Event Trailer Video'}
                            className="w-full h-full border-0"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                            allowFullScreen
                          />
                        )}
                        {/* Switch Back to Poster Button */}
                        <button
                          type="button"
                          onClick={() => setIsPlayingVideo(false)}
                          className="absolute top-4 right-4 px-3.5 py-1.5 rounded-full bg-black/80 hover:bg-black text-white text-xs font-bold backdrop-blur-md border border-white/20 flex items-center gap-1.5 z-30 cursor-pointer transition shadow-xl hover:scale-105 active:scale-95"
                          title="ወደ ባነር ፎቶ ተመለስ"
                        >
                          <i className="fa-solid fa-image text-[11px] text-[#f9b03c]"></i>
                          <span>ባነር (Poster)</span>
                        </button>
                      </div>
                    );
                  }

                  return (
                    <div 
                      onClick={() => {
                        if (hasVideo) setIsPlayingVideo(true);
                      }}
                      className={`relative rounded-3xl overflow-hidden border-2 border-white/15 shadow-[0_20px_60px_rgba(0,0,0,0.9)] group aspect-[16/9] bg-slate-900 ${
                        hasVideo ? 'cursor-pointer' : ''
                      }`}
                      title={hasVideo ? "የክንውኑን ማስተዋወቂያ ቪዲዮ ይመልከቱ (Watch Trailer)" : event.title}
                    >
                      <img
                        src={posterUrl}
                        alt={event.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                        loading="eager"
                        decoding="async"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = DEFAULT_EVENT_BANNER;
                        }}
                      />

                      {/* Gradient Overlay */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent pointer-events-none" />

                      {/* Optional Discrete Trailer Pill Tag in Top-Right */}
                      {hasVideo && (
                        <div className="absolute top-3.5 right-3.5 px-3 py-1 rounded-full bg-black/75 backdrop-blur-md border border-white/15 text-white text-[11px] font-bold z-10 flex items-center gap-1.5 shadow-md group-hover:border-[#f9b03c]/60 transition-colors">
                          <i className="fa-solid fa-circle-play text-[11px] text-[#f9b03c]"></i>
                          <span>ቪዲዮ አለው (Trailer)</span>
                        </div>
                      )}

                      {/* Video Indicator / Play Trailer Button (Hidden by default; Smoothly appears on Hover / Tap / Interaction) */}
                      {hasVideo && (
                        <div className="absolute inset-0 flex items-center justify-center z-20 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 group-active:opacity-100 transition-all duration-300 pointer-events-none group-hover:pointer-events-auto">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setIsPlayingVideo(true);
                            }}
                            className="group/btn relative flex flex-col items-center justify-center cursor-pointer transition-all duration-300 hover:scale-110 active:scale-95 scale-90 group-hover:scale-100"
                            aria-label="የክንውኑን ማስተዋወቂያ ቪዲዮ ተመልከት"
                          >
                            <div className="absolute -inset-4 rounded-full bg-amber-500/25 blur-xl group-hover/btn:bg-amber-500/50 transition duration-500 animate-pulse"></div>
                            <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gradient-to-tr from-amber-500 to-[#f9b03c] text-slate-950 flex items-center justify-center shadow-[0_0_35px_rgba(249,176,60,0.7)] border-2 border-white/40">
                              <i className="fa-solid fa-play text-xl sm:text-2xl ml-1 text-slate-950 group-hover/btn:scale-110 transition-transform"></i>
                            </div>
                            <div className="mt-3 px-3.5 py-1.5 rounded-full bg-black/85 backdrop-blur-md border border-white/20 text-[11px] font-bold text-white whitespace-nowrap shadow-lg flex items-center gap-1.5">
                              <i className="fa-solid fa-play text-[9px] text-[#f9b03c]"></i>
                              <span>ቪዲዮውን ተመልከት (Watch Trailer)</span>
                            </div>
                          </button>
                        </div>
                      )}

                      {/* Floating Price Tag */}
                      <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between z-10">
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
                  );
                })()}
              </div>

            </div>
          </div>

        </div>
      </main>

      {/* Two-Stage Ticket Checkout Modal (Step 1 Attendee Info -> Step 2 Full LMS Payment Modal) */}
      <TwoStageEventBookingModal
        isOpen={isBookingOpen}
        onClose={() => setIsBookingOpen(false)}
        event={event}
        initialAttendeeName={attendeeName}
        initialAttendeeEmail={attendeeEmail}
        initialAttendeePhone={attendeePhone}
        onSuccess={(ticket) => {
          saveCachedUserTicket(ticket);
          setUserBookedTickets(prev => ({
            ...prev,
            [event.id]: ticket,
            ...(event.slug ? { [event.slug]: ticket } : {})
          }));
          setActiveTicket(ticket);
          setIsBookingOpen(false);
          setIsTicketModalOpen(true);
        }}
      />

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
