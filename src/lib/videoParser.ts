/**
 * Universal Video & Media Parser for Tsehay Campus
 * Handles YouTube (Watch, Shorts, Live, Embed), Google Drive (Videos & Images),
 * Dropbox (Direct stream & raw embeds), Direct Video files (.mp4, .webm, .mov),
 * BunnyCDN, Vimeo, Cloudflare Stream, and Iframe embeds.
 */

export interface ParsedVideo {
  type: 'embed' | 'video';
  src: string;
  isYouTube: boolean;
  isGoogleDrive: boolean;
  isDropbox: boolean;
  youtubeId?: string;
  thumbnailUrl?: string;
}

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
  return '';
}

export function extractGoogleDriveId(url: string): string {
  if (!url) return '';
  const trimmed = url.trim();
  const match = trimmed.match(/\/file\/d\/([a-zA-Z0-9_-]+)/i) ||
                trimmed.match(/drive\.google\.com\/(?:open|uc)\?.*id=([a-zA-Z0-9_-]+)/i) ||
                trimmed.match(/[?&]id=([a-zA-Z0-9_-]+)/i);
  return match && match[1] ? match[1] : '';
}

export function parseDropboxUrl(url: string): { isDropbox: boolean; streamUrl: string } {
  if (!url) return { isDropbox: false, streamUrl: '' };
  const trimmed = url.trim();
  if (trimmed.includes('dropbox.com')) {
    let streamUrl = trimmed;
    if (streamUrl.includes('dl=0')) {
      streamUrl = streamUrl.replace('dl=0', 'raw=1');
    } else if (!streamUrl.includes('raw=1') && !streamUrl.includes('dl=1')) {
      streamUrl += (streamUrl.includes('?') ? '&' : '?') + 'raw=1';
    }
    return { isDropbox: true, streamUrl };
  }
  return { isDropbox: false, streamUrl: '' };
}

export function parseImageUrl(rawUrl?: string): string {
  if (!rawUrl || !rawUrl.trim()) return '/assets/hero-bg-new.jpg';
  const trimmed = rawUrl.trim();

  // 1. Google Drive Links: Extract ID and use Google's direct CDN high-res image rendering
  const gDriveId = extractGoogleDriveId(trimmed);
  if (gDriveId) {
    return `https://lh3.googleusercontent.com/d/${gDriveId}`;
  }

  // 2. Dropbox image link: convert dl=0 to raw=1
  if (trimmed.includes('dropbox.com')) {
    const { streamUrl } = parseDropboxUrl(trimmed);
    return streamUrl;
  }

  // 3. If user pasted a YouTube video URL as thumbnail -> return Max-Res thumbnail
  const ytId = extractYouTubeId(trimmed);
  if (ytId) {
    return `https://img.youtube.com/vi/${ytId}/maxresdefault.jpg`;
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

export function parseVideoEmbedUrl(rawUrl: string, autoplay: boolean = false): ParsedVideo {
  const ytParams = `rel=0&modestbranding=1&showinfo=0&autoplay=${autoplay ? 1 : 0}&controls=1&vq=hd1080&hd=1&playsinline=1&enablejsapi=1`;

  if (!rawUrl || !rawUrl.trim()) {
    return {
      type: 'embed',
      src: '',
      isYouTube: false,
      isGoogleDrive: false,
      isDropbox: false
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
      return { 
        type: 'embed', 
        src, 
        isYouTube: !!ytId, 
        isGoogleDrive: src.includes('drive.google.com'),
        isDropbox: src.includes('dropbox.com'),
        youtubeId: ytId || undefined,
        thumbnailUrl: ytId ? `https://img.youtube.com/vi/${ytId}/maxresdefault.jpg` : undefined
      };
    }
  }

  // 2. Google Drive Video: drive.google.com/file/d/.../view
  const gDriveId = extractGoogleDriveId(trimmed);
  if (gDriveId) {
    return {
      type: 'embed',
      src: `https://drive.google.com/file/d/${gDriveId}/preview${autoplay ? '?autoplay=1' : ''}`,
      isYouTube: false,
      isGoogleDrive: true,
      isDropbox: false,
      thumbnailUrl: `https://lh3.googleusercontent.com/d/${gDriveId}`
    };
  }

  // 3. Dropbox direct video link
  if (trimmed.includes('dropbox.com')) {
    const { streamUrl } = parseDropboxUrl(trimmed);
    return {
      type: 'video',
      src: streamUrl,
      isYouTube: false,
      isGoogleDrive: false,
      isDropbox: true
    };
  }

  // 4. YouTube Watch, Shorts, youtu.be, Embed, or 11-char ID
  const ytId = extractYouTubeId(trimmed);
  if (ytId) {
    return {
      type: 'embed',
      src: `https://www.youtube.com/embed/${ytId}?${ytParams}`,
      isYouTube: true,
      isGoogleDrive: false,
      isDropbox: false,
      youtubeId: ytId,
      thumbnailUrl: `https://img.youtube.com/vi/${ytId}/maxresdefault.jpg`
    };
  }

  // 5. Direct video file (mp4, webm, mov, ogg)
  if (
    trimmed.endsWith('.mp4') || 
    trimmed.endsWith('.webm') || 
    trimmed.endsWith('.mov') || 
    trimmed.endsWith('.ogg') ||
    trimmed.includes('/assets/videos/') ||
    trimmed.includes('.mp4?')
  ) {
    return { 
      type: 'video', 
      src: trimmed, 
      isYouTube: false, 
      isGoogleDrive: false,
      isDropbox: false
    };
  }

  // 6. General Player / Embed URL (Vimeo, BunnyCDN, Cloudflare Stream, Custom Player)
  let generalSrc = trimmed;
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
    isYouTube: false, 
    isGoogleDrive: false,
    isDropbox: false
  };
}
