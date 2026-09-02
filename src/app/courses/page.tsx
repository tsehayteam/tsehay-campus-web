export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

import CoursesClient from './CoursesClient';
import { getLiveCoursesServer } from '@/lib/serverCourses';

export default async function CoursesPage() {
  const initialCourses = await getLiveCoursesServer();
  return <CoursesClient initialCourses={initialCourses} />;
}

