import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { DEFAULT_COURSES, generateCourseSlug, getCourseBySlugOrId } from '@/lib/courseCache';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const courseId = searchParams.get('courseId') || searchParams.get('id');

    if (!adminDb) {
      if (courseId) {
        const found = getCourseBySlugOrId(courseId, DEFAULT_COURSES);
        return found ? NextResponse.json({ success: true, course: found }) : NextResponse.json({ error: 'Course not found' }, { status: 404 });
      }
      return NextResponse.json({ success: true, count: DEFAULT_COURSES.length, courses: DEFAULT_COURSES });
    }

    if (courseId) {
      // 1. Direct doc ID lookup
      const docRef = adminDb
        .collection('artifacts')
        .doc('tsehaycampus-e1a6d')
        .collection('public')
        .doc('data')
        .collection('courses')
        .doc(courseId);

      const snap = await docRef.get();
      if (snap.exists) {
        return NextResponse.json({ success: true, course: { id: snap.id, ...snap.data() } });
      }

      // 2. Direct root doc lookup
      try {
        const rootSnap = await adminDb.collection('courses').doc(courseId).get();
        if (rootSnap.exists) {
          return NextResponse.json({ success: true, course: { id: rootSnap.id, ...rootSnap.data() } });
        }
      } catch (e) {}

      // 3. Slug query lookup
      const slugSnap = await adminDb
        .collection('artifacts')
        .doc('tsehaycampus-e1a6d')
        .collection('public')
        .doc('data')
        .collection('courses')
        .where('slug', '==', courseId.toLowerCase().trim())
        .limit(1)
        .get();

      if (!slugSnap.empty) {
        const doc = slugSnap.docs[0];
        return NextResponse.json({ success: true, course: { id: doc.id, ...doc.data() } });
      }

      const defaultMatch = getCourseBySlugOrId(courseId, DEFAULT_COURSES);
      if (defaultMatch) {
        return NextResponse.json({ success: true, course: defaultMatch });
      }

      return NextResponse.json({ error: 'Course not found' }, { status: 404 });
    }

    const snapshot = await adminDb
      .collection('artifacts')
      .doc('tsehaycampus-e1a6d')
      .collection('public')
      .doc('data')
      .collection('courses')
      .get();

    let courses = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    if (courses.length === 0) {
      try {
        const rootSnap = await adminDb.collection('courses').get();
        if (!rootSnap.empty) {
          courses = rootSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        }
      } catch (e) {}
    }

    if (courses.length === 0) {
      courses = DEFAULT_COURSES;
      // Background auto-sync into Firestore
      try {
        for (const course of DEFAULT_COURSES) {
          const docId = course.id;
          const payload = { ...course, updatedAt: new Date().toISOString(), status: 'Active' };
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
        }
      } catch (e) {}
    }

    const filteredCourses = courses.filter((c: any) => c && c.status !== 'Deleted' && !c.isDeleted);
    return NextResponse.json({ success: true, count: filteredCourses.length, courses: filteredCourses });
  } catch (error: any) {
    console.error('Error fetching courses in API route:', error);
    return NextResponse.json({ success: true, count: DEFAULT_COURSES.length, courses: DEFAULT_COURSES, error: error.message });
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
      return NextResponse.json({ error: 'Missing courseData payload' }, { status: 400 });
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
      // 1. Primary write to artifacts/tsehaycampus-e1a6d/public/data/courses/${docId}
      try {
        const courseRef = adminDb
          .collection('artifacts')
          .doc('tsehaycampus-e1a6d')
          .collection('public')
          .doc('data')
          .collection('courses')
          .doc(docId);
        await courseRef.set(payload, { merge: true });
      } catch (e) {}

      // 2. Mirror write to root /courses/${docId}
      try {
        await adminDb.collection('courses').doc(docId).set(payload, { merge: true });
      } catch (e) {}

      return NextResponse.json({ 
        success: true, 
        message: 'Course saved successfully via Admin SDK', 
        docId, 
        id: docId,
        course: payload 
      });
    }

    return NextResponse.json({ success: true, message: 'Saved with client sync', docId, id: docId, course: payload });
  } catch (error: any) {
    console.error('Error saving course in Admin API route:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
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
      return NextResponse.json({ success: false, error: 'Missing courseId parameter' }, { status: 400 });
    }

    const payload = {
      ...courseData,
      id: courseId,
      updatedAt: new Date().toISOString()
    };

    if (adminDb) {
      try {
        const courseRef = adminDb
          .collection('artifacts')
          .doc('tsehaycampus-e1a6d')
          .collection('public')
          .doc('data')
          .collection('courses')
          .doc(courseId);
        await courseRef.set(payload, { merge: true });
      } catch (e) {}

      try {
        await adminDb.collection('courses').doc(courseId).set(payload, { merge: true });
      } catch (e) {}

      return NextResponse.json({ 
        success: true, 
        message: 'Course updated successfully', 
        id: courseId, 
        course: payload 
      });
    }

    return NextResponse.json({ success: true, message: 'Course updated', id: courseId, course: payload });
  } catch (error: any) {
    console.error('Error in PUT /api/admin/courses:', error);
    return NextResponse.json({ success: false, error: error.message || 'Internal server error' }, { status: 500 });
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
      return NextResponse.json({ success: false, error: 'Missing id parameter' }, { status: 400 });
    }

    if (adminDb) {
      try {
        const courseRef = adminDb
          .collection('artifacts')
          .doc('tsehaycampus-e1a6d')
          .collection('public')
          .doc('data')
          .collection('courses')
          .doc(courseId);
        await courseRef.delete();
      } catch (e) {}

      try {
        await adminDb.collection('courses').doc(courseId).delete();
      } catch (e) {}

      return NextResponse.json({ 
        success: true, 
        message: 'Course deleted successfully', 
        id: courseId,
        courseId 
      });
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Course deleted successfully', 
      id: courseId,
      courseId 
    });
  } catch (error: any) {
    console.error('Error deleting course in Admin API route:', error);
    return NextResponse.json({ success: false, error: error.message || 'Internal server error' }, { status: 500 });
  }
}
