'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import DigitalTicketModal from '@/components/DigitalTicketModal';
import PaymentModal from '@/components/PaymentModal';
import RequireAuthModal from '@/components/RequireAuthModal';
import { TsehayEvent, EventTicket, DEFAULT_EVENTS, getCachedEvents, getRemainingSeats, formatDriveImageUrl } from '@/lib/eventCache';
import { useAuth } from '@/context/AuthContext';
import { db } from '@/lib/firebase/config';
import { collection, onSnapshot, query, getDocs } from 'firebase/firestore';

export default function EventsClient() {
  const { user } = useAuth();
  const [events, setEvents] = useState<TsehayEvent[]>(() => getCachedEvents());
  const [filter, setFilter] = useState<'all' | 'free' | 'paid' | 'online' | 'in-person'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Registration & Modal states
  const [selectedEvent, setSelectedEvent] = useState<TsehayEvent | null>(null);
  const [isRegistering, setIsRegistering] = useState(false);
  const [generatedTicket, setGeneratedTicket] = useState<EventTicket | null>(null);
  const [isTicketModalOpen, setIsTicketModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  // Real-time Firestore sync on both collections
  useEffect(() => {
    let artifactList: TsehayEvent[] = [];
    let rootList: TsehayEvent[] = [];

    const syncAndSet = () => {
      const eventMap = new Map<string, TsehayEvent>();
      [...artifactList, ...rootList].forEach(ev => {
        if (ev && ev.id) {
          eventMap.set(ev.id, {
            ...ev,
            image: formatDriveImageUrl(ev.image) || ev.image
          });
        }
      });

      const combined = Array.from(eventMap.values());
      if (combined.length > 0) {
        setEvents(combined);
        try {
          localStorage.setItem('tsehay_events_cache', JSON.stringify(combined));
        } catch (e) {}
      }
    };

    // 1. Listen on root events collection
    let unsubRoot = () => {};
    try {
      const qRoot = query(collection(db, 'events'));
      unsubRoot = onSnapshot(qRoot, (snapshot) => {
        if (!snapshot.empty) {
          rootList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as TsehayEvent[];
          syncAndSet();
        }
      }, (err) => {
        console.warn("Firestore root events sync note:", err);
      });
    } catch (e) {}

    // 2. Listen on artifact events collection
    let unsubArtifact = () => {};
    try {
      const qArtifact = query(collection(db, 'artifacts', 'tsehaycampus-e1a6d', 'public', 'data', 'events'));
      unsubArtifact = onSnapshot(qArtifact, (snapshot) => {
        if (!snapshot.empty) {
          artifactList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as TsehayEvent[];
          syncAndSet();
        }
      }, (err) => {
        console.warn("Firestore artifact events sync note:", err);
      });
    } catch (e) {}

    // 3. Direct HTTP fetch with cache-busting
    fetch(`/api/events?t=${Date.now()}`, {
      cache: 'no-store',
      headers: { 'Cache-Control': 'no-cache, no-store, must-revalidate' }
    })
      .then(res => res.json())
      .then(data => {
        if (data && Array.isArray(data.events) && data.events.length > 0) {
          artifactList = data.events;
          syncAndSet();
        }
      })
      .catch(() => {});

    return () => {
      unsubRoot();
      unsubArtifact();
    };
  }, []);

  const filteredEvents = events.filter((evt) => {
    // Filter type
    if (filter === 'free' && !evt.isFree && evt.price > 0) return false;
    if (filter === 'paid' && (evt.isFree || evt.price === 0)) return false;
    if (filter === 'online' && !evt.isOnline) return false;
    if (filter === 'in-person' && evt.isOnline) return false;

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        evt.title.toLowerCase().includes(q) ||
        evt.description.toLowerCase().includes(q) ||
        evt.location.toLowerCase().includes(q) ||
        (evt.speaker || '').toLowerCase().includes(q)
      );
    }
    return true;
  });

  const handleBookTicket = (event: TsehayEvent) => {
    setSelectedEvent(event);
    const seats = getRemainingSeats(event);
    if (seats <= 0) {
      alert('ይህ ዝግጅት ሙሉ በሙሉ ተይዟል (Sold Out)!');
      return;
    }

    if (event.isFree || event.price === 0) {
      processRegistration(event, 0, 'free');
    } else {
      setIsPaymentModalOpen(true);
    }
  };

  const processRegistration = async (event: TsehayEvent, pricePaid: number, paymentMethod: string) => {
    setIsRegistering(true);
    try {
      const res = await fetch('/api/events/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventId: event.id,
          eventSlug: event.slug,
          eventTitle: event.title,
          eventDate: event.date,
          eventTime: event.time,
          eventLocation: event.location,
          isOnline: event.isOnline,
          meetingLink: event.meetingLink || '',
          mapsUrl: event.mapsUrl || '',
          attendeeName: user?.displayName || (user?.email ? user.email.split('@')[0] : 'ተማሪ'),
          attendeeEmail: user?.email || 'student@tsehaycampus.com',
          userId: user?.uid || 'guest_student',
          pricePaid,
          paymentMethod,
          tier: pricePaid > 1200 ? 'VIP Pass' : 'General Admission'
        })
      });

      const data = await res.json();
      if (data.success && data.ticket) {
        setGeneratedTicket(data.ticket);
        setIsPaymentModalOpen(false);
        setIsTicketModalOpen(true);
      } else {
        alert(data.error || 'ትኬቱን መቁረጥ አልተቻለም። እባክዎ እንደገና ይሞክሩ።');
      }
    } catch (e: any) {
      alert('የኔትዎርክ ችግር አጋጥሟል። እባክዎ እንደገና ይሞክሩ።');
    } finally {
      setIsRegistering(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#030509] text-white selection:bg-[#f9b03c]/30 selection:text-[#f9b03c]">
      <Navbar />

      {/* Hero Header Section */}
      <section className="relative pt-32 pb-16 overflow-hidden border-b border-white/10">
        {/* Layered Ambient Glows */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-[#f9b03c]/15 rounded-full blur-[140px] pointer-events-none" />
        <div className="absolute top-1/3 -right-32 w-[400px] h-[400px] bg-[#3268ba]/20 rounded-full blur-[130px] pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-gradient-to-r from-[#f9b03c]/20 to-amber-500/10 border border-[#f9b03c]/40 text-[#f9b03c] text-xs font-black uppercase tracking-widest backdrop-blur-xl shadow-[0_0_20px_rgba(249,176,60,0.2)]">
            <span className="w-2 h-2 rounded-full bg-[#f9b03c] animate-ping" />
            <span>🎟️ የቀጥታ ስልጠናዎች እና ዝግጅቶች (Live Events)</span>
          </div>

          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black font-heading tracking-tight">
            የፀሐይ ካምፓስ{' '}
            <span className="bg-gradient-to-r from-white via-amber-200 to-[#f9b03c] bg-clip-text text-transparent drop-shadow-[0_2px_20px_rgba(249,176,60,0.3)]">
              ልዩ ዝግጅቶች እና ዌቢናሮች
            </span>
          </h1>

          <p className="text-sm sm:text-base text-slate-300 max-w-2xl mx-auto font-body leading-relaxed">
            ከባለሙያዎች ጋር በቀጥታ የሚገናኙባቸው፣ የቢዝነስ እና የቴክኖሎጂ ስልቶችን በተግባር የሚማሩባቸው ልዩ የካምፓስ ዝግጅቶች።
          </p>

          {/* Search & Filter Toolbar */}
          <div className="pt-6 max-w-3xl mx-auto flex flex-col sm:flex-row items-center gap-3">
            <div className="relative flex-1 w-full">
              <i className="fa-solid fa-magnifying-glass absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-xs" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="ዝግጅቶችን፣ አሰልጣኞችን ወይም ቦታ ይፈልጉ..."
                className="w-full bg-white/5 border border-white/10 focus:border-[#f9b03c] rounded-2xl pl-10 pr-4 py-3 text-xs sm:text-sm text-white placeholder-slate-500 outline-none transition backdrop-blur-xl"
              />
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar w-full sm:w-auto justify-center">
              {[
                { id: 'all', label: 'ሁሉም' },
                { id: 'free', label: '🎁 ነፃ' },
                { id: 'paid', label: '💎 ፕሪሚየም' },
                { id: 'online', label: '🌐 Online' },
                { id: 'in-person', label: '📍 In-Person' },
              ].map((item) => (
                <button
                  key={item.id}
                  onClick={() => setFilter(item.id as any)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer whitespace-nowrap border ${
                    filter === item.id
                      ? 'bg-[#f9b03c] text-slate-950 border-[#f9b03c] font-black shadow-[0_0_15px_rgba(249,176,60,0.4)]'
                      : 'bg-white/5 text-slate-300 hover:text-white border-white/10 hover:bg-white/10'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Events Grid Listing */}
      <section className="py-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {filteredEvents.length === 0 ? (
          <div className="text-center py-20 border border-white/10 rounded-3xl bg-white/[0.02]">
            <i className="fa-solid fa-calendar-xmark text-4xl text-slate-500 mb-3 block" />
            <h3 className="text-lg font-bold text-slate-200 font-heading">ምንም የተገኘ ዝግጅት የለም</h3>
            <p className="text-xs text-slate-400 mt-1">እባክዎ ሌላ ቃል ይፈልጉ ወይም ፊልተሩን ይቀይሩ።</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredEvents.map((evt) => {
              const remaining = getRemainingSeats(evt);
              const isSoldOut = remaining <= 0;
              const imageUrl = formatDriveImageUrl(evt.image || '');

              return (
                <div
                  key={evt.id}
                  className="group rounded-3xl bg-[#090d16]/90 border border-white/10 hover:border-[#f9b03c]/60 transition-all duration-300 flex flex-col justify-between overflow-hidden shadow-[0_15px_40px_rgba(0,0,0,0.7)] backdrop-blur-2xl hover:-translate-y-1.5"
                >
                  <div>
                    {/* Event Banner */}
                    <div className="relative h-48 w-full overflow-hidden bg-slate-900">
                      {imageUrl ? (
                        <img
                          src={imageUrl}
                          alt={evt.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-tr from-[#090d16] to-[#1a2333] text-4xl text-[#f9b03c]">
                          <i className="fa-solid fa-calendar-star" />
                        </div>
                      )}

                      {/* Online / Location Badge */}
                      <div className="absolute top-3 left-3 flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/80 backdrop-blur-md border border-white/15 text-[10px] font-bold text-white">
                        <i className={`fa-solid ${evt.isOnline ? 'fa-video text-blue-400' : 'fa-location-dot text-red-400'}`} />
                        <span>{evt.isOnline ? 'Google Meet / Online' : evt.location}</span>
                      </div>

                      {/* Price Badge */}
                      <div className="absolute top-3 right-3 px-3 py-1 rounded-full bg-[#f9b03c] text-slate-950 font-black text-[11px] shadow-[0_0_15px_rgba(249,176,60,0.5)]">
                        {evt.isFree || evt.price === 0 ? 'ነፃ (FREE)' : `${evt.price} ETB`}
                      </div>
                    </div>

                    {/* Content Body */}
                    <div className="p-5 space-y-3">
                      {/* Date & Time Row */}
                      <div className="flex items-center gap-3 text-[11px] text-[#f9b03c] font-bold">
                        <span className="flex items-center gap-1">
                          <i className="fa-regular fa-calendar" />
                          <span>{evt.date}</span>
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1 text-slate-300">
                          <i className="fa-regular fa-clock" />
                          <span>{evt.time}</span>
                        </span>
                      </div>

                      {/* Title */}
                      <h3 className="text-lg font-black font-heading text-white group-hover:text-[#f9b03c] transition-colors line-clamp-2 leading-snug">
                        {evt.title}
                      </h3>

                      {/* Description */}
                      <p className="text-xs text-slate-300 line-clamp-2 leading-relaxed font-body">
                        {evt.description}
                      </p>

                      {/* Speaker / Host */}
                      <div className="pt-2 border-t border-white/5 flex items-center justify-between text-xs text-slate-300">
                        <span className="flex items-center gap-1.5">
                          <i className="fa-solid fa-chalkboard-user text-[#f9b03c]" />
                          <span className="font-bold truncate">{evt.speaker || 'Tsehay Team'}</span>
                        </span>
                        <span className="text-[10px] text-slate-400">{evt.speakerRole}</span>
                      </div>
                    </div>
                  </div>

                  {/* Card Footer Actions */}
                  <div className="p-5 pt-0">
                    <div className="p-3 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between mb-3">
                      <div className="text-[11px]">
                        <span className="text-slate-400 block text-[9px] uppercase tracking-wider">የቀሩ ወንበሮች</span>
                        <span className={`font-mono font-bold ${isSoldOut ? 'text-red-400' : 'text-emerald-400'}`}>
                          {isSoldOut ? 'ሙሉ በሙሉ ተይዟል' : `🔥 ${remaining} ወንበር ቀርቷል`}
                        </span>
                      </div>

                      <Link
                        href={`/events/${evt.slug || evt.id}`}
                        className="text-xs font-bold text-slate-300 hover:text-white transition flex items-center gap-1"
                      >
                        <span>ዝርዝር</span>
                        <i className="fa-solid fa-arrow-right text-[10px]" />
                      </Link>
                    </div>

                    <button
                      type="button"
                      disabled={isSoldOut || isRegistering}
                      onClick={() => handleBookTicket(evt)}
                      className={`w-full py-3 rounded-2xl font-black font-heading text-xs uppercase tracking-wider transition-all duration-300 flex items-center justify-center gap-2 cursor-pointer ${
                        isSoldOut
                          ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                          : 'bg-gradient-to-r from-[#f9b03c] via-amber-400 to-[#f9b03c] hover:from-amber-400 hover:to-[#f9b03c] text-slate-950 shadow-[0_0_25px_rgba(249,176,60,0.35)] hover:shadow-[0_0_35px_rgba(249,176,60,0.6)] active:scale-98'
                      }`}
                    >
                      <i className="fa-solid fa-ticket" />
                      <span>{isSoldOut ? 'ተይዞ አልቋል (Sold Out)' : evt.isFree || evt.price === 0 ? 'ነፃ ትኬት ቁረጥ (RSVP Free)' : `ትኬት ቁረጥ (${evt.price} ETB)`}</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Modals */}
      {selectedEvent && (
        <PaymentModal
          isOpen={isPaymentModalOpen}
          onClose={() => setIsPaymentModalOpen(false)}
          course={{
            id: selectedEvent.id,
            title: `[ኢቨንት ትኬት] ${selectedEvent.title}`,
            price: selectedEvent.price,
            originalPrice: (selectedEvent as any).originalPrice || selectedEvent.price * 1.5,
            usdPrice: (selectedEvent as any).usdPrice || Math.round(selectedEvent.price / 130),
            thumbnailUrl: selectedEvent.image || '',
            category: 'Events'
          }}
          customTitle={`የኢቨንት ትኬት ክፍያ፦ ${selectedEvent.title}`}
          onSuccess={() => {
            processRegistration(selectedEvent, selectedEvent.price, 'lakipay_unified');
          }}
        />
      )}

      <DigitalTicketModal
        isOpen={isTicketModalOpen}
        onClose={() => setIsTicketModalOpen(false)}
        ticket={generatedTicket}
      />

      <RequireAuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        title="ትኬት ለመቁረጥ ይግቡ"
      />

      <Footer />
    </main>
  );
}
