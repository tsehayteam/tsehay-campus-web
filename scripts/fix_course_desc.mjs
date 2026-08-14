import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, updateDoc } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyDCxlwfYAS_I0D7c-8e-iB-Y-Rh2ZZoHZw",
  authDomain: "tsehaycampus.com",
  projectId: "tsehaycampus-e1a6d",
  storageBucket: "tsehaycampus-e1a6d.firebasestorage.app",
  messagingSenderId: "1043616909865",
  appId: "1:1043616909865:web:9ecca7d9a14deef0f5ea38"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function inspectAndFix() {
  const coursesCol = collection(db, 'artifacts', 'tsehaycampus-e1a6d', 'public', 'data', 'courses');
  const snap = await getDocs(coursesCol);
  
  console.log(`Found ${snap.docs.length} courses:`);
  for (const d of snap.docs) {
    const data = d.data();
    console.log(`\nID: ${d.id}`);
    console.log(`Title: ${data.title}`);
    console.log(`Desc: ${data.desc || data.description}`);
    console.log(`Price: ${data.price}`);

    const currentDesc = data.desc || data.description || '';
    if (
      d.id.toLowerCase().includes('youtube') || 
      data.title?.toLowerCase().includes('youtube') || 
      currentDesc.includes('You are "Tsehay AI"') || 
      currentDesc.includes('Tsehay AI') ||
      currentDesc.includes('teaching assistant') ||
      currentDesc.startsWith('You are')
    ) {
      const properDesc = "ከዜሮ ተነስተው ስኬታማ እና ገቢ የሚያስገኝ የዩቲዩብ ቻናል ለመገንባት የሚያስፈልጉዎትን ሚስጥሮች፣ የቪዲዮ አሰራር፣ የ Thumbnail ዲዛይን፣ የ SEO እና የገቢ ማግኛ መንገዶችን ደረጃ በደረጃ በተግባር የሚያስተምር የተሟላ ማስተርክላስ።";
      
      console.log(`--> Updating course ${d.id} description to proper text...`);
      await updateDoc(doc(db, 'artifacts', 'tsehaycampus-e1a6d', 'public', 'data', 'courses', d.id), {
        desc: properDesc,
        description: properDesc,
        aiPrompt: data.aiPrompt || currentDesc
      });
      console.log(`--> Updated successfully!`);
    }
  }
  process.exit(0);
}

inspectAndFix().catch(err => {
  console.error("Error:", err);
  process.exit(1);
});
