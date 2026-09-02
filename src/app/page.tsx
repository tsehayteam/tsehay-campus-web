export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

import HomeClient from './HomeClient';
import { getLiveCoursesServer, getLiveLandingVideoServer } from '@/lib/serverCourses';
import { DEFAULT_COURSES } from '@/lib/courseCache';

export default async function HomePage() {
  let courses: any[] = DEFAULT_COURSES;
  let landingVideo = 'https://www.youtube.com/watch?v=mgdOMtW6J8k';

  try {
    const results = await Promise.allSettled([
      getLiveCoursesServer(),
      getLiveLandingVideoServer()
    ]);
    if (results[0].status === 'fulfilled' && Array.isArray(results[0].value) && results[0].value.length > 0) {
      courses = results[0].value;
    }
    if (results[1].status === 'fulfilled' && typeof results[1].value === 'string' && results[1].value) {
      landingVideo = results[1].value;
    }
  } catch (e) {
    console.warn('HomePage SSR graceful fallback notice:', e);
  }

  return <HomeClient initialCourses={courses} initialLandingVideo={landingVideo} />;
}

