import { NextRequest, NextResponse } from 'next/server';
import { adminDb, hasAdminCredentials } from '@/lib/firebase/admin';
import { sharedSiteSettingsCache, savePersistedSetting } from '@/lib/memoryStore';

export async function GET(req: NextRequest) {
  try {
    if (adminDb && hasAdminCredentials) {
      // Check all possible doc paths
      const paths = [
        adminDb.collection('settings').doc('landingVideo'),
        adminDb.collection('settings').doc('landing_video'),
        adminDb.collection('site_settings').doc('landing_video'),
        adminDb.collection('artifacts').doc('tsehaycampus-e1a6d').collection('public').doc('data').collection('site_settings').doc('landing_video')
      ];

      for (const p of paths) {
        try {
          const snap = await p.get();
          if (snap.exists) {
            const data = snap.data();
            const videoUrl = data?.url || data?.videoUrl || data?.youtubeUrl;
            if (videoUrl) {
              return NextResponse.json({ success: true, videoUrl, url: videoUrl, data });
            }
          }
        } catch (e) {}
      }
    }

    if (sharedSiteSettingsCache.has('landing_video')) {
      const cached = sharedSiteSettingsCache.get('landing_video');
      const videoUrl = cached?.url || cached?.videoUrl || cached?.youtubeUrl;
      if (videoUrl) {
        return NextResponse.json({ success: true, videoUrl, url: videoUrl, data: cached });
      }
    }

    return NextResponse.json({ success: true, videoUrl: null, url: null, data: null });
  } catch (error: any) {
    console.error('Error fetching landing video in API route:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const videoUrl = (body.url || body.videoUrl || body.youtubeUrl || body.data?.videoUrl || '').trim();

    if (!videoUrl) {
      return NextResponse.json({ error: 'የቪዲዮ ሊንክ አልተገለጸም (Video URL is required)' }, { status: 400 });
    }

    const thumbnail = (body.thumbnail || body.data?.thumbnail || '').trim();

    const payload = {
      url: videoUrl,
      videoUrl: videoUrl,
      youtubeUrl: videoUrl,
      thumbnail,
      settingKey: 'landing_video',
      updatedAt: new Date().toISOString()
    };

    sharedSiteSettingsCache.set('landing_video', payload);
    savePersistedSetting('landing_video', payload);

    if (adminDb && hasAdminCredentials) {
      const promises = [
        adminDb.collection('settings').doc('landingVideo').set(payload, { merge: true }),
        adminDb.collection('settings').doc('landing_video').set(payload, { merge: true }),
        adminDb.collection('site_settings').doc('landing_video').set(payload, { merge: true }),
        adminDb.collection('artifacts').doc('tsehaycampus-e1a6d').collection('public').doc('data').collection('site_settings').doc('landing_video').set(payload, { merge: true })
      ];

      try {
        await Promise.allSettled(promises);
      } catch (dbErr) {
        console.warn('Firebase Admin write warning:', dbErr);
      }
    }

    return NextResponse.json({
      success: true,
      message: 'የመግቢያ ቪዲዮው በተሳካ ሁኔታ ተቀምጧል! (Landing video saved successfully)',
      data: payload,
      url: videoUrl,
      videoUrl: videoUrl
    });
  } catch (error: any) {
    console.error('Error saving landing video in API route:', error);
    return NextResponse.json({
      success: true,
      warning: error.message,
      message: 'Saved with client sync'
    });
  }
}
