import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { supabaseAdmin } from '@/lib/supabase/server';
import { verifyAdminRequest } from '@/lib/adminAuthHelper';
import { invalidateEventsCache } from '@/app/api/events/route';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

const NO_CACHE_HEADERS = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
  'CDN-Cache-Control': 'no-store',
  'Vercel-CDN-Cache-Control': 'no-store',
  'Pragma': 'no-cache',
  'Expires': '0',
};

export async function POST(req: NextRequest) {
  try {
    const auth = await verifyAdminRequest(req);
    if (!auth.authorized) {
      return NextResponse.json(
        { success: false, error: auth.error || 'Unauthorized: Admin privileges required.' },
        { status: 401, headers: NO_CACHE_HEADERS }
      );
    }

    const body = await req.json();
    const { 
      eventId, 
      deductCount, 
      countToDeduct, 
      seatsToDeduct, 
      newRegisteredCount: explicitCount, 
      note, 
      mode = 'deduct', 
      action = 'deduct' 
    } = body;

    if (!eventId) {
      return NextResponse.json(
        { success: false, error: 'የክስተት መለያ (Event ID) ያስፈልጋል' },
        { status: 400, headers: NO_CACHE_HEADERS }
      );
    }

    // 1. Fetch event from database (Supabase table and site_settings)
    let currentReg = 0;
    let capacity = 100;
    let targetEvent: any = null;

    // Check PostgreSQL events table
    try {
      const { data: dbEvent } = await supabaseAdmin
        .from('events')
        .select('*')
        .or(`id.eq.${eventId},slug.eq.${eventId}`)
        .maybeSingle();

      if (dbEvent) {
        targetEvent = dbEvent;
        capacity = Number(dbEvent.capacity || dbEvent.seatCapacity) || 100;
        currentReg = Number(dbEvent.registered_count ?? dbEvent.registeredCount) || 0;
      }
    } catch (e) {
      console.warn('Postgres events table fetch warning:', e);
    }

    // Check site_settings 'events'
    const { data: settingsRow } = await supabaseAdmin
      .from('site_settings')
      .select('data')
      .eq('key', 'events')
      .maybeSingle();

    const existingEvents: any[] = Array.isArray(settingsRow?.data) ? settingsRow.data : [];
    const settingsEvent = existingEvents.find(e => e && (e.id === eventId || e.slug === eventId));

    if (settingsEvent) {
      if (!targetEvent) targetEvent = settingsEvent;
      capacity = Number(settingsEvent.capacity || settingsEvent.seatCapacity) || capacity;
      currentReg = Number(settingsEvent.registered_count ?? settingsEvent.registeredCount) || currentReg;
    }

    if (!targetEvent && !settingsEvent) {
      return NextResponse.json(
        { success: false, error: 'ክስተቱ አልተገኘም (Event not found)' },
        { status: 404, headers: NO_CACHE_HEADERS }
      );
    }

    // 2. Calculate new count with Seats Math:
    // When deducting available seats (e.g. 10 offline in-person attendees arrived):
    // registeredCount increases by +10 -> availableSeats decreases by -10!
    let finalRegCount: number;
    let deductedAmount: number = 0;
    const isRelease = mode === 'release' || action === 'release';

    if (explicitCount !== undefined && typeof explicitCount === 'number') {
      finalRegCount = Math.max(0, Math.min(capacity, explicitCount));
      deductedAmount = Math.abs(currentReg - finalRegCount);
    } else {
      const rawCount = Math.abs(Number(countToDeduct ?? deductCount ?? seatsToDeduct) || 0);
      if (rawCount <= 0) {
        return NextResponse.json(
          { success: false, error: 'የሚቀነሰው የመቀመጫ ብዛት ከዜሮ መብለጥ አለበት (Count must be greater than 0)' },
          { status: 400, headers: NO_CACHE_HEADERS }
        );
      }

      deductedAmount = rawCount;

      if (isRelease) {
        // Seat release: reduces registered count (releasing back to available seats)
        finalRegCount = Math.max(0, currentReg - rawCount);
      } else {
        // Default (Deduct Available Seats): In-person/offline attendees occupy available seats
        const newRegisteredCount = currentReg + rawCount;
        if (newRegisteredCount > capacity) {
          return NextResponse.json(
            { 
              success: false, 
              error: 'የተጠየቀው የመቀመጫ ብዛት ካለው ክፍት ቦታ በላይ ነው!' 
            },
            { status: 400, headers: NO_CACHE_HEADERS }
          );
        }
        finalRegCount = newRegisteredCount;
      }
    }

    const newAvailableSeats = Math.max(0, capacity - finalRegCount);
    const nowIso = new Date().toISOString();

    // 3. Atomic Database Update
    // A) Update PostgreSQL events table
    try {
      await supabaseAdmin
        .from('events')
        .update({
          registered_count: finalRegCount,
          updated_at: nowIso
        })
        .or(`id.eq.${eventId},slug.eq.${eventId}`);
    } catch (sbErr) {
      console.warn('Error updating PostgreSQL events table:', sbErr);
    }

    // B) Update site_settings 'events' array
    let updatedEventObj: any = null;
    let updatedEventsList: any[] = [];

    if (existingEvents.length > 0) {
      updatedEventsList = existingEvents.map(ev => {
        if (ev && (ev.id === eventId || ev.slug === eventId)) {
          updatedEventObj = {
            ...ev,
            registeredCount: finalRegCount,
            registered_count: finalRegCount,
            availableSeats: newAvailableSeats,
            available_seats: newAvailableSeats,
            remainingSeats: newAvailableSeats,
            remaining_seats: newAvailableSeats,
            seatsLeft: newAvailableSeats,
            availableTickets: newAvailableSeats,
            updatedAt: nowIso,
            lastSeatAdjustment: {
              deductedAmount,
              mode: isRelease ? 'release' : 'deduct',
              previousCount: currentReg,
              newCount: finalRegCount,
              availableSeats: newAvailableSeats,
              at: nowIso,
              adminEmail: auth.email || 'Admin',
              note: note || (isRelease ? 'Admin manual seat release' : 'Admin manual offline seat deduction')
            }
          };
          return updatedEventObj;
        }
        return ev;
      });

      await supabaseAdmin
        .from('site_settings')
        .upsert({
          key: 'events',
          data: updatedEventsList,
          updated_at: nowIso
        });
    }

    if (!updatedEventObj) {
      updatedEventObj = {
        ...(targetEvent || {}),
        id: targetEvent?.id || eventId,
        registeredCount: finalRegCount,
        registered_count: finalRegCount,
        availableSeats: newAvailableSeats,
        available_seats: newAvailableSeats,
        remainingSeats: newAvailableSeats,
        remaining_seats: newAvailableSeats,
        seatsLeft: newAvailableSeats,
        capacity,
        updatedAt: nowIso
      };
    }

    // 4. Invalidate Caches & Revalidate Next.js Paths
    invalidateEventsCache();
    try {
      revalidatePath('/');
      revalidatePath('/events');
      revalidatePath('/admin');
    } catch (e) {}

    return NextResponse.json(
      {
        success: true,
        message: isRelease
          ? `በተሳካ ሁኔታ ${deductedAmount} መቀመጫዎች ተለቀዋል! የቀረ ክፍት ቦታ፦ ${newAvailableSeats} (ጠቅላላ የተመዘገበ፦ ${finalRegCount}/${capacity})`
          : `በተሳካ ሁኔታ ${deductedAmount} መቀመጫዎች ተቀንሰዋል! የቀረ ክፍት ቦታ፦ ${newAvailableSeats} (ጠቅላላ የተመዘገበ፦ ${finalRegCount}/${capacity})`,
        event: updatedEventObj,
        events: updatedEventsList.length > 0 ? updatedEventsList : undefined,
        previousCount: currentReg,
        newCount: finalRegCount,
        newRegisteredCount: finalRegCount,
        availableSeats: newAvailableSeats,
        remainingSeats: newAvailableSeats,
        deductedAmount
      },
      { headers: NO_CACHE_HEADERS }
    );
  } catch (error: any) {
    console.error('Error in /api/events/adjust-seats:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to adjust seats' },
      { status: 500, headers: NO_CACHE_HEADERS }
    );
  }
}
