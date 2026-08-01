'use client';
import React, { useState, useEffect } from 'react';
import { db, auth } from '@/lib/firebase/config';
import { collection, onSnapshot, doc, setDoc, deleteDoc, serverTimestamp, query, orderBy, collectionGroup } from 'firebase/firestore';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged, updateProfile, sendPasswordResetEmail } from 'firebase/auth';
import { useRouter } from 'next/navigation';

const PRESET_REQUIREMENTS = [
  'መሰረታዊ የኮምፒውተር እውቀት (Basic Computer Skill)',
  'ስማርት ስልክ ወይም ላፕቶፕ (Smartphone or Laptop)',
  'የኢንተርኔት ኮኔክሽን (Internet Connection)',
  'ምንም ቅድመ ተሞክሮ አይጠይቅም (No prior experience needed)',
  'የመማር ፍላጎት እና ትጋት (Desire & Dedication to learn)'
];

const PRESET_INCLUDES = [
  'በቪዲዮ የተደገፈ ትምህርት (On-demand video)',
  'የተግባር አሳይመንቶች እና ፕሮጀክቶች (Assignments & Projects)',
  'በስልክ እና በቲቪ መጠቀም የሚያስችል (Access on mobile and TV)',
  'የኮርስ ማጠናቀቂያ ሰርተፊኬት (Certificate of completion)',
  'የሁልጊዜ መዳረሻ (Full lifetime access)',
  'የሚወርዱ የትምህርት ማቴሪያሎች (Downloadable PDF resources)'
];

