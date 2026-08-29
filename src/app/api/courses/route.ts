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

    // Merge root, artifact, and default courses
    const merged = mergeCoursesLists(DEFAULT_COURSES, artifactCourses, rootCourses);

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
