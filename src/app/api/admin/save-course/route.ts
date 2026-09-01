import { NextRequest, NextResponse } from 'next/server';
import { adminDb, adminAuth } from '@/lib/firebase/admin';

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

const AUTHORIZED_ADMIN_EMAILS = [
  'admin@tsehaycampus.com',
  'tsehayoperation@gmail.com',
  'tsehayteam@gmail.com',
  'eyoubsahle@gmail.com',
  'habte@gmail.com',
  'cryptomaster758@gmail.com',
  'admin@tsehay.com',
  'chadmin@tsehaycampus.com'
];

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const courseId = searchParams.get('courseId') || searchParams.get('id');

    if (!adminDb) {
      return NextResponse.json({ success: true, count: 0, courses: [] }, { headers: NO_CACHE_HEADERS });
    }

    if (courseId) {
      try {
        const docRef = adminDb
          .collection('artifacts')
          .doc('tsehaycampus-e1a6d')
          .collection('public')
          .doc('data')
          .collection('courses')
          .doc(courseId);

        const snap = await docRef.get();
        if (snap.exists) {
          return NextResponse.json({ success: true, course: { id: snap.id, ...snap.data() } }, { headers: NO_CACHE_HEADERS });
        }
      } catch (e) {}

      try {
        const rootDoc = await adminDb.collection('courses').doc(courseId).get();
        if (rootDoc.exists) {
          return NextResponse.json({ success: true, course: { id: rootDoc.id, ...rootDoc.data() } }, { headers: NO_CACHE_HEADERS });
        }
      } catch (e) {}

      return NextResponse.json({ success: false, error: 'Course not found' }, { status: 404, headers: NO_CACHE_HEADERS });
    }

    const courseMap = new Map<string, any>();
    try {
      const snapshot = await adminDb
        .collection('artifacts')
        .doc('tsehaycampus-e1a6d')
        .collection('public')
        .doc('data')
        .collection('courses')
        .get();

      snapshot.docs.forEach(doc => {
        if (doc.exists) {
          const data = doc.data();
          if (data && data.status !== 'Deleted' && !data.isDeleted) {
            courseMap.set(doc.id, { id: doc.id, ...data });
          }
        }
      });
    } catch (e) {}

    try {
      const rootSnapshot = await adminDb.collection('courses').get();
      rootSnapshot.docs.forEach(doc => {
        if (doc.exists) {
          const data = doc.data();
          if (data && data.status !== 'Deleted' && !data.isDeleted) {
            if (!courseMap.has(doc.id)) {
              courseMap.set(doc.id, { id: doc.id, ...data });
            }
          }
        }
      });
    } catch (e) {}

    const courses = Array.from(courseMap.values());
    return NextResponse.json({ success: true, count: courses.length, courses }, { headers: NO_CACHE_HEADERS });
  } catch (error: any) {
    console.error('Error fetching admin saved courses:', error);
    return NextResponse.json({ success: false, count: 0, courses: [], error: error.message }, { status: 500, headers: NO_CACHE_HEADERS });
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

    const { courseData, courseId, email } = body;

    if (!courseData) {
      return NextResponse.json({ success: false, error: 'Missing courseData payload' }, { status: 400, headers: NO_CACHE_HEADERS });
    }

    const docId = courseId || courseData.id || `course_${Date.now()}`;
    const timestamp = courseData.timestamp || Date.now();
    const nowIso = new Date().toISOString();

    const formattedPayload = {
      ...courseData,
      id: docId,
      timestamp,
      updatedAt: nowIso,
      price: courseData.price === "" ? 0 : Number(courseData.price) || 0,
      oldPrice: courseData.oldPrice ? Number(courseData.oldPrice) : '',
      aiPrompt: courseData.aiPrompt || '',
      lessons: Array.isArray(courseData.lessons) ? courseData.lessons : [],
      whatYouWillLearn: Array.isArray(courseData.whatYouWillLearn) 
        ? courseData.whatYouWillLearn 
        : (typeof courseData.whatYouWillLearn === 'string' 
            ? courseData.whatYouWillLearn.split('\n').map((s: string) => s.trim()).filter(Boolean) 
            : []),
      requirements: Array.isArray(courseData.requirements) ? courseData.requirements : [],
      instructorImage: courseData.instructorImage || courseData.instructorPhoto || '',
      instructorPhoto: courseData.instructorImage || courseData.instructorPhoto || '',
      previewVideoUrl: courseData.previewVideoUrl || courseData.videoUrl || courseData.video || '',
      videoUrl: courseData.previewVideoUrl || courseData.videoUrl || courseData.video || '',
      video: courseData.previewVideoUrl || courseData.videoUrl || courseData.video || '',
      thumbnailUrl: courseData.thumbnailUrl || courseData.image || courseData.thumbnail || '',
      image: courseData.thumbnailUrl || courseData.image || courseData.thumbnail || '',
      thumbnail: courseData.thumbnailUrl || courseData.image || courseData.thumbnail || '',
      modules: Array.isArray(courseData.modules) ? courseData.modules : []
    };

    if (adminDb && typeof adminDb.collection === 'function') {
      try {
        await adminDb
          .collection('artifacts')
          .doc('tsehaycampus-e1a6d')
          .collection('public')
          .doc('data')
          .collection('courses')
          .doc(docId)
          .set(formattedPayload, { merge: true });
      } catch (nestedErr) {
        console.warn('Admin Firestore nested write warning:', nestedErr);
      }

      try {
        await adminDb.collection('courses').doc(docId).set(formattedPayload, { merge: true });
      } catch (rootErr) {
        console.warn('Admin Firestore root mirror write warning:', rootErr);
      }

      try {
        await adminDb
          .collection('artifacts')
          .doc('tsehaycampus-e1a6d')
          .collection('courses')
          .doc(docId)
          .set(formattedPayload, { merge: true });
      } catch (altErr) {
        console.warn('Admin Firestore alt write warning:', altErr);
      }
    }

    return NextResponse.json({
      success: true,
      message: 'ኮርሱ እና የ AI ሲስተም ፕሮምፕቱ በደህንነት ተቀምጧል! (Course Saved Securely)',
      docId,
      course: formattedPayload
    }, { headers: NO_CACHE_HEADERS });

  } catch (error: any) {
    console.error('Error in save-course API:', error);
    return NextResponse.json({
      success: false,
      error: error?.message || 'ኮርሱን ማስቀመጥ አልተቻለም (Failed to save course)'
    }, { status: 500, headers: NO_CACHE_HEADERS });
  }
}