export default function AdminDashboard() {
  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [students, setStudents] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [tickets, setTickets] = useState<any[]>([]);
  const router = useRouter();
  
  // Login State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');

  // Settings State
  const [settingsName, setSettingsName] = useState('');
  const [settingsPhotoUrl, setSettingsPhotoUrl] = useState('');
  const [isUpdatingSettings, setIsUpdatingSettings] = useState(false);

  // Course Form State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState<any>(null);
  
  const [formData, setFormData] = useState({
    title: '',
    category: 'General',
    instructor: '',
    instructorImage: '',
    instructorTelegram: '@EyoubSahle',
    price: '',
    oldPrice: '',
    duration: '',
    status: 'Active',
    image: '',
    banner: '',
    video: '',
    pdfUrl: '',
    pdfTitle: '',
    desc: '',
    whatYouWillLearn: '',
    requirements: '',
    requirementsList: [] as string[],
    customRequirement: '',
    includesList: [] as string[],
    instructorBio: '',
    assignmentsInfo: '',
    accessInfo: '',
    certificateInfo: '',
    aiPrompt: '',
    level: 'ጀማሪ (Beginner)',
    isPopular: false
  });

  const [lessons, setLessons] = useState<any[]>([]);
  const [lessonForm, setLessonForm] = useState({ title: '', duration: '', video: '', desc: '', points: 0 });
  const [editingLessonIdx, setEditingLessonIdx] = useState<number | null>(null);


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

    const pq = query(collectionGroup(db, 'purchased_courses'));
    const unsubscribePayments = onSnapshot(pq, (snapshot) => {
      setPayments(snapshot.docs.map(doc => ({ id: doc.id, userId: doc.ref.parent.parent?.id, ...doc.data() })));
    });

    const tq = query(collection(db, 'artifacts', 'tsehaycampus-e1a6d', 'support', 'messages', 'tickets'), orderBy('createdAt', 'desc'));
    const unsubscribeTickets = onSnapshot(tq, (snapshot) => {
      setTickets(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    return () => {
        unsubscribeAuth();
        unsubscribe();
        unsubscribeStudents();
        unsubscribePayments();
        unsubscribeTickets();
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
        setLoginError('የሲስተም ስህተት ተፈጥሯል! እባክዎ በድጋሚ ይሞክሩ።');
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

  const handleUpdateAdminProfile = async () => {
    if (!auth.currentUser) return;
    setIsUpdatingSettings(true);
    try {
      await updateProfile(auth.currentUser, {
        displayName: settingsName || auth.currentUser.displayName,
        photoURL: settingsPhotoUrl || auth.currentUser.photoURL
      });
      alert('የአድሚን መረጃ በተሳካ ሁኔታ ተስተካክሏል! (Profile updated!)');
      window.location.reload();
    } catch (error) {
      console.error("Error updating admin profile", error);
      alert('መረጃውን ማስተካከል አልተቻለም። እባክዎ በድጋሚ ይሞክሩ።');
    } finally {
      setIsUpdatingSettings(false);
    }
  };

  const handleAdminPasswordReset = async () => {
    if (!auth.currentUser?.email) return;
    try {
      await sendPasswordResetEmail(auth, auth.currentUser.email);
      alert('የይለፍ ቃል መቀየሪያ ኢሜል ተልኳል! እባክዎ ኢሜልዎን ይክፈቱ።');
    } catch (error) {
      console.error("Error sending reset email:", error);
      alert('የይለፍ ቃል መቀየሪያ ኢሜል መላክ አልተቻለም። እባክዎ በድጋሚ ይሞክሩ።');
    }
  };

  const formatDriveLink = (url: string) => {
    if (!url) return url;
    const match = url.match(/(?:file\/d\/|id=|thumbnail\?id=|\/d\/)([a-zA-Z0-9_-]{20,})/);
    if (match && match[1]) {
      return `https://lh3.googleusercontent.com/d/${match[1]}`;
    }
    return url;
  };

  const handlePdfFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      setFormData(prev => ({
        ...prev,
        pdfUrl: dataUrl,
        pdfTitle: prev.pdfTitle || file.name
      }));
    };
    reader.readAsDataURL(file);
  };

  const openForm = async (course: any = null) => {
    setEditingLessonIdx(null);
    setLessonForm({ title: '', duration: '', video: '', desc: '', points: 0 });

    if (course) {
      setEditingCourse(course);
      setFormData({ 
        ...course,
        whatYouWillLearn: course.whatYouWillLearn ? (Array.isArray(course.whatYouWillLearn) ? course.whatYouWillLearn.join('\n') : course.whatYouWillLearn) : '',
        requirementsList: Array.isArray(course.requirements) ? course.requirements : [],
        includesList: Array.isArray(course.includes) ? course.includes : [
          'የተግባር አሳይመንቶች እና ፕሮጀክቶች (Assignments & Projects)',
          'በስልክ እና በቲቪ መጠቀም የሚያስችል (Access on mobile and TV)',
          'የኮርስ ማጠናቀቂያ ሰርተፊኬት (Certificate of completion)'
        ],
        customRequirement: ''
      });
      
      // Load lessons from course document
      if (course.lessons && Array.isArray(course.lessons) && course.lessons.length > 0) {
        setLessons(course.lessons);
      } else {
        setLessons([{ title: '', duration: '', video: '', points: 0 }]);
      }
    } else {
      setEditingCourse(null);
      setFormData({ 
        title: '', category: 'General', instructor: '', instructorImage: '', instructorTelegram: '@EyoubSahle', price: '', oldPrice: '', 
        duration: '', status: 'Active', image: '', banner: '', video: '', pdfUrl: '', pdfTitle: '', desc: '', whatYouWillLearn: '', requirements: '', 
        requirementsList: [
          'መሰረታዊ የኮምፒውተር እውቀት (Basic Computer Skill)',
          'ስማርት ስልክ ወይም ላፕቶፕ (Smartphone or Laptop)',
          'የኢንተርኔት ኮኔክሽን (Internet Connection)'
        ],
        includesList: [
          'የተግባር አሳይመንቶች እና ፕሮጀክቶች (Assignments & Projects)',
          'በስልክ እና በቲቪ መጠቀም የሚያስችል (Access on mobile and TV)',
          'የኮርስ ማጠናቀቂያ ሰርተፊኬት (Certificate of completion)'
        ],
        customRequirement: '',
        instructorBio: '', assignmentsInfo: '4 assignments', accessInfo: 'Access on mobile and TV', certificateInfo: 'Certificate of completion', aiPrompt: '', level: 'ጀማሪ (Beginner)', isPopular: false 
      });
      setLessons([{ title: '', duration: '', video: '', desc: '', points: 0 }]);
    }
    setIsModalOpen(true);
  };

  const handleSaveCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const docId = editingCourse ? editingCourse.id : `course_${Date.now()}`;
      const courseRef = doc(db, 'artifacts', 'tsehaycampus-e1a6d', 'public', 'data', 'courses', docId);
      const priceNum = formData.price === "" ? 0 : parseFloat(formData.price.toString());

      const formattedLessons = lessons.map(lesson => ({
        ...lesson,
        video: lesson.video // Video URL is NOT from drive (e.g., mediadelivery)
      }));

      const whatYouWillLearnArray = formData.whatYouWillLearn 
        ? formData.whatYouWillLearn.split('\n').map((item: string) => item.trim()).filter((item: string) => item.length > 0)
        : [];

      let requirementsArray = [...(formData.requirementsList || [])];
      if (formData.customRequirement && formData.customRequirement.trim().length > 0) {
        requirementsArray.push(formData.customRequirement.trim());
      }

      await setDoc(courseRef, {
        ...formData,
        whatYouWillLearn: whatYouWillLearnArray,
        requirements: requirementsArray,
        includes: formData.includesList || [],
        instructorBio: formData.instructorBio || '',
        instructorTelegram: formData.instructorTelegram || '@EyoubSahle',
        assignmentsInfo: formData.assignmentsInfo || '',
        accessInfo: formData.accessInfo || '',
        certificateInfo: formData.certificateInfo || '',
        lessons: formattedLessons,
        image: formatDriveLink(formData.image),
        banner: formatDriveLink(formData.banner),
        video: formData.video, // Main promo video is NOT from drive
        instructorImage: formatDriveLink(formData.instructorImage),
        price: priceNum,
        timestamp: (editingCourse && editingCourse.timestamp) ? editingCourse.timestamp : Date.now()
      }, { merge: true });
      
      setIsModalOpen(false);
    } catch (err: any) {
      console.error(err);
      alert(`Error saving course: ${err.message}`);
    }
  };

  const handleAddOrUpdateLesson = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!lessonForm.title) return;

    if (editingLessonIdx !== null) {
      const updated = [...lessons];
      updated[editingLessonIdx] = { ...lessonForm };
      setLessons(updated);
      setEditingLessonIdx(null);
    } else {
      setLessons([...lessons, lessonForm]);
    }
    setLessonForm({ title: '', duration: '', video: '', desc: '', points: 0 });
  };

  const handleStartEditLesson = (index: number) => {
    const lessonToEdit = lessons[index];
    if (!lessonToEdit) return;
    setLessonForm({
      title: lessonToEdit.title || '',
      duration: lessonToEdit.duration || '',
      video: lessonToEdit.video || '',
      desc: lessonToEdit.desc || '',
      points: lessonToEdit.points || 0
    });
    setEditingLessonIdx(index);
  };

  const handleDeleteLesson = (lessonIdx: number) => {
    if (window.confirm("ትምህርቱን ማጥፋት ይፈልጋሉ? (Delete lesson?)")) {
      setLessons(lessons.filter((_, idx) => idx !== lessonIdx));
    }
  };

  const handleMoveLessonUp = (index: number) => {
    if (index <= 0) return;
    const updated = [...lessons];
    const temp = updated[index];
    updated[index] = updated[index - 1];
    updated[index - 1] = temp;
    setLessons(updated);
  };

  const handleMoveLessonDown = (index: number) => {
    if (index >= lessons.length - 1) return;
    const updated = [...lessons];
    const temp = updated[index];
    updated[index] = updated[index + 1];
    updated[index + 1] = temp;
    setLessons(updated);
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
            <img src="/tc-logo.jpg" alt="Tsehay Campus Logo" className="h-16 w-auto object-contain mb-6 bg-white p-2 rounded-xl" />
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
            <img src="/tc-logo.jpg" alt="AdminPanel Logo" className="h-8 w-auto rounded-lg bg-white p-1 animate-logo-zoom" />
            <h2 className="text-xl font-black font-heading text-dark dark:text-white tracking-tighter select-none">
              <span className="animate-tsehay-float">Admin</span><span className="text-primary animate-campus-float">Panel</span>
            </h2>
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
            <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold text-sm shrink-0 overflow-hidden">
              {auth.currentUser?.photoURL ? (
                <img src={auth.currentUser.photoURL} className="w-full h-full object-cover" />
              ) : (
                (auth.currentUser?.displayName || auth.currentUser?.email || 'Admin').substring(0, 2).toUpperCase()
              )}
            </div>
            <div className="overflow-hidden">
              <p className="text-sm font-bold text-dark dark:text-white leading-tight truncate">{auth.currentUser?.displayName || auth.currentUser?.email?.split('@')[0] || 'Admin'}</p>
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
                      students.map(student => {
                        const studentPayments = payments.filter(p => p.userId === student.id);
                        const isPaid = studentPayments.some(p => p.amount > 0);
                        const isFree = studentPayments.length > 0 && !isPaid;
                        
                        return (
                          <tr key={student.id} className="border-b border-gray-50 dark:border-slate-700/50 hover:bg-gray-50 dark:hover:bg-slate-700/20 transition group">
                            <td className="p-4 font-bold text-dark dark:text-white">
                                {student.name || 'Unknown'}
                                <div className="text-[10px] text-gray-400 font-normal mt-1">Joined: {student.createdAt ? new Date(student.createdAt.toDate()).toLocaleDateString() : 'Unknown'}</div>
                            </td>
                            <td className="p-4 text-sm text-gray-500">{student.email}</td>
                            <td className="p-4">
                                {isPaid ? (
                                    <span className="bg-primary/20 text-primary px-3 py-1 rounded-full text-xs font-bold">Paid</span>
                                ) : isFree ? (
                                    <span className="bg-blue-50 text-secondary px-3 py-1 rounded-full text-xs font-bold">Free</span>
                                ) : (
                                    <span className="bg-gray-100 text-gray-500 px-3 py-1 rounded-full text-xs font-bold">Registered</span>
                                )}
                            </td>
                            <td className="p-4 text-right space-x-2">
                               <a href={`mailto:${student.email}`} className="text-sm bg-blue-50 dark:bg-slate-700 text-secondary dark:text-primary px-3 py-1.5 rounded-lg font-bold hover:bg-secondary hover:text-white transition">መልዕክት ላክ</a>
                            </td>
                          </tr>
                        );
                      })
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
                    {(() => {
                      const uniqueTeachers = Array.from(new Set(courses.map(c => c.instructor))).filter(Boolean).map(instructorName => {
                        const teacherCourses = courses.filter(c => c.instructor === instructorName);
                        return {
                          name: instructorName,
                          image: teacherCourses.find(c => c.instructorImage)?.instructorImage || `https://ui-avatars.com/api/?name=${encodeURIComponent(instructorName)}&background=F9B03C&color=fff`,
                          specialty: teacherCourses[0]?.category || 'General',
                          courseCount: teacherCourses.length
                        };
                      });
                      
                      if (uniqueTeachers.length === 0) {
                        return <tr><td colSpan={4} className="p-8 text-center text-gray-500">ምንም አስተማሪ የለም</td></tr>;
                      }
                      
                      return uniqueTeachers.map((teacher, idx) => (
                        <tr key={idx} className="border-b border-gray-50 dark:border-slate-700/50 hover:bg-gray-50 dark:hover:bg-slate-700/20 transition">
                          <td className="p-4 font-bold text-dark dark:text-white flex items-center gap-3">
                            <img src={teacher.image} onError={(e) => { e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(teacher.name)}&background=F9B03C&color=fff`; }} alt={teacher.name} className="w-10 h-10 rounded-full object-cover border border-gray-200" />
                            {teacher.name}
                          </td>
                          <td className="p-4 text-sm text-gray-500">{teacher.specialty}</td>
                          <td className="p-4 text-sm text-gray-500">{teacher.courseCount}</td>
                          <td className="p-4 text-right space-x-2">
                             <button className="text-sm bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-300 px-3 py-1.5 rounded-lg font-bold hover:bg-gray-200 dark:hover:bg-slate-600 transition">አስተካክል</button>
                          </td>
                        </tr>
                      ));
                    })()}
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
                    {payments.filter(p => Number(p.amount) > 0).length === 0 ? (
                        <tr><td colSpan={5} className="p-8 text-center text-gray-500">ምንም ክፍያ የለም</td></tr>
                    ) : (
                        payments.filter(p => Number(p.amount) > 0).sort((a, b) => b.purchasedAt?.toMillis() - a.purchasedAt?.toMillis()).map(payment => {
                            const student = students.find(s => s.id === payment.userId);
                            const course = courses.find(c => c.id === payment.courseId);
                            return (
                                <tr key={payment.id} className="border-b border-gray-50 dark:border-slate-700/50 hover:bg-gray-50 dark:hover:bg-slate-700/20 transition">
                                    <td className="p-4 font-bold text-dark dark:text-white">
                                        {student?.name || 'Unknown Student'}
                                        <div className="text-xs text-gray-500 font-normal mt-0.5">{student?.email || 'No email'}</div>
                                    </td>
                                    <td className="p-4 text-sm text-gray-700 dark:text-gray-300">{course?.title || payment.courseId}</td>
                                    <td className="p-4 font-bold text-success">{Number(payment.amount).toLocaleString()} ብር</td>
                                    <td className="p-4 text-sm text-gray-500 uppercase">{payment.paymentMethod || 'Chapa'}</td>
                                    <td className="p-4">
                                        <span className="bg-green-50 text-success px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 w-max">
                                            <i className="fa-solid fa-check-circle"></i> Successful
                                        </span>
                                        <div className="text-[10px] text-gray-400 mt-1">{payment.purchasedAt ? new Date(payment.purchasedAt.toDate()).toLocaleString() : ''}</div>
                                    </td>
                                </tr>
                            );
                        })
                    )}
                  </tbody>
                </table>
            </div>
          )}

          {activeTab === 'questions' && (
            <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 border border-gray-100 dark:border-slate-700 shadow-sm min-h-[400px]">
                <h3 className="text-xl font-bold mb-6 border-b border-gray-100 dark:border-slate-700 pb-4 flex items-center gap-2"><i className="fa-solid fa-circle-question text-primary"></i> የተማሪዎች ጥያቄ</h3>
                <div className="space-y-4">
                    {tickets.length === 0 ? (
                        <div className="text-center py-10 text-gray-500">ምንም ጥያቄዎች የሉም (No questions)</div>
                    ) : (
                        tickets.map(ticket => (
                            <div key={ticket.id} className="p-4 border border-gray-100 dark:border-slate-700 rounded-xl bg-gray-50 dark:bg-slate-900/50">
                                <div className="flex justify-between items-start mb-2">
                                    <div>
                                        <h4 className="font-bold text-dark dark:text-white">{ticket.userName} <span className="text-xs text-gray-500 font-normal">({ticket.userEmail})</span></h4>
                                        <p className="text-xs text-primary font-bold">{ticket.courseName}</p>
                                    </div>
                                    <div className="text-[10px] text-gray-400">{ticket.createdAt ? new Date(ticket.createdAt.toDate()).toLocaleString() : ''}</div>
                                </div>
                                <p className="text-sm text-gray-700 dark:text-gray-300 mb-3 bg-white dark:bg-slate-800 p-3 rounded-lg shadow-sm border border-gray-100 dark:border-slate-700">{ticket.message}</p>
                                
                                {ticket.attachment && (
                                    <div className="mb-3">
                                        {ticket.attachment.type === 'image' && (
                                            <img src={ticket.attachment.url} alt={ticket.attachment.name} className="max-w-[280px] max-h-[200px] rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm" />
                                        )}
                                        {ticket.attachment.type === 'document' && (
                                            <a href={ticket.attachment.url} download={ticket.attachment.name} className="inline-flex items-center gap-2 bg-blue-50 dark:bg-slate-800 text-blue-700 dark:text-blue-300 px-3 py-2 rounded-xl border border-blue-200 dark:border-slate-700 text-xs font-bold hover:underline">
                                                <i className="fa-solid fa-file-pdf text-red-500 text-base"></i>
                                                <span>{ticket.attachment.name}</span>
                                            </a>
                                        )}
                                        {ticket.attachment.type === 'audio' && (
                                            <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 inline-flex items-center gap-2">
                                                <i className="fa-solid fa-microphone text-amber-500 text-sm"></i>
                                                <audio controls src={ticket.attachment.url} className="h-8 max-w-[260px]"></audio>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {ticket.replies && ticket.replies.length > 0 && (
                                    <div className="mb-3 pl-4 border-l-2 border-green-500 space-y-2">
                                        {ticket.replies.map((reply: any, i: number) => (
                                            <div key={i} className="text-sm">
                                                <span className="font-bold text-green-600 dark:text-green-400">እርስዎ: </span>
                                                <span className="text-gray-600 dark:text-gray-400">{reply.message}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                                
                                <div className="flex gap-2">
                                    <input type="text" placeholder="ምላሽዎን ይፃፉ (Write a reply)..." id={`reply-${ticket.id}`} className="flex-1 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm outline-none focus:border-primary" />
                                    <button onClick={async () => {
                                        const input = document.getElementById(`reply-${ticket.id}`) as HTMLInputElement;
                                        if(!input.value.trim()) return;
                                        try {
                                            await setDoc(doc(db, 'artifacts', 'tsehaycampus-e1a6d', 'support', 'messages', 'tickets', ticket.id), {
                                                replies: [...(ticket.replies || []), { message: input.value, createdAt: new Date() }],
                                                status: 'replied'
                                            }, { merge: true });
                                            input.value = '';
                                        } catch (e) {
                                            console.error(e);
                                        }
                                    }} className="bg-primary text-dark px-4 py-2 rounded-lg text-sm font-bold hover:bg-yellow-400 transition">ላክ</button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
          )}

          {activeTab === 'settings' && (
            <div className="bg-white dark:bg-slate-800 rounded-3xl p-8 border border-gray-100 dark:border-slate-700 shadow-sm max-w-2xl mx-auto">
                <h3 className="text-xl font-bold mb-6 border-b border-gray-100 dark:border-slate-700 pb-4">ሲስተም ቅንብሮች (Settings)</h3>
                <div className="space-y-4">
                   <div>
                       <label className="block text-sm font-bold mb-2">የአድሚን ስም</label>
                       <input 
                         type="text" 
                         className="w-full bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl px-4 py-3 outline-none focus:border-primary" 
                         defaultValue={auth.currentUser?.displayName || 'Admin'} 
                         onChange={(e) => setSettingsName(e.target.value)}
                       />
                   </div>
                   <div>
                       <label className="block text-sm font-bold mb-2">የአድሚን ፎቶ (Image URL)</label>
                       <input 
                         type="text" 
                         className="w-full bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl px-4 py-3 outline-none focus:border-primary" 
                         defaultValue={auth.currentUser?.photoURL || ''}
                         placeholder="https://..."
                         onChange={(e) => setSettingsPhotoUrl(e.target.value)}
                       />
                   </div>
                   <div>
                       <label className="block text-sm font-bold mb-2">የቴሌግራም ቻናል ሊንክ (Support Link)</label>
                       <input type="text" className="w-full bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl px-4 py-3 outline-none focus:border-primary" defaultValue="https://t.me/tsehaycampus" />
                   </div>
                   <div className="pt-4 flex flex-col gap-3">
                     <button onClick={handleUpdateAdminProfile} disabled={isUpdatingSettings} className="w-full bg-dark dark:bg-primary text-white dark:text-dark font-bold py-3 rounded-xl hover:opacity-90 transition">
                       {isUpdatingSettings ? 'እያስተካከለ ነው...' : 'አዘምን (Save Settings)'}
                     </button>
                     <button onClick={handleAdminPasswordReset} className="w-full bg-gray-200 dark:bg-slate-700 text-dark dark:text-white font-bold py-3 rounded-xl hover:bg-gray-300 dark:hover:bg-slate-600 transition">
                       የይለፍ ቃል ቀይር (Reset Password)
                     </button>
                   </div>
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
                  <select required value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} className="w-full bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl px-4 py-3 text-dark dark:text-white outline-none focus:border-primary transition">
                    <option value="General">General</option>
                    <option value="Ecommerce">Ecommerce</option>
                    <option value="Marketing">Marketing</option>
                    <option value="Crypto">Crypto</option>
                    <option value="Tech">Tech</option>
                    <option value="Free">Free</option>
                  </select>
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
                  <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">የአሰልጣኝ ቴሌግራም ዩዘርኔም (Telegram Username)</label>
                  <input type="text" value={formData.instructorTelegram || ''} onChange={e => setFormData({...formData, instructorTelegram: e.target.value})} placeholder="@EyoubSahle" className="w-full bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl px-4 py-3 text-dark dark:text-white outline-none focus:border-primary transition" />
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
                
                <div className="flex items-center gap-3 mt-8">
                  <input type="checkbox" id="isPopular" checked={formData.isPopular} onChange={e => setFormData({...formData, isPopular: e.target.checked})} className="w-5 h-5 rounded border-gray-300 text-primary focus:ring-primary" />
                  <label htmlFor="isPopular" className="text-sm font-bold text-gray-700 dark:text-gray-300">Best Seller ምልክት ይኑረው?</label>
                </div>
                
                <div className="md:col-span-2 mt-4">
                  <h3 className="font-bold text-lg border-b border-gray-100 dark:border-slate-700 pb-2 mb-4 text-primary">ሚዲያ ፋይሎች</h3>
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">የሽፋን ፎቶ (Cover Image URL) *</label>
                  <input required type="text" value={formData.image} onChange={e => setFormData({...formData, image: e.target.value})} className="w-full bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl px-4 py-3 text-dark dark:text-white outline-none focus:border-primary transition" />
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">የጀርባ ፎቶ (Background Banner URL)</label>
                  <input type="text" value={formData.banner || ''} onChange={e => setFormData({...formData, banner: e.target.value})} className="w-full bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl px-4 py-3 text-dark dark:text-white outline-none focus:border-primary transition" placeholder="Optional" />
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">የፕሪቪው ቪዲዮ ሊንክ (Preview Video URL) *</label>
                  <input required type="text" value={formData.video} onChange={e => setFormData({...formData, video: e.target.value})} className="w-full bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl px-4 py-3 text-dark dark:text-white outline-none focus:border-primary transition" />
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">የኮርስ ማቴሪያል PDF (Upload File / Enter URL)</label>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <label className="bg-primary/20 hover:bg-primary text-dark dark:text-primary hover:text-dark px-4 py-2.5 rounded-xl border border-primary/40 font-bold text-xs cursor-pointer transition flex items-center gap-2 shrink-0">
                        <i className="fa-solid fa-file-arrow-up text-sm"></i>
                        <span>PDF ፋይል ከስልክ/ኮምፒውተር ምረጥ (Upload PDF)</span>
                        <input type="file" accept=".pdf" onChange={handlePdfFileUpload} className="hidden" />
                      </label>
                      {formData.pdfUrl && formData.pdfUrl.startsWith('data:') && (
                        <span className="text-xs text-emerald-600 dark:text-emerald-400 font-bold">✓ ፋይል ተመርጧል!</span>
                      )}
                    </div>
                    <input type="text" value={formData.pdfUrl || ''} onChange={e => setFormData({...formData, pdfUrl: e.target.value})} className="w-full bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl px-4 py-3 text-dark dark:text-white outline-none focus:border-primary transition text-xs" placeholder="ወይም የ Google Drive PDF ሊንክ ያስገቡ (e.g. drive.google.com/...)" />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">የማቴሪያሉ ስም (PDF Title / Name)</label>
                  <input type="text" value={formData.pdfTitle || ''} onChange={e => setFormData({...formData, pdfTitle: e.target.value})} className="w-full bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl px-4 py-3 text-dark dark:text-white outline-none focus:border-primary transition" placeholder="ለምሳሌ፦ የኮርስ ማንዋል / Course Syllabus" />
                </div>

                <div className="md:col-span-2 mt-4">
                  <h3 className="font-bold text-lg border-b border-gray-100 dark:border-slate-700 pb-2 mb-4 text-primary">ማብራሪያ እና የ AI ትዕዛዝ</h3>
                </div>
                
                <div className="md:col-span-2">
                  <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">ስለ ኮርሱ አጭር ማብራሪያ (Description) *</label>
                  <textarea required rows={4} value={formData.desc} onChange={e => setFormData({...formData, desc: e.target.value})} className="w-full bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl px-4 py-3 text-dark dark:text-white outline-none focus:border-primary transition"></textarea>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">ምን ይማራሉ? (What you will learn)</label>
                  <p className="text-xs text-gray-500 mb-2">እያንዳንዱን ነጥብ በአዲስ መስመር (Enter እየነኩ) ይጻፉ።</p>
                  <textarea rows={5} value={formData.whatYouWillLearn || ''} onChange={e => setFormData({...formData, whatYouWillLearn: e.target.value})} className="w-full bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl px-4 py-3 text-dark dark:text-white outline-none focus:border-primary transition" placeholder="ዲጂታል ማርኬቲንግ ምን እንደሆነ ይረዱበታል...&#10;የሶሻል ሚዲያ ማስታወቂያዎችን መስራት..."></textarea>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">የኮርስ ቅደመ-ሁኔታዎች (Requirements)</label>
                  <p className="text-xs text-gray-500 mb-3">የሚፈልጉትን ቅድመ-ሁኔታዎች በምልክት (☑️) ይምረጡ፦</p>
                  <div className="space-y-2 mb-3 bg-gray-50 dark:bg-slate-900 p-4 rounded-xl border border-gray-200 dark:border-slate-700">
                    {PRESET_REQUIREMENTS.map((req, idx) => {
                      const isChecked = formData.requirementsList?.includes(req);
                      return (
                        <label key={idx} className="flex items-center gap-3 text-sm text-gray-700 dark:text-gray-300 cursor-pointer font-medium hover:text-primary transition">
                          <input 
                            type="checkbox" 
                            checked={!!isChecked} 
                            onChange={(e) => {
                              if (e.target.checked) {
                                setFormData({...formData, requirementsList: [...(formData.requirementsList || []), req]});
                              } else {
                                setFormData({...formData, requirementsList: (formData.requirementsList || []).filter(r => r !== req)});
                              }
                            }} 
                            className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary" 
                          />
                          <span>{req}</span>
                        </label>
                      );
                    })}
                  </div>
                  <input 
                    type="text" 
                    placeholder="ሌላ ተጨማሪ ቅድመ-ሁኔታ ካለ እዚህ ይጻፉ (Optional custom requirement)" 
                    value={formData.customRequirement || ''} 
                    onChange={e => setFormData({...formData, customRequirement: e.target.value})} 
                    className="w-full bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl px-4 py-3 text-dark dark:text-white outline-none focus:border-primary transition text-sm" 
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">የአሰልጣኙ ማብራሪያ / ባዮግራፊ (Instructor Bio)</label>
                  <textarea rows={4} value={formData.instructorBio || ''} onChange={e => setFormData({...formData, instructorBio: e.target.value})} className="w-full bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl px-4 py-3 text-dark dark:text-white outline-none focus:border-primary transition" placeholder="ስለ አሰልጣኙ አጭር ማብራሪያ ይጻፉ..."></textarea>
                </div>

                <div className="md:col-span-2 mt-4">
                  <h3 className="font-bold text-lg border-b border-gray-100 dark:border-slate-700 pb-2 mb-4 text-primary">የኮርስ ካርድ መረጃዎች (This Course Includes)</h3>
                  <p className="text-xs text-gray-500 mb-3">በኮርሱ ካርድ ላይ የሚካተቱትን መረጃዎች በምልክት (☑️) ይምረጡ፦</p>
                  <div className="space-y-2 bg-gray-50 dark:bg-slate-900 p-4 rounded-xl border border-gray-200 dark:border-slate-700">
                    {PRESET_INCLUDES.map((inc, idx) => {
                      const isChecked = formData.includesList?.includes(inc);
                      return (
                        <label key={idx} className="flex items-center gap-3 text-sm text-gray-700 dark:text-gray-300 cursor-pointer font-medium hover:text-primary transition">
                          <input 
                            type="checkbox" 
                            checked={!!isChecked} 
                            onChange={(e) => {
                              if (e.target.checked) {
                                setFormData({...formData, includesList: [...(formData.includesList || []), inc]});
                              } else {
                                setFormData({...formData, includesList: (formData.includesList || []).filter(i => i !== inc)});
                              }
                            }} 
                            className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary" 
                          />
                          <span>{inc}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">የ AI መመሪያ (System Prompt) *</label>
                  <textarea required rows={6} value={formData.aiPrompt} onChange={e => setFormData({...formData, aiPrompt: e.target.value})} className="w-full bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl px-4 py-3 text-dark dark:text-white outline-none focus:border-primary transition" placeholder="You are Tsehay AI..."></textarea>
                </div>
              </div>

                <div className="mt-8 border-t border-gray-200 dark:border-slate-700 pt-6">
                  <h3 className="font-bold text-xl mb-4 text-dark dark:text-white">የኮርስ ክፍሎች (Modules & Lessons)</h3>
                  
                  <div className="space-y-4 mb-6">
                    <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-blue-100 dark:border-slate-600 mb-4 shadow-sm">
                      <h5 className="text-sm font-bold mb-3 text-primary flex items-center justify-between">
                        <span>{editingLessonIdx !== null ? `ትምህርቱን አስተካክል #${editingLessonIdx + 1} (Edit Lesson)` : 'አዲስ ትምህርት ጨምር (Add Lesson)'}</span>
                        {editingLessonIdx !== null && (
                          <span className="text-xs bg-amber-100 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 px-2 py-0.5 rounded-md font-extrabold">Editing Mode</span>
                        )}
                      </h5>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                        <input placeholder="የርዕስ ስም (Title)" value={lessonForm.title} onChange={e => setLessonForm({...lessonForm, title: e.target.value})} className="border rounded-lg px-3 py-2 text-sm bg-gray-50 dark:bg-slate-900" />
                        <input placeholder="የቪዲዮ ርዝመት (00:00)" value={lessonForm.duration} onChange={e => setLessonForm({...lessonForm, duration: e.target.value})} className="border rounded-lg px-3 py-2 text-sm bg-gray-50 dark:bg-slate-900" />
                        <input placeholder="የቪዲዮ ሊንክ (Video URL)" value={lessonForm.video} onChange={e => setLessonForm({...lessonForm, video: e.target.value})} className="border rounded-lg px-3 py-2 text-sm bg-gray-50 dark:bg-slate-900" />
                        <input type="number" placeholder="ነጥብ (Points)" value={lessonForm.points || ''} onChange={e => setLessonForm({...lessonForm, points: Number(e.target.value)})} className="border rounded-lg px-3 py-2 text-sm bg-gray-50 dark:bg-slate-900" />
                        <input placeholder="የቪዲዮ ማብራሪያ (Description)" value={lessonForm.desc} onChange={e => setLessonForm({...lessonForm, desc: e.target.value})} className="border rounded-lg px-3 py-2 text-sm bg-gray-50 dark:bg-slate-900 sm:col-span-2" />
                      </div>
                      <p className="text-xs text-gray-500 mb-2 mt-2">መረጃውን ሞልተው ሲጨርሱ ከታች ያለውን አዝራር ተጭነው አስቀምጡ።</p>
                      <div className="flex gap-2 mt-2">
                        <button type="button" onClick={handleAddOrUpdateLesson} disabled={!lessonForm.title} className="bg-primary text-dark px-4 py-2 rounded-lg text-sm font-black hover:bg-yellow-400 disabled:opacity-50 flex items-center gap-1.5 cursor-pointer">
                          <i className={`fa-solid ${editingLessonIdx !== null ? 'fa-check' : 'fa-plus'}`}></i>
                          <span>{editingLessonIdx !== null ? 'ለወጡን አስቀምጥ (Save Edits)' : 'ወደ ክፍሎች ዝርዝር ጨምር (Add to List)'}</span>
                        </button>
                        {editingLessonIdx !== null && (
                          <button type="button" onClick={() => { setEditingLessonIdx(null); setLessonForm({ title: '', duration: '', video: '', desc: '', points: 0 }); }} className="bg-gray-200 dark:bg-slate-700 text-gray-700 dark:text-gray-300 px-3 py-2 rounded-lg text-sm font-bold hover:bg-gray-300 transition cursor-pointer">
                            ሰርዝ (Cancel)
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="space-y-3">
                      {lessons.map((lesson: any, lidx: number) => {
                        const isEditingThis = editingLessonIdx === lidx;
                        return (
                          <div key={lidx} className={`bg-white dark:bg-slate-800 rounded-2xl border transition-all overflow-hidden ${isEditingThis ? 'border-primary ring-2 ring-primary/40 shadow-xl' : 'border-gray-200 dark:border-slate-700 shadow-xs hover:border-primary/50'}`}>
                            
                            {/* Lesson Header Row */}
                            <div className="p-3.5 flex justify-between items-center bg-gray-50/50 dark:bg-slate-800/80">
                              <div 
                                onClick={() => handleStartEditLesson(lidx)} 
                                className="flex items-center gap-3 flex-1 cursor-pointer group"
                              >
                                <span className="w-7 h-7 rounded-full bg-primary/20 text-dark dark:text-primary font-black text-xs flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                                  {lidx + 1}
                                </span>
                                <div>
                                  <p className="font-bold text-sm text-dark dark:text-white group-hover:text-primary transition-colors flex items-center gap-2">
                                    <span>{lesson.title || `ትምህርት ${lidx + 1}`}</span>
                                    <span className="text-[10px] text-blue-500 dark:text-primary font-bold underline opacity-80 group-hover:opacity-100 transition-opacity">(ለመቀየር ይጫኑ / Click to edit)</span>
                                  </p>
                                  {lesson.desc && <p className="text-xs text-gray-500 mt-0.5 truncate max-w-xs">{lesson.desc}</p>}
                                  <p className="text-[11px] text-gray-500 mt-0.5 flex items-center gap-2">
                                    <span><i className="fa-solid fa-video mr-1 text-primary"></i> {lesson.duration || '00:00'}</span>
                                    <span>•</span>
                                    <span className="text-primary font-bold">+{lesson.points || 100} ነጥብ</span>
                                    {lesson.video && <span className="text-emerald-600 dark:text-emerald-400 font-bold text-[10px]">✓ Video URL Set</span>}
                                  </p>
                                </div>
                              </div>

                              <div className="flex items-center gap-1.5 shrink-0 ml-2">
                                <button 
                                  type="button" 
                                  onClick={() => handleStartEditLesson(lidx)}
                                  title="ትምህርቱን አስተካክል (Edit Lesson)"
                                  className={`px-3 py-1.5 rounded-xl flex items-center gap-1.5 text-xs font-black transition cursor-pointer ${isEditingThis ? 'bg-primary text-dark shadow-sm' : 'bg-amber-400/20 dark:bg-amber-400/10 text-amber-900 dark:text-amber-300 hover:bg-primary hover:text-dark'}`}
                                >
                                  <i className="fa-solid fa-pen"></i>
                                  <span>{isEditingThis ? 'እየቀየሩት ነው' : 'አስተካክል (Edit)'}</span>
                                </button>
                                <button 
                                  type="button" 
                                  onClick={() => handleMoveLessonUp(lidx)}
                                  disabled={lidx === 0}
                                  title="ቦታ ወደ ላይ ቀይር (Move Up)"
                                  className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-slate-700 hover:bg-primary hover:text-dark text-gray-600 dark:text-gray-300 disabled:opacity-30 disabled:hover:bg-gray-100 flex items-center justify-center transition text-xs font-black cursor-pointer"
                                >
                                  ▲
                                </button>
                                <button 
                                  type="button" 
                                  onClick={() => handleMoveLessonDown(lidx)}
                                  disabled={lidx === lessons.length - 1}
                                  title="ቦታ ወደ ታች ቀይር (Move Down)"
                                  className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-slate-700 hover:bg-primary hover:text-dark text-gray-600 dark:text-gray-300 disabled:opacity-30 disabled:hover:bg-gray-100 flex items-center justify-center transition text-xs font-black cursor-pointer"
                                >
                                  ▼
                                </button>
                                <button type="button" onClick={() => handleDeleteLesson(lidx)} className="w-8 h-8 rounded-lg bg-red-50 dark:bg-red-950/30 hover:bg-red-500 hover:text-white text-danger flex items-center justify-center transition text-xs ml-1 cursor-pointer"><i className="fa-solid fa-trash"></i></button>
                              </div>
                            </div>

                            {/* Expanded Inline Edit Form when editing this lesson */}
                            {isEditingThis && (
                              <div className="p-4 border-t border-primary/30 bg-amber-50/40 dark:bg-slate-900/80 animate-[fadeIn_0.2s_ease-in-out]">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                                  <div>
                                    <label className="block text-[11px] font-bold text-gray-700 dark:text-gray-300 mb-1">የርዕስ ስም (Title) *</label>
                                    <input value={lessonForm.title} onChange={e => setLessonForm({...lessonForm, title: e.target.value})} className="w-full border border-gray-300 dark:border-slate-600 rounded-xl px-3 py-2 text-sm bg-white dark:bg-slate-800 font-bold outline-none focus:ring-2 focus:ring-primary" />
                                  </div>
                                  <div>
                                    <label className="block text-[11px] font-bold text-gray-700 dark:text-gray-300 mb-1">የቪዲዮ ርዝመት (Duration e.g. 00:15:00)</label>
                                    <input value={lessonForm.duration} onChange={e => setLessonForm({...lessonForm, duration: e.target.value})} className="w-full border border-gray-300 dark:border-slate-600 rounded-xl px-3 py-2 text-sm bg-white dark:bg-slate-800 font-bold outline-none focus:ring-2 focus:ring-primary" />
                                  </div>
                                  <div className="sm:col-span-2">
                                    <label className="block text-[11px] font-bold text-gray-700 dark:text-gray-300 mb-1">የቪዲዮ ሊንክ (Video URL) *</label>
                                    <input value={lessonForm.video} onChange={e => setLessonForm({...lessonForm, video: e.target.value})} className="w-full border border-gray-300 dark:border-slate-600 rounded-xl px-3 py-2 text-sm bg-white dark:bg-slate-800 font-mono text-xs outline-none focus:ring-2 focus:ring-primary" placeholder="e.g. https://iframe.mediadelivery.net/play/..." />
                                  </div>
                                  <div>
                                    <label className="block text-[11px] font-bold text-gray-700 dark:text-gray-300 mb-1">ነጥብ (Points)</label>
                                    <input type="number" value={lessonForm.points || ''} onChange={e => setLessonForm({...lessonForm, points: Number(e.target.value)})} className="w-full border border-gray-300 dark:border-slate-600 rounded-xl px-3 py-2 text-sm bg-white dark:bg-slate-800 font-bold outline-none focus:ring-2 focus:ring-primary" />
                                  </div>
                                  <div>
                                    <label className="block text-[11px] font-bold text-gray-700 dark:text-gray-300 mb-1">የቪዲዮ ማብራሪያ (Description)</label>
                                    <input value={lessonForm.desc} onChange={e => setLessonForm({...lessonForm, desc: e.target.value})} className="w-full border border-gray-300 dark:border-slate-600 rounded-xl px-3 py-2 text-sm bg-white dark:bg-slate-800 outline-none focus:ring-2 focus:ring-primary" />
                                  </div>
                                </div>

                                <div className="flex justify-end gap-2 pt-2 border-t border-gray-200 dark:border-slate-700">
                                  <button type="button" onClick={() => { setEditingLessonIdx(null); setLessonForm({ title: '', duration: '', video: '', desc: '', points: 0 }); }} className="px-3.5 py-2 rounded-xl bg-gray-200 dark:bg-slate-700 text-gray-700 dark:text-gray-300 text-xs font-bold hover:bg-gray-300 transition cursor-pointer">
                                    ሰርዝ (Cancel)
                                  </button>
                                  <button type="button" onClick={handleAddOrUpdateLesson} className="px-5 py-2 rounded-xl bg-primary text-dark text-xs font-black hover:bg-yellow-400 shadow-md flex items-center gap-1.5 cursor-pointer">
                                    <i className="fa-solid fa-circle-check text-base"></i>
                                    <span>ለወጡን አስቀምጥ (Save Edits)</span>
                                  </button>
                                </div>
                              </div>
                            )}

                          </div>
                        );
                      })}
                    </div>
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
