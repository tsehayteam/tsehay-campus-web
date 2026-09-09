export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

import HomeClient from './HomeClient';
import { 
  getLiveCoursesServer,
  getLiveLandingVideoDataServer, 
  getLivePortfolioVideosServer, 
  getLiveYouTubeVideosServer 
} from '@/lib/serverCourses';

export default async function HomePage() {
  const [coursesData, landingData, portfolioData, youtubeVideosData] = await Promise.all([
    getLiveCoursesServer(),
    getLiveLandingVideoDataServer(),
    getLivePortfolioVideosServer(),
    getLiveYouTubeVideosServer()
  ]);

  return (
    <HomeClient 
      initialCourses={coursesData}
      initialLandingVideo={landingData.videoUrl} 
      initialLandingVideoThumbnail={landingData.thumbnail} 
      initialPortfolio={portfolioData}
      initialYouTubeVideos={youtubeVideosData}
    />
  );
}
