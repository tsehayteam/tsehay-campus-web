import { NextRequest, NextResponse } from 'next/server';

/**
 * Splits text into safe, punctuation-aware chunks (max 140 chars)
 * to avoid Google Translate TTS 400 Bad Request URL length limits.
 */
function splitTextIntoSafeChunks(text: string, maxLen = 140): string[] {
  const clean = text
    .replace(/[*_~`#\r[\]()<>]/g, ' ')
    .replace(/\n+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (!clean) return [];
  if (clean.length <= maxLen) return [clean];

  const chunks: string[] = [];
  let remaining = clean;

  while (remaining.length > 0) {
    if (remaining.length <= maxLen) {
      chunks.push(remaining.trim());
      break;
    }

    const slice = remaining.slice(0, maxLen);
    // Find best break point prioritizing Amharic/English punctuation
    const breakIdx = Math.max(
      slice.lastIndexOf('።'),
      slice.lastIndexOf('.'),
      slice.lastIndexOf('!'),
      slice.lastIndexOf('?'),
      slice.lastIndexOf('፣'),
      slice.lastIndexOf(','),
      slice.lastIndexOf(';')
    );

    let cutAt = -1;
    if (breakIdx > 40) {
      cutAt = breakIdx + 1;
    } else {
      const spaceIdx = slice.lastIndexOf(' ');
      if (spaceIdx > 30) {
        cutAt = spaceIdx;
      } else {
        cutAt = maxLen;
      }
    }

    const chunk = remaining.slice(0, cutAt).trim();
    if (chunk) chunks.push(chunk);
    remaining = remaining.slice(cutAt).trim();
  }

  return chunks;
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const text = searchParams.get('text') || searchParams.get('q');
    const lang = searchParams.get('lang') || 'am';

    if (!text || !text.trim()) {
      return NextResponse.json({ error: 'Missing text parameter' }, { status: 400 });
    }

    const targetLang = lang.startsWith('en') ? 'en' : 'am';
    const chunks = splitTextIntoSafeChunks(text, 130);

    if (chunks.length === 0) {
      return NextResponse.json({ error: 'Empty text after cleaning' }, { status: 400 });
    }

    // Limit to first 6 chunks (~750 chars) to balance instant playback and comprehensive audio
    const chunksToProcess = chunks.slice(0, 6);

    // Fetch MP3 audio buffers for each chunk in parallel
    const bufferPromises = chunksToProcess.map(async (chunk) => {
      const ttsUrl = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(chunk)}&tl=${encodeURIComponent(targetLang)}&client=tw-ob`;
      
      const response = await fetch(ttsUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
          'Referer': 'https://translate.google.com/'
        }
      });

      if (!response.ok) {
        throw new Error(`TTS chunk fetch failed with status ${response.status}`);
      }

      const arrBuf = await response.arrayBuffer();
      return Buffer.from(arrBuf);
    });

    const buffers = await Promise.all(bufferPromises);
    const combinedBuffer = Buffer.concat(buffers);

    return new NextResponse(combinedBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'audio/mpeg',
        'Cache-Control': 'public, max-age=86400, stale-while-revalidate=604800',
        'Content-Length': combinedBuffer.length.toString(),
      }
    });
  } catch (error: any) {
    console.error('TTS API error:', error);
    return NextResponse.json({ error: error.message || 'Failed to synthesize speech' }, { status: 500 });
  }
}
