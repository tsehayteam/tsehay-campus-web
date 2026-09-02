export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

import CoursesClient from './CoursesClient';
import { getLiveCoursesServer } from '@/lib/serverCourses';
import { DEFAULT_COURSES } from '@/lib/courseCache';

export default async function CoursesPage() {
  let initialCourses: any[] = DEFAULT_COURSES;
  try {
    const courses = await getLiveCoursesServer();
    if (Array.isArray(courses) && courses.length > 0) {
      initialCourses = courses;
    }
  } catch (e) {
    console.warn('CoursesPage SSR graceful fallback notice:', e);
  }

  return <CoursesClient initialCourses={initialCourses} />;
}

