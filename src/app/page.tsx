export const dynamic = 'force-dynamic';
export const revalidate = 0;

import HomeClient from './HomeClient';
import { 
  getLiveCoursesServer,
  getLiveLandingVideoDataServer, 
  getLivePortfolioVideosServer, 
  getLiveYouTubeVideosServer 
} from '@/lib/serverCourses';
import { parseImageUrl, parseDropboxUrl } from '@/lib/videoParser';

export default async function HomePage() {
  const [coursesData, landingData, portfolioData, youtubeVideosData] = await Promise.all([
    getLiveCoursesServer(),
    getLiveLandingVideoDataServer(),
    getLivePortfolioVideosServer(),
    getLiveYouTubeVideosServer()
  ]);

  const rawVideo = (landingData?.videoUrl || '').trim();
  const rawThumb = (landingData?.thumbnail || '').trim();

  // Resolve direct video link for fast preloading
  let preloadVideoSrc = '';
  if (rawVideo) {
    const lower = rawVideo.toLowerCase();
    if (
      lower.includes('.mp4') || 
      lower.includes('.webm') || 
      lower.includes('.mov') || 
      lower.includes('.ogg') ||
      lower.includes('.m4v') ||
      lower.includes('/storage/v1/object/public/video') ||
      lower.includes('/assets/videos/')
    ) {
      preloadVideoSrc = rawVideo;
    } else if (lower.includes('dropbox.com') || lower.includes('dropboxusercontent.com')) {
      const { streamUrl } = parseDropboxUrl(rawVideo);
      preloadVideoSrc = streamUrl || rawVideo;
    }
  }

  const resolvedThumb = rawThumb ? parseImageUrl(rawThumb) : '';

  return (
    <>
      {/* 🚀 Instant Browser Network Preload for Landing Video & Poster */}
      {resolvedThumb && (
        <link 
          rel="preload" 
          as="image" 
          href={resolvedThumb} 
        />
      )}
      {preloadVideoSrc && (
        <link 
          rel="preload" 
          as="video" 
          href={preloadVideoSrc} 
          type={preloadVideoSrc.toLowerCase().includes('.webm') ? 'video/webm' : 'video/mp4'} 
        />
      )}
      {/* DNS preconnects for fast video streaming */}
      <link rel="preconnect" href="https://dl.dropboxusercontent.com" crossOrigin="anonymous" />
      <link rel="preconnect" href="https://iframe.mediadelivery.net" />
      <link rel="preconnect" href="https://video.bunnycdn.com" />
      <link rel="preconnect" href="https://img.youtube.com" />
      <link rel="preconnect" href="https://www.youtube.com" />

      <HomeClient 
        initialCourses={coursesData}
        initialLandingVideo={landingData.videoUrl} 
        initialLandingVideoThumbnail={landingData.thumbnail} 
        initialPortfolio={portfolioData}
        initialYouTubeVideos={youtubeVideosData}
      />
    </>
  );
}
