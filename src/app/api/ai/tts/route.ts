import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const text = searchParams.get('text') || searchParams.get('q');
    const lang = searchParams.get('lang') || 'am';

    if (!text || !text.trim()) {
      return NextResponse.json({ error: 'Missing text parameter' }, { status: 400 });
    }

    // Clean text thoroughly from markdown, asterisks, repeated whitespaces, etc.
    let cleanText = text
      .replace(/[*_~`#\n\r[\]()<>]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    // Limit to 220 chars for instantaneous TTS streaming
    if (cleanText.length > 220) {
      // Cut at last punctuation/sentence break
      const lastPeriod = cleanText.slice(0, 220).lastIndexOf('።');
      const lastComma = cleanText.slice(0, 220).lastIndexOf('፣');
      const lastSpace = cleanText.slice(0, 220).lastIndexOf(' ');
      const cutIdx = lastPeriod > 100 ? lastPeriod + 1 : lastComma > 100 ? lastComma + 1 : lastSpace > 100 ? lastSpace : 220;
      cleanText = cleanText.slice(0, cutIdx);
    }

    // Google Translate TTS endpoint with authentic Amharic (am) voice engine
    const ttsUrl = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(cleanText)}&tl=${encodeURIComponent(lang)}&client=tw-ob`;

    const response = await fetch(ttsUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Referer': 'https://translate.google.com/'
      }
    });

    if (!response.ok) {
      return NextResponse.json({ error: `TTS Provider returned ${response.status}` }, { status: 502 });
    }

    const audioBuffer = await response.arrayBuffer();

    return new NextResponse(audioBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'audio/mpeg',
        'Cache-Control': 'public, max-age=86400, stale-while-revalidate=604800',
      }
    });
  } catch (error: any) {
    console.error('TTS API error:', error);
    return NextResponse.json({ error: error.message || 'Failed to synthesize Amharic speech' }, { status: 500 });
  }
}
