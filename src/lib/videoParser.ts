/**
 * Universal Video & Media Parser for Tsehay Campus
 * Robust parsing for ANY video source:
 * - YouTube (Watch, Shorts, Live, Embed, youtu.be, 11-char ID)
 * - Google Drive (Direct video preview & CDN image rendering)
 * - Dropbox (Direct streaming with raw=1)
 * - Vimeo (Standard, Player embed, Showcase)
 * - Direct Video Files (.mp4, .webm, .mov, .ogg, .m4v, BunnyCDN, Cloudflare)
 * - Raw HTML <iframe> embeds
 */

export interface ParsedVideo {
  type: 'embed' | 'video';
  src: string;
  isDirectVideo: boolean;
  isYouTube: boolean;
  isGoogleDrive: boolean;
  isDropbox: boolean;
  isVimeo: boolean;
  youtubeId?: string;
  vimeoId?: string;
  googleDriveId?: string;
  thumbnailUrl?: string;
}

/**
 * Extracts Vimeo Video ID from any Vimeo URL format.
 */
export function extractVimeoId(url: string): string {
  if (!url) return '';
  const trimmed = url.trim();
  const match = trimmed.match(/(?:vimeo\.com\/(?:video\/)?|player\.vimeo\.com\/video\/)(\d+)/i);
  return match && match[1] ? match[1] : '';
}

/**
 * Extracts 11-character YouTube ID from any YouTube URL format
 * (watch?v=, youtu.be/, shorts/, embed/, live/, v/, or raw ID).
 */
