'use client';
import React, { useState } from 'react';
import { db, auth } from '@/lib/firebase/config';
import { doc, setDoc } from 'firebase/firestore';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';

const FREE_COURSE = {
  id: "digital_marketing_free",
  title: "ዲጂታል ማርኬቲንግ ለጀማሪዎች፡ ቢዝነስዎን በቀላሉ የሚያሳድጉበት መመሪያ",
  category: "ማርኬቲንግ (Marketing)",
  instructor: "Eyoub Sahle",
  instructorImage: "https://drive.google.com/thumbnail?id=1rdjkUc6ZwK6NbbgHaZ-7BtEi8A9aA5Uq&sz=w1000",
  price: 0,
  oldPrice: 4000,
  status: "Active",
  duration: "00:50:00",
  level: "ጀማሪ (Beginner)",
  image: "https://drive.google.com/thumbnail?id=1HZf1jV5AdSXyc7MJUf8vPgYm4z0-30O6&sz=w1000",
  videoUrl: "https://www.youtube.com/embed/B-s71n0dHUk",
  description: "በዚህ ኮርስ የዲጂታል ማርኬቲንግ መሰረታዊ ሀሳቦችን፣ የሶሻል ሚዲያ አጠቃቀምን እና ቢዝነስዎን እንዴት ማሳደግ እንደሚችሉ ይማራሉ።",
  aiPrompt: "You are Tsehay AI. Your job is to help students learning the Digital Marketing course by Eyoub Sahle. Answer questions strictly related to marketing.",
  isFree: true,
  isPopular: true,
};

const FREE_MODULES = [
  {
    id: "module_1",
    title: "የኮርስ ማስታወቂያ (Course Intro)",
    order: 1,
    lessons: [
      {
        title: "የኮርስ ማስታወቂያ",
        duration: "02:30",
        points: 10,
        videoUrl: "https://www.youtube.com/embed/B-s71n0dHUk"
      }
    ]
  },
  {
    id: "module_2",
    title: "ባህላዊ vs ዲጂታል ማርኬቲንግ",
    order: 2,
    lessons: [
      {
        title: "ባህላዊ እና ዲጂታል ማርኬቲንግ ልዩነት",
        duration: "05:15",
        points: 50,
        videoUrl: "https://www.youtube.com/embed/B-s71n0dHUk"
      }
    ]
  },
  {
    id: "module_3",
    title: "የዲጂታል ማርኬቲንግ አይነቶች",
    order: 3,
    lessons: [
      {
        title: "የዲጂታል ማርኬቲንግ አይነቶች ክፍል 1",
        duration: "10:00",
        points: 100,
        videoUrl: "https://www.youtube.com/embed/B-s71n0dHUk"
      }
    ]
  },
  {
    id: "module_4",
    title: "በተግባር የተደገፈ የፌስቡክ ማስታወቂያ",
    order: 4,
    lessons: [
      {
        title: "የፌስቡክ ማስታወቂያ አሰራር",
        duration: "15:20",
        points: 100,
        videoUrl: "https://www.youtube.com/embed/B-s71n0dHUk"
      }
    ]
  }
];

const PAID_COURSE = {
  id: "digital_marketing_pro",
  title: "ፕሮፌሽናል ዲጂታል ማርኬቲንግ ማስተር ክላስ",
  category: "ማርኬቲንግ (Marketing)",
  instructor: "Eyoub Sahle",
  instructorImage: "https://drive.google.com/thumbnail?id=1rdjkUc6ZwK6NbbgHaZ-7BtEi8A9aA5Uq&sz=w1000",
  price: 2500,
  oldPrice: 5000,
  status: "Active",
  duration: "10:00:00",
  level: "ከፍተኛ (Advanced)",
  image: "https://drive.google.com/thumbnail?id=1HZf1jV5AdSXyc7MJUf8vPgYm4z0-30O6&sz=w1000",
  videoUrl: "https://www.youtube.com/embed/B-s71n0dHUk",
  description: "ይህ የፕሮፌሽናል ዲጂታል ማርኬቲንግ ኮርስ ሲሆን ከጀማሪ እስከ አድቫንስድ ያሉትን ሁሉንም የዲጂታል ማርኬቲንግ አይነቶች በተግባር ይማሩበታል።",
  aiPrompt: "You are Tsehay AI for the Pro Digital Marketing class. Help students with advanced marketing concepts, Facebook Ads, Google Ads, and SEO.",
  isFree: false,
  isPopular: true,
};

const PAID_MODULES = [
  {
    id: "module_1",
    title: "Introduction to Advanced Marketing",
    order: 1,
    lessons: [
      {
        title: "Welcome to Pro Class",
        duration: "05:00",
        points: 50,
        videoUrl: "https://www.youtube.com/embed/B-s71n0dHUk"
      }
    ]
  }
];

export default function SeedDatabase() {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');

  const seedData = async () => {
    setLoading(true);
    setSuccess('');
    
    try {
      // Step 1: Authenticate as admin to bypass Firestore rules
      try {
        await signInWithEmailAndPassword(auth, 'admin@tsehaycampus.com', 'admin123');
      } catch (authError: any) {
        if (authError.code === 'auth/user-not-found' || authError.code === 'auth/invalid-credential') {
          await createUserWithEmailAndPassword(auth, 'admin@tsehaycampus.com', 'admin123');
        } else {
          console.error("Auth error:", authError);
          // Proceed anyway if it's a different error, we might already have permissions from another account
        }
      }

      // Step 2: Seed Free Course
      const freeCourseRef = doc(db, 'artifacts', 'tsehaycampus-e1a6d', 'public', 'data', 'courses', FREE_COURSE.id);
      await setDoc(freeCourseRef, FREE_COURSE);

      for (const mod of FREE_MODULES) {
        const modRef = doc(db, 'artifacts', 'tsehaycampus-e1a6d', 'public', 'data', 'courses', FREE_COURSE.id, 'modules', mod.id);
        await setDoc(modRef, mod);
      }

      // Step 3: Seed Paid Course
      const paidCourseRef = doc(db, 'artifacts', 'tsehaycampus-e1a6d', 'public', 'data', 'courses', PAID_COURSE.id);
      await setDoc(paidCourseRef, PAID_COURSE);

      for (const mod of PAID_MODULES) {
        const modRef = doc(db, 'artifacts', 'tsehaycampus-e1a6d', 'public', 'data', 'courses', PAID_COURSE.id, 'modules', mod.id);
        await setDoc(modRef, mod);
      }

      setSuccess('Courses and Modules successfully inserted into database!');
    } catch (error: any) {
      console.error(error);
      setSuccess(`Error seeding data: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-10 flex flex-col items-center justify-center min-h-screen bg-gray-50">
      <h1 className="text-2xl font-bold mb-4">Seed Database with Courses</h1>
      <button 
        onClick={seedData} 
        disabled={loading}
        className="bg-primary text-dark font-bold px-6 py-3 rounded-xl disabled:opacity-50"
      >
        {loading ? 'Seeding...' : 'Inject Course Data into Firestore'}
      </button>
      {success && <p className="mt-4 font-bold text-green-600">{success}</p>}
    </div>
  );
}
