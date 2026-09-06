export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

import HomeClient from './HomeClient';
import { 
  getLiveLandingVideoDataServer, 
  getLivePortfolioVideosServer, 
  getLiveYouTubeVideosServer 
} from '@/lib/serverCourses';

export default async function HomePage() {
  const [landingData, portfolioData, youtubeVideosData] = await Promise.all([
    getLiveLandingVideoDataServer(),
    getLivePortfolioVideosServer(),
    getLiveYouTubeVideosServer()
  ]);

  return (
    <HomeClient 
      initialLandingVideo={landingData.videoUrl} 
      initialLandingVideoThumbnail={landingData.thumbnail} 
      initialPortfolio={portfolioData}
      initialYouTubeVideos={youtubeVideosData}
    />
  );
}
