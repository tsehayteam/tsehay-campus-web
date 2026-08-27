import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { getMentorshipUserEmailHtml, getMentorshipAdminEmailHtml, MentorshipBooking } from '@/lib/premiumEmailTemplates';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, phone, email, date, time, topic, userId } = body;

    if (!name || !phone || !email || !date || !time) {
      return NextResponse.json(
        { success: false, error: 'እባክዎ ሙሉ ስም፣ ስልክ ቁጥር፣ ኢሜይል፣ ቀን እና ሰዓት ያስገቡ።' },
        { status: 400 }
      );
    }

    const bookingData: MentorshipBooking = {
      name: name.trim(),
      phone: phone.trim(),
      email: email.trim(),
      date: date.trim(),
      time: time.trim(),
      topic: (topic || 'አጠቃላይ የዲጂታል ቢዝነስ እና የዩቲዩብ ማማከር').trim(),
      userId: userId || 'guest_user',
      createdAt: new Date().toISOString()
    };

    // 1. Save booking to Firestore collection 'mentorship_bookings'
    let bookingId = `MNTR-${Date.now().toString(36).toUpperCase()}`;
    try {
      if (adminDb && typeof adminDb.collection === 'function') {
        const docRef = await adminDb.collection('mentorship_bookings').add({
          ...bookingData,
          status: 'confirmed',
          createdAtServer: new Date()
        });
        bookingId = docRef.id;
        bookingData.id = bookingId;
      }
    } catch (dbErr) {
      console.warn('Firestore mentorship save warning:', dbErr);
    }

    // 2. Dispatch Dual Emails via Resend
    const resendApiKey = process.env.RESEND_API_KEY;
    const fromEmail = process.env.RESEND_FROM_EMAIL || 'Tsehay Campus <support@tsehaycampus.com>';
    const adminEmail = process.env.ADMIN_EMAIL || 'eyoubsahle@gmail.com';

    if (resendApiKey) {
      // Email A: Student Confirmation
      try {
        await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${resendApiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            from: fromEmail,
            to: [bookingData.email],
            subject: 'የማማከር ቀጠሮዎ ተረጋግጧል! (Your Mentorship is Confirmed) - Tsehay Campus',
            html: getMentorshipUserEmailHtml(bookingData)
          })
        });
      } catch (mailErr) {
        console.warn('Mentorship student email error:', mailErr);
      }

      // Email B: Admin Alert
      try {
        await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${resendApiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            from: fromEmail,
            to: [adminEmail, 'admin@tsehaycampus.com'],
            subject: `New Mentorship Booking: ${bookingData.name} (${bookingData.date})`,
            html: getMentorshipAdminEmailHtml(bookingData)
          })
        });
      } catch (adminMailErr) {
        console.warn('Mentorship admin email alert error:', adminMailErr);
      }
    } else {
      console.log('RESEND_API_KEY not configured. Mocking mentorship email dispatch for:', bookingData.email);
    }

    return NextResponse.json({
      success: true,
      bookingId,
      booking: bookingData,
      message: 'የማማከር ቀጠሮዎ በተሳካ ሁኔታ ተመዝግቧል! ማረጋገጫ በኢሜይልዎ ተልኳል።'
    });

  } catch (error: any) {
    console.error('Mentorship API Error:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'ቀጠሮ ማስያዝ አልተቻለም፤ እባክዎ በድጋሚ ይሞክሩ።' },
      { status: 500 }
    );
  }
}
