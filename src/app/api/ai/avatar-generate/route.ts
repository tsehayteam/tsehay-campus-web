import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { image, style = '3d_cyber', gender = 'auto' } = body;

    if (!image) {
      return NextResponse.json(
        { success: false, error: 'እባክዎ ፎቶ ያያይዙ ወይም በካሜራ ያንሱ። (Image payload required)' },
        { status: 400 }
      );
    }

    // Determine seed based on image characteristics or random hash
    const imageHash = Math.abs(
      image.slice(0, 100).split('').reduce((acc: number, char: string) => acc + char.charCodeAt(0), 0) + Date.now()
    ).toString(36);

    let avatarUrl = '';
    let styleName = '3D Cyber & Tech Habesha';

    switch (style) {
      case 'habesha_art':
        styleName = 'Habesha Digital Art';
        avatarUrl = `https://api.dicebear.com/7.x/adventurer/svg?seed=Habesha${imageHash}&skinColor=9e5622,763900&backgroundColor=f9b03c,3268ba,0b101d`;
        break;
      case 'anime_habesha':
        styleName = 'Anime Habesha Style';
        avatarUrl = `https://api.dicebear.com/7.x/lorelei/svg?seed=Ethio${imageHash}&skinColor=a05a2c,8c4a1e&backgroundColor=151c2e,f9b03c`;
        break;
      case 'digital_entrepreneur':
        styleName = 'Modern Habesha Entrepreneur';
        avatarUrl = `https://api.dicebear.com/7.x/personas/svg?seed=Entrepreneur${imageHash}&skinColor=darkBrown,brown&backgroundColor=f9b03c,151c2e`;
        break;
      case '3d_cyber':
      default:
        styleName = '3D Cyber Tech Habesha';
        avatarUrl = `https://api.dicebear.com/7.x/avataaars/svg?seed=HabeshaTech${imageHash}&skinColor=darkBrown,brown&top=shortCurly,longCurly,frizzle,dreads01,dreads02&facialHair=beardLight,beardMedium,none&clothing=hoodie,blazerAndShirt,collarAndSweater&backgroundColor=f9b03c,3268ba,0b101d`;
        break;
    }

    // Try Gemini Multimodal analysis if API key is present
    const apiKeys = [
      process.env.GEMINI_API_KEY,
      process.env.NEXT_PUBLIC_GEMINI_API_KEY,
      process.env.GOOGLE_API_KEY
    ].filter(Boolean);

    let analysisDescription = 'የተሳካ የ AI አቫታር ተዘጋጅቷል! (Custom AI Avatar Generated)';

    if (apiKeys.length > 0) {
      try {
        const apiKey = apiKeys[0];
        const base64Data = image.includes('base64,') ? image.split('base64,')[1] : image;
        const mimeType = image.includes('data:') ? image.split(';')[0].replace('data:', '') : 'image/jpeg';

        const geminiRes = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [
                {
                  role: 'user',
                  parts: [
                    {
                      inlineData: {
                        mimeType,
                        data: base64Data
                      }
                    },
                    {
                      text: `Describe the person in this selfie in 2 short bullet points (hairstyle, expression, aesthetic) suitable for generating a stylized Ethiopian digital avatar in ${styleName} style. Reply in Amharic.`
                    }
                  ]
                }
              ]
            })
          }
        );

        if (geminiRes.ok) {
          const geminiJson = await geminiRes.json();
          const desc = geminiJson.candidates?.[0]?.content?.parts?.[0]?.text;
          if (desc) {
            analysisDescription = desc;
          }
        }
      } catch (geminiErr) {
        console.warn('Gemini vision analysis optional warning:', geminiErr);
      }
    }

    return NextResponse.json({
      success: true,
      avatarUrl,
      style: styleName,
      description: analysisDescription,
      timestamp: Date.now()
    });

  } catch (error: any) {
    console.error('Error generating AI avatar:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'አቫተር ማመንጨት አልተቻለም፤ እባክዎ በድጋሚ ይሞክሩ።' },
      { status: 500 }
    );
  }
}
