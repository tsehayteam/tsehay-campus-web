import { NextResponse } from 'next/server';
import { getMentorshipUserEmailHtml, getMentorshipAdminEmailHtml, MentorshipBooking } from '@/lib/premiumEmailTemplates';
import { adminDb } from '@/lib/firebase/admin';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    let body: any = {};
    try {
      body = await req.json();
    } catch (parseError) {
      return NextResponse.json(
        { success: false, error: 'Invalid JSON payload provided.' },
        { status: 400 }
      );
    }

    const { name, phone, email, date, time, topic, userId, tier, amount, paymentMethod, meetingMode, transactionRef, receiptFile } = body;

    if (!name || !phone || !email || !date || !time) {
      return NextResponse.json(
        { success: false, error: 'እባክዎ ሙሉ ስም፣ ስልክ ቁጥር፣ ኢሜይል፣ ቀን እና ሰዓት ያስገቡ።' },
        { status: 400 }
      );
    }

    const validUserId = String(userId || 'guest_user').trim();
    let bookingId = `MNTR-${Date.now().toString(36).toUpperCase()}`;

    const bookingData: MentorshipBooking = {
      id: bookingId,
      name: String(name).trim(),
      phone: String(phone).trim(),
      email: String(email).trim(),
      date: String(date).trim(),
      time: String(time).trim(),
      topic: (topic || 'አጠቃላይ የ 1-ለ-1 ማማከር').trim(),
      tier: tier || '1-Hour Strategy Consultation',
      amount: Number(amount) || 4600,
      meetingMode: meetingMode || 'online',
      paymentMethod: paymentMethod || 'telebirr',
      userId: validUserId,
      createdAt: new Date().toISOString()
    };

    const dbPayload = {
      ...bookingData,
      transactionRef: transactionRef ? String(transactionRef).trim() : null,
      receiptFile: receiptFile || null,
      status: 'confirmed',
      createdAtServer: new Date()
    };

    // 1. Save booking to Firestore collections & user sub-collection
    if (adminDb) {
      try {
        const batchPromises: Promise<any>[] = [
          adminDb.collection('mentorship_bookings').doc(bookingId).set(dbPayload),
          adminDb.collection('artifacts').doc('tsehaycampus-e1a6d').collection('mentorship_bookings').doc(bookingId).set(dbPayload)
        ];

        // If user is authenticated, strictly link to their user profile subcollection
        if (validUserId && !validUserId.startsWith('guest_')) {
          batchPromises.push(
            adminDb
              .collection('artifacts')
              .doc('tsehaycampus-e1a6d')
              .collection('users')
              .doc(validUserId)
              .collection('mentorship_bookings')
              .doc(bookingId)
              .set(dbPayload)
          );
        }

        await Promise.allSettled(batchPromises);
      } catch (dbErr) {
        console.warn('Firestore admin mentorship save warning:', dbErr);
      }
    }

    // 2. Dispatch Dual Emails via Resend (Safe & Non-blocking)
    const resendApiKey = process.env.RESEND_API_KEY;
    const fromEmail = process.env.RESEND_FROM_EMAIL || '"Tsehay Campus" <tsehayoperation@gmail.com>';
    const adminEmail = process.env.ADMIN_EMAIL || 'eyoubsahle@gmail.com';

    if (resendApiKey) {
      // Email A: Student Confirmation
      fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${resendApiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          from: fromEmail,
          to: [bookingData.email],
          subject: 'የማማከር ቀጠሮዎ ተመዝግቧል! (Mentorship Booking Received) - Tsehay Campus',
          html: getMentorshipUserEmailHtml(bookingData)
        })
      }).catch((e) => console.warn('Mentorship student email dispatch error:', e));

      // Email B: Admin Alert
      fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${resendApiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          from: fromEmail,
          to: [adminEmail, 'admin@tsehaycampus.com'],
          subject: `New Mentorship Booking: ${bookingData.name} (${bookingData.tier} - ${bookingData.date})`,
          html: getMentorshipAdminEmailHtml(bookingData)
        })
      }).catch((e) => console.warn('Mentorship admin email alert error:', e));
    }

    return NextResponse.json({
      success: true,
      bookingId,
      booking: bookingData,
      message: 'የማማከር ቀጠሮዎ በተሳካ ሁኔታ ተመዝግቧል!'
    });

  } catch (error: any) {
    console.error('Mentorship API Error:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'ቀጠሮ ማስያዝ አልተቻለም፤ እባክዎ በድጋሚ ይሞክሩ።' },
      { status: 500 }
    );
  }
}
