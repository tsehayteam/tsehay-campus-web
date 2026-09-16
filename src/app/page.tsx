export const revalidate = 120;

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
