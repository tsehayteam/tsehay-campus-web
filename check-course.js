const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const serviceAccount = require('./src/lib/firebase/serviceAccountKey.json');

// Initialize Firebase
if (!require('firebase-admin').apps.length) {
  initializeApp({
    credential: cert(serviceAccount)
  });
}

const db = getFirestore();

async function checkCourse() {
  try {
    const courseId = 'course_1784495507314';
    const docRef = db.collection('courses').doc(courseId);
    const doc = await docRef.get();
    
    if (!doc.exists) {
      console.log('No such course!');
      return;
    }
    
    const data = doc.data();
    console.log('Course ID:', doc.id);
    console.log('Title:', data.title);
    console.log('Video:', data.video);
    console.log('VideoUrl:', data.videoUrl);
    
    // Also check lessons for this course
    const modulesSnapshot = await db.collection(`courses/${courseId}/modules`).get();
    modulesSnapshot.forEach(mDoc => {
      console.log(`Module ${mDoc.id}:`, mDoc.data().title);
      const lessons = mDoc.data().lessons || [];
      lessons.forEach((l, i) => {
        console.log(`  Lesson ${i}: video = ${l.video}, videoUrl = ${l.videoUrl}`);
      });
    });
    
  } catch (error) {
    console.error('Error:', error);
  }
}

checkCourse();
