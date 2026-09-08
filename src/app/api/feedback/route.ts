import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase/server';
import { verifyAdminRequest } from '@/lib/adminAuthHelper';

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

async function getFeedbacks(): Promise<any[]> {
  try {
    const { data: row, error } = await supabaseServer
      .from('site_settings')
      .select('data')
      .eq('key', 'user_feedbacks')
      .maybeSingle();

    if (!error && row?.data && Array.isArray(row.data)) {
      return row.data;
    }
  } catch (e) {
    console.warn('Supabase feedback fetch warning:', e);
  }
  return [];
}

async function saveFeedbacks(feedbacks: any[]) {
  try {
    await supabaseServer
      .from('site_settings')
      .upsert({
        key: 'user_feedbacks',
        data: feedbacks,
        updated_at: new Date().toISOString()
      });
  } catch (e) {
    console.warn('Supabase feedback save error:', e);
  }
}

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

    const feedbacks = await getFeedbacks();
    const updated = [payload, ...feedbacks.filter(f => f.id !== feedbackId)];
    await saveFeedbacks(updated);

    return NextResponse.json({
      success: true,
      message: 'አስተያየትዎ በተሳካ ሁኔታ ደርሶናል! እናመሰግናለን። (Feedback submitted successfully)',
      feedback: payload
    }, { headers: NO_CACHE_HEADERS });
  } catch (error: any) {
    console.error('Error in POST /api/feedback:', error);
    return NextResponse.json({ success: false, error: error.message || 'Internal server error' }, { status: 500, headers: NO_CACHE_HEADERS });
  }
}

export async function GET(req: NextRequest) {
  const auth = await verifyAdminRequest(req);
  if (!auth.authorized) {
    return NextResponse.json({ success: false, error: auth.error || 'Unauthorized' }, { status: 401, headers: NO_CACHE_HEADERS });
  }

  try {
    const { searchParams } = new URL(req.url);
    const category = searchParams.get('category') || searchParams.get('type');
    const status = searchParams.get('status');

    let feedbacks = await getFeedbacks();

    if (category && category !== 'all') {
      feedbacks = feedbacks.filter(f => (f.category === category || f.type === category));
    }

    if (status && status !== 'all') {
      feedbacks = feedbacks.filter(f => f.status === status);
    }

    const totalRatings = feedbacks.reduce((acc, f) => acc + (Number(f.rating) || 5), 0);
    const averageRating = feedbacks.length > 0 ? (totalRatings / feedbacks.length).toFixed(1) : '5.0';

    return NextResponse.json({
      success: true,
      count: feedbacks.length,
      averageRating,
      feedbacks
    }, { headers: NO_CACHE_HEADERS });
  } catch (error: any) {
    console.error('Error in GET /api/feedback:', error);
    return NextResponse.json({ success: true, count: 0, feedbacks: [] }, { headers: NO_CACHE_HEADERS });
  }
}

export async function PATCH(req: NextRequest) {
  const auth = await verifyAdminRequest(req);
  if (!auth.authorized) {
    return NextResponse.json({ success: false, error: auth.error || 'Unauthorized' }, { status: 401, headers: NO_CACHE_HEADERS });
  }

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

    const feedbacks = await getFeedbacks();
    const updated = feedbacks.map(f => {
      if (f.id === id) {
        return {
          ...f,
          ...(status ? { status } : {}),
          ...(body.adminNotes ? { adminNotes: body.adminNotes } : {}),
          updatedAt: new Date().toISOString()
        };
      }
      return f;
    });

    await saveFeedbacks(updated);

    return NextResponse.json({
      success: true,
      message: 'የአስተያየቱ ሁኔታ ተስተካክሏል (Status updated)',
      id
    }, { headers: NO_CACHE_HEADERS });
  } catch (error: any) {
    console.error('Error in PATCH /api/feedback:', error);
    return NextResponse.json({ success: false, error: error.message || 'Internal server error' }, { status: 500, headers: NO_CACHE_HEADERS });
  }
}

export async function DELETE(req: NextRequest) {
  const auth = await verifyAdminRequest(req);
  if (!auth.authorized) {
    return NextResponse.json({ success: false, error: auth.error || 'Unauthorized' }, { status: 401, headers: NO_CACHE_HEADERS });
  }

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

    const feedbacks = await getFeedbacks();
    const updated = feedbacks.filter(f => f.id !== id);
    await saveFeedbacks(updated);

    return NextResponse.json({
      success: true,
      message: 'አስተያየቱ ተሰርዟል! (Feedback deleted successfully)',
      id
    }, { headers: NO_CACHE_HEADERS });
  } catch (error: any) {
    console.error('Error in DELETE /api/feedback:', error);
    return NextResponse.json({ success: false, error: error.message || 'Internal server error' }, { status: 500, headers: NO_CACHE_HEADERS });
  }
}
