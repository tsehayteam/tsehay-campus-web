export const revalidate = 120;

import AboutClient from './AboutClient';
import { getLiveAboutVideoDataServer, getLiveAboutCommunityMediaServer } from '@/lib/serverCourses';

export default async function AboutPage() {
  const [liveAboutData, communityMediaUrl] = await Promise.all([
    getLiveAboutVideoDataServer(),
    getLiveAboutCommunityMediaServer()
  ]);

  return (
    <AboutClient 
      initialVideoUrl={liveAboutData.videoUrl}
      initialThumbnail={liveAboutData.thumbnail}
      initialTitle={liveAboutData.title}
      initialCommunityMediaUrl={communityMediaUrl}
    />
  );
}

