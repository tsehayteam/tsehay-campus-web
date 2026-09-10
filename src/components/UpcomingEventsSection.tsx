'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  TsehayEvent, 
  EventTicket, 
  DEFAULT_EVENTS, 
  DEFAULT_EVENT_BANNER,
  formatEventBannerUrl,
  getCachedEvents, 
  getRemainingSeats, 
  formatDriveImageUrl,
  getCachedUserTickets,
  saveCachedUserTicket,
  getDeletedEventIds,
  recordDeletedEventId
} from '@/lib/eventCache';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase/client';
import DigitalTicketModal from '@/components/DigitalTicketModal';
import TwoStageEventBookingModal from '@/components/TwoStageEventBookingModal';
import { Ban } from 'lucide-react';
import { parseVideoEmbedUrl, isMediaVideo, getMediaThumbnail } from '@/lib/videoParser';

export default function UpcomingEventsSection() {
  const { user } = useAuth();
  const [events, setEvents] = useState<TsehayEvent[]>(() => getCachedEvents());
  const [loading, setLoading] = useState(false);

  // Active Ticket Modal State
  const [activeTicket, setActiveTicket] = useState<EventTicket | null>(null);
  const [isTicketModalOpen, setIsTicketModalOpen] = useState(false);

  // Video Trailer Lightbox State
  const [previewVideoEvent, setPreviewVideoEvent] = useState<TsehayEvent | null>(null);

  // Auto-duck background music when trailer video is opened
  useEffect(() => {
    if (previewVideoEvent) {
      window.dispatchEvent(new CustomEvent('tsehay-audio-duck', { detail: { duck: true } }));
      return () => {
        window.dispatchEvent(new CustomEvent('tsehay-audio-duck', { detail: { duck: false } }));
      };
    }
  }, [previewVideoEvent]);

  // Booking Modal State
  const [selectedEvent, setSelectedEvent] = useState<TsehayEvent | null>(null);
  const [isBookingOpen, setIsBookingOpen] = useState(false);
  const [attendeeName, setAttendeeName] = useState(user?.displayName || '');
  const [attendeeEmail, setAttendeeEmail] = useState(user?.email || '');
  const [attendeePhone, setAttendeePhone] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [bookingError, setBookingError] = useState<string | null>(null);

  // 🌟 User Booked Tickets Map: eventId/slug -> EventTicket (Strictly User-Scoped)
  const [userBookedTickets, setUserBookedTickets] = useState<Record<string, EventTicket>>(() => user?.id ? getCachedUserTickets(user.id) : {});

  // 🌟 Live Real-time Events Listener (Firestore + Local Broadcast + API)
  const [registrationsCountByEvent, setRegistrationsCountByEvent] = useState<Record<string, number>>({});

  // 🔒 Strict User-Session Ticket Isolation
  useEffect(() => {
    if (!user || !user.id) {
      setUserBookedTickets({});
      return;
    }

    const cached = getCachedUserTickets(user.id);
    setUserBookedTickets(cached);

    let isMounted = true;
    const fetchUserTickets = async () => {
      try {
        const query = user.email 
          ? `userId=${encodeURIComponent(user.id)}&email=${encodeURIComponent(user.email)}`
          : `userId=${encodeURIComponent(user.id)}`;
        const res = await fetch(`/api/events/tickets?${query}`, { cache: 'no-store' });
        if (res.ok && isMounted) {
          const data = await res.json();
          if (data.tickets && Array.isArray(data.tickets)) {
            const map: Record<string, EventTicket> = {};
            data.tickets.forEach((t: EventTicket) => {
              if (t.eventId) map[t.eventId] = t;
              if (t.eventSlug) map[t.eventSlug] = t;
              saveCachedUserTicket(t, user.id);
            });
            setUserBookedTickets(map);
          }
        }
      } catch (e) {}
    };
    fetchUserTickets();

    return () => {
      isMounted = false;
    };
  }, [user?.id, user?.email]);

  useEffect(() => {
    const handleEventsUpdate = (e: any) => {
      if (e.detail?.deletedId || e.detail?.deletedSlug) {
        const dId = (e.detail.deletedId || '').toLowerCase();
        const dSlug = (e.detail.deletedSlug || '').toLowerCase();
        if (dId) recordDeletedEventId(dId);
        if (dSlug) recordDeletedEventId(dSlug);
        setEvents(prev => prev.filter(ev => {
          const cId = (ev.id || '').toLowerCase();
          const cSlug = (ev.slug || '').toLowerCase();
          return cId !== dId && (!dSlug || cSlug !== dSlug);
        }));
      }
      if (e.detail?.events && Array.isArray(e.detail.events)) {
        const deletedIds = getDeletedEventIds();
        setEvents(e.detail.events.filter((ev: TsehayEvent) => 
          !deletedIds.includes((ev.id || '').toLowerCase()) && 
          !(ev.slug && deletedIds.includes(ev.slug.toLowerCase()))
        ));
      } else if (e.detail?.event) {
        const single = e.detail.event;
        const deletedIds = getDeletedEventIds();
        if (!deletedIds.includes((single.id || '').toLowerCase()) && !(single.slug && deletedIds.includes(single.slug.toLowerCase()))) {
          setEvents(prev => [single, ...prev.filter(p => p.id !== single.id)]);
        }
      }
    };
    window.addEventListener('tsehay_events_updated', handleEventsUpdate);

    const handleLiveTicketDecrement = (e: any) => {
      const eId = e.detail?.eventId;
      const eSlug = e.detail?.eventSlug;
      if (eId) {
        setRegistrationsCountByEvent(prev => ({
          ...prev,
          [eId]: (prev[eId] || 0) + 1,
          ...(eSlug ? { [eSlug]: (prev[eSlug] || 0) + 1 } : {})
        }));
      }
    };
    window.addEventListener('tsehay_ticket_registered', handleLiveTicketDecrement);

    let bc: BroadcastChannel | null = null;
    try {
      bc = new BroadcastChannel('tsehay_events_sync');
      bc.onmessage = (msg) => {
        if (msg.data?.type === 'EVENT_DELETED' || msg.data?.deletedId || msg.data?.deletedSlug) {
          const dId = (msg.data.deletedId || '').toLowerCase();
          const dSlug = (msg.data.deletedSlug || '').toLowerCase();
          if (dId) recordDeletedEventId(dId);
          if (dSlug) recordDeletedEventId(dSlug);
          setEvents(prev => prev.filter(ev => {
            const cId = (ev.id || '').toLowerCase();
            const cSlug = (ev.slug || '').toLowerCase();
            return cId !== dId && (!dSlug || cSlug !== dSlug);
          }));
        }
        if (msg.data?.events && Array.isArray(msg.data.events)) {
          const deletedIds = getDeletedEventIds();
          setEvents(msg.data.events.filter((ev: TsehayEvent) => 
            !deletedIds.includes((ev.id || '').toLowerCase()) && 
            !(ev.slug && deletedIds.includes(ev.slug.toLowerCase()))
          ));
        } else if (msg.data?.event) {
          const single = msg.data.event;
          const deletedIds = getDeletedEventIds();
          if (!deletedIds.includes((single.id || '').toLowerCase()) && !(single.slug && deletedIds.includes(single.slug.toLowerCase()))) {
            setEvents(prev => [single, ...prev.filter(p => p.id !== single.id)]);
          }
        }
        if (msg.data?.type === 'ticket_registered' && msg.data?.eventId) {
          const eId = msg.data.eventId;
          const eSlug = msg.data.eventSlug;
          setRegistrationsCountByEvent(prev => ({
            ...prev,
            [eId]: (prev[eId] || 0) + 1,
            ...(eSlug ? { [eSlug]: (prev[eSlug] || 0) + 1 } : {})
          }));
        }
      };
    } catch (e) {}

    const handleTicketSaved = (e: any) => {
      if (e.detail?.ticket && user?.id && (!e.detail.userId || e.detail.userId === user.id)) {
        const t = e.detail.ticket as EventTicket;
        setUserBookedTickets(prev => ({
          ...prev,
          [t.eventId]: t,
          ...(t.eventSlug ? { [t.eventSlug]: t } : {})
        }));
      }
    };
    window.addEventListener('tsehay_user_ticket_saved', handleTicketSaved);

    let artifactList: TsehayEvent[] = [];
    let rootList: TsehayEvent[] = [];

    const syncAndSet = () => {
      const deletedIds = getDeletedEventIds();
      const isDeleted = (idOrSlug?: string) => {
        if (!idOrSlug || deletedIds.length === 0) return false;
        return deletedIds.includes(idOrSlug.trim().toLowerCase());
      };

      // 🌟 Authoritative sync: If server returned an active events list, use it directly (purging any deleted events)
      if (artifactList && artifactList.length > 0) {
        const cleanServerList = artifactList
          .filter(ev => ev && (ev.id || ev.slug) && !isDeleted(ev.id) && !isDeleted(ev.slug))
          .map(ev => ({
            ...ev,
            image: formatDriveImageUrl(ev.image) || ev.image || ''
          }));
        setEvents(cleanServerList);
        try {
          localStorage.setItem('tsehay_events_cache', JSON.stringify(cleanServerList));
        } catch (e) {}
        return;
      }

      const eventMap = new Map<string, TsehayEvent>();

      // 1. Preload DEFAULT_EVENTS ONLY if not permanently deleted
      DEFAULT_EVENTS.forEach(ev => {
        if (!isDeleted(ev.id) && !isDeleted(ev.slug)) {
          eventMap.set(ev.id, { ...ev });
          if (ev.slug) eventMap.set(ev.slug, { ...ev });
        }
      });

      // 2. Overlay LocalStorage Cached Events (filtered)
      getCachedEvents().forEach(ev => {
        if (ev && (ev.id || ev.slug) && !isDeleted(ev.id) && !isDeleted(ev.slug)) {
          const key = ev.id || ev.slug!;
          eventMap.set(key, { ...(eventMap.get(key) || {}), ...ev });
        }
      });

      // 3. Overlay Live API / Firestore Documents (Root & Artifact)
      [...artifactList, ...rootList].forEach(ev => {
        if (ev && (ev.id || ev.slug) && !isDeleted(ev.id) && !isDeleted(ev.slug)) {
          const key = ev.id || ev.slug!;
          const existing: any = eventMap.get(key) || (ev.slug ? eventMap.get(ev.slug) : null) || {};
          const cleanImage = formatDriveImageUrl(ev.image) || ev.image || existing.image;
          const merged: TsehayEvent = {
            ...existing,
            ...ev,
            image: cleanImage,
            videoUrl: ev.videoUrl || existing.videoUrl || ''
          };
          eventMap.set(key, merged);
          if (ev.id) eventMap.set(ev.id, merged);
          if (ev.slug) eventMap.set(ev.slug, merged);
        }
      });

      const uniqueMap = new Map<string, TsehayEvent>();
      eventMap.forEach(v => {
        if (v && v.id && !isDeleted(v.id) && !isDeleted(v.slug)) {
          uniqueMap.set(v.id, v);
        }
      });

      const combined = Array.from(uniqueMap.values());
      setEvents(combined);
      try {
        localStorage.setItem('tsehay_events_cache', JSON.stringify(combined));
      } catch (e) {}
    };

    // 1. Fetch live events from API with cache-busting
    const fetchEvents = async () => {
      try {
        const res = await fetch(`/api/events?t=${Date.now()}`, {
          cache: 'no-store',
          headers: { 'Cache-Control': 'no-cache, no-store, must-revalidate' }
        });
        if (res.ok) {
          const data = await res.json();
          if (data.deletedIds && Array.isArray(data.deletedIds)) {
            data.deletedIds.forEach((d: string) => recordDeletedEventId(d));
          }
          if (data.events && Array.isArray(data.events)) {
            artifactList = data.events;
            syncAndSet();
          }
        }
      } catch (e) {}
    };
    fetchEvents();

    // 2. Supabase Realtime WebSocket subscription for live event updates
    const eventsChannel = supabase
      .channel('realtime_events_section_sync')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'events' },
        () => {
          fetchEvents();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'site_settings' },
        (payload: any) => {
          if (payload?.new && payload.new.key === 'events') {
            fetchEvents();
          }
        }
      )
      .on('broadcast', { event: 'seat_decrement' }, (msg: any) => {
        const data = msg?.payload;
        if (data && data.eventId) {
          setEvents(prev => prev.map(ev => {
            if (ev.id === data.eventId || ev.slug === data.eventSlug || ev.slug === data.eventId) {
              const nextRem = typeof data.remainingSeats === 'number' 
                ? data.remainingSeats 
                : Math.max(0, (ev.remainingSeats ?? 100) - 1);
              const nextReg = typeof data.registeredCount === 'number' 
                ? data.registeredCount 
                : (Number(ev.registeredCount) || 0) + 1;
              return {
                ...ev,
                remainingSeats: nextRem,
                seatsLeft: nextRem,
                availableTickets: nextRem,
                registeredCount: nextReg
              };
            }
            return ev;
          }));
        }
      })
      .subscribe();

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        fetchEvents();
      }
    };
    window.addEventListener('focus', fetchEvents);
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      supabase.removeChannel(eventsChannel);
      window.removeEventListener('tsehay_events_updated', handleEventsUpdate);
      window.removeEventListener('tsehay_user_ticket_saved', handleTicketSaved);
      window.removeEventListener('focus', fetchEvents);
      document.removeEventListener('visibilitychange', handleVisibility);
      if (bc) bc.close();
    };
  }, [user]);

  // Update attendee form with user data
  useEffect(() => {
    if (user) {
      if (user.displayName && !attendeeName) setAttendeeName(user.displayName);
      if (user.email && !attendeeEmail) setAttendeeEmail(user.email);
    }
  }, [user]);

  const handleOpenBooking = (event: TsehayEvent) => {
    // Check if already registered
    const existingTicket = userBookedTickets[event.id] || (event.slug ? userBookedTickets[event.slug] : null);
    if (existingTicket) {
      setActiveTicket(existingTicket);
      setIsTicketModalOpen(true);
      return;
    }

    const remaining = getRemainingSeats(event);
    if (remaining <= 0) {
      return;
    }

    // 🔒 Mandatory Authentication Check
    if (!user) {
      try {
        sessionStorage.setItem('tsehay_pending_event_reg', JSON.stringify({
          eventId: event.id,
          eventSlug: event.slug,
          eventTitle: event.title,
          returnUrl: `/events/${event.slug || event.id}`
        }));
        sessionStorage.setItem('tsehay_pending_action', JSON.stringify({
          action: 'book_ticket',
          eventId: event.id,
          eventSlug: event.slug,
          returnUrl: `/events/${event.slug || event.id}`
        }));
      } catch (e) {}
      window.dispatchEvent(new CustomEvent('open-auth-modal', {
        detail: {
          isSignupMode: false,
          returnUrl: `/events/${event.slug || event.id}`,
          message: 'ትኬት ለመቁረጥ እባክዎ መጀመሪያ ወደ አካውንትዎ ይግቡ (ወይም ይመዝገቡ)።'
        }
      }));
      return;
    }

    setSelectedEvent(event);
    setBookingError(null);
    setIsBookingOpen(true);
  };

  const handleConfirmBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEvent) return;

    const trimmedName = attendeeName.trim();
    const trimmedEmail = attendeeEmail.trim().toLowerCase();
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
      // If paid event, initiate checkout
      if (selectedEvent.price > 0 && !selectedEvent.isFree) {
        try {
          const checkoutRes = await fetch('/api/initiate-payment', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              courseId: selectedEvent.id,
              title: selectedEvent.title,
              price: selectedEvent.price,
              userEmail: trimmedEmail,
              userId: user?.uid || 'guest_user',
              phone_number: trimmedPhone,
              phoneNumber: trimmedPhone,
              paymethod: 'lakipay'
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
        } catch (checkoutErr) {
          console.warn('Payment initiate notice:', checkoutErr);
        }
      }

      // Safe registration payload
      const registerPayload = {
        eventId: selectedEvent.id,
        eventSlug: selectedEvent.slug || '',
        eventTitle: selectedEvent.title,
        eventDate: selectedEvent.date,
        eventTime: selectedEvent.time,
        eventLocation: selectedEvent.location,
        eventImage: formatDriveImageUrl(selectedEvent.image) || selectedEvent.image || '',
        image: formatDriveImageUrl(selectedEvent.image) || selectedEvent.image || '',
        isOnline: selectedEvent.isOnline || false,
        meetingLink: selectedEvent.meetingLink || '',
        mapsUrl: selectedEvent.mapsUrl || '',
        name: trimmedName,
        email: trimmedEmail,
        phone: trimmedPhone,
        attendeeName: trimmedName,
        attendeeEmail: trimmedEmail,
        attendeePhone: trimmedPhone,
        userId: user?.uid || `guest_${Date.now()}`,
        pricePaid: selectedEvent.price || 0,
        price: selectedEvent.price || 0,
        paymentMethod: selectedEvent.price === 0 || selectedEvent.isFree ? 'free' : 'lakipay',
        tier: selectedEvent.price > 1200 ? 'VIP Pass' : 'General Admission'
      };

      let issuedTicket: EventTicket | null = null;
      let registerHandled = false;

      // 1. Try /api/events/register endpoint
      try {
        const res = await fetch('/api/events/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(registerPayload)
        });

        const data = await res.json().catch(() => null);

        // If user already registered, open existing ticket
        if (data && data.alreadyRegistered && data.ticket) {
          const loadedTicket = {
            ...data.ticket,
            eventImage: data.ticket.eventImage || formatDriveImageUrl(selectedEvent.image) || selectedEvent.image || '',
            image: data.ticket.image || formatDriveImageUrl(selectedEvent.image) || selectedEvent.image || ''
          };
          saveCachedUserTicket(loadedTicket);
          setUserBookedTickets(prev => ({
            ...prev,
            [selectedEvent.id]: loadedTicket,
            ...(selectedEvent.slug ? { [selectedEvent.slug]: loadedTicket } : {})
          }));
          setActiveTicket(loadedTicket);
          setIsBookingOpen(false);
          setIsTicketModalOpen(true);
          return;
        }

        if (data && data.soldOut) {
          setBookingError(data.error || 'ይቅርታ፣ የዚህ ዝግጅት ትኬት ሙሉ በሙሉ አልቋል! (Sold Out)');
          return;
        }

        if (data && (data.success || data.ticket || data.ticketId)) {
          registerHandled = true;
          const cleanImage = formatDriveImageUrl(selectedEvent.image) || selectedEvent.image || '';
          issuedTicket = data.ticket ? {
            ...data.ticket,
            eventImage: data.ticket.eventImage || cleanImage,
            image: data.ticket.image || cleanImage
          } : {
            ticketId: data.ticketId || `TC-EVT-${Date.now().toString(36).toUpperCase()}`,
            eventId: selectedEvent.id,
            eventSlug: selectedEvent.slug || '',
            eventTitle: selectedEvent.title,
            eventDate: selectedEvent.date,
            eventTime: selectedEvent.time,
            eventLocation: selectedEvent.location,
            eventImage: cleanImage,
            image: cleanImage,
            isOnline: selectedEvent.isOnline,
            meetingLink: selectedEvent.meetingLink || '',
            mapsUrl: selectedEvent.mapsUrl || '',
            attendeeName: attendeeName.trim(),
            attendeeEmail: attendeeEmail.trim().toLowerCase(),
            attendeePhone: attendeePhone.trim(),
            userId: user?.uid || `guest_${Date.now()}`,
            pricePaid: selectedEvent.price || 0,
            tier: selectedEvent.price > 1200 ? 'VIP Pass' : 'General Admission',
            qrCodeData: data.ticketId || '',
            isUsed: false,
            usedAt: null,
            issuedAt: new Date().toISOString()
          };
        }
      } catch (regErr) {
        console.warn('/api/events/register notice:', regErr);
      }

      // 2. Fallback to /api/events/tickets ONLY if register endpoint failed to execute
      if (!issuedTicket && !registerHandled) {
        try {
          const ticketRes = await fetch('/api/events/tickets', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(registerPayload)
          });
          const tData = await ticketRes.json().catch(() => null);
          if (tData && tData.ticket) {
            issuedTicket = tData.ticket;
          }
        } catch (ticketErr) {
          console.warn('/api/events/tickets notice:', ticketErr);
        }
      }

      if (issuedTicket) {
        saveCachedUserTicket(issuedTicket);
        setUserBookedTickets(prev => ({
          ...prev,
          [selectedEvent.id]: issuedTicket!,
          ...(selectedEvent.slug ? { [selectedEvent.slug]: issuedTicket! } : {})
        }));
        
        // Instant Live Auto Deduction on current screen
        setRegistrationsCountByEvent(prev => ({
          ...prev,
          [selectedEvent.id]: (prev[selectedEvent.id] || 0) + 1,
          ...(selectedEvent.slug ? { [selectedEvent.slug]: (prev[selectedEvent.slug] || 0) + 1 } : {})
        }));

        // Broadcast to all other open tabs and components
        window.dispatchEvent(new CustomEvent('tsehay_ticket_registered', {
          detail: { eventId: selectedEvent.id, eventSlug: selectedEvent.slug }
        }));
        try {
          if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
            const channel = new BroadcastChannel('tsehay_ticket_sync');
            channel.postMessage({
              type: 'ticket_registered',
              eventId: selectedEvent.id,
              eventSlug: selectedEvent.slug
            });
            channel.close();
          }
        } catch (e) {}

        setActiveTicket(issuedTicket);
        setIsBookingOpen(false);
        setIsTicketModalOpen(true);
      } else {
        setBookingError('ምዝገባውን ማጠናቀቅ አልተቻለም፤ እባክዎ በድጋሚ ይሞክሩ።');
      }
    } catch (err: any) {
      console.error("Booking error:", err);
      setBookingError(err?.message || 'ትኬቱን ማዘጋጀት አልተቻለም፤ እባክዎ በድጋሚ ይሞክሩ።');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section id="events" className="relative py-24 bg-[#080b11] text-white overflow-hidden scrolly-reveal">
      
      {/* Background Cinematic Atmosphere */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-[#f9b03c]/10 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-[140px] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          
          {/* Golden Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-400/10 border border-amber-400/30 text-[#f9b03c] text-xs sm:text-sm font-black mb-4 backdrop-blur-md shadow-[0_0_20px_rgba(249,176,60,0.2)]">
            <span className="w-2 h-2 rounded-full bg-[#f9b03c] animate-ping"></span>
            <span>የቅርብ ጊዜ ክንውኖች እና የቀጥታ ስልጠናዎች</span>
            <span className="text-slate-500 font-normal">|</span>
            <span className="text-slate-300 font-semibold">Live Events & Workshops</span>
          </div>

          <h2 className="text-3xl sm:text-4xl md:text-5xl font-black font-heading text-white tracking-tight leading-tight mb-4">
            በቀጥታ እና በአካል የሚሰጡ <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#f9b03c] via-amber-300 to-[#5a93e8] animate-pulse drop-shadow-[0_5px_25px_rgba(249,176,60,0.4)]">ልዩ ወርክሾፖች (Workshops)</span>
          </h2>
          
          <p className="text-slate-300 text-sm sm:text-base leading-relaxed">
            ከኢዮብ ሳህሌ እና ከኢንዱስትሪው ባለሙያዎች ጋር በቀጥታ በመገናኘት የዩቲዩብ፣ የሼን ኢምፖርት እና የዲጂታል ቢዝነስ ስኬትዎን ወደ ላቀ ደረጃ ያሳድጉ።
          </p>
        </div>

        {/* Event Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {events.map((event) => {
            const capacity = Number(event.capacity) || 100;
            const liveRegCount = (registrationsCountByEvent[event.id] || (event.slug ? registrationsCountByEvent[event.slug] : 0) || 0);
            const baseReg = Number(event.registeredCount) || 0;
            const totalReg = Math.max(baseReg, liveRegCount);
            const remainingSeats = Math.max(0, capacity - totalReg);
            const isSoldOut = remainingSeats <= 0;
            const percentTaken = Math.min(100, Math.round((totalReg / capacity) * 100));

            const userTicket = userBookedTickets[event.id] || (event.slug ? userBookedTickets[event.slug] : null);
            const isAlreadyRegistered = Boolean(userTicket);
            const cleanVid = (event.videoUrl || '').trim();
            const hasVideo = Boolean(cleanVid && cleanVid !== 'none' && cleanVid !== 'yelewim');
            const effectiveVideoUrl = hasVideo ? cleanVid : '';
            const posterUrl = formatEventBannerUrl(event.image) || (effectiveVideoUrl ? getMediaThumbnail(effectiveVideoUrl) : '') || DEFAULT_EVENT_BANNER;

            return (
              <div 
                key={event.id}
                className={`group relative rounded-3xl p-6 transition-all duration-500 hover:-translate-y-2 hover:scale-[1.01] flex flex-col justify-between backdrop-blur-xl bg-black/60 border ${
                  isAlreadyRegistered ? 'border-emerald-500/50 shadow-[0_15px_40px_rgba(16,185,129,0.2)]' : 'border-white/10 hover:border-[#f9b03c]/60'
                } shadow-[0_20px_50px_rgba(0,0,0,0.7)] hover:shadow-[0_25px_60px_rgba(249,176,60,0.25)]`}
              >
                {/* 3D Radial Glow on Hover */}
                <div className="absolute inset-0 rounded-3xl bg-gradient-to-b from-[#f9b03c]/10 via-transparent to-[#3268ba]/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

                <div>
                  {/* Event Thumbnail & Badges - Clean & Direct Link to Preview */}
                  <Link
                    href={`/events/${event.slug || event.id}`}
                    className="block relative w-full aspect-[16/9] rounded-2xl overflow-hidden mb-5 border border-white/10 group/img bg-slate-900 cursor-pointer"
                    title={`${event.title} - ዝርዝር መረጃ ይመልከቱ`}
                  >
                    <img 
                      src={posterUrl} 
                      alt={event.title} 
                      className="w-full h-full object-cover group-hover/img:scale-105 transition-transform duration-700"
                      loading="eager"
                      decoding="async"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = DEFAULT_EVENT_BANNER;
                      }}
                    />
                    
                    {/* Top Status Capsules */}
                    <div className="absolute top-3 left-3 flex flex-wrap items-center gap-2 z-20 pointer-events-none">
                      <span className="px-3 py-1 rounded-full bg-[#3268ba]/80 backdrop-blur-md text-white border border-[#3268ba] text-xs font-black shadow-md flex items-center gap-1.5">
                        <i className={`fa-solid ${event.isOnline ? 'fa-globe' : 'fa-location-dot'} text-[11px]`}></i>
                        <span>{event.isOnline ? 'Virtual Live Stream' : 'In-Person (አካል)'}</span>
                      </span>
                      {isAlreadyRegistered ? (
                        <span className="px-2.5 py-1 rounded-full bg-emerald-600/95 text-white text-[10px] font-black tracking-wider uppercase shadow-md flex items-center gap-1">
                          <i className="fa-solid fa-circle-check text-[10px]"></i>
                          <span>ተመዝግበዋል</span>
                        </span>
                      ) : isSoldOut ? (
                        <span className="px-2.5 py-1 rounded-full bg-red-600/90 text-white text-[10px] font-black tracking-wider uppercase shadow-md animate-pulse flex items-center gap-1">
                          <Ban className="w-3 h-3 text-white" aria-hidden="true" />
                          <span>አልቋል (Sold Out)</span>
                        </span>
                      ) : null}
                    </div>

                    {/* Price Tag */}
                    <div className="absolute bottom-3 right-3 z-20 pointer-events-none">
                      <span className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-[#f9b03c] via-amber-400 to-[#f9b03c] text-slate-950 text-xs font-black shadow-[0_0_20px_rgba(249,176,60,0.6)]">
                        {event.price === 0 || event.isFree ? '100% ነፃ (FREE)' : `${event.price.toLocaleString()} ብር`}
                      </span>
                    </div>
                  </Link>

                  {/* Date & Time Capsule */}
                  <div className="flex items-center gap-2.5 text-xs text-slate-300 mb-3.5 font-semibold">
                    <div className="flex items-center gap-1.5 bg-[#f9b03c]/10 border border-[#f9b03c]/30 px-3 py-1.5 rounded-xl text-[#f9b03c] font-black">
                      <i className="fa-regular fa-calendar text-[#f9b03c]"></i>
                      <span>{event.date}</span>
                    </div>
                    <div className="flex items-center gap-1.5 bg-white/5 border border-white/10 px-3 py-1.5 rounded-xl text-slate-200">
                      <i className="fa-regular fa-clock text-[#f9b03c]"></i>
                      <span>{event.time}</span>
                    </div>
                  </div>

                  {/* Title */}
                  <Link href={`/events/${event.slug || event.id}`} className="block">
                    <h3 className="text-lg sm:text-xl font-black text-white font-heading line-clamp-2 mb-2.5 group-hover:text-[#f9b03c] transition-colors leading-snug">
                      {event.title}
                    </h3>
                  </Link>

                  {/* Description */}
                  <p className="text-xs sm:text-sm text-slate-300 line-clamp-3 leading-relaxed mb-4 font-body">
                    {event.description}
                  </p>

                  {/* Speaker & Location Info */}
                  <div className="space-y-2 text-xs text-slate-400 mb-5 border-t border-white/10 pt-3.5">
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 rounded-md bg-[#3268ba]/20 text-[#5a93e8] flex items-center justify-center text-[10px]">
                        <i className="fa-solid fa-microphone-lines"></i>
                      </div>
                      <span className="text-slate-200 font-bold">{event.speaker}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 rounded-md bg-[#f9b03c]/20 text-[#f9b03c] flex items-center justify-center text-[10px]">
                        <i className="fa-solid fa-location-dot"></i>
                      </div>
                      <span className="truncate">{event.location}</span>
                    </div>
                  </div>
                </div>

                <div>
                  {/* Capacity & Progress Bar */}
                  <div className="mb-4">
                    <div className="flex justify-between text-[11px] font-bold mb-1.5">
                      <span className="text-slate-300">የተያዙ ቦታዎች ({percentTaken}%)</span>
                      {isSoldOut ? (
                        <span className="text-red-400 font-black">ትኬቱ ሙሉ በሙሉ አልቋል!</span>
                      ) : (
                        <span className="text-[#f9b03c] font-black">{remainingSeats} ቦታዎች ብቻ ቀርተዋል!</span>
                      )}
                    </div>
                    <div className="w-full h-2.5 bg-white/10 rounded-full overflow-hidden p-0.5">
                      <div 
                        className={`h-full rounded-full transition-all duration-1000 ${isSoldOut ? 'bg-red-500' : 'bg-gradient-to-r from-[#3268ba] via-[#5a93e8] to-[#f9b03c] shadow-[0_0_10px_rgba(249,176,60,0.8)]'}`}
                        style={{ width: `${percentTaken}%` }}
                      />
                    </div>
                  </div>

                  {/* Action Buttons Row */}
                  <div className="flex items-center gap-2.5">
                    {isAlreadyRegistered ? (
                      <button
                        type="button"
                        onClick={() => {
                          setActiveTicket(userTicket);
                          setIsTicketModalOpen(true);
                        }}
                        className="flex-1 py-3.5 rounded-2xl text-xs sm:text-sm font-black flex items-center justify-center gap-2 transition-all cursor-pointer bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-[0_0_25px_rgba(16,185,129,0.35)] border border-emerald-400/40 active:scale-95"
                      >
                        <i className="fa-solid fa-circle-check text-white text-sm"></i>
                        <span>ቲኬት ቆርጠዋል (Already Registered)</span>
                      </button>
                    ) : isSoldOut ? (
                      <button
                        type="button"
                        disabled
                        className="flex-1 py-3.5 rounded-2xl text-xs sm:text-sm font-black flex items-center justify-center gap-2 bg-red-950/40 text-red-400 border border-red-500/40 cursor-not-allowed shadow-[0_0_15px_rgba(239,68,68,0.2)] opacity-80"
                      >
                        <i className="fa-solid fa-ban text-xs text-red-400"></i>
                        <span>አልቋል (Sold Out)</span>
                      </button>
                    ) : !user ? (
                      <button
                        type="button"
                        onClick={() => handleOpenBooking(event)}
                        className="flex-1 py-3.5 rounded-2xl text-xs sm:text-sm font-black flex items-center justify-center gap-2 transition-all cursor-pointer bg-gradient-to-r from-[#f9b03c] via-amber-400 to-[#f9b03c] hover:brightness-110 text-slate-950 active:scale-95 shadow-[0_0_25px_rgba(249,176,60,0.35)] hover:shadow-[0_0_40px_rgba(249,176,60,0.6)]"
                      >
                        <i className="fa-solid fa-right-to-bracket text-xs"></i>
                        <span>ይግቡና ትኬት ይቁረጡ (Login)</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleOpenBooking(event)}
                        className="flex-1 py-3.5 rounded-2xl text-xs sm:text-sm font-black flex items-center justify-center gap-2 transition-all cursor-pointer bg-gradient-to-r from-[#f9b03c] via-amber-400 to-[#f9b03c] hover:brightness-110 text-slate-950 active:scale-95 shadow-[0_0_25px_rgba(249,176,60,0.35)] hover:shadow-[0_0_40px_rgba(249,176,60,0.6)]"
                      >
                        <span>{event.price === 0 || event.isFree ? 'በነፃ ይመዝገቡ' : 'ትኬት ይቁረጡ'}</span>
                        <i className="fa-solid fa-ticket text-xs"></i>
                      </button>
                    )}

                    <Link
                      href={`/events/${event.slug || event.id}`}
                      className="px-3.5 py-3.5 rounded-2xl bg-white/5 hover:bg-white/15 border border-white/10 hover:border-[#f9b03c]/50 text-slate-300 hover:text-white transition flex items-center justify-center text-xs font-bold shrink-0"
                      title="ሙሉ ዝርዝር እይ"
                    >
                      <i className="fa-solid fa-arrow-up-right-from-square text-xs text-[#f9b03c]"></i>
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

      </div>

      {/* Two-Stage Ticket Checkout Modal (Step 1 Attendee Info -> Step 2 Full LMS Payment Modal) */}
      <TwoStageEventBookingModal
        isOpen={isBookingOpen}
        onClose={() => setIsBookingOpen(false)}
        event={selectedEvent}
        initialAttendeeName={attendeeName}
        initialAttendeeEmail={attendeeEmail}
        initialAttendeePhone={attendeePhone}
        onSuccess={(ticket) => {
          if (user?.id) {
            saveCachedUserTicket(ticket, user.id);
            if (selectedEvent) {
              setUserBookedTickets(prev => ({
                ...prev,
                [selectedEvent.id]: ticket,
                ...(selectedEvent.slug ? { [selectedEvent.slug]: ticket } : {})
              }));
            }
          }
          // Instant Live Count Decrement
          const eId = selectedEvent?.id || ticket.eventId;
          const eSlug = selectedEvent?.slug || ticket.eventSlug;
          if (eId) {
            setRegistrationsCountByEvent(prev => ({
              ...prev,
              [eId]: (prev[eId] || 0) + 1,
              ...(eSlug ? { [eSlug]: (prev[eSlug] || 0) + 1 } : {})
            }));
          }
          try {
            const bc = new BroadcastChannel('tsehay_events_sync');
            bc.postMessage({ type: 'ticket_registered', eventId: eId, eventSlug: eSlug, ticket });
            bc.close();
          } catch (e) {}
          window.dispatchEvent(new CustomEvent('tsehay_ticket_registered', {
            detail: { eventId: eId, eventSlug: eSlug, ticket }
          }));
          setActiveTicket(ticket);
          setIsBookingOpen(false);
          setIsTicketModalOpen(true);
        }}
      />

      {/* Universal Video Trailer Lightbox Modal */}
      {previewVideoEvent && (
        <div 
          className="fixed inset-0 z-[999999] flex items-center justify-center p-4 bg-black/85 backdrop-blur-xl animate-in fade-in duration-200"
          onClick={(e) => { if (e.target === e.currentTarget) setPreviewVideoEvent(null); }}
        >
          <div className="relative w-full max-w-3xl bg-slate-950 border border-white/15 rounded-3xl overflow-hidden shadow-2xl">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-white/10 flex items-center justify-between bg-white/[0.02]">
              <div className="flex items-center gap-2.5">
                <span className="w-8 h-8 rounded-xl bg-amber-500/20 text-[#f9b03c] flex items-center justify-center">
                  <i className="fa-solid fa-circle-play text-sm"></i>
                </span>
                <div>
                  <h3 className="font-heading font-black text-sm sm:text-base text-white line-clamp-1">
                    {previewVideoEvent.title}
                  </h3>
                  <p className="text-[11px] text-gray-400">የክንውን ቪዲዮ ማስተዋወቂያ (Event Trailer)</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPreviewVideoEvent(null)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center text-xs transition cursor-pointer"
                title="ዝጋ (Close)"
              >
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>

            {/* Video Player Stage */}
            <div className="relative aspect-video w-full bg-black">
              {(() => {
                const cleanVid = (previewVideoEvent.videoUrl || '').trim();
                const vidUrl = (cleanVid && cleanVid !== 'none' && cleanVid !== 'yelewim') ? cleanVid : '';
                const parsed = parseVideoEmbedUrl(vidUrl, true);
                if (parsed.type === 'video') {
                  return (
                    <video
                      src={parsed.src}
                      controls
                      autoPlay
                      playsInline
                      className="w-full h-full object-contain"
                    />
                  );
                }
                if (parsed.src) {
                  return (
                    <iframe
                      src={parsed.src}
                      title={previewVideoEvent.title}
                      className="w-full h-full border-0"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                      allowFullScreen
                    />
                  );
                }
                return (
                  <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">
                    ቪዲዮውን መክፈት አልተቻለም
                  </div>
                );
              })()}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-white/10 flex items-center justify-between bg-slate-900/50">
              <div className="text-xs text-gray-300">
                <span className="font-bold text-[#f9b03c]">{previewVideoEvent.date}</span> • {previewVideoEvent.time}
              </div>
              <Link
                href={`/events/${previewVideoEvent.slug || previewVideoEvent.id}`}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-[#f9b03c] text-slate-950 font-black text-xs hover:opacity-95 transition flex items-center gap-1.5 shadow-md"
              >
                <span>ሙሉ መረጃውን እይ</span>
                <i className="fa-solid fa-arrow-right text-[10px]"></i>
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Digital Apple Wallet Style Ticket Pass Modal */}
      <DigitalTicketModal
        isOpen={isTicketModalOpen}
        onClose={() => setIsTicketModalOpen(false)}
        ticket={activeTicket}
      />

    </section>
  );
}
