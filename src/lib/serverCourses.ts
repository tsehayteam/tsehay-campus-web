import { adminDb } from '@/lib/firebase/admin';
import { DEFAULT_COURSES, formatCourseDesc } from '@/lib/courseCache';

export async function getLiveCoursesServer(): Promise<any[]> {
  try {
    if (!adminDb) return DEFAULT_COURSES;

    const courseMap = new Map<string, any>();

    // 1. Nested collection: artifacts/tsehaycampus-e1a6d/public/data/courses
    try {
      const snapA = await adminDb
        .collection('artifacts')
        .doc('tsehaycampus-e1a6d')
        .collection('public')
        .doc('data')
        .collection('courses')
        .get();

      snapA.docs.forEach(doc => {
        if (doc.exists) {
          const data = doc.data();
          if (data && data.status !== 'Deleted' && !data.isDeleted) {
            const cleanDesc = formatCourseDesc(data);
            courseMap.set(doc.id, { id: doc.id, ...data, desc: cleanDesc, description: cleanDesc });
          }
        }
      });
    } catch (e) {}

    // 2. Root collection: courses
    try {
      const snapB = await adminDb.collection('courses').get();
      snapB.docs.forEach(doc => {
        if (doc.exists) {
          const data = doc.data();
          if (data && data.status !== 'Deleted' && !data.isDeleted) {
            const cleanDesc = formatCourseDesc(data);
            if (!courseMap.has(doc.id)) {
              courseMap.set(doc.id, { id: doc.id, ...data, desc: cleanDesc, description: cleanDesc });
            } else {
              courseMap.set(doc.id, { ...courseMap.get(doc.id), ...data, id: doc.id, desc: cleanDesc, description: cleanDesc });
            }
          }
        }
      });
    } catch (e) {}

    // 3. Alt collection: artifacts/tsehaycampus-e1a6d/courses
    try {
      const snapC = await adminDb
        .collection('artifacts')
        .doc('tsehaycampus-e1a6d')
        .collection('courses')
        .get();

      snapC.docs.forEach(doc => {
        if (doc.exists) {
          const data = doc.data();
          if (data && data.status !== 'Deleted' && !data.isDeleted) {
            const cleanDesc = formatCourseDesc(data);
            if (!courseMap.has(doc.id)) {
              courseMap.set(doc.id, { id: doc.id, ...data, desc: cleanDesc, description: cleanDesc });
            } else {
              courseMap.set(doc.id, { ...courseMap.get(doc.id), ...data, id: doc.id, desc: cleanDesc, description: cleanDesc });
            }
          }
        }
      });
    } catch (e) {}

    const list = Array.from(courseMap.values());
    if (list.length > 0) {
      return list;
    }
  } catch (error) {
    console.warn('getLiveCoursesServer fallback notice:', error);
  }

  return DEFAULT_COURSES;
}
