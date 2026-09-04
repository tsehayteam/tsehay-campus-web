import { NextRequest, NextResponse } from 'next/server';
import { sendTicketEmail } from '@/lib/ticketEmailService';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { ticket, email } = body;

    if (!ticket) {
      return NextResponse.json({ error: 'Ticket required' }, { status: 400 });
    }

    const targetTicket = {
      ...ticket,
      attendeeEmail: email || ticket.attendeeEmail
    };

    const emailResult = await sendTicketEmail(targetTicket);

    return NextResponse.json({
      success: true,
      emailSent: emailResult.success,
      message: emailResult.success 
        ? 'ትኬቱ ወደ ኢሜይልዎ በተሳካ ሁኔታ ተልኳል! (Ticket email sent)' 
        : 'ትኬቱ ተዘጋጅቷል፤ በዲጂታል ፓስ መልክ ማውረድ ይችላሉ።',
      error: emailResult.error
    });
  } catch (error: any) {
    console.error('Error in /api/events/send-ticket-email:', error);
    return NextResponse.json({ 
      success: false, 
      error: error.message || 'Failed to send ticket email' 
    }, { status: 500 });
  }
}
