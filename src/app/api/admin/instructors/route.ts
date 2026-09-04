import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';

export const dynamic = 'force-dynamic';

export interface InstructorData {
  id: string;
  name: string;
  specialty?: string;
  bio?: string;
  image?: string;
  telegram?: string;
  youtube?: string;
  tiktok?: string;
  email?: string;
  phone?: string;
  courseCount?: number;
  rating?: number;
  updatedAt?: string;
}

const DEFAULT_INSTRUCTOR: InstructorData = {
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

    let instructorsList: InstructorData[] = [DEFAULT_INSTRUCTOR];
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
      const found = instructorsList.find(i => i.id === id || i.name.toLowerCase().includes(id.toLowerCase()));
      return NextResponse.json({
        success: true,
        instructor: found || DEFAULT_INSTRUCTOR
      });
    }

    return NextResponse.json({
      success: true,
      count: instructorsList.length,
      instructors: instructorsList
    });
  } catch (error: any) {
    console.error('Error fetching instructors in API route:', error);
    return NextResponse.json({
      success: true,
      instructors: [DEFAULT_INSTRUCTOR],
      error: error.message
    });
  }
}

export async function POST(req: NextRequest) {
  return handleSaveInstructor(req);
}

export async function PUT(req: NextRequest) {
  return handleSaveInstructor(req);
}

export async function PATCH(req: NextRequest) {
  return handleSaveInstructor(req);
}

async function handleSaveInstructor(req: NextRequest) {
  try {
    let body: any = {};
    try {
      body = await req.json();
    } catch (e) {
      body = {};
    }

    const { searchParams } = new URL(req.url);
    const idParam = searchParams.get('id');
    const instructorData = body.instructorData || body;
    const instructorId = idParam || body.id || instructorData.id || 'eyoub_sahle';

    const payload: InstructorData = {
      id: instructorId,
      name: instructorData.name || 'Eyoub Sahle (ኢዮብ ሳህሌ)',
      specialty: instructorData.specialty || 'E-Commerce & Digital Business',
      bio: instructorData.bio || '',
      image: instructorData.image || '/assets/eyob_white.jpg',
      telegram: instructorData.telegram || '@EyoubSahle',
      youtube: instructorData.youtube || '',
      tiktok: instructorData.tiktok || '',
      email: instructorData.email || 'eyobsahle@gmail.com',
      phone: instructorData.phone || '',
      courseCount: Number(instructorData.courseCount) || 3,
      rating: Number(instructorData.rating) || 5.0,
      updatedAt: new Date().toISOString()
    };

    // Save to Supabase site_settings
    try {
      await supabase.from('site_settings').upsert({
        key: 'instructors',
        data: [payload],
        updated_at: new Date().toISOString()
      });

      // Update instructor info on all courses
      await supabase
        .from('courses')
        .update({
          instructor: payload.name,
          instructor_name: payload.name,
          instructor_image: payload.image,
          instructor_bio: payload.bio,
          instructor_telegram: payload.telegram,
          updated_at: new Date().toISOString()
        })
        .neq('id', '');
    } catch (err) {
      console.warn('Supabase instructor save warning:', err);
    }

    return NextResponse.json({
      success: true,
      message: 'የአስተማሪው መረጃ በተሳካ ሁኔታ ተስተካክሏል! (Instructor updated successfully)',
      instructor: payload
    });
  } catch (error: any) {
    console.error('Error saving instructor in API route:', error);
    return NextResponse.json({ success: false, error: error.message || 'Internal server error' }, { status: 500 });
  }
}
