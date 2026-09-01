'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import DigitalTicketModal from '@/components/DigitalTicketModal';
import ShareEventModal from '@/components/ShareEventModal';
import CinematicVideoModal from '@/components/CinematicVideoModal';
import { TsehayEvent, EventTicket, DEFAULT_EVENTS, getCachedEvents, getEventBySlugOrId, getRemainingSeats, formatDriveImageUrl } from '@/lib/eventCache';
import { parseVideoEmbedUrl } from '@/lib/videoParser';
import { useAuth } from '@/context/AuthContext';
import { db } from '@/lib/firebase/config';
import { collection, doc, onSnapshot, query, getDocs } from 'firebase/firestore';

export default function EventDetailClient() {
  const params = useParams();
  const router = useRouter();
  const slug = (params?.slug as string) || '';
  const { user } = useAuth();

  const [event, setEvent] = useState<TsehayEvent | null>(() => getEventBySlugOrId(slug, getCachedEvents()));
  const [liveRegistrationsCount, setLiveRegistrationsCount] = useState<number>(0);
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
  const [isVideoModalOpen, setIsVideoModalOpen] = useState(false);
  const [createdTicket, setCreatedTicket] = useState<EventTicket | null>(null);
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

    // 1. Live Firestore Event Listener on Artifacts
    let unsubEvent: any = null;
    try {
      const eventsRef = collection(db, 'artifacts', 'tsehaycampus-e1a6d', 'public', 'data', 'events');
      unsubEvent = onSnapshot(eventsRef, (snapshot) => {
        if (!snapshot.empty) {
          const list = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as TsehayEvent));
          const found = getEventBySlugOrId(slug, list);
          if (found) setEvent(found);
        }
      }, (err) => {});
    } catch (e) {}

    // 2. Live Firestore Event Listener on Root
    let unsubRootEvent: any = null;
    try {
      const rootEventsRef = collection(db, 'events');
      unsubRootEvent = onSnapshot(rootEventsRef, (snapshot) => {
        if (!snapshot.empty) {
          const list = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as TsehayEvent));
          const found = getEventBySlugOrId(slug, list);
          if (found) setEvent(found);
        }
      }, (err) => {});
    } catch (e) {}

    // 3. Live Firestore Event Registrations Listener
    let unsubRegs: any = null;
    try {
      const regsRef = collection(db, 'event_registrations');
      unsubRegs = onSnapshot(regsRef, (snapshot) => {
        let count = 0;
        snapshot.docs.forEach(d => {
          const r = d.data();
          if (r.eventSlug === slug || (event && (r.eventId === event.id || r.eventSlug === event.slug))) {
            count++;
          }
        });
        setLiveRegistrationsCount(count);
      }, (err) => {});
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

    return () => {
      window.removeEventListener('tsehay_events_updated', handleEventsUpdate);
      if (unsubEvent) unsubEvent();
      if (unsubRootEvent) unsubRootEvent();
      if (unsubRegs) unsubRegs();
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

    // Ensure automated email dispatch is sent to the attendee
    if (ticketObj && ticketObj.attendeeEmail) {
      fetch('/api/events/send-ticket-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ticket: ticketObj, email: ticketObj.attendeeEmail })
      }).catch(() => {});
    }

    // Direct client-side atomic Firestore decrement & registration save
    try {
      const { doc, updateDoc, increment, setDoc } = await import('firebase/firestore');
      const rootDocRef = doc(db, 'events', event.id);
      const curSeats = event.remainingSeats !== undefined ? event.remainingSeats : Math.max(0, (Number(event.capacity) || 100) - (Number(event.registeredCount) || 0));
      
      await updateDoc(rootDocRef, {
        remainingSeats: increment(-1),
        registeredCount: increment(1),
        updatedAt: new Date().toISOString()
      }).catch(async () => {
        await setDoc(rootDocRef, {
          ...event,
          remainingSeats: Math.max(0, curSeats - 1),
          registeredCount: (Number(event.registeredCount) || 0) + 1,
          updatedAt: new Date().toISOString()
        }, { merge: true });
      });

      if (ticketObj) {
        await setDoc(doc(db, 'event_registrations', ticketObj.ticketId), {
          ...ticketObj,
          registeredAt: new Date().toISOString(),
          createdAt: new Date().toISOString(),
          status: 'confirmed'
        });
      }
    } catch (dbErr) {
      console.warn('Client Firestore ticket save notice:', dbErr);
    }

    // Optimistically decrement remaining seats in local state
    setEvent(prev => {
      if (!prev) return prev;
      const curSeats = prev.remainingSeats !== undefined ? prev.remainingSeats : Math.max(0, (Number(prev.capacity) || 100) - (Number(prev.registeredCount) || 0));
      return {
        ...prev,
        remainingSeats: Math.max(0, curSeats - 1),
        registeredCount: (Number(prev.registeredCount) || 0) + 1
      };
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

  const [copiedShare, setCopiedShare] = useState(false);

  const handleShareEvent = async () => {
    if (!event) return;
    const url = typeof window !== 'undefined' ? window.location.href : '';
    const shareData = {
      title: event.title,
      text: event.description ? event.description.slice(0, 120) + '...' : 'የፀሐይ ካምፓስ ዝግጅት',
      url: url,
    };

    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share(shareData);
        return;
      } catch (err) {
        // Fallback to clipboard
      }
    }

    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      try {
        await navigator.clipboard.writeText(url);
        setCopiedShare(true);
        setTimeout(() => setCopiedShare(false), 3000);
      } catch (err) {
        console.warn('Clipboard write failed:', err);
      }
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

  const capacity = Number(event.capacity) || 100;
  const registeredCount = Number(event.registeredCount) || 0;
  const remainingSeats = event.remainingSeats !== undefined && typeof event.remainingSeats === 'number'
    ? Math.max(0, event.remainingSeats)
    : Math.max(0, capacity - Math.max(registeredCount, liveRegistrationsCount));
  const isSoldOut = remainingSeats <= 0;
  const effectiveRegCount = Math.max(registeredCount, capacity - remainingSeats);
  const percentTaken = Math.min(100, Math.round((effectiveRegCount / capacity) * 100));

  return (
    <div className="min-h-screen bg-[#06090e] text-white flex flex-col justify-between selection:bg-[#f9b03c] selection:text-black">
      <main className="flex-1 pt-24 pb-20 relative overflow-hidden">
        
        {/* Ambient Glows */}
        <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[700px] h-[400px] bg-[#f9b03c]/10 rounded-full blur-[160px] pointer-events-none" />
        <div className="absolute top-96 right-10 w-96 h-96 bg-blue-600/10 rounded-full blur-[140px] pointer-events-none" />

        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          
          {/* Breadcrumb & Top Bar with Prominent Royal Blue Glowing Share Button */}
          <div className="flex items-center justify-between gap-4 mb-8 pt-4">
            <Link 
              href="/#events" 
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-xs text-slate-300 transition hover:border-[#f9b03c]/40"
            >
              <i className="fa-solid fa-arrow-left text-[#f9b03c] text-xs"></i>
              <span>ወደ ዋናው ገጽ (All Events)</span>
            </Link>

            {/* Prominent Glassmorphic Share Button with Royal Blue Glow */}
            <button
              type="button"
              onClick={handleShareEvent}
              className="relative inline-flex items-center gap-2.5 px-5 py-2.5 rounded-full bg-[#3268ba]/15 hover:bg-[#3268ba]/25 text-white text-xs sm:text-sm font-bold border border-[#3268ba]/50 hover:border-[#3268ba] shadow-[0_0_25px_rgba(50,104,186,0.4)] hover:shadow-[0_0_35px_rgba(50,104,186,0.7)] backdrop-blur-xl transition-all duration-300 hover:scale-105 active:scale-95 cursor-pointer group"
              title="ክንውኑን ለጓደኞችዎ ያጋሩ (Share Event)"
            >
              <svg 
                className="w-4 h-4 text-[#5a93e8] group-hover:scale-110 transition-transform duration-300" 
                fill="none" 
                viewBox="0 0 24 24" 
                stroke="currentColor" 
                strokeWidth="2.2"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
              </svg>
              <span>{copiedShare ? 'ተገልብጧል! (Link Copied)' : 'አጋራ (Share)'}</span>
              {copiedShare && (
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
              )}
            </button>
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
            <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
              <div className="flex flex-wrap items-center gap-3">
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

              {/* In-Hero Glassmorphic Share Action */}
              <button
                type="button"
                onClick={handleShareEvent}
                className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#3268ba]/20 hover:bg-[#3268ba]/30 text-blue-200 hover:text-white border border-[#3268ba]/50 hover:border-[#3268ba] text-xs font-black backdrop-blur-md shadow-[0_0_20px_rgba(50,104,186,0.35)] transition-all duration-300 hover:scale-105 active:scale-95 cursor-pointer group"
                title="ክንውኑን ያጋሩ (Share)"
              >
                <svg 
                  className="w-3.5 h-3.5 text-[#5a93e8] group-hover:scale-110 transition-transform" 
                  fill="none" 
                  viewBox="0 0 24 24" 
                  stroke="currentColor" 
                  strokeWidth="2.2"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                </svg>
                <span>{copiedShare ? 'ሊንኩ ተገልብጧል' : 'አጋራ (Share)'}</span>
              </button>
            </div>

            {/* Grid: Details (Left) + Banner Card (Right) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
              
              {/* Left Column (7 cols) */}
              <div className="lg:col-span-7 space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                  <div className="flex-1">
                    <h1 className="text-2xl sm:text-4xl lg:text-5xl font-black font-heading text-white tracking-tight leading-tight">
                      {event.title}
                    </h1>

                    {event.titleEn && (
                      <p className="text-sm font-semibold text-[#f9b03c] tracking-wide mt-1.5">
                        {event.titleEn}
                      </p>
                    )}
                  </div>
                </div>

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
                    <button
                      type="button"
                      disabled={isSoldOut}
                      onClick={() => !isSoldOut && setIsBookingOpen(true)}
                      className={`w-full sm:flex-1 py-4 rounded-2xl text-base font-black flex items-center justify-center gap-2.5 transition-all ${
                        isSoldOut 
                          ? 'bg-slate-800/80 text-slate-500 border border-white/5 cursor-not-allowed'
                          : 'btn-buy-now-vibe cursor-pointer active:scale-98 shadow-[0_0_35px_rgba(249,176,60,0.4)]'
                      }`}
                    >
                      <i className={`fa-solid ${isSoldOut ? 'fa-lock' : 'fa-ticket'} text-lg`}></i>
                      <span>
                        {isSoldOut 
                          ? 'ትኬቱ አልቋል (Sold Out)'
                          : event.price === 0 || event.isFree 
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
                <div 
                  className={`relative rounded-3xl overflow-hidden border-2 border-white/15 shadow-[0_20px_60px_rgba(0,0,0,0.9)] group ${event.videoUrl ? 'cursor-pointer' : ''}`}
                  onClick={() => {
                    if (event.videoUrl) setIsVideoModalOpen(true);
                  }}
                >
                  <img
                    src={formatDriveImageUrl(event.image) || event.image || 'https://images.unsplash.com/photo-1515187029135-18ee286d815b?q=80&w=1200'}
                    alt={event.title}
                    className="w-full aspect-[4/3] object-cover group-hover:scale-105 transition-transform duration-700"
                  />

                  {/* Play Video Trigger Overlay if event has videoUrl */}
                  {event.videoUrl && (
                    <div className="absolute inset-0 flex items-center justify-center z-10">
                      <div className="relative group cursor-pointer">
                        <span className="absolute -inset-3 rounded-full bg-red-500/40 animate-ping pointer-events-none" />
                        <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gradient-to-tr from-red-600 via-rose-500 to-amber-400 text-white flex items-center justify-center text-2xl sm:text-3xl font-black shadow-[0_0_40px_rgba(239,68,68,0.7)] group-hover:scale-110 transition-all duration-300">
                          <i className="fa-solid fa-play ml-1"></i>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Gradient Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent pointer-events-none" />

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
                <label className="block text-xs font-bold text-slate-200 mb-1.5">
                  ሙሉ ስም (Full Name) <span className="text-red-400 font-black">* (ግዴታ)</span>
                </label>
                <input
                  type="text"
                  required
                  value={attendeeName}
                  onChange={(e) => setAttendeeName(e.target.value)}
                  placeholder="ለምሳሌ፡ ኢዮብ ሳህሌ (Eyoub Sahle)"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-hidden focus:border-[#f9b03c]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-200 mb-1.5">
                  ኢሜይል (Email Address) <span className="text-red-400 font-black">* (ግዴታ)</span>
                </label>
                <input
                  type="email"
                  required
                  value={attendeeEmail}
                  onChange={(e) => setAttendeeEmail(e.target.value)}
                  placeholder="eyoubsahle1@gmail.com (ዲጂታል ቲኬቱ የሚላክበት)"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-hidden focus:border-[#f9b03c]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-200 mb-1.5">
                  ስልክ ቁጥር (Phone Number) <span className="text-red-400 font-black">* (ግዴታ)</span>
                </label>
                <input
                  type="tel"
                  required
                  value={attendeePhone}
                  onChange={(e) => setAttendeePhone(e.target.value)}
                  placeholder="0911223344 ወይም +251911223344"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-hidden focus:border-[#f9b03c]"
                />
                <p className="text-[10px] text-amber-400/80 mt-1 flex items-center gap-1">
                  <i className="fa-solid fa-shield-check"></i>
                  <span>የማረጋገጫ SMS እና የትኬት QR ኮድ ወደዚህ ቁጥር ይላካል</span>
                </p>
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

      {/* Fullscreen Cinematic Event Video Modal */}
      <CinematicVideoModal
        isOpen={isVideoModalOpen}
        onClose={() => setIsVideoModalOpen(false)}
        videoUrl={event?.videoUrl || ''}
        title={event?.title || 'Event Video'}
      />

      <Footer />
    </div>
  );
}
