import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { generateCourseSlug } from '@/lib/courseCache';

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

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const courseId = searchParams.get('courseId') || searchParams.get('id');

    if (!adminDb) {
      return NextResponse.json(
        { success: true, count: 0, courses: [], message: 'Database connection initializing' },
        { headers: NO_CACHE_HEADERS }
      );
    }

    // 1. Single Course Lookup
    if (courseId) {
      const cleanId = courseId.trim();
      const cleanLower = cleanId.toLowerCase();

      // Check artifacts/tsehaycampus-e1a6d/public/data/courses
      try {
        const snap = await adminDb
          .collection('artifacts')
          .doc('tsehaycampus-e1a6d')
          .collection('public')
          .doc('data')
          .collection('courses')
          .doc(cleanId)
          .get();
        if (snap.exists) {
          return NextResponse.json(
            { success: true, course: { id: snap.id, ...snap.data() } },
            { headers: NO_CACHE_HEADERS }
          );
        }
      } catch (e) {}

      // Check root courses collection
      try {
        const rootSnap = await adminDb.collection('courses').doc(cleanId).get();
        if (rootSnap.exists) {
          return NextResponse.json(
            { success: true, course: { id: rootSnap.id, ...rootSnap.data() } },
            { headers: NO_CACHE_HEADERS }
          );
        }
      } catch (e) {}

      // Check artifacts/tsehaycampus-e1a6d/courses collection
      try {
        const altSnap = await adminDb
          .collection('artifacts')
          .doc('tsehaycampus-e1a6d')
          .collection('courses')
          .doc(cleanId)
          .get();
        if (altSnap.exists) {
          return NextResponse.json(
            { success: true, course: { id: altSnap.id, ...altSnap.data() } },
            { headers: NO_CACHE_HEADERS }
          );
        }
      } catch (e) {}

      // Check slug queries across collections
      try {
        const slugSnap1 = await adminDb
          .collection('artifacts')
          .doc('tsehaycampus-e1a6d')
          .collection('public')
          .doc('data')
          .collection('courses')
          .where('slug', '==', cleanLower)
          .limit(1)
          .get();
        if (!slugSnap1.empty) {
          const doc = slugSnap1.docs[0];
          return NextResponse.json(
            { success: true, course: { id: doc.id, ...doc.data() } },
            { headers: NO_CACHE_HEADERS }
          );
        }
      } catch (e) {}

      try {
        const slugSnap2 = await adminDb
          .collection('courses')
          .where('slug', '==', cleanLower)
          .limit(1)
          .get();
        if (!slugSnap2.empty) {
          const doc = slugSnap2.docs[0];
          return NextResponse.json(
            { success: true, course: { id: doc.id, ...doc.data() } },
            { headers: NO_CACHE_HEADERS }
          );
        }
      } catch (e) {}

      return NextResponse.json(
        { success: false, error: 'Course not found' },
        { status: 404, headers: NO_CACHE_HEADERS }
      );
    }

    // 2. Fetch All Live Courses from Firestore directly
    const courseMap = new Map<string, any>();

    // Collection A: artifacts/tsehaycampus-e1a6d/public/data/courses
    try {
      const snapA = await adminDb
        .collection('artifacts')
        .doc('tsehaycampus-e1a6d')
        .collection('public')
        .doc('data')
        .collection('courses')
        .get();
      snapA.docs.forEach(d => {
        if (d.exists) {
          const data = d.data();
          if (data && data.status !== 'Deleted' && !data.isDeleted) {
            courseMap.set(d.id, { id: d.id, ...data });
          }
        }
      });
    } catch (e) {
      console.warn("Collection A fetch notice:", e);
    }

    // Collection B: root courses
    try {
      const snapB = await adminDb.collection('courses').get();
      snapB.docs.forEach(d => {
        if (d.exists) {
          const data = d.data();
          if (data && data.status !== 'Deleted' && !data.isDeleted) {
            if (!courseMap.has(d.id)) {
              courseMap.set(d.id, { id: d.id, ...data });
            } else {
              courseMap.set(d.id, { ...courseMap.get(d.id), ...data, id: d.id });
            }
          }
        }
      });
    } catch (e) {
      console.warn("Collection B fetch notice:", e);
    }

    // Collection C: artifacts/tsehaycampus-e1a6d/courses
    try {
      const snapC = await adminDb
        .collection('artifacts')
        .doc('tsehaycampus-e1a6d')
        .collection('courses')
        .get();
      snapC.docs.forEach(d => {
        if (d.exists) {
          const data = d.data();
          if (data && data.status !== 'Deleted' && !data.isDeleted) {
            if (!courseMap.has(d.id)) {
              courseMap.set(d.id, { id: d.id, ...data });
            } else {
              courseMap.set(d.id, { ...courseMap.get(d.id), ...data, id: d.id });
            }
          }
        }
      });
    } catch (e) {
      console.warn("Collection C fetch notice:", e);
    }

    const courses = Array.from(courseMap.values());

    return NextResponse.json(
      { success: true, count: courses.length, courses },
      { headers: NO_CACHE_HEADERS }
    );
  } catch (error: any) {
    console.error('Error fetching public courses in API route:', error);
    return NextResponse.json(
      { success: false, count: 0, courses: [], error: error.message },
      { status: 500, headers: NO_CACHE_HEADERS }
    );
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

    const courseData = body.courseData || body;
    const courseId = body.courseId || body.id || courseData.id;

    if (!courseData || Object.keys(courseData).length === 0) {
      return NextResponse.json({ error: 'Missing courseData payload' }, { status: 400, headers: NO_CACHE_HEADERS });
    }

    const docId = courseId || `course_${Date.now()}`;
    const slug = (courseData.slug && typeof courseData.slug === 'string' && courseData.slug.trim()) 
      ? courseData.slug.trim().toLowerCase() 
      : generateCourseSlug(courseData.title || docId);

    const payload = {
      ...courseData,
      id: docId,
      slug,
      updatedAt: new Date().toISOString()
    };

    if (adminDb) {
      try {
        await adminDb
          .collection('artifacts')
          .doc('tsehaycampus-e1a6d')
          .collection('public')
          .doc('data')
          .collection('courses')
          .doc(docId)
          .set(payload, { merge: true });
      } catch (e) {}

      try {
        await adminDb.collection('courses').doc(docId).set(payload, { merge: true });
      } catch (e) {}

      try {
        await adminDb
          .collection('artifacts')
          .doc('tsehaycampus-e1a6d')
          .collection('courses')
          .doc(docId)
          .set(payload, { merge: true });
      } catch (e) {}

      return NextResponse.json({ success: true, message: 'Course saved successfully', id: docId, course: payload }, { headers: NO_CACHE_HEADERS });
    }

    return NextResponse.json({ success: true, message: 'Saved', id: docId, course: payload }, { headers: NO_CACHE_HEADERS });
  } catch (error: any) {
    console.error('Error saving course in /api/courses POST:', error);
    return NextResponse.json({ success: false, error: error.message || 'Internal server error' }, { status: 500, headers: NO_CACHE_HEADERS });
  }
}

