import { NextResponse } from 'next/server';
import { getMentorshipUserEmailHtml, getMentorshipAdminEmailHtml, MentorshipBooking } from '@/lib/premiumEmailTemplates';

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

    const { name, phone, email, date, time, topic, userId, tier, amount, paymentMethod, meetingMode } = body;

    if (!name || !phone || !email || !date || !time) {
      return NextResponse.json(
        { success: false, error: 'እባክዎ ሙሉ ስም፣ ስልክ ቁጥር፣ ኢሜይል፣ ቀን እና ሰዓት ያስገቡ።' },
        { status: 400 }
      );
    }

    const bookingData: MentorshipBooking = {
      name: String(name).trim(),
      phone: String(phone).trim(),
      email: String(email).trim(),
      date: String(date).trim(),
      time: String(time).trim(),
      topic: (topic || 'አጠቃላይ የ 1-ለ-1 ማማከር').trim(),
      tier: tier || '1-Hour Strategy Consultation',
      amount: amount || 4600,
      meetingMode: meetingMode || 'online',
      paymentMethod: paymentMethod || 'telebirr',
      userId: userId || 'guest_user',
      createdAt: new Date().toISOString()
    };

    // 1. Save booking to Firestore collection 'mentorship_bookings'
    let bookingId = `MNTR-${Date.now().toString(36).toUpperCase()}`;
    try {
      const { adminDb } = await import('@/lib/firebase/admin');
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
      console.warn('Firestore admin mentorship save warning:', dbErr);
    }

    // 2. Dispatch Dual Emails via Resend (Safe & Non-blocking)
    const resendApiKey = process.env.RESEND_API_KEY;
    const fromEmail = process.env.RESEND_FROM_EMAIL || '"Tsehay Campus" <tsehayoperation@gmail.com>';
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
            subject: 'የማማከር ቀጠሮዎ ተመዝግቧል! (Mentorship Booking Received) - Tsehay Campus',
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
            subject: `New Mentorship Booking: ${bookingData.name} (${bookingData.tier} - ${bookingData.date})`,
            html: getMentorshipAdminEmailHtml(bookingData)
          })
        });
      } catch (adminMailErr) {
        console.warn('Mentorship admin email alert error:', adminMailErr);
      }
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
