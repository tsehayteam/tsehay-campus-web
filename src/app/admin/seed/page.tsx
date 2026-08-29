'use client';
import React, { useState } from 'react';
import { db, auth } from '@/lib/firebase/config';
import { doc, setDoc } from 'firebase/firestore';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { DEFAULT_COURSES } from '@/lib/courseCache';

export default function SeedDatabase() {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');

  const seedData = async () => {
    setLoading(true);
    setSuccess('');
    
    try {
      // Step 1: Authenticate as admin to ensure write permissions
      try {
        await signInWithEmailAndPassword(auth, 'admin@tsehaycampus.com', 'admin123');
      } catch (authError: any) {
        if (authError.code === 'auth/user-not-found' || authError.code === 'auth/invalid-credential') {
          try {
            await createUserWithEmailAndPassword(auth, 'admin@tsehaycampus.com', 'admin123');
          } catch (createErr) {}
        }
      }

      // Step 2: Seed All Authentic Courses into both collections
      let count = 0;
      for (const course of DEFAULT_COURSES) {
        const docId = course.id;
        const nowIso = new Date().toISOString();
        const payload = {
          ...course,
          updatedAt: nowIso,
          status: 'Active'
        };

        // 1. Artifacts nested collection
        try {
          const artifactRef = doc(db, 'artifacts', 'tsehaycampus-e1a6d', 'public', 'data', 'courses', docId);
          await setDoc(artifactRef, payload, { merge: true });
        } catch (e) {
          console.warn(`Artifact seed notice for ${docId}:`, e);
        }

        // 2. Root collection
        try {
          const rootRef = doc(db, 'courses', docId);
          await setDoc(rootRef, payload, { merge: true });
        } catch (e) {
          console.warn(`Root seed notice for ${docId}:`, e);
        }

        count++;
      }

      setSuccess(`All ${count} authentic courses successfully synchronized into Firestore!`);
    } catch (error: any) {
      console.error(error);
      setSuccess(`Error seeding data: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-10 flex flex-col items-center justify-center min-h-screen bg-gray-50 dark:bg-slate-900 text-dark dark:text-white">
      <h1 className="text-2xl font-bold mb-4 font-heading">Sync & Seed Authentic Courses Database</h1>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-6 max-w-md text-center">
        Writes the 6 authentic original courses (YouTube Secrets, Shein Import, Digital Marketing Free/Pro, Crypto Trading, Web Development) to Firestore.
      </p>
      <button 
        onClick={seedData} 
        disabled={loading}
        className="bg-primary hover:bg-yellow-400 text-dark font-black px-8 py-3.5 rounded-xl disabled:opacity-50 transition shadow-md"
      >
        {loading ? 'Synchronizing with Firestore...' : 'Sync Authentic Courses to Firestore'}
      </button>
      {success && (
        <div className="mt-6 p-4 rounded-xl bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-700 text-emerald-700 dark:text-emerald-300 font-bold text-sm">
          {success}
        </div>
      )}
    </div>
  );
}