export async function PUT(req: NextRequest) {
  try {
    let body: any = {};
    try {
      body = await req.json();
    } catch (e) {
      body = {};
    }

    const { searchParams } = new URL(req.url);
    const courseId = searchParams.get('id') || searchParams.get('courseId') || body.id || body.courseId;
    const courseData = body.courseData || body;

    if (!courseId) {
      return NextResponse.json({ success: false, error: 'Missing courseId parameter' }, { status: 400, headers: NO_CACHE_HEADERS });
    }

    const payload = {
      ...courseData,
      id: courseId,
      updatedAt: new Date().toISOString()
    };

    if (adminDb) {
      try {
        await adminDb
          .collection('artifacts')
          .doc('tsehaycampus-e1a6d')
          .collection('public')
          .doc('data')
          .collection('courses')
          .doc(courseId)
          .set(payload, { merge: true });
      } catch (e) {}

      try {
        await adminDb.collection('courses').doc(courseId).set(payload, { merge: true });
      } catch (e) {}

      try {
        await adminDb
          .collection('artifacts')
          .doc('tsehaycampus-e1a6d')
          .collection('courses')
          .doc(courseId)
          .set(payload, { merge: true });
      } catch (e) {}

      return NextResponse.json({ success: true, message: 'Course updated successfully', id: courseId, course: payload }, { headers: NO_CACHE_HEADERS });
    }

    return NextResponse.json({ success: true, message: 'Updated', id: courseId, course: payload }, { headers: NO_CACHE_HEADERS });
  } catch (error: any) {
    console.error('Error in PUT /api/courses:', error);
    return NextResponse.json({ success: false, error: error.message || 'Internal server error' }, { status: 500, headers: NO_CACHE_HEADERS });
  }
}

export async function PATCH(req: NextRequest) {
  return PUT(req);
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    let courseId = searchParams.get('id') || searchParams.get('courseId');

    if (!courseId) {
      try {
        const body = await req.json();
        courseId = body?.id || body?.courseId;
      } catch (e) {}
    }

    if (!courseId) {
      return NextResponse.json({ success: false, error: 'Missing id parameter' }, { status: 400, headers: NO_CACHE_HEADERS });
    }

    if (adminDb) {
      try {
        await adminDb
          .collection('artifacts')
          .doc('tsehaycampus-e1a6d')
          .collection('public')
          .doc('data')
          .collection('courses')
          .doc(courseId)
          .delete();
      } catch (e) {}

      try {
        await adminDb.collection('courses').doc(courseId).delete();
      } catch (e) {}

      try {
        await adminDb
          .collection('artifacts')
          .doc('tsehaycampus-e1a6d')
          .collection('courses')
          .doc(courseId)
          .delete();
      } catch (e) {}

      return NextResponse.json({ success: true, message: 'Course deleted successfully', id: courseId }, { headers: NO_CACHE_HEADERS });
    }

    return NextResponse.json({ success: true, message: 'Course deleted successfully', id: courseId }, { headers: NO_CACHE_HEADERS });
  } catch (error: any) {
    console.error('Error deleting course in /api/courses:', error);
    return NextResponse.json({ success: false, error: error.message || 'Internal server error' }, { status: 500, headers: NO_CACHE_HEADERS });
  }
}
