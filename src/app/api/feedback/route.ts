import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    let body: any = {};
    try {
      body = await req.json();
    } catch (e) {
      body = {};
    }

    const { rating, type, category, message, userId, userName, userEmail, pageUrl, imageUrl, screenshotUrl, audioUrl, voiceNoteUrl } = body;

    const feedbackId = body.id || `fb_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const payload = {
      id: feedbackId,
      rating: Number(rating) || 5,
      type: type || category || 'general',
      category: category || type || 'general',
      message: (message || '').trim() || (audioUrl || voiceNoteUrl ? '🎙️ [የድምፅ መልዕክት]' : ''),
      userId: userId || 'guest_student',
      userName: userName || (userEmail ? userEmail.split('@')[0] : 'ተማሪ'),
      userEmail: userEmail || 'student@tsehaycampus.com',
      pageUrl: pageUrl || '/',
      imageUrl: imageUrl || screenshotUrl || null,
      screenshotUrl: screenshotUrl || imageUrl || null,
      audioUrl: audioUrl || voiceNoteUrl || null,
      voiceNoteUrl: voiceNoteUrl || audioUrl || null,
      status: 'pending',
      createdAt: new Date().toISOString(),
      createdAtClient: new Date().toISOString(),
    };

    if (adminDb) {
      // 1. Root user_feedbacks
      try {
        await adminDb.collection('user_feedbacks').doc(feedbackId).set(payload, { merge: true });
      } catch (e) {}

      // 2. Root student_feedback
      try {
        await adminDb.collection('student_feedback').doc(feedbackId).set(payload, { merge: true });
      } catch (e) {}

      // 3. Artifact collection
      try {
        await adminDb
          .collection('artifacts')
          .doc('tsehaycampus-e1a6d')
          .collection('public')
          .doc('data')
          .collection('student_feedback')
          .doc(feedbackId)
          .set(payload, { merge: true });
      } catch (e) {}
    }

    return NextResponse.json({
      success: true,
      message: 'አስተያየትዎ በተሳካ ሁኔታ ደርሶናል! እናመሰግናለን። (Feedback submitted successfully)',
      feedback: payload
    });
  } catch (error: any) {
    console.error('Error in POST /api/feedback:', error);
    return NextResponse.json({ success: false, error: error.message || 'Internal server error' }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const category = searchParams.get('category') || searchParams.get('type');
    const status = searchParams.get('status');

    let feedbacks: any[] = [];
    if (adminDb) {
      try {
        const snap = await adminDb.collection('user_feedbacks').orderBy('createdAt', 'desc').limit(100).get();
        if (!snap.empty) {
          feedbacks = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        }
      } catch (e) {
        try {
          const snap2 = await adminDb.collection('student_feedback').get();
          if (!snap2.empty) {
            feedbacks = snap2.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          }
        } catch (e2) {}
      }
    }

    if (category && category !== 'all') {
      feedbacks = feedbacks.filter(f => (f.category === category || f.type === category));
    }

    if (status && status !== 'all') {
      feedbacks = feedbacks.filter(f => f.status === status);
    }

    // Calculate rating statistics
    const totalRatings = feedbacks.reduce((acc, f) => acc + (Number(f.rating) || 5), 0);
    const averageRating = feedbacks.length > 0 ? (totalRatings / feedbacks.length).toFixed(1) : '5.0';

    return NextResponse.json({
      success: true,
      count: feedbacks.length,
      averageRating,
      feedbacks
    });
  } catch (error: any) {
    console.error('Error in GET /api/feedback:', error);
    return NextResponse.json({ success: true, count: 0, feedbacks: [] });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    let body: any = {};
    try {
      body = await req.json();
    } catch (e) {
      body = {};
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id') || body.id;
    const status = body.status;

    if (!id) {
      return NextResponse.json({ success: false, error: 'Missing feedback id' }, { status: 400 });
    }

    const updates: any = {
      updatedAt: new Date().toISOString()
    };
    if (status) updates.status = status;
    if (body.adminNotes) updates.adminNotes = body.adminNotes;

    if (adminDb) {
      try {
        await adminDb.collection('user_feedbacks').doc(id).set(updates, { merge: true });
      } catch (e) {}

      try {
        await adminDb.collection('student_feedback').doc(id).set(updates, { merge: true });
      } catch (e) {}
    }

    return NextResponse.json({
      success: true,
      message: 'የአስተያየቱ ሁኔታ ተስተካክሏል (Status updated)',
      id,
      updates
    });
  } catch (error: any) {
    console.error('Error in PATCH /api/feedback:', error);
    return NextResponse.json({ success: false, error: error.message || 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    let id = searchParams.get('id');

    if (!id) {
      try {
        const body = await req.json();
        id = body?.id;
      } catch (e) {}
    }

    if (!id) {
      return NextResponse.json({ success: false, error: 'Missing feedback id' }, { status: 400 });
    }

    if (adminDb) {
      try {
        await adminDb.collection('user_feedbacks').doc(id).delete();
      } catch (e) {}

      try {
        await adminDb.collection('student_feedback').doc(id).delete();
      } catch (e) {}
    }

    return NextResponse.json({
      success: true,
      message: 'አስተያየቱ ተሰርዟል! (Feedback deleted successfully)',
      id
    });
  } catch (error: any) {
    console.error('Error in DELETE /api/feedback:', error);
    return NextResponse.json({ success: false, error: error.message || 'Internal server error' }, { status: 500 });
  }
}
