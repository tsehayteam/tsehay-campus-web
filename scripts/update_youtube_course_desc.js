const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const serviceAccount = require('../src/lib/firebase/serviceAccountKey.json');

if (!require('firebase-admin').apps.length) {
  initializeApp({
    credential: cert(serviceAccount)
  });
}

const db = getFirestore();

async function updateDescriptions() {
  const properYouTubeDesc = "ከዜሮ ተነስተው ስኬታማ እና ገቢ የሚያስገኝ የዩቲዩብ ቻናል ለመገንባት የሚያስፈልጉዎትን ሚስጥሮች፣ የቪዲዮ አሰራር፣ የ Thumbnail ዲዛይን፣ የ SEO እና የገቢ ማግኛ መንገዶችን ደረጃ በደረጃ በተግባር የሚያስተምር የተሟላ ማስተርክላስ።";
  
  // 1. Update in artifacts/tsehaycampus-e1a6d/public/data/courses
  const colRef = db.collection('artifacts/tsehaycampus-e1a6d/public/data/courses');
  const snap = await colRef.get();
  
  console.log(`Checking ${snap.docs.length} courses in artifacts...`);
  for (const doc of snap.docs) {
    const data = doc.data();
    console.log(`Course ${doc.id}: "${data.title}"`);
    const currentDesc = data.desc || data.description || '';
    
    if (doc.id === 'course_1784885267254' || data.title?.includes('YouTube') || data.title?.includes('ዩቲዩብ') || currentDesc.startsWith('You are')) {
      console.log(`-> Updating course ${doc.id} with proper description...`);
      await doc.ref.update({
        desc: properYouTubeDesc,
        description: properYouTubeDesc,
        aiPrompt: data.aiPrompt || currentDesc
      });
      console.log(`-> Successfully updated ${doc.id}!`);
    }
  }

  // 2. Also check standard /courses collection just in case
  try {
    const rootCol = db.collection('courses');
    const rootSnap = await rootCol.get();
    for (const doc of rootSnap.docs) {
      const data = doc.data();
      const currentDesc = data.desc || data.description || '';
      if (doc.id === 'course_1784885267254' || data.title?.includes('YouTube') || data.title?.includes('ዩቲዩብ') || currentDesc.startsWith('You are')) {
        console.log(`-> Updating root course ${doc.id}...`);
        await doc.ref.update({
          desc: properYouTubeDesc,
          description: properYouTubeDesc,
          aiPrompt: data.aiPrompt || currentDesc
        });
      }
    }
  } catch (e) {
    console.warn('Root courses check warning:', e.message);
  }

  console.log('All updates complete!');
  process.exit(0);
}

updateDescriptions().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
