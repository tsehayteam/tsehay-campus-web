import { NextRequest, NextResponse } from 'next/server';
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
    const { eventId, deductCount, newRegisteredCount: explicitCount, note } = body;

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
        capacity = Number(dbEvent.capacity) || 100;
        currentReg = Number(dbEvent.registered_count) || 0;
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
      capacity = Number(settingsEvent.capacity) || capacity;
      currentReg = Number(settingsEvent.registered_count ?? settingsEvent.registeredCount) || currentReg;
    }

    if (!targetEvent && !settingsEvent) {
      return NextResponse.json(
        { success: false, error: 'ክስተቱ አልተገኘም (Event not found)' },
        { status: 404, headers: NO_CACHE_HEADERS }
      );
    }

    // 2. Calculate new count with Floor Guard (registeredCount >= 0)
    let finalRegCount: number;
    let deductedAmount: number = 0;

    if (explicitCount !== undefined && typeof explicitCount === 'number') {
      finalRegCount = Math.max(0, Math.min(capacity, explicitCount));
      deductedAmount = Math.max(0, currentReg - finalRegCount);
    } else {
      const deduction = Math.abs(Number(deductCount) || 0);
      if (deduction <= 0) {
        return NextResponse.json(
          { success: false, error: 'የሚቀነሰው የመቀመጫ ብዛት ከዜሮ መብለጥ አለበት (Deduction must be greater than 0)' },
          { status: 400, headers: NO_CACHE_HEADERS }
        );
      }
      deductedAmount = Math.min(deduction, currentReg);
      // Floor guard: Never drop below 0
      finalRegCount = Math.max(0, currentReg - deduction);
    }

    const newRemainingSeats = Math.max(0, capacity - finalRegCount);
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
            remainingSeats: newRemainingSeats,
            seatsLeft: newRemainingSeats,
            availableTickets: newRemainingSeats,
            updatedAt: nowIso,
            lastSeatAdjustment: {
              deductedAmount,
              previousCount: currentReg,
              newCount: finalRegCount,
              at: nowIso,
              adminEmail: auth.email || 'Admin',
              note: note || 'Admin manual seat decrement'
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
        remainingSeats: newRemainingSeats,
        seatsLeft: newRemainingSeats,
        capacity,
        updatedAt: nowIso
      };
    }

    // 4. Invalidate Cache
    invalidateEventsCache();

    return NextResponse.json(
      {
        success: true,
        message: `በተሳካ ሁኔታ የመቀመጫ ብዛት ተስተካክሏል! የቀድሞ የተመዘገበ፦ ${currentReg}፣ አዲስ የተመዘገበ፦ ${finalRegCount} (ክፍት ቦታ፦ ${newRemainingSeats})`,
        event: updatedEventObj,
        events: updatedEventsList.length > 0 ? updatedEventsList : undefined,
        previousCount: currentReg,
        newCount: finalRegCount,
        remainingSeats: newRemainingSeats,
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
