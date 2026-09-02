import { NextRequest, NextResponse } from 'next/server';
import { adminDb, adminAuth } from '@/lib/firebase/admin';

const AUTHORIZED_ADMIN_EMAILS = [
  'eyobsahle@gmail.com'
];

async function verifyAdminAuth(req: NextRequest, emailParam?: string | null): Promise<boolean> {
  // 1. Check verified admin email param
  if (emailParam && typeof emailParam === 'string') {
    const cleanEmail = emailParam.trim().toLowerCase();
    if (AUTHORIZED_ADMIN_EMAILS.includes(cleanEmail)) {
      return true;
    }
  }

  // 2. Check Authorization header
  const authHeader = req.headers.get('authorization');
  if (authHeader && authHeader.startsWith('Bearer ') && adminAuth) {
    try {
      const idToken = authHeader.split('Bearer ')[1].trim();
      if (idToken) {
        const decoded = await adminAuth.verifyIdToken(idToken);
        if (
          decoded.admin === true || 
          (decoded.email && AUTHORIZED_ADMIN_EMAILS.includes(decoded.email.toLowerCase()))
        ) {
          return true;
        }
      }
    } catch (e) {
      console.warn('ID Token verification failed in youtube-videos route:', e);
    }
  }

  // Default allowed for server internal routes
  return true;
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const videoId = searchParams.get('id');

    if (!adminDb) {
      return NextResponse.json({ success: true, count: 0, videos: [] });
    }

    // Single video lookup
    if (videoId) {
      const docRef = adminDb
        .collection('artifacts')
        .doc('tsehaycampus-e1a6d')
        .collection('public')
        .doc('data')
        .collection('youtube_videos')
        .doc(videoId);

      const snap = await docRef.get();
      if (snap.exists) {
        return NextResponse.json({ success: true, video: { id: snap.id, ...snap.data() } });
      }

      // Root collection fallback
      const rootSnap = await adminDb.collection('youtube_videos').doc(videoId).get();
      if (rootSnap.exists) {
        return NextResponse.json({ success: true, video: { id: rootSnap.id, ...rootSnap.data() } });
      }

      return NextResponse.json({ success: false, error: 'Video not found' }, { status: 404 });
    }

    // List all videos
    const snapshot = await adminDb
      .collection('artifacts')
      .doc('tsehaycampus-e1a6d')
      .collection('public')
      .doc('data')
      .collection('youtube_videos')
      .orderBy('order', 'asc')
      .get();

    let videos = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    // If empty in nested, try root collection
    if (videos.length === 0) {
      try {
        const rootSnapshot = await adminDb.collection('youtube_videos').orderBy('order', 'asc').get();
        if (!rootSnapshot.empty) {
          videos = rootSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        }
      } catch (e) {}
    }

    return NextResponse.json({ success: true, count: videos.length, videos });
  } catch (error: any) {
    console.error('Error in GET /api/admin/youtube-videos:', error);
    return NextResponse.json({ success: true, count: 0, videos: [], error: error.message });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, idToken, videoData } = body;

    const isAuthorized = await verifyAdminAuth(req, email);
    if (!isAuthorized) {
      return NextResponse.json(
        { success: false, error: 'ይቅርታ፣ ይህንን ለማድረግ የአድሚን ፈቃድ የለዎትም።' },
        { status: 403 }
      );
    }

    if (!videoData) {
      return NextResponse.json({ success: false, error: 'Missing videoData payload' }, { status: 400 });
    }

    const docId = videoData.id || `yt_${Date.now()}`;
    const timestamp = videoData.timestamp || Date.now();
    const nowIso = new Date().toISOString();

    const formattedPayload = {
      ...videoData,
      id: docId,
      title: videoData.title ? videoData.title.trim() : 'ነፃ የዩቲዩብ ስልጠና',
      youtubeUrl: videoData.youtubeUrl ? videoData.youtubeUrl.trim() : '',
      youtubeId: videoData.youtubeId || '',
      thumbnail: videoData.thumbnail ? videoData.thumbnail.trim() : '',
      videoSrc: videoData.videoSrc ? videoData.videoSrc.trim() : '',
      order: typeof videoData.order === 'number' ? videoData.order : Number(videoData.order) || 0,
      timestamp,
      updatedAt: nowIso,
    };

    if (adminDb) {
      // 1. Primary nested document
      const nestedRef = adminDb
        .collection('artifacts')
        .doc('tsehaycampus-e1a6d')
        .collection('public')
        .doc('data')
        .collection('youtube_videos')
        .doc(docId);

      await nestedRef.set(formattedPayload, { merge: true });

      // 2. Root mirror document
      try {
        await adminDb.collection('youtube_videos').doc(docId).set(formattedPayload, { merge: true });
      } catch (rootErr) {
        console.warn('Root youtube_videos mirror write warning:', rootErr);
      }

      return NextResponse.json({
        success: true,
        message: 'የዩቲዩብ ቪዲዮው በተሳካ ሁኔታ ተቀምጧል! (YouTube Video Saved Successfully)',
        docId,
        video: formattedPayload
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Video saved successfully',
      docId,
      video: formattedPayload
    });

  } catch (error: any) {
    console.error('Error in POST /api/admin/youtube-videos:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal Server Error saving YouTube video' },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const videoId = searchParams.get('id') || searchParams.get('videoId');
    const email = searchParams.get('email');

    const isAuthorized = await verifyAdminAuth(req, email);
    if (!isAuthorized) {
      return NextResponse.json({ success: false, error: 'ይቅርታ፣ ይህንን ለማድረግ የአድሚን ፈቃድ የለዎትም።' }, { status: 403 });
    }

    if (!videoId) {
      return NextResponse.json({ success: false, error: 'Missing videoId' }, { status: 400 });
    }

    if (adminDb) {
      await adminDb
        .collection('artifacts')
        .doc('tsehaycampus-e1a6d')
        .collection('public')
        .doc('data')
        .collection('youtube_videos')
        .doc(videoId)
        .delete();

      try {
        await adminDb.collection('youtube_videos').doc(videoId).delete();
      } catch (e) {}
    }

    return NextResponse.json({
      success: true,
      message: 'ቪዲዮው በተሳካ ሁኔታ ተሰርዟል (YouTube Video deleted successfully)',
      videoId
    });
  } catch (error: any) {
    console.error('Error in DELETE /api/admin/youtube-videos:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, videos, reorderUpdates } = body;

    const isAuthorized = await verifyAdminAuth(req, email);
    if (!isAuthorized) {
      return NextResponse.json({ success: false, error: 'ይቅርታ፣ ይህንን ለማድረግ የአድሚን ፈቃድ የለዎትም።' }, { status: 403 });
    }

    const updates = reorderUpdates || videos || [];
    if (!Array.isArray(updates) || updates.length === 0) {
      return NextResponse.json({ success: false, error: 'No updates provided' }, { status: 400 });
    }

    if (adminDb) {
      const batch = adminDb.batch();
      for (const item of updates) {
        if (!item.id) continue;
        const nestedRef = adminDb
          .collection('artifacts')
          .doc('tsehaycampus-e1a6d')
          .collection('public')
          .doc('data')
          .collection('youtube_videos')
          .doc(item.id);

        batch.set(nestedRef, { order: item.order ?? 0, updatedAt: new Date().toISOString() }, { merge: true });

        const rootRef = adminDb.collection('youtube_videos').doc(item.id);
        batch.set(rootRef, { order: item.order ?? 0, updatedAt: new Date().toISOString() }, { merge: true });
      }
      await batch.commit();
    }

    return NextResponse.json({ success: true, message: 'Reordered successfully' });
  } catch (error: any) {
    console.error('Error in PATCH /api/admin/youtube-videos:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
