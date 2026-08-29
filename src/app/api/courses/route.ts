import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { DEFAULT_COURSES, getCourseBySlugOrId, mergeCoursesLists } from '@/lib/courseCache';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const courseId = searchParams.get('courseId') || searchParams.get('id');

    if (!adminDb) {
      if (courseId) {
        const found = getCourseBySlugOrId(courseId, DEFAULT_COURSES);
        return found 
          ? NextResponse.json({ success: true, course: found }) 
          : NextResponse.json({ error: 'Course not found' }, { status: 404 });
      }
      return NextResponse.json({ 
        success: true, 
        count: DEFAULT_COURSES.length, 
        courses: DEFAULT_COURSES 
      });
    }

    if (courseId) {
      // 1. Check artifact collection by doc ID
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
          return NextResponse.json({ success: true, course: { id: snap.id, ...snap.data() } });
        }
      } catch (e) {}

      // 2. Check root collection by doc ID
      try {
        const rootDoc = await adminDb.collection('courses').doc(courseId).get();
        if (rootDoc.exists) {
          return NextResponse.json({ success: true, course: { id: rootDoc.id, ...rootDoc.data() } });
        }
      } catch (e) {}

      // 3. Slug query lookup in artifacts collection
      try {
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
      } catch (e) {}

      // 4. Slug query lookup in root collection
      try {
        const rootSlugSnap = await adminDb
          .collection('courses')
          .where('slug', '==', courseId.toLowerCase().trim())
          .limit(1)
          .get();
        if (!rootSlugSnap.empty) {
          const doc = rootSlugSnap.docs[0];
          return NextResponse.json({ success: true, course: { id: doc.id, ...doc.data() } });
        }
      } catch (e) {}

      // 5. Fallback to default mock courses
      const defaultMatch = getCourseBySlugOrId(courseId, DEFAULT_COURSES);
      if (defaultMatch) {
        return NextResponse.json({ success: true, course: defaultMatch });
      }

      return NextResponse.json({ error: 'Course not found' }, { status: 404 });
    }

    // Fetch from BOTH collections and merge
    let artifactCourses: any[] = [];
    let rootCourses: any[] = [];

    try {
      const artifactSnap = await adminDb
        .collection('artifacts')
        .doc('tsehaycampus-e1a6d')
        .collection('public')
        .doc('data')
        .collection('courses')
        .get();
      if (!artifactSnap.empty) {
        artifactCourses = artifactSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      }
    } catch (e) {
      console.warn("Artifact courses fetch notice:", e);
    }

    try {
      const rootSnap = await adminDb.collection('courses').get();
      if (!rootSnap.empty) {
        rootCourses = rootSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      }
    } catch (e) {
      console.warn("Root courses fetch notice:", e);
    }

    // Filter active (non-deleted) courses from Firestore
    const liveFirestoreCourses = mergeCoursesLists(artifactCourses, rootCourses);

    // If Firestore has live courses, return them directly so edits and deletes reflect instantly
    if (liveFirestoreCourses.length > 0) {
      return NextResponse.json({ 
        success: true, 
        count: liveFirestoreCourses.length, 
        courses: liveFirestoreCourses 
      });
    }

    // Only bootstrap DEFAULT_COURSES if Firestore is 100% empty
    if (artifactCourses.length === 0 && rootCourses.length === 0) {
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
      } catch (syncErr) {
        console.warn("Auto-sync authentic courses notice:", syncErr);
      }
    }

    const merged = mergeCoursesLists(DEFAULT_COURSES);

    return NextResponse.json({ 
      success: true, 
      count: merged.length, 
      courses: merged 
    });
  } catch (error: any) {
    console.error('Error fetching public courses in API route:', error);
    return NextResponse.json({ 
      success: true, 
      count: DEFAULT_COURSES.length, 
      courses: DEFAULT_COURSES, 
      error: error.message 
    });
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
    const payload = {
      ...courseData,
      id: docId,
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
          .doc(docId);
        await courseRef.set(payload, { merge: true });
      } catch (e) {}

      try {
        await adminDb.collection('courses').doc(docId).set(payload, { merge: true });
      } catch (e) {}

      return NextResponse.json({ success: true, message: 'Course saved successfully', id: docId, course: payload });
    }

    return NextResponse.json({ success: true, message: 'Saved', id: docId, course: payload });
  } catch (error: any) {
    console.error('Error saving course in /api/courses POST:', error);
    return NextResponse.json({ success: false, error: error.message || 'Internal server error' }, { status: 500 });
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

      return NextResponse.json({ success: true, message: 'Course updated successfully', id: courseId, course: payload });
    }

    return NextResponse.json({ success: true, message: 'Updated', id: courseId, course: payload });
  } catch (error: any) {
    console.error('Error in PUT /api/courses:', error);
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
    console.error('Error deleting course in /api/courses:', error);
    return NextResponse.json({ success: false, error: error.message || 'Internal server error' }, { status: 500 });
  }
}
