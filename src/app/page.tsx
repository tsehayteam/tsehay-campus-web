export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

import HomeClient from './HomeClient';
import { getLiveCoursesServer } from '@/lib/serverCourses';

export default async function HomePage() {
  const initialCourses = await getLiveCoursesServer();
  return <HomeClient initialCourses={initialCourses} />;
}
