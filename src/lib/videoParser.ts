export interface ParsedVideo {
  type: 'embed' | 'video';
  src: string;
}

export function parseVideoEmbedUrl(rawUrl: string): ParsedVideo {
  if (!rawUrl || !rawUrl.trim()) {
    return {
      type: 'embed',
      src: 'https://www.youtube.com/embed/mgdOMtW6J8k?rel=0&modestbranding=1&showinfo=0&autoplay=0&controls=1&vq=hd1080&playsinline=1'
    };
  }

  const trimmed = rawUrl.trim();

  // 1. Raw <iframe ... src="..." ...> extraction
  if (trimmed.includes('<iframe')) {
    const srcMatch = trimmed.match(/src=["']([^"']+)["']/i);
    if (srcMatch && srcMatch[1]) {
      return { type: 'embed', src: srcMatch[1] };
    }
  }

  // 2. Direct video file (mp4, webm, mov)
  if (
    trimmed.endsWith('.mp4') || 
    trimmed.endsWith('.webm') || 
    trimmed.endsWith('.mov') || 
    trimmed.includes('/assets/videos/') ||
    trimmed.includes('.mp4?')
  ) {
    return { type: 'video', src: trimmed };
  }

  // 3. YouTube Watch URL: youtube.com/watch?v=...
  const ytWatchMatch = trimmed.match(/[?&]v=([a-zA-Z0-9_-]{11})/);
  if (ytWatchMatch && ytWatchMatch[1]) {
    return {
      type: 'embed',
      src: `https://www.youtube.com/embed/${ytWatchMatch[1]}?rel=0&modestbranding=1&showinfo=0&autoplay=0&controls=1&vq=hd1080&playsinline=1`
    };
  }

  // 4. YouTube Short Link: youtu.be/...
  const ytuMatch = trimmed.match(/youtu\.be\/([a-zA-Z0-9_-]{11})/);
  if (ytuMatch && ytuMatch[1]) {
    return {
      type: 'embed',
      src: `https://www.youtube.com/embed/${ytuMatch[1]}?rel=0&modestbranding=1&showinfo=0&autoplay=0&controls=1&vq=hd1080&playsinline=1`
    };
  }

  // 5. YouTube Embed / Shorts / Live
  const ytEmbedMatch = trimmed.match(/(?:embed|shorts|live)\/([a-zA-Z0-9_-]{11})/);
  if (ytEmbedMatch && ytEmbedMatch[1]) {
    return {
      type: 'embed',
      src: `https://www.youtube.com/embed/${ytEmbedMatch[1]}?rel=0&modestbranding=1&showinfo=0&autoplay=0&controls=1&vq=hd1080&playsinline=1`
    };
  }

  // 6. Direct 11-char YouTube ID
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) {
    return {
      type: 'embed',
      src: `https://www.youtube.com/embed/${trimmed}?rel=0&modestbranding=1&showinfo=0&autoplay=0&controls=1&vq=hd1080&playsinline=1`
    };
  }

  // 7. General Player / Embed URL (Vimeo, BunnyCDN, Cloudflare, Custom Player)
  return { type: 'embed', src: trimmed };
}
