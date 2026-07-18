'use client';
import React, { useState, useEffect } from 'react';
import { db, auth } from '@/lib/firebase/config';
import { collection, onSnapshot, doc, setDoc, deleteDoc, serverTimestamp, query } from 'firebase/firestore';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged } from 'firebase/auth';
import { useRouter } from 'next/navigation';

export default function AdminDashboard() {
  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [students, setStudents] = useState<any[]>([]);
  const router = useRouter();
  
  // Login State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');

  // Course Form State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState<any>(null);
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: '',
    price: '',
    oldPrice: '',
    image: '',
    instructor: '',
    instructorImage: '',
    status: 'Active',
    duration: '',
    level: 'Beginner',
    videoUrl: '',
    videoUrl: '',
    aiPrompt: '',
    isFree: false,
    isPopular: false
  });

  const [courseModules, setCourseModules] = useState<any[]>([]);
  const [newModuleTitle, setNewModuleTitle] = useState('');
  const [activeModuleId, setActiveModuleId] = useState<string | null>(null);
  const [lessonForm, setLessonForm] = useState({ title: '', duration: '', videoUrl: '', points: 100 });


  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (user && (user.email === 'admin@tsehaycampus.com' || user.email === 'habte@gmail.com' || user.email === 'cryptomaster758@gmail.com')) {
        setIsAuthenticated(true);
        localStorage.setItem('adminAuth', 'true');
      } else {
        // If not logged in Firebase but localStorage is true, clear it to force real login
        if (localStorage.getItem('adminAuth') === 'true') {
            setIsAuthenticated(false);
            localStorage.removeItem('adminAuth');
        }
      }
    });
    
    const q = query(collection(db, 'artifacts', 'tsehaycampus-e1a6d', 'public', 'data', 'courses'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setCourses(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    });

    const sq = query(collection(db, 'artifacts', 'tsehaycampus-e1a6d', 'public', 'data', 'users'));
    const unsubscribeStudents = onSnapshot(sq, (snapshot) => {
      setStudents(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    return () => {
        unsubscribeAuth();
        unsubscribe();
        unsubscribeStudents();
    };
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (email === 'admin@tsehaycampus.com' && password === 'admin123') { 
      try {
        try {
          await signInWithEmailAndPassword(auth, email, password);
        } catch (authError: any) {
          if (authError.code === 'auth/user-not-found' || authError.code === 'auth/invalid-credential') {
            await createUserWithEmailAndPassword(auth, email, password);
          } else {
            console.error("Auth error:", authError);
            throw authError;
          }
        }
        localStorage.setItem('adminAuth', 'true');
        setIsAuthenticated(true);
        setLoginError('');
      } catch (error) {
        setLoginError('የሲስተም ስህተት ተፈጥሯል (Firebase Auth Error)');
      }
    } else {
      setLoginError('የተሳሳተ ኢሜል ወይም የይለፍ ቃል');
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch(e) {
      console.error(e);
    }
    localStorage.removeItem('adminAuth');
    setIsAuthenticated(false);
  };

  const formatDriveLink = (url: string) => {
    if (!url) return url;
    const match = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
    if (match && match[1]) {
      return `https://drive.google.com/uc?export=view&id=${match[1]}`;
    }
    return url;
  };

  const openForm = async (course = null) => {
    if (course) {
      setEditingCourse(course);
      setFormData(course);
      
      // Load modules from course document or fallback to subcollection
      if (course.modules && course.modules.length > 0) {
        setCourseModules(course.modules);
      } else {
        const q = query(collection(db, 'artifacts', 'tsehaycampus-e1a6d', 'public', 'data', 'courses', course.id, 'modules'), orderBy('order', 'asc'));
        onSnapshot(q, (snapshot) => {
            setCourseModules(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
        });
      }
    } else {
      setEditingCourse(null);
      setFormData({ 
        title: '', description: '', category: '', price: '', oldPrice: '', image: '', 
        instructor: '', instructorImage: '', status: 'Active', duration: '', 
        level: 'Beginner', videoUrl: '', aiPrompt: '', isFree: false, isPopular: false 
      });
      setCourseModules([]);
    }
    setIsModalOpen(true);
  };

  const handleSaveCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const docId = editingCourse ? editingCourse.id : `course_${Date.now()}`;
      const courseRef = doc(db, 'artifacts', 'tsehaycampus-e1a6d', 'public', 'data', 'courses', docId);
      const priceNum = Number(formData.price);
      const isFreeCourse = priceNum === 0 || formData.price === '0' || formData.price === 'Free';

      await setDoc(courseRef, {
        ...formData,
        modules: courseModules,
        image: formatDriveLink(formData.image),
        instructorImage: formatDriveLink(formData.instructorImage),
        price: priceNum,
        isFree: isFreeCourse,
        createdAt: (editingCourse && editingCourse.createdAt) ? editingCourse.createdAt : serverTimestamp()
      }, { merge: true });
      
      setIsModalOpen(false);
    } catch (err: any) {
      console.error(err);
      alert(`Error saving course: ${err.message}`);
    }
  };

  const handleAddModule = () => {
    if (!newModuleTitle.trim()) return;
    const modId = `module_${Date.now()}`;
    setCourseModules([...courseModules, {
      id: modId,
      title: newModuleTitle,
      order: courseModules.length + 1,
      lessons: []
    }]);
    setNewModuleTitle('');
  };

  const handleDeleteModule = (modId: string) => {
    if (window.confirm("እርግጠኛ ነዎት ይህን ሞጁል ማጥፋት ይፈልጋሉ? (Delete module?)")) {
      setCourseModules(courseModules.filter(m => m.id !== modId));
      if (activeModuleId === modId) setActiveModuleId(null);
    }
  };

  const handleAddLesson = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeModuleId) return;
    setCourseModules(courseModules.map(mod => {
      if (mod.id === activeModuleId) {
        return { ...mod, lessons: [...(mod.lessons || []), lessonForm] };
      }
      return mod;
    }));
    setActiveModuleId(null);
    setLessonForm({ title: '', duration: '', videoUrl: '', points: 100 });
  };

  const handleDeleteLesson = (modId: string, lessonIdx: number) => {
    if (window.confirm("ትምህርቱን ማጥፋት ይፈልጋሉ? (Delete lesson?)")) {
      setCourseModules(courseModules.map(mod => {
        if (mod.id === modId) {
          return { ...mod, lessons: mod.lessons.filter((_: any, idx: number) => idx !== lessonIdx) };
        }
        return mod;
      }));
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm("እርግጠኛ ነዎት ይህን ኮርስ ማጥፋት ይፈልጋሉ?")) {
      try {
        await deleteDoc(doc(db, 'artifacts', 'tsehaycampus-e1a6d', 'public', 'data', 'courses', id));
      } catch (err: any) {
        console.error(err);
        alert(`Error deleting course: ${err.message}`);
      }
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-dark flex flex-col items-center justify-center p-4 relative overflow-hidden -mt-20 z-[60]">
        {/* Background blobs for art */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-primary/20 rounded-full blur-[100px]"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-secondary/20 rounded-full blur-[100px]"></div>

        <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-10 rounded-[2rem] w-full max-w-md relative z-10 shadow-2xl">
          <div className="text-center mb-8 flex flex-col items-center">
            <img src="/logo.png" alt="Tsehay Campus Logo" className="h-16 w-auto object-contain mb-6 bg-white p-2 rounded-xl" />
            <h1 className="text-4xl font-black text-white mb-2 font-heading tracking-tight">Tsehay <span className="text-primary">Admin</span></h1>
            <p className="text-gray-400">ወደ መቆጣጠሪያ ዳሽቦርድ ይግቡ</p>
          </div>
          
          {loginError && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl mb-6 text-sm text-center font-bold">
              {loginError}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 block">ኢሜል</label>
              <input 
                type="email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-black/30 border border-white/10 rounded-xl px-5 py-4 text-white outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                placeholder="admin@tsehaycampus.com"
                required
              />
            </div>
            <div>
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 block">የይለፍ ቃል</label>
              <input 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-black/30 border border-white/10 rounded-xl px-5 py-4 text-white outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                placeholder="••••••••"
                required
              />
            </div>
            <button type="submit" className="w-full bg-primary text-dark font-black py-4 rounded-xl hover:bg-yellow-400 transition-colors shadow-lg">
              ግባ (Log in)
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-gray-50 dark:bg-slate-900 flex overflow-hidden -mt-20 relative z-[60]">
      {/* Sidebar */}
      <aside className="w-[280px] bg-white dark:bg-[#1E293B] border-r border-gray-200 dark:border-slate-700 hidden lg:flex flex-col">
        <div className="h-16 flex items-center px-6 border-b border-gray-100 dark:border-slate-700">
          <div className="flex items-center gap-3">
            <img src="/logo.png" alt="AdminPanel Logo" className="h-8 w-auto rounded-lg bg-white p-1" />
            <h2 className="text-xl font-black font-heading text-dark dark:text-white tracking-tighter">Admin<span className="text-primary">Panel</span></h2>
          </div>
        </div>
        <nav className="flex-1 p-4 space-y-2">
          <button onClick={() => setActiveTab('dashboard')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition ${activeTab === 'dashboard' ? 'bg-blue-50 dark:bg-slate-700/50 text-secondary dark:text-primary' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-slate-700/30'}`}>
            <i className="fa-solid fa-chart-pie"></i> አጠቃላይ መረጃ (Dashboard)
          </button>
          <button onClick={() => setActiveTab('courses')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition ${activeTab === 'courses' ? 'bg-blue-50 dark:bg-slate-700/50 text-secondary dark:text-primary' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-slate-700/30'}`}>
            <i className="fa-solid fa-layer-group"></i> ኮርሶች (Courses)
          </button>
          <button onClick={() => setActiveTab('students')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition ${activeTab === 'students' ? 'bg-blue-50 dark:bg-slate-700/50 text-secondary dark:text-primary' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-slate-700/30'}`}>
            <i className="fa-solid fa-users"></i> ተማሪዎች (Students)
          </button>
          <button onClick={() => setActiveTab('teachers')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition ${activeTab === 'teachers' ? 'bg-blue-50 dark:bg-slate-700/50 text-secondary dark:text-primary' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-slate-700/30'}`}>
            <i className="fa-solid fa-chalkboard-user"></i> አስተማሪዎች (Teachers)
          </button>
          <button onClick={() => setActiveTab('payments')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition ${activeTab === 'payments' ? 'bg-blue-50 dark:bg-slate-700/50 text-secondary dark:text-primary' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-slate-700/30'}`}>
            <i className="fa-solid fa-file-invoice-dollar"></i> የክፍያ ሪፖርቶች
          </button>
          <button onClick={() => setActiveTab('questions')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition ${activeTab === 'questions' ? 'bg-blue-50 dark:bg-slate-700/50 text-secondary dark:text-primary' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-slate-700/30'}`}>
            <i className="fa-solid fa-circle-question"></i> የተማሪዎች ጥያቄ
          </button>
          <button onClick={() => setActiveTab('settings')} className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl font-bold transition ${activeTab === 'settings' ? 'bg-blue-50 dark:bg-slate-700/50 text-secondary dark:text-primary' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-slate-700/30'}`}>
            <i className="fa-solid fa-gear"></i> ሲስተም ቅንብሮች
          </button>
        </nav>
        <div className="p-4 border-t border-gray-200 dark:border-slate-700 bg-white dark:bg-[#1E293B]">
          <div className="flex items-center gap-3 mb-4 px-2">
            <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold text-sm shrink-0">
              MA
            </div>
            <div>
              <p className="text-sm font-bold text-dark dark:text-white leading-tight">marts</p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <div className="w-2 h-2 rounded-full bg-green-500"></div>
                <p className="text-[10px] text-green-500 font-bold uppercase tracking-wider">Online</p>
              </div>
            </div>
          </div>
          <button onClick={handleLogout} className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-gray-50 dark:bg-[#2A3B52] text-red-600 dark:text-red-400 rounded-xl font-bold hover:bg-red-50 dark:hover:bg-[#334760] transition border border-gray-100 dark:border-slate-600 text-sm">
            <i className="fa-solid fa-arrow-right-from-bracket"></i> መውጫ (Logout)
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        <header className="h-16 bg-white dark:bg-[#1E293B] border-b border-gray-200 dark:border-slate-700 flex items-center justify-between px-8 shrink-0">
          <h1 className="text-xl font-black text-dark dark:text-white">
             {activeTab === 'dashboard' && 'አጠቃላይ መረጃ'}
             {activeTab === 'courses' && 'ኮርሶች ማስተዳደሪያ'}
             {activeTab === 'students' && 'የተማሪዎች አስተዳደር'}
             {activeTab === 'teachers' && 'የአስተማሪዎች ዝርዝር'}
             {activeTab === 'payments' && 'የክፍያ ሪፖርቶች'}
             {activeTab === 'questions' && 'የተማሪዎች ጥያቄ'}
             {activeTab === 'settings' && 'ሲስተም ቅንብሮች'}
          </h1>
          <div className="flex gap-4 items-center">
            <button className="w-9 h-9 rounded-full bg-gray-50 dark:bg-[#2A3B52] flex items-center justify-center text-gray-500 dark:text-gray-400 hover:text-dark dark:hover:text-white transition">
               <i className="fa-solid fa-bell"></i>
            </button>
            <button className="w-9 h-9 rounded-full bg-gray-50 dark:bg-[#2A3B52] flex items-center justify-center text-gray-500 dark:text-gray-400 hover:text-dark dark:hover:text-white transition">
               <i className="fa-solid fa-moon"></i>
            </button>
            <button className="bg-gray-100 dark:bg-[#2A3B52] text-dark dark:text-white px-4 py-1.5 rounded-full text-sm font-bold flex items-center gap-2 ml-2 hover:bg-gray-200 dark:hover:bg-[#334760] transition">
              <i className="fa-solid fa-circle-user text-primary"></i> ማስተካከያ አድርግ
            </button>
            {activeTab === 'courses' && (
              <button onClick={() => openForm()} className="bg-dark dark:bg-primary text-white dark:text-dark px-6 py-2 rounded-xl text-sm font-bold hover:bg-secondary dark:hover:bg-yellow-400 transition shadow-sm flex items-center gap-2 ml-2">
                <i className="fa-solid fa-plus"></i> አዲስ ኮርስ ጨምር
              </button>
            )}
          </div>
        </header>

        <div className="flex-1 overflow-auto p-8">
          {activeTab === 'dashboard' && (
             <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
               <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 border border-gray-100 dark:border-slate-700 shadow-sm flex items-center gap-4">
                 <div className="w-14 h-14 rounded-2xl bg-blue-50 dark:bg-slate-700 flex items-center justify-center text-secondary dark:text-primary text-2xl">
                   <i className="fa-solid fa-video"></i>
                 </div>
                 <div>
                   <p className="text-gray-500 dark:text-gray-400 text-sm font-bold">ኮርሶች</p>
                   <h3 className="text-3xl font-black text-dark dark:text-white">{courses.length}</h3>
                 </div>
               </div>
               <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 border border-gray-100 dark:border-slate-700 shadow-sm flex items-center gap-4">
                 <div className="w-14 h-14 rounded-2xl bg-orange-50 dark:bg-slate-700 flex items-center justify-center text-orange-500 text-2xl">
                   <i className="fa-solid fa-users"></i>
                 </div>
                 <div>
                   <p className="text-gray-500 dark:text-gray-400 text-sm font-bold">ተማሪዎች</p>
                   <h3 className="text-3xl font-black text-dark dark:text-white">4</h3>
                 </div>
               </div>
               <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 border border-gray-100 dark:border-slate-700 shadow-sm flex items-center gap-4">
                 <div className="w-14 h-14 rounded-2xl bg-green-50 dark:bg-slate-700 flex items-center justify-center text-success text-2xl">
                   <i className="fa-solid fa-money-bill-wave"></i>
                 </div>
                 <div>
                   <p className="text-gray-500 dark:text-gray-400 text-sm font-bold">ጠቅላላ ገቢ</p>
                   <h3 className="text-3xl font-black text-dark dark:text-white">0 <span className="text-sm">ብር</span></h3>
                 </div>
               </div>
               <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 border border-gray-100 dark:border-slate-700 shadow-sm flex items-center gap-4">
                 <div className="w-14 h-14 rounded-2xl bg-purple-50 dark:bg-slate-700 flex items-center justify-center text-purple-500 text-2xl">
                   <i className="fa-solid fa-server"></i>
                 </div>
                 <div>
                   <p className="text-gray-500 dark:text-gray-400 text-sm font-bold">የስርዓት ሁኔታ</p>
                   <h3 className="text-2xl font-black text-success">Online</h3>
                 </div>
               </div>
             </div>
          )}

          {activeTab === 'courses' && (
          <div className="bg-white dark:bg-slate-800 rounded-3xl border border-gray-100 dark:border-slate-700 shadow-sm overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 dark:bg-slate-900 border-b border-gray-100 dark:border-slate-700">
                  <th className="p-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">ኮርስ</th>
                  <th className="p-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">ዋጋ</th>
                  <th className="p-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">ሁኔታ</th>
                  <th className="p-4 text-right text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">እርምጃ</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={4} className="p-8 text-center text-gray-500"><i className="fa-solid fa-spinner fa-spin mr-2"></i> በመጫን ላይ...</td></tr>
                ) : courses.length === 0 ? (
                  <tr><td colSpan={4} className="p-8 text-center text-gray-500">ምንም ኮርስ የለም</td></tr>
                ) : (
                  courses.map(course => (
                    <tr key={course.id} className="border-b border-gray-50 dark:border-slate-700/50 hover:bg-gray-50 dark:hover:bg-slate-700/20 transition group">
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <img src={course.image || 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?q=80&w=1000'} className="w-12 h-12 rounded-lg object-cover" />
                          <div>
                            <p className="font-bold text-dark dark:text-white">{course.title}</p>
                            <p className="text-xs text-gray-500">{course.category}</p>
                          </div>
                        </div>
                      </td>
                      <td className="p-4 font-bold text-dark dark:text-white">
                        {course.isFree ? <span className="text-success">ነፃ</span> : `${Number(course.price).toLocaleString()} ብር`}
                      </td>
                      <td className="p-4">
                        {course.isPopular && <span className="bg-primary/20 text-primary px-2 py-1 rounded text-xs font-bold">Best Seller</span>}
                      </td>
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button onClick={() => openForm(course)} className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-slate-700 text-secondary dark:text-blue-400 hover:bg-secondary hover:text-white transition flex items-center justify-center" title="ኮርሱን አስተካክል (Edit Course)">
                            <i className="fa-solid fa-pen"></i>
                          </button>
                          <button onClick={() => handleDelete(course.id)} className="w-8 h-8 rounded-lg bg-red-50 dark:bg-red-500/10 text-danger hover:bg-danger hover:text-white transition flex items-center justify-center" title="ኮርሱን አጥፋ (Delete Course)">
                            <i className="fa-solid fa-trash"></i>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          )}

          {activeTab === 'students' && (
            <div className="bg-white dark:bg-slate-800 rounded-3xl border border-gray-100 dark:border-slate-700 shadow-sm overflow-hidden">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-50 dark:bg-slate-900 border-b border-gray-100 dark:border-slate-700">
                      <th className="p-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">ስም</th>
                      <th className="p-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">ኢሜይል</th>
                      <th className="p-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">ሁኔታ</th>
                      <th className="p-4 text-right text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">እርምጃ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {students.length === 0 ? (
                      <tr><td colSpan={4} className="p-8 text-center text-gray-500">ምንም ተማሪ የለም</td></tr>
                    ) : (
                      students.map(student => (
                        <tr key={student.id} className="border-b border-gray-50 dark:border-slate-700/50 hover:bg-gray-50 dark:hover:bg-slate-700/20 transition group">
                          <td className="p-4 font-bold text-dark dark:text-white">{student.name || 'Unknown'}</td>
                          <td className="p-4 text-sm text-gray-500">{student.email}</td>
                          <td className="p-4"><span className="bg-green-50 text-success px-3 py-1 rounded-full text-xs font-bold">Active</span></td>
                          <td className="p-4 text-right space-x-2">
                             <a href={`mailto:${student.email}`} className="text-sm bg-blue-50 dark:bg-slate-700 text-secondary dark:text-primary px-3 py-1.5 rounded-lg font-bold hover:bg-secondary hover:text-white transition">መልዕክት ላክ</a>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
            </div>
          )}

          {activeTab === 'teachers' && (
            <div className="bg-white dark:bg-slate-800 rounded-3xl border border-gray-100 dark:border-slate-700 shadow-sm overflow-hidden">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-50 dark:bg-slate-900 border-b border-gray-100 dark:border-slate-700">
                      <th className="p-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">አስተማሪ</th>
                      <th className="p-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">ስፔሻሊቲ</th>
                      <th className="p-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">ኮርሶች ብዛት</th>
                      <th className="p-4 text-right text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">እርምጃ</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-gray-50 dark:border-slate-700/50 hover:bg-gray-50 dark:hover:bg-slate-700/20 transition">
                      <td className="p-4 font-bold text-dark dark:text-white flex items-center gap-3">
                         <div className="w-10 h-10 rounded-full bg-gray-200"></div>
                         Eyoub Sahle
                      </td>
                      <td className="p-4 text-sm text-gray-500">Digital Marketing</td>
                      <td className="p-4 text-sm text-gray-500">3</td>
                      <td className="p-4 text-right space-x-2">
                         <button className="text-sm bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-300 px-3 py-1.5 rounded-lg font-bold">አስተካክል</button>
                      </td>
                    </tr>
                  </tbody>
                </table>
            </div>
          )}

          {activeTab === 'payments' && (
            <div className="bg-white dark:bg-slate-800 rounded-3xl border border-gray-100 dark:border-slate-700 shadow-sm overflow-hidden">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-50 dark:bg-slate-900 border-b border-gray-100 dark:border-slate-700">
                      <th className="p-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">ተማሪ</th>
                      <th className="p-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">ኮርስ</th>
                      <th className="p-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">የክፍያ መጠን</th>
                      <th className="p-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">ዘዴ</th>
                      <th className="p-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">ሁኔታ</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr><td colSpan={5} className="p-8 text-center text-gray-500">ምንም ክፍያ የለም</td></tr>
                  </tbody>
                </table>
            </div>
          )}

          {activeTab === 'questions' && (
            <div className="bg-white dark:bg-slate-800 rounded-3xl p-8 border border-gray-100 dark:border-slate-700 text-center text-gray-500 shadow-sm">
                <i className="fa-solid fa-circle-question text-4xl mb-4 opacity-50"></i>
                <h3 className="text-xl font-bold">የተማሪዎች ጥያቄ</h3>
                <p>በቅርቡ የተማሪዎች ጥያቄዎች እዚህ ጋር ይታያሉ።</p>
            </div>
          )}

          {activeTab === 'settings' && (
            <div className="bg-white dark:bg-slate-800 rounded-3xl p-8 border border-gray-100 dark:border-slate-700 shadow-sm max-w-2xl mx-auto">
                <h3 className="text-xl font-bold mb-6 border-b border-gray-100 dark:border-slate-700 pb-4">ሲስተም ቅንብሮች (Settings)</h3>
                <div className="space-y-4">
                   <div>
                       <label className="block text-sm font-bold mb-2">የአድሚን ስም</label>
                       <input type="text" className="w-full bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl px-4 py-3" defaultValue="Admin User" />
                   </div>
                   <div>
                       <label className="block text-sm font-bold mb-2">የቴሌግራም ቻናል ሊንክ (Support Link)</label>
                       <input type="text" className="w-full bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl px-4 py-3" defaultValue="https://t.me/tsehaycampus" />
                   </div>
                   <button className="w-full bg-dark dark:bg-primary text-white dark:text-dark font-bold py-3 rounded-xl mt-4">አዘምን (Save Settings)</button>
                </div>
            </div>
          )}
        </div>
      </main>

      {/* Add/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-start justify-center p-4 sm:p-6 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white dark:bg-slate-800 w-full max-w-2xl flex flex-col rounded-3xl shadow-2xl overflow-hidden animate-[modalPop_0.3s_ease-out_forwards] mt-10 mb-20 shrink-0">
            <div className="p-6 border-b border-gray-100 dark:border-slate-700 flex justify-between items-center shrink-0 bg-gray-50 dark:bg-slate-900/50">
              <h2 className="font-black text-xl text-dark dark:text-white">
                {editingCourse ? 'ኮርስ አስተካክል' : 'አዲስ ኮርስ ጨምር'}
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-danger p-2 transition"><i className="fa-solid fa-xmark text-2xl"></i></button>
            </div>
            
            <form onSubmit={handleSaveCourse} className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div className="md:col-span-2">
                  <h3 className="font-bold text-lg border-b border-gray-100 dark:border-slate-700 pb-2 mb-4 text-primary">መሰረታዊ መረጃ</h3>
                </div>
                
                <div>
                  <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">የኮርሱ ርዕስ (Title) *</label>
                  <input required type="text" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} className="w-full bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl px-4 py-3 text-dark dark:text-white outline-none focus:border-primary transition" />
                </div>
                
                <div>
                  <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">የኮርሱ ዘርፍ (Category) *</label>
                  <input required type="text" value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} className="w-full bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl px-4 py-3 text-dark dark:text-white outline-none focus:border-primary transition" />
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">የአሰልጣኝ ስም (Instructor) *</label>
                  <input required type="text" value={formData.instructor} onChange={e => setFormData({...formData, instructor: e.target.value})} className="w-full bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl px-4 py-3 text-dark dark:text-white outline-none focus:border-primary transition" />
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">የአሰልጣኝ ፎቶ (Instructor Image URL)</label>
                  <input type="text" value={formData.instructorImage} onChange={e => setFormData({...formData, instructorImage: e.target.value})} className="w-full bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl px-4 py-3 text-dark dark:text-white outline-none focus:border-primary transition" />
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">ዋጋ በብር (Price) *</label>
                  <input required type="number" value={formData.price} onChange={e => setFormData({...formData, price: e.target.value})} className="w-full bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl px-4 py-3 text-dark dark:text-white outline-none focus:border-primary transition" />
                  <p className="text-xs text-gray-500 mt-1">ነፃ ኮርስ ከሆነ 0 ብለው ይፃፉ።</p>
                </div>
                
                <div>
                  <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">የድሮ ዋጋ (Old Price)</label>
                  <input type="number" value={formData.oldPrice} onChange={e => setFormData({...formData, oldPrice: e.target.value})} className="w-full bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl px-4 py-3 text-dark dark:text-white outline-none focus:border-primary transition" />
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">ሁኔታ (Status) *</label>
                  <select required value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})} className="w-full bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl px-4 py-3 text-dark dark:text-white outline-none focus:border-primary transition">
                      <option value="Active">🟢 Active (ይፋዊ)</option>
                      <option value="Inactive">🔴 Inactive (ድብቅ)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">የኮርሱ ቆይታ (Duration) *</label>
                  <input required type="text" placeholder="00:50:00" value={formData.duration} onChange={e => setFormData({...formData, duration: e.target.value})} className="w-full bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl px-4 py-3 text-dark dark:text-white outline-none focus:border-primary transition" />
                </div>
                
                <div>
                  <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">የኮርሱ ደረጃ (Level) *</label>
                  <select required value={formData.level} onChange={e => setFormData({...formData, level: e.target.value})} className="w-full bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl px-4 py-3 text-dark dark:text-white outline-none focus:border-primary transition">
                      <option value="ጀማሪ (Beginner)">ጀማሪ (Beginner)</option>
                      <option value="መካከለኛ (Intermediate)">መካከለኛ (Intermediate)</option>
                      <option value="ከፍተኛ (Advanced)">ከፍተኛ (Advanced)</option>
                  </select>
                </div>
                
                <div className="flex flex-col justify-center gap-4">
                  <label className="flex items-center gap-3 cursor-pointer h-full">
                    <input type="checkbox" checked={formData.isPopular} onChange={e => setFormData({...formData, isPopular: e.target.checked})} className="w-5 h-5 accent-primary" />
                    <span className="font-bold text-dark dark:text-white">Best Seller ምልክት ይኑረው?</span>
                  </label>
                </div>

                <div className="md:col-span-2 mt-4">
                  <h3 className="font-bold text-lg border-b border-gray-100 dark:border-slate-700 pb-2 mb-4 text-primary">ሚዲያ ፋይሎች</h3>
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">የሽፋን ፎቶ (Cover Image URL) *</label>
                  <input required type="text" value={formData.image} onChange={e => setFormData({...formData, image: e.target.value})} className="w-full bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl px-4 py-3 text-dark dark:text-white outline-none focus:border-primary transition" />
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">የዋና ቪዲዮ ሊንክ (Video URL) *</label>
                  <input required type="text" value={formData.videoUrl} onChange={e => setFormData({...formData, videoUrl: e.target.value})} className="w-full bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl px-4 py-3 text-dark dark:text-white outline-none focus:border-primary transition" />
                </div>

                <div className="md:col-span-2 mt-4">
                  <h3 className="font-bold text-lg border-b border-gray-100 dark:border-slate-700 pb-2 mb-4 text-primary">ማብራሪያ እና የ AI ትዕዛዝ</h3>
                </div>
                
                <div className="md:col-span-2">
                  <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">ስለ ኮርሱ አጭር ማብራሪያ (Description) *</label>
                  <textarea required rows={4} value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="w-full bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl px-4 py-3 text-dark dark:text-white outline-none focus:border-primary transition"></textarea>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">የ AI መመሪያ (System Prompt) *</label>
                  <textarea required rows={6} value={formData.aiPrompt} onChange={e => setFormData({...formData, aiPrompt: e.target.value})} className="w-full bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl px-4 py-3 text-dark dark:text-white outline-none focus:border-primary transition" placeholder="You are Tsehay AI..."></textarea>
                </div>
              </div>

                <div className="mt-8 border-t border-gray-200 dark:border-slate-700 pt-6">
                  <h3 className="font-bold text-xl mb-4 text-dark dark:text-white">የኮርስ ክፍሎች (Modules & Lessons)</h3>
                  
                  <div className="space-y-4 mb-6">
                    {courseModules.map((mod, idx) => (
                      <div key={mod.id} className="border border-gray-200 dark:border-slate-700 rounded-xl p-4 bg-gray-50 dark:bg-slate-900/50">
                        <div className="flex justify-between items-center mb-3">
                          <h4 className="font-bold text-lg text-primary">ክፍል {mod.order}: {mod.title}</h4>
                          <div className="flex gap-2">
                            <button type="button" onClick={() => setActiveModuleId(mod.id)} className="text-xs bg-blue-100 text-blue-600 px-3 py-1.5 rounded-lg font-bold hover:bg-blue-200 transition">ትምህርት ጨምር (Add Lesson)</button>
                            <button type="button" onClick={() => handleDeleteModule(mod.id)} className="text-xs bg-red-100 text-red-600 px-3 py-1.5 rounded-lg font-bold hover:bg-red-200 transition">አጥፋ (Delete)</button>
                          </div>
                        </div>

                        {activeModuleId === mod.id && (
                          <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-blue-100 dark:border-slate-600 mb-4 shadow-sm">
                            <h5 className="text-sm font-bold mb-3">አዲስ ትምህርት ወደ "{mod.title}"</h5>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                              <input placeholder="የርዕስ ስም (Title)" value={lessonForm.title} onChange={e => setLessonForm({...lessonForm, title: e.target.value})} className="border rounded-lg px-3 py-2 text-sm bg-gray-50 dark:bg-slate-900" />
                              <input placeholder="የቪዲዮ ርዝመት (00:00)" value={lessonForm.duration} onChange={e => setLessonForm({...lessonForm, duration: e.target.value})} className="border rounded-lg px-3 py-2 text-sm bg-gray-50 dark:bg-slate-900" />
                              <input placeholder="የቪዲዮ ሊንክ (Video URL)" value={lessonForm.videoUrl} onChange={e => setLessonForm({...lessonForm, videoUrl: e.target.value})} className="border rounded-lg px-3 py-2 text-sm bg-gray-50 dark:bg-slate-900" />
                              <input type="number" placeholder="ነጥብ (Points)" value={lessonForm.points} onChange={e => setLessonForm({...lessonForm, points: Number(e.target.value)})} className="border rounded-lg px-3 py-2 text-sm bg-gray-50 dark:bg-slate-900" />
                            </div>
                            <div className="flex gap-2">
                              <button type="button" onClick={handleAddLesson} className="bg-primary text-dark px-4 py-1.5 rounded-lg text-sm font-bold hover:bg-yellow-400">ሴቭ አድርግ</button>
                              <button type="button" onClick={() => setActiveModuleId(null)} className="bg-gray-200 text-dark px-4 py-1.5 rounded-lg text-sm font-bold hover:bg-gray-300">ሰርዝ</button>
                            </div>
                          </div>
                        )}

                        <div className="space-y-2">
                          {(mod.lessons || []).map((lesson: any, lidx: number) => (
                            <div key={lidx} className="flex justify-between items-center bg-white dark:bg-slate-800 p-3 rounded-lg border border-gray-100 dark:border-slate-700">
                              <div>
                                <p className="font-bold text-sm text-dark dark:text-white">{lesson.title}</p>
                                <p className="text-xs text-gray-500 mt-1"><i className="fa-solid fa-video mr-1"></i> {lesson.duration} | <span className="text-primary">+{lesson.points || 100} ነጥብ</span></p>
                              </div>
                              <button type="button" onClick={() => handleDeleteLesson(mod.id, lidx)} className="text-danger hover:text-red-700"><i className="fa-solid fa-trash text-sm"></i></button>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="flex gap-3 items-center bg-gray-50 dark:bg-slate-900 p-4 rounded-xl border border-gray-200 dark:border-slate-700">
                    <input 
                      type="text" 
                      placeholder="አዲስ ሞጁል ርዕስ ይፃፉ..." 
                      value={newModuleTitle} 
                      onChange={e => setNewModuleTitle(e.target.value)} 
                      className="flex-1 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-600 rounded-lg px-4 py-2 outline-none focus:border-primary"
                    />
                    <button type="button" onClick={handleAddModule} disabled={!newModuleTitle.trim()} className="bg-dark dark:bg-white text-white dark:text-dark px-4 py-2 rounded-lg font-bold disabled:opacity-50 hover:bg-gray-800 dark:hover:bg-gray-200 transition whitespace-nowrap">
                      ሞጁል ጨምር
                    </button>
                  </div>
                </div>

              <div className="mt-8 flex gap-4 pt-4 border-t border-gray-100 dark:border-slate-700">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-300 font-bold py-4 rounded-xl hover:bg-gray-200 dark:hover:bg-slate-600 transition">ሰርዝ (Cancel)</button>
                <button type="submit" className="flex-1 bg-primary text-dark font-black py-4 rounded-xl hover:bg-yellow-400 transition shadow-lg">ኮርሱን ሴቭ አድርግ (Save Course)</button>
              </div>
            </form>
          </div>
        </div>
      )}
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes modalPop {
          0% { opacity: 0; transform: scale(0.95); }
          100% { opacity: 1; transform: scale(1); }
        }
      `}} />
    </div>
  );
}
