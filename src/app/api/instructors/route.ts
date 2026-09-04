export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';

const NO_CACHE_HEADERS = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
  'CDN-Cache-Control': 'no-store',
  'Vercel-CDN-Cache-Control': 'no-store',
  'Pragma': 'no-cache',
  'Expires': '0',
};

const DEFAULT_INSTRUCTOR = {
  id: 'eyoub_sahle',
  name: 'Eyoub Sahle (ኢዮብ ሳህሌ)',
  specialty: 'E-Commerce, YouTube & Digital Business',
  bio: 'የፀሐይ ካምፓስ (Tsehay Campus) መስራች እና ዋና አሰልጣኝ። በዲጂታል ንግድ፣ በቻይና ቀጥታ ኢምፖርት እና በዩቲዩብ ሞኒታይዜሽን ከ 5+ ዓመታት በላይ ተግባራዊ ልምድ ያለው የቢዝነስ አማካሪ።',
  image: '/assets/eyob_white.jpg',
  telegram: '@EyoubSahle',
  youtube: 'https://youtube.com/@eyoubsahle',
  tiktok: '@eyoubsahle',
  email: 'eyobsahle@gmail.com',
  phone: '+251911000000',
  courseCount: 3,
  rating: 5.0,
  updatedAt: new Date().toISOString()
};

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    let instructorsList: any[] = [DEFAULT_INSTRUCTOR];

    try {
      const { data: row } = await supabase
        .from('site_settings')
        .select('data')
        .eq('key', 'instructors')
        .maybeSingle();

      if (row?.data && Array.isArray(row.data) && row.data.length > 0) {
        instructorsList = row.data;
      }
    } catch (e) {}

    if (id) {
      const found = instructorsList.find(i => i.id === id);
      return NextResponse.json(
        { success: true, instructor: found || DEFAULT_INSTRUCTOR },
        { headers: NO_CACHE_HEADERS }
      );
    }

    return NextResponse.json({
      success: true,
      count: instructorsList.length,
      instructors: instructorsList
    }, { headers: NO_CACHE_HEADERS });
  } catch (error: any) {
    console.error('Error fetching instructors:', error);
    return NextResponse.json({
      success: true,
      instructors: [DEFAULT_INSTRUCTOR]
    }, { headers: NO_CACHE_HEADERS });
  }
}
