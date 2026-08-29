export interface ParsedVideo {
  type: 'embed' | 'video';
  src: string;
}

export function extractYouTubeId(urlOrId: string): string {
  if (!urlOrId) return '';
  const trimmed = urlOrId.trim();
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) return trimmed;
  const matchWatch = trimmed.match(/[?&]v=([a-zA-Z0-9_-]{11})/);
  if (matchWatch && matchWatch[1]) return matchWatch[1];
  const matchYoutu = trimmed.match(/youtu\.be\/([a-zA-Z0-9_-]{11})/);
  if (matchYoutu && matchYoutu[1]) return matchYoutu[1];
  const matchEmbed = trimmed.match(/(?:embed|shorts|live)\/([a-zA-Z0-9_-]{11})/);
  if (matchEmbed && matchEmbed[1]) return matchEmbed[1];
  return '';
}

export function parseImageUrl(rawUrl?: string): string {
  if (!rawUrl || !rawUrl.trim()) return '/assets/hero-bg-new.jpg';
  const trimmed = rawUrl.trim();

  // 1. Google Drive Links: Extract ID and use Google's direct CDN high-res image rendering
  const gDriveMatch = trimmed.match(/\/file\/d\/([a-zA-Z0-9_-]+)/) ||
                      trimmed.match(/drive\.google\.com\/(?:open|uc)\?.*id=([a-zA-Z0-9_-]+)/) ||
                      trimmed.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (gDriveMatch && gDriveMatch[1]) {
    const fileId = gDriveMatch[1];
    return `https://lh3.googleusercontent.com/d/${fileId}`;
  }

  // 2. If user pasted a YouTube video URL as thumbnail -> return Max-Res thumbnail
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
      src: ''
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
      return { type: 'embed', src };
    }
  }

  // 2. Google Drive Video: drive.google.com/file/d/.../view
  const gDriveVideoMatch = trimmed.match(/\/file\/d\/([a-zA-Z0-9_-]+)/) ||
                          trimmed.match(/drive\.google\.com\/(?:open|uc)\?.*id=([a-zA-Z0-9_-]+)/);
  if (gDriveVideoMatch && gDriveVideoMatch[1]) {
    const fileId = gDriveVideoMatch[1];
    return {
      type: 'embed',
      src: `https://drive.google.com/file/d/${fileId}/preview${autoplay ? '?autoplay=1' : ''}`
    };
  }

  // 3. Direct video file (mp4, webm, mov)
  if (
    trimmed.endsWith('.mp4') || 
    trimmed.endsWith('.webm') || 
    trimmed.endsWith('.mov') || 
    trimmed.includes('/assets/videos/') ||
    trimmed.includes('.mp4?')
  ) {
    return { type: 'video', src: trimmed };
  }

  // 4. YouTube Watch URL: youtube.com/watch?v=...
  const ytWatchMatch = trimmed.match(/[?&]v=([a-zA-Z0-9_-]{11})/);
  if (ytWatchMatch && ytWatchMatch[1]) {
    return {
      type: 'embed',
      src: `https://www.youtube.com/embed/${ytWatchMatch[1]}?${ytParams}`
    };
  }

  // 5. YouTube Short Link: youtu.be/...
  const ytuMatch = trimmed.match(/youtu\.be\/([a-zA-Z0-9_-]{11})/);
  if (ytuMatch && ytuMatch[1]) {
    return {
      type: 'embed',
      src: `https://www.youtube.com/embed/${ytuMatch[1]}?${ytParams}`
    };
  }

  // 6. YouTube Embed / Shorts / Live
  const ytEmbedMatch = trimmed.match(/(?:embed|shorts|live)\/([a-zA-Z0-9_-]{11})/);
  if (ytEmbedMatch && ytEmbedMatch[1]) {
    return {
      type: 'embed',
      src: `https://www.youtube.com/embed/${ytEmbedMatch[1]}?${ytParams}`
    };
  }

  // 7. Direct 11-char YouTube ID
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) {
    return {
      type: 'embed',
      src: `https://www.youtube.com/embed/${trimmed}?${ytParams}`
    };
  }

  // 8. General Player / Embed URL (Vimeo, BunnyCDN, Cloudflare, Custom Player)
  let generalSrc = trimmed;
  if (autoplay) {
    if (!generalSrc.includes('autoplay=')) {
      generalSrc += (generalSrc.includes('?') ? '&' : '?') + 'autoplay=1';
    } else {
      generalSrc = generalSrc.replace(/autoplay=0/g, 'autoplay=1');
    }
  }
  return { type: 'embed', src: generalSrc };
}