export function extractYouTubeId(urlOrId: string): string {
  if (!urlOrId) return '';
  const trimmed = urlOrId.trim();
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) return trimmed;
  const matchWatch = trimmed.match(/[?&]v=([a-zA-Z0-9_-]{11})/i);
  if (matchWatch && matchWatch[1]) return matchWatch[1];
  const matchYoutu = trimmed.match(/youtu\.be\/([a-zA-Z0-9_-]{11})/i);
  if (matchYoutu && matchYoutu[1]) return matchYoutu[1];
  const matchEmbed = trimmed.match(/(?:embed|shorts|live|v)\/([a-zA-Z0-9_-]{11})/i);
  if (matchEmbed && matchEmbed[1]) return matchEmbed[1];
  const matchAny11 = trimmed.match(/(?:[=/&?]|^)([a-zA-Z0-9_-]{11})(?:[?&/#]|$)/);
  if (matchAny11 && matchAny11[1]) return matchAny11[1];
  return '';
}

/**
 * Extracts Google Drive File ID from standard sharing/view links.
 */
export function extractGoogleDriveId(url: string): string {
  if (!url) return '';
  const trimmed = url.trim();
  if (trimmed.includes('/folders/')) return '';
  const match = trimmed.match(/\/file\/(?:u\/\d+\/)?d\/([a-zA-Z0-9_-]+)/i) ||
                trimmed.match(/\/d\/([a-zA-Z0-9_-]+)/i) ||
                trimmed.match(/drive\.google\.com\/(?:open|uc|file)\?.*id=([a-zA-Z0-9_-]+)/i) ||
                trimmed.match(/[?&]id=([a-zA-Z0-9_-]+)/i);
  return match && match[1] ? match[1] : '';
}

/**
 * Normalizes Dropbox links for direct streaming (transforms dl=0 or dl=1 to raw=1).
 */
export function parseDropboxUrl(url: string): { isDropbox: boolean; streamUrl: string } {
  if (!url) return { isDropbox: false, streamUrl: '' };
  const trimmed = url.trim();
  if (trimmed.includes('dropbox.com') || trimmed.includes('dropboxusercontent.com')) {
    let streamUrl = trimmed;
    if (streamUrl.includes('dl=0')) {
      streamUrl = streamUrl.replace(/([?&])dl=0/g, '$1raw=1');
    } else if (streamUrl.includes('dl=1')) {
      streamUrl = streamUrl.replace(/([?&])dl=1/g, '$1raw=1');
    } else if (!streamUrl.includes('raw=1')) {
      streamUrl += (streamUrl.includes('?') ? '&' : '?') + 'raw=1';
    }
    return { isDropbox: true, streamUrl };
  }
  return { isDropbox: false, streamUrl: '' };
}

/**
 * Formats any image or video thumbnail URL safely.
 */
export function parseImageUrl(rawUrl?: string): string {
  if (!rawUrl || !rawUrl.trim()) return '/assets/hero-bg-new.jpg';
  let trimmed = rawUrl.trim();

  // If raw iframe was passed, extract src
  if (trimmed.includes('<iframe')) {
    const srcMatch = trimmed.match(/src=["']([^"']+)["']/i);
    if (srcMatch && srcMatch[1]) {
      trimmed = srcMatch[1];
    }
  }

  // 1. YouTube video URL -> return Max-Res thumbnail
  const ytId = extractYouTubeId(trimmed);
  if (ytId) {
    return `https://img.youtube.com/vi/${ytId}/maxresdefault.jpg`;
  }

  // 2. Google Drive Links: Extract ID and use Google's direct CDN high-res image rendering
  const gDriveId = extractGoogleDriveId(trimmed);
  if (gDriveId) {
    return `https://lh3.googleusercontent.com/d/${gDriveId}`;
  }

  // 3. Dropbox image link: convert dl=0/1 to raw=1
  if (trimmed.includes('dropbox.com') || trimmed.includes('dropboxusercontent.com')) {
    const { streamUrl } = parseDropboxUrl(trimmed);
    return streamUrl;
  }

  return trimmed;
}

export function getYouTubeThumbnail(youtubeId?: string, customThumb?: string): string {
  if (customThumb && customThumb.trim()) {
    return parseImageUrl(customThumb);
  }
  if (youtubeId && youtubeId.trim()) {
    return `https://img.youtube.com/vi/${youtubeId}/maxresdefault.jpg`;
  }
  return '/assets/hero-bg-new.jpg';
}

export function getMediaThumbnail(url?: string, fallback: string = 'https://images.unsplash.com/photo-1515187029135-18ee286d815b?q=80&w=1200'): string {
  if (!url || !url.trim()) return fallback;
  const parsed = parseImageUrl(url);
  return parsed || fallback;
}

/**
 * Checks if a given media URL is a video source.
 */
export function isMediaVideo(url?: string): boolean {
  if (!url || typeof url !== 'string') return false;
  const trimmed = url.trim().toLowerCase();
  if (extractYouTubeId(url)) return true;
  if (extractVimeoId(url)) return true;
  if (trimmed.includes('<iframe')) return true;
  if (
    trimmed.endsWith('.mp4') || 
    trimmed.endsWith('.webm') || 
    trimmed.endsWith('.mov') || 
    trimmed.endsWith('.ogg') ||
    trimmed.endsWith('.m4v') ||
    trimmed.includes('.mp4?') ||
    trimmed.includes('.webm?') ||
    trimmed.includes('.mov?') ||
    trimmed.includes('/assets/videos/') ||
    trimmed.includes('vimeo.com') ||
    trimmed.includes('mediadelivery.net') ||
    trimmed.includes('cloudflarestream.com')
  ) {
    return true;
  }
  if (trimmed.includes('dropbox.com') || trimmed.includes('dropboxusercontent.com')) {
    return (
      trimmed.includes('.mp4') || 
      trimmed.includes('.mov') || 
      trimmed.includes('.webm') || 
      trimmed.includes('raw=1') ||
      trimmed.includes('video')
    );
  }
  if (trimmed.includes('drive.google.com')) {
    return (
      trimmed.includes('/preview') || 
      trimmed.includes('video') || 
      trimmed.includes('usp=sharing') || 
      trimmed.includes('/file/d/')
    );
  }
  return false;
}

/**
 * Universal Video Parser
 * Accepts ANY video link: YouTube, YouTube Shorts, Google Drive, Dropbox, Vimeo, or direct video files (.mp4).
 * Securely formats it into a valid iframe embed or direct <video> src with metadata.
 */
export function parseVideoUrl(rawUrl: string, autoplay: boolean = false): ParsedVideo {
  const ytParams = `rel=0&modestbranding=1&showinfo=0&autoplay=${autoplay ? 1 : 0}&controls=1&vq=hd1080&hd=1&playsinline=1&enablejsapi=1&iv_load_policy=3`;

  if (!rawUrl || !rawUrl.trim()) {
    return {
      type: 'embed',
      src: '',
      isDirectVideo: false,
      isYouTube: false,
      isGoogleDrive: false,
      isDropbox: false,
      isVimeo: false
    };
  }

  const trimmed = rawUrl.trim();

  // 1. Raw <iframe ... src="..." ...> extraction
  if (trimmed.includes('<iframe')) {
    const srcMatch = trimmed.match(/src=["']([^"']+)["']/i);
    if (srcMatch && srcMatch[1]) {
      let src = srcMatch[1];
      if (autoplay) {
        if (!src.includes('autoplay=')) {
          src += (src.includes('?') ? '&' : '?') + 'autoplay=1';
        } else {
          src = src.replace(/autoplay=0/g, 'autoplay=1');
        }
      }
      const ytId = extractYouTubeId(src);
      const vId = extractVimeoId(src);
      const isDrive = src.includes('drive.google.com');
      const gDriveId = isDrive ? extractGoogleDriveId(src) : undefined;
      const isDrop = src.includes('dropbox.com') || src.includes('dropboxusercontent.com');

      return { 
        type: 'embed', 
        src, 
        isDirectVideo: false,
        isYouTube: !!ytId, 
        isGoogleDrive: isDrive,
        isDropbox: isDrop,
        isVimeo: !!vId,
        youtubeId: ytId || undefined,
        vimeoId: vId || undefined,
        googleDriveId: gDriveId || undefined,
        thumbnailUrl: ytId ? `https://img.youtube.com/vi/${ytId}/maxresdefault.jpg` : (gDriveId ? `https://lh3.googleusercontent.com/d/${gDriveId}` : undefined)
      };
    }
  }

  // 2. Google Drive Video: drive.google.com/file/d/.../view or /preview
  const gDriveId = extractGoogleDriveId(trimmed);
  if (gDriveId && trimmed.includes('drive.google.com')) {
    return {
      type: 'embed',
      src: `https://drive.google.com/file/d/${gDriveId}/preview${autoplay ? '?autoplay=1' : ''}`,
      isDirectVideo: false,
      isYouTube: false,
      isGoogleDrive: true,
      isDropbox: false,
      isVimeo: false,
      googleDriveId: gDriveId,
      thumbnailUrl: `https://lh3.googleusercontent.com/d/${gDriveId}`
    };
  }

  // 3. Dropbox direct video link
  if (trimmed.includes('dropbox.com') || trimmed.includes('dropboxusercontent.com')) {
    const { streamUrl } = parseDropboxUrl(trimmed);
    return {
      type: 'video',
      src: streamUrl,
      isDirectVideo: true,
      isYouTube: false,
      isGoogleDrive: false,
      isDropbox: true,
      isVimeo: false,
      thumbnailUrl: streamUrl
    };
  }

  // 4. YouTube Watch, Shorts, youtu.be, Embed, Live, or 11-char ID
  const ytId = extractYouTubeId(trimmed);
  if (ytId) {
    return {
      type: 'embed',
      src: `https://www.youtube.com/embed/${ytId}?${ytParams}`,
      isDirectVideo: false,
      isYouTube: true,
      isGoogleDrive: false,
      isDropbox: false,
      isVimeo: false,
      youtubeId: ytId,
      thumbnailUrl: `https://img.youtube.com/vi/${ytId}/maxresdefault.jpg`
    };
  }

  // 5. Vimeo Video link (vimeo.com/ID or player.vimeo.com/video/ID)
  const vimeoId = extractVimeoId(trimmed);
  if (vimeoId) {
    return {
      type: 'embed',
      src: `https://player.vimeo.com/video/${vimeoId}${autoplay ? '?autoplay=1' : ''}`,
      isDirectVideo: false,
      isYouTube: false,
      isGoogleDrive: false,
      isDropbox: false,
      isVimeo: true,
      vimeoId,
      thumbnailUrl: parseImageUrl(trimmed)
    };
  }

  // 6. Direct video files (.mp4, .webm, .mov, .ogg, .m4v, blob:, /assets/videos/)
  const lower = trimmed.toLowerCase();
  if (
    lower.endsWith('.mp4') || 
    lower.endsWith('.webm') || 
    lower.endsWith('.mov') || 
    lower.endsWith('.ogg') ||
    lower.endsWith('.m4v') ||
    lower.includes('.mp4?') ||
    lower.includes('.mov?') ||
    lower.includes('.webm?') ||
    lower.includes('/assets/videos/') ||
    lower.startsWith('blob:')
  ) {
    return { 
      type: 'video', 
      src: trimmed, 
      isDirectVideo: true,
      isYouTube: false, 
      isGoogleDrive: false, 
      isDropbox: false, 
      isVimeo: false,
      thumbnailUrl: parseImageUrl(trimmed)
    };
  }

  // 7. General Player / Embed URL (BunnyCDN mediadelivery.net, Cloudflare Stream, Custom Player)
  let generalSrc = trimmed;
  if (generalSrc.includes('mediadelivery.net')) {
    generalSrc = generalSrc.replace('/play/', '/embed/').replace('video.mediadelivery.net', 'iframe.mediadelivery.net');
  }
  if (autoplay) {
    if (!generalSrc.includes('autoplay=')) {
      generalSrc += (generalSrc.includes('?') ? '&' : '?') + 'autoplay=1';
    } else {
      generalSrc = generalSrc.replace(/autoplay=0/g, 'autoplay=1');
    }
  }

  return { 
    type: 'embed', 
    src: generalSrc, 
    isDirectVideo: false,
    isYouTube: false, 
    isGoogleDrive: false, 
    isDropbox: false, 
    isVimeo: false,
    thumbnailUrl: parseImageUrl(trimmed)
  };
}

/**
 * Backward compatibility alias so existing calls work interchangeably.
 */
export const parseVideoEmbedUrl = parseVideoUrl;

export interface ParsedEventMedia {
  isVideo: boolean;
  video: ParsedVideo;
  thumbnail: string;
  rawUrl: string;
}

export function parseEventMedia(rawUrl?: string, autoplay: boolean = false): ParsedEventMedia {
  if (!rawUrl || !rawUrl.trim()) {
    return {
      isVideo: false,
      video: {
        type: 'embed',
        src: '',
        isDirectVideo: false,
        isYouTube: false,
        isGoogleDrive: false,
        isDropbox: false,
        isVimeo: false
      },
      thumbnail: 'https://images.unsplash.com/photo-1515187029135-18ee286d815b?q=80&w=1200',
      rawUrl: ''
    };
  }

  const trimmed = rawUrl.trim();
  const isVideo = isMediaVideo(trimmed);
  const video = parseVideoUrl(trimmed, autoplay);
  const thumbnail = getMediaThumbnail(trimmed);

  return {
    isVideo,
    video,
    thumbnail,
    rawUrl: trimmed
  };
}
