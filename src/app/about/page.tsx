export const revalidate = 120;

import AboutClient from './AboutClient';
import { getLiveAboutVideoDataServer } from '@/lib/serverCourses';

export default async function AboutPage() {
  const liveAboutData = await getLiveAboutVideoDataServer();
  return (
    <AboutClient 
      initialVideoUrl={liveAboutData.videoUrl}
      initialThumbnail={liveAboutData.thumbnail}
      initialTitle={liveAboutData.title}
    />
  );
}

