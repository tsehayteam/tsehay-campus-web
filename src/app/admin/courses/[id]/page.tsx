'use client';
import React, { useEffect, useState } from 'react';
import { db } from '@/lib/firebase/config';
import { collection, doc, getDoc, getDocs, query, orderBy, setDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { useParams, useRouter } from 'next/navigation';

export default function CourseModulesAdmin() {
  const { id } = useParams();
  const router = useRouter();
  const [course, setCourse] = useState<any>(null);
  const [modules, setModules] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModuleModalOpen, setIsModuleModalOpen] = useState(false);
  const [editingModule, setEditingModule] = useState<any>(null);
  
  const [moduleForm, setModuleForm] = useState({
    title: '',
    order: 0,
    lessons: [] as any[]
  });

  const [lessonForm, setLessonForm] = useState({
    title: '',
    duration: '',
    videoUrl: '',
    points: 100
  });
  
  const [isLessonModalOpen, setIsLessonModalOpen] = useState(false);
  const [activeModuleForLesson, setActiveModuleForLesson] = useState<any>(null);

  useEffect(() => {
    if (localStorage.getItem('adminAuth') !== 'true') {
      router.push('/admin');
      return;
    }
    fetchData();
  }, [id]);

  const fetchData = async () => {
    try {
      const courseRef = doc(db, 'artifacts', 'tsehaycampus-e1a6d', 'public', 'data', 'courses', id as string);
      const courseSnap = await getDoc(courseRef);
      if (courseSnap.exists()) {
        setCourse({ id: courseSnap.id, ...courseSnap.data() });
      }

      const q = query(collection(db, 'artifacts', 'tsehaycampus-e1a6d', 'public', 'data', 'courses', id as string, 'modules'), orderBy('order', 'asc'));
      const modSnap = await getDocs(q);
      setModules(modSnap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const saveModule = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const modId = editingModule ? editingModule.id : `module_${Date.now()}`;
      const modRef = doc(db, 'artifacts', 'tsehaycampus-e1a6d', 'public', 'data', 'courses', id as string, 'modules', modId);
      await setDoc(modRef, {
        ...moduleForm,
        updatedAt: serverTimestamp()
      }, { merge: true });
      setIsModuleModalOpen(false);
      fetchData();
    } catch (err) {
      alert("Error saving module");
    }
  };

  const deleteModule = async (modId: string) => {
    if (window.confirm("Delete module?")) {
      await deleteDoc(doc(db, 'artifacts', 'tsehaycampus-e1a6d', 'public', 'data', 'courses', id as string, 'modules', modId));
      fetchData();
    }
  };

  const openLessonModal = (mod: any) => {
    setActiveModuleForLesson(mod);
    setLessonForm({ title: '', duration: '', videoUrl: '', points: 100 });
    setIsLessonModalOpen(true);
  };

  const saveLesson = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeModuleForLesson) return;
    try {
      const updatedLessons = [...(activeModuleForLesson.lessons || []), lessonForm];
      const modRef = doc(db, 'artifacts', 'tsehaycampus-e1a6d', 'public', 'data', 'courses', id as string, 'modules', activeModuleForLesson.id);
      await setDoc(modRef, { lessons: updatedLessons }, { merge: true });
      setIsLessonModalOpen(false);
      fetchData();
    } catch (err) {
      alert("Error saving lesson");
    }
  };

  const deleteLesson = async (mod: any, lessonIdx: number) => {
    if (window.confirm("Delete lesson?")) {
      const updatedLessons = mod.lessons.filter((_: any, idx: number) => idx !== lessonIdx);
      const modRef = doc(db, 'artifacts', 'tsehaycampus-e1a6d', 'public', 'data', 'courses', id as string, 'modules', mod.id);
      await setDoc(modRef, { lessons: updatedLessons }, { merge: true });
      fetchData();
    }
  };

  if (loading) return <div className="p-10 text-center">Loading...</div>;

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <button onClick={() => router.push('/admin')} className="mb-6 font-bold text-gray-500 hover:text-dark">
        <i className="fa-solid fa-arrow-left"></i> ተመለስ
      </button>
      
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-black">{course?.title} - ሞጁሎች (Modules)</h1>
        <button onClick={() => { setEditingModule(null); setModuleForm({ title: '', order: modules.length + 1, lessons: [] }); setIsModuleModalOpen(true); }} className="bg-primary text-dark font-bold px-6 py-2 rounded-xl">
          አዲስ ሞጁል ጨምር
        </button>
      </div>

      <div className="space-y-6">
        {modules.map((mod, idx) => (
          <div key={mod.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-lg text-dark dark:text-white font-heading">ክፍል {mod.order}: {mod.title}</h3>
              <div className="flex gap-2">
                <button onClick={() => openLessonModal(mod)} className="text-sm bg-blue-50 dark:bg-slate-700 text-secondary dark:text-primary px-3 py-1.5 rounded-lg font-bold hover:bg-secondary hover:text-white transition">ትምህርት (Lesson) ጨምር</button>
                <button onClick={() => { setEditingModule(mod); setModuleForm(mod); setIsModuleModalOpen(true); }} className="text-sm bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-300 px-3 py-1.5 rounded-lg font-bold hover:bg-gray-200 dark:hover:bg-slate-600 transition">አስተካክል</button>
                <button onClick={() => deleteModule(mod.id)} className="text-sm bg-red-50 dark:bg-red-500/10 text-danger px-3 py-1.5 rounded-lg font-bold hover:bg-danger hover:text-white transition">አጥፋ</button>
              </div>
            </div>

            <div className="space-y-2 mt-4">
              {(mod.lessons || []).map((lesson: any, lidx: number) => (
                <div key={lidx} className="flex justify-between items-center bg-gray-50 dark:bg-slate-800 p-3 rounded-lg border border-gray-100 dark:border-slate-700">
                  <div>
                    <p className="font-bold text-sm text-dark dark:text-white">{lesson.title}</p>
                    <p className="text-xs text-gray-500 mt-1"><i className="fa-solid fa-video mr-1"></i> {lesson.duration} | <span className="text-primary font-bold">+{lesson.points || 100} ነጥብ</span></p>
                  </div>
                  <button onClick={() => deleteLesson(mod, lidx)} className="w-8 h-8 rounded-lg bg-red-50 dark:bg-red-500/10 text-danger hover:bg-danger hover:text-white transition flex items-center justify-center"><i className="fa-solid fa-trash text-xs"></i></button>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {isModuleModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6">
            <h2 className="text-xl font-bold mb-4">{editingModule ? 'ሞጁል አስተካክል' : 'አዲስ ሞጁል'}</h2>
            <form onSubmit={saveModule} className="space-y-4">
              <div>
                <label className="block text-sm font-bold mb-1">የሞጁል ርዕስ</label>
                <input required value={moduleForm.title} onChange={e => setModuleForm({...moduleForm, title: e.target.value})} className="w-full border rounded-lg px-4 py-2" />
              </div>
              <div>
                <label className="block text-sm font-bold mb-1">ቅደም ተከተል (Order)</label>
                <input type="number" required value={moduleForm.order} onChange={e => setModuleForm({...moduleForm, order: Number(e.target.value)})} className="w-full border rounded-lg px-4 py-2" />
              </div>
              <div className="flex gap-2 pt-4">
                <button type="button" onClick={() => setIsModuleModalOpen(false)} className="flex-1 bg-gray-100 py-2 rounded-lg font-bold">ሰርዝ</button>
                <button type="submit" className="flex-1 bg-primary py-2 rounded-lg font-bold">ሴቭ አድርግ</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isLessonModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6">
            <h2 className="text-xl font-bold mb-4">አዲስ ትምህርት (Lesson) ጨምር</h2>
            <form onSubmit={saveLesson} className="space-y-4">
              <div>
                <label className="block text-sm font-bold mb-1">የርዕስ ስም</label>
                <input required value={lessonForm.title} onChange={e => setLessonForm({...lessonForm, title: e.target.value})} className="w-full border rounded-lg px-4 py-2" />
              </div>
              <div>
                <label className="block text-sm font-bold mb-1">የቪዲዮ ርዝመት (ለምሳሌ: 10:24)</label>
                <input required value={lessonForm.duration} onChange={e => setLessonForm({...lessonForm, duration: e.target.value})} className="w-full border rounded-lg px-4 py-2" />
              </div>
              <div>
                <label className="block text-sm font-bold mb-1">የቪዲዮ ሊንክ (Video URL)</label>
                <input required value={lessonForm.videoUrl} onChange={e => setLessonForm({...lessonForm, videoUrl: e.target.value})} className="w-full border rounded-lg px-4 py-2" />
              </div>
              <div>
                <label className="block text-sm font-bold mb-1">ነጥብ (Points)</label>
                <input required type="number" value={lessonForm.points} onChange={e => setLessonForm({...lessonForm, points: Number(e.target.value)})} className="w-full border rounded-lg px-4 py-2" />
              </div>
              <div className="flex gap-2 pt-4">
                <button type="button" onClick={() => setIsLessonModalOpen(false)} className="flex-1 bg-gray-100 py-2 rounded-lg font-bold">ሰርዝ</button>
                <button type="submit" className="flex-1 bg-dark dark:bg-primary text-white dark:text-dark py-2 rounded-lg font-bold">ሴቭ አድርግ</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
