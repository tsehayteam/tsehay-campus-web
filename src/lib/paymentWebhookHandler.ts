import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { supabaseServer } from '@/lib/supabase/server';
import { EventTicket } from '@/lib/eventCache';
import { sendTicketEmail } from '@/lib/ticketEmailService';

async function getTickets(): Promise<EventTicket[]> {
  try {
    const { data: row, error } = await supabaseServer
      .from('site_settings')
      .select('data')
      .eq('key', 'event_tickets')
      .maybeSingle();

    if (!error && row?.data && Array.isArray(row.data)) {
      return row.data;
    }
  } catch (e) {}
  return [];
}

async function saveTickets(tickets: EventTicket[]) {
  try {
    await supabaseServer
      .from('site_settings')
      .upsert({
        key: 'event_tickets',
        data: tickets,
        updated_at: new Date().toISOString()
      });
  } catch (e) {}
}

export async function handleLakiPayWebhook(request: Request): Promise<Response> {
  try {
    const rawBody = await request.text();
    const signature = 
      request.headers.get('x-lakipay-signature') || 
      request.headers.get('x-chapa-signature') ||
      request.headers.get('signature');

    const secret = (process.env.LAKIPAY_SECRET_KEY || process.env.CHAPA_SECRET_KEY || '').trim().replace(/^["']|["']$/g, '');

    // Mandatory signature verification
    if (!secret) {
      console.error("Webhook Error: LAKIPAY_SECRET_KEY / CHAPA_SECRET_KEY is not configured on server.");
      return NextResponse.json({ error: 'Server webhook configuration error' }, { status: 500 });
    }

    if (!signature) {
      console.warn("Webhook Warning: Request missing signature header.");
      return NextResponse.json({ error: 'Missing signature header' }, { status: 401 });
    }

    const hash = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
    if (hash !== signature) {
      console.error("Webhook Error: Invalid signature hash verification failed.");
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    let event: any = {};
    try {
      event = JSON.parse(rawBody);
    } catch (parseErr) {
      console.error("Webhook Error: Invalid JSON body:", parseErr);
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }

    // LakiPay / Chapa charge success event validation
    const statusStr = String(event.status || event.event || '').toLowerCase();
    const isSuccess = 
      statusStr === 'charge.success' || 
      statusStr === 'success' || 
      statusStr === 'completed' ||
      statusStr === 'paid';

    const tx_ref = 
      event.reference || 
      event.data?.reference || 
      event.data?.tx_ref || 
      event.tx_ref ||
      event.transaction_id ||
      event.data?.transaction_id;

    const amount = Number(event.amount || event.data?.amount || 0);

    if (isSuccess && tx_ref) {
      console.log(`LakiPay Webhook: Verified payment successful for tx_ref: ${tx_ref}`);

      let pendingDoc: any = null;
      try {
        const { data } = await supabaseServer
          .from('pending_payments')
          .select('*')
          .eq('id', tx_ref)
          .maybeSingle();
        pendingDoc = data;
      } catch (dbErr) {
        console.warn("Error querying pending payment:", dbErr);
      }

      const isEventTicket = Boolean(
        pendingDoc?.is_event_ticket ||
        String(pendingDoc?.course_id || '').startsWith('evt_') ||
        String(pendingDoc?.course_id || '').startsWith('EVT-') ||
        String(tx_ref).startsWith('TC-EVT-')
      );

      // 🎫 Handle Event Ticket Confirmation
      if (isEventTicket && pendingDoc) {
        const eventId = pendingDoc.event_id || pendingDoc.course_id || 'evt_general';
        const eventSlug = pendingDoc.event_slug || '';
        const attendeeEmail = pendingDoc.attendee_email || pendingDoc.user_email || '';
        const attendeeName = pendingDoc.attendee_name || 'የተከበሩ ተማሪ';
        const attendeePhone = pendingDoc.attendee_phone || '';
        const tier = pendingDoc.tier || 'General Admission';
        const pricePaid = Number(pendingDoc.price || amount || 0);

        const existingTickets = await getTickets();
        const alreadyIssued = existingTickets.find(t => t.ticketId === tx_ref || (t.eventId === eventId && t.attendeeEmail.toLowerCase() === attendeeEmail.toLowerCase()));

        if (!alreadyIssued) {
          const randomHex = Math.random().toString(36).substring(2, 6).toUpperCase();
          const ticketId = tx_ref.startsWith('TC-EVT-') ? tx_ref : `TC-EVT-${Date.now().toString(36).substring(4).toUpperCase()}-${randomHex}`;

          const ticket: EventTicket = {
            ticketId,
            eventId,
            eventSlug,
            eventTitle: pendingDoc.event_title || pendingDoc.title || 'Tsehay Campus Live Workshop',
            eventImage: pendingDoc.event_image || '',
            image: pendingDoc.event_image || '',
            eventDate: pendingDoc.event_date || new Date().toLocaleDateString(),
            eventTime: pendingDoc.event_time || '02:00 PM',
            eventLocation: pendingDoc.event_location || 'Addis Ababa, Ethiopia',
            isOnline: Boolean(pendingDoc.is_online),
            meetingLink: pendingDoc.meeting_link || '',
            mapsUrl: pendingDoc.maps_url || '',
            attendeeName,
            attendeeEmail,
            attendeePhone,
            userId: pendingDoc.user_id || 'guest_user',
            tier: tier as any,
            pricePaid,
            paymentMethod: 'lakipay',
            qrCodeData: JSON.stringify({ ticketId, eventId, name: attendeeName, email: attendeeEmail, tier }),
            isUsed: false,
            usedAt: null,
            issuedAt: new Date().toISOString()
          };

          const updatedTickets = [ticket, ...existingTickets];
          await saveTickets(updatedTickets);

          try {
            await sendTicketEmail(ticket);
          } catch (mailErr) {
            console.warn("Webhook ticket email notice:", mailErr);
          }
          console.log(`LakiPay Webhook: Issued event ticket ${ticketId} for ${attendeeEmail}`);
        }

        return NextResponse.json({ status: 'success', type: 'event_ticket' }, { status: 200 });
      }

      // 🎓 Handle Course Enrollment Fulfillment
      let courseId = pendingDoc?.course_id || pendingDoc?.courseId;
      let userId = pendingDoc?.user_id || pendingDoc?.userId;

      if (!courseId || !userId) {
        if (tx_ref.includes('_')) {
          const parts = tx_ref.split('_');
          if (parts[0] === 'REF') {
            courseId = parts[1];
            userId = parts[2];
          } else {
            courseId = parts[2];
            userId = parts[3];
          }
        }
      }

      if (userId && userId !== 'anonymous' && courseId) {
        try {
          await supabaseServer.from('enrollments').upsert({
            id: `${userId}_${courseId}`,
            user_id: userId,
            course_id: courseId,
            tx_ref,
            amount: amount || Number(pendingDoc?.price || 0),
            payment_method: 'lakipay',
            status: 'active',
            created_at: new Date().toISOString()
          });

          console.log(`LakiPay Webhook: Successfully granted course ${courseId} access to user ${userId}`);

          // 📧 Send Course Enrollment Confirmation Email
          try {
            const { sendCourseEnrollmentEmail } = await import('@/lib/email');
            const { DEFAULT_COURSES } = await import('@/lib/courseCache');

            const { data: profile } = await supabaseServer
              .from('profiles')
              .select('email, full_name, display_name')
              .eq('id', userId)
              .maybeSingle();

            const { data: dbCourse } = await supabaseServer
              .from('courses')
              .select('title, desc, description')
              .or(`id.eq.${courseId},slug.eq.${courseId}`)
              .maybeSingle();

            const defaultMatch = DEFAULT_COURSES.find(c => c.id === courseId || c.slug === courseId);
            const courseTitle = dbCourse?.title || defaultMatch?.title || 'የፀሐይ ካምፓስ ስልጠና';
            const courseDescription = dbCourse?.desc || dbCourse?.description || defaultMatch?.description || '';

            const studentEmail = pendingDoc?.email || profile?.email;
            const studentName = pendingDoc?.name || profile?.full_name || profile?.display_name || studentEmail?.split('@')[0];

            if (studentEmail) {
              sendCourseEnrollmentEmail({
                to: studentEmail,
                name: studentName,
                courseTitle,
                courseDescription,
                price: amount || Number(pendingDoc?.price || 0),
                referenceId: tx_ref,
                accessUrl: `https://www.tsehaycampus.com/dashboard?view=classroom&courseId=${encodeURIComponent(courseId)}`
              }).catch(e => console.warn('[LakiPay Course Email Dispatch Error]:', e));
            }
          } catch (mailErr) {
            console.warn('[LakiPay Course Email Error]:', mailErr);
          }
        } catch (err) {
          console.error("Error saving enrollment to Supabase:", err);
        }
      }

      return NextResponse.json({ status: 'success', type: 'course_enrollment' }, { status: 200 });
    }

    return NextResponse.json({ status: 'ignored' }, { status: 200 });

  } catch (error: any) {
    console.error("LakiPay webhook processing error:", error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
