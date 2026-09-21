export const dynamic = 'force-dynamic';
export const revalidate = 0;

import AboutClient from './AboutClient';
import { getLiveAboutVideoDataServer, getLiveAboutCommunityMediaServer } from '@/lib/serverCourses';

export default async function AboutPage() {
  const [liveAboutData, communityMedia] = await Promise.all([
    getLiveAboutVideoDataServer(),
    getLiveAboutCommunityMediaServer()
  ]);

  return (
    <AboutClient 
      initialVideoUrl={liveAboutData.videoUrl}
      initialThumbnail={liveAboutData.thumbnail}
      initialTitle={liveAboutData.title}
      initialCommunityMedia={communityMedia}
      initialCommunityMediaUrl={communityMedia[0]?.url || ''}
    />
  );
}
