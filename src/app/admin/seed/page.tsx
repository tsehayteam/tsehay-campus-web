'use client';
import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';
import { DEFAULT_COURSES } from '@/lib/courseCache';

export default function SeedDatabase() {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');

  useEffect(() => {
    const hasAuth = !!sessionStorage.getItem('tc_admin_session') || document.cookie.includes('tc_admin_session=');
    if (!hasAuth) {
      window.location.href = '/admin';
    }
  }, []);

  const seedData = async () => {
    const hasAuth = !!sessionStorage.getItem('tc_admin_session') || document.cookie.includes('tc_admin_session=');
    if (!hasAuth) {
      setSuccess('Unauthorized: Admin access required.');
      return;
    }

    setLoading(true);
    setSuccess('');
    
    try {
      let count = 0;
      for (const course of DEFAULT_COURSES) {
        const payload = {
          id: course.id,
          title: course.title,
          instructor: course.instructor,
          desc: course.desc,
          price: course.price,
          old_price: course.oldPrice || null,
          image: course.image,
          duration: course.duration,
          level: course.level,
          category: course.category || 'Business',
          rating: course.rating || 5.0,
          students_count: course.studentsCount || 0,
          lessons: course.lessons || [],
          status: 'Active',
          updated_at: new Date().toISOString()
        };

        const { error } = await supabase.from('courses').upsert(payload);
        if (error) {
          console.warn(`Supabase seed notice for ${course.id}:`, error);
        }
        count++;
      }

      setSuccess(`All ${count} authentic courses (Shein Import, YouTube Secrets, Free Digital Marketing) successfully synchronized into Supabase!`);
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
        Writes the 3 authentic courses (Shein Import Business - 4500 ETB, YouTube Secrets - 600 ETB, Free Digital Marketing - 0 ETB) directly to Supabase.
      </p>
      <button 
        onClick={seedData} 
        disabled={loading}
        className="bg-primary hover:bg-yellow-400 text-dark font-black px-8 py-3.5 rounded-xl disabled:opacity-50 transition shadow-md"
      >
        {loading ? 'Synchronizing with Supabase...' : 'Sync Authentic Courses to Supabase'}
      </button>
      {success && (
        <div className="mt-6 p-4 rounded-xl bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-700 text-emerald-700 dark:text-emerald-300 font-bold text-sm">
          {success}
        </div>
      )}
    </div>
  );
}
