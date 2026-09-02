export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';

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

    if (!adminDb) {
      return NextResponse.json({
        success: true,
        instructors: [DEFAULT_INSTRUCTOR]
      }, { headers: NO_CACHE_HEADERS });
    }

    let instructorsList: any[] = [];
    try {
      const snap = await adminDb.collection('instructors').get();
      if (!snap.empty) {
        instructorsList = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      }
    } catch (e) {}

    try {
      const artifactSnap = await adminDb
        .collection('artifacts')
        .doc('tsehaycampus-e1a6d')
        .collection('public')
        .doc('data')
        .collection('instructors')
        .get();
      
      if (!artifactSnap.empty) {
        artifactSnap.docs.forEach(doc => {
          if (!instructorsList.some(i => i.id === doc.id)) {
            instructorsList.push({ id: doc.id, ...doc.data() });
          }
        });
      }
    } catch (e) {}

    if (instructorsList.length === 0) {
      instructorsList = [DEFAULT_INSTRUCTOR];
    }

    if (id) {
      const found = instructorsList.find(i => i.id === id);
      if (found) {
        return NextResponse.json({ success: true, instructor: found }, { headers: NO_CACHE_HEADERS });
      }
      return NextResponse.json({ success: true, instructor: DEFAULT_INSTRUCTOR }, { headers: NO_CACHE_HEADERS });
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
