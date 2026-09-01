import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { DEFAULT_COURSES } from '@/lib/courseCache';

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

    if (!adminDb) {
      return NextResponse.json({
        success: true,
        instructors: [DEFAULT_INSTRUCTOR]
      });
    }

    // 1. Fetch instructors collection from Firestore
    let instructorsList: InstructorData[] = [];
    try {
      const snap = await adminDb.collection('instructors').get();
      if (!snap.empty) {
        instructorsList = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as InstructorData));
      }
    } catch (e) {}

    // 2. Also check artifact instructors collection
    if (instructorsList.length === 0) {
      try {
        const artifactSnap = await adminDb
          .collection('artifacts')
          .doc('tsehaycampus-e1a6d')
          .collection('public')
          .doc('data')
          .collection('instructors')
          .get();
        if (!artifactSnap.empty) {
          instructorsList = artifactSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as InstructorData));
        }
      } catch (e) {}
    }

    // 3. Fallback / seed with default instructor if empty
    if (instructorsList.length === 0) {
      instructorsList = [DEFAULT_INSTRUCTOR];
      try {
        await adminDb.collection('instructors').doc(DEFAULT_INSTRUCTOR.id).set(DEFAULT_INSTRUCTOR, { merge: true });
        await adminDb
          .collection('artifacts')
          .doc('tsehaycampus-e1a6d')
          .collection('public')
          .doc('data')
          .collection('instructors')
          .doc(DEFAULT_INSTRUCTOR.id)
          .set(DEFAULT_INSTRUCTOR, { merge: true });
      } catch (e) {}
    }

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

    if (!instructorData || Object.keys(instructorData).length === 0) {
      return NextResponse.json({ success: false, error: 'Missing instructorData payload' }, { status: 400 });
    }

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

    if (adminDb) {
      // 1. Save to root instructors collection
      try {
        await adminDb.collection('instructors').doc(instructorId).set(payload, { merge: true });
      } catch (e) {}

      // 2. Save to artifacts instructors collection
      try {
        await adminDb
          .collection('artifacts')
          .doc('tsehaycampus-e1a6d')
          .collection('public')
          .doc('data')
          .collection('instructors')
          .doc(instructorId)
          .set(payload, { merge: true });
      } catch (e) {}

      // 3. Cascade update instructor info across all matching courses if requested
      const shouldSyncCourses = body.syncCourses !== false;
      if (shouldSyncCourses) {
        try {
          const courseCollections = [
            adminDb.collection('courses'),
            adminDb.collection('artifacts').doc('tsehaycampus-e1a6d').collection('public').doc('data').collection('courses')
          ];

          for (const col of courseCollections) {
            const snap = await col.get();
            if (!snap.empty) {
              const batch = adminDb.batch();
              snap.docs.forEach(docSnap => {
                const cData = docSnap.data();
                const instName = (cData.instructor || cData.instructorName || '').toLowerCase();
                const isMatch = !instName || 
                  instName.includes('eyoub') || 
                  instName.includes('eyob') || 
                  instName.includes('ኢዮብ') ||
                  instName.includes(payload.name.toLowerCase().split(' ')[0]);

                if (isMatch) {
                  batch.set(docSnap.ref, {
                    instructor: payload.name,
                    instructorName: payload.name,
                    instructorImage: payload.image,
                    instructorBio: payload.bio,
                    instructorTelegram: payload.telegram,
                    updatedAt: new Date().toISOString()
                  }, { merge: true });
                }
              });
              await batch.commit();
            }
          }
        } catch (cascadeErr) {
          console.warn('Cascade instructor sync to courses warning:', cascadeErr);
        }
      }

      return NextResponse.json({
        success: true,
        message: 'የአስተማሪው መረጃ በተሳካ ሁኔታ ተስተካክሏል! (Instructor updated successfully)',
        instructor: payload
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Instructor saved (client sync)',
      instructor: payload
    });
  } catch (error: any) {
    console.error('Error saving instructor in API route:', error);
    return NextResponse.json({ success: false, error: error.message || 'Internal server error' }, { status: 500 });
  }
}
