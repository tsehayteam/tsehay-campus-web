export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

import HomeClient from './HomeClient';
import { getLiveLandingVideoDataServer } from '@/lib/serverCourses';

export default async function HomePage() {
  const landingData = await getLiveLandingVideoDataServer();
  return (
    <HomeClient 
      initialLandingVideo={landingData.videoUrl} 
      initialLandingVideoThumbnail={landingData.thumbnail} 
    />
  );
}
