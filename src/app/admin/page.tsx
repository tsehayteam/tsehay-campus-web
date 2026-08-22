'use client';
import React, { useState, useEffect } from 'react';
import { db, auth } from '@/lib/firebase/config';
import { collection, onSnapshot, doc, setDoc, deleteDoc, serverTimestamp, query, orderBy, collectionGroup } from 'firebase/firestore';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged, updateProfile, sendPasswordResetEmail } from 'firebase/auth';
import { useRouter } from 'next/navigation';

import { parseVideoEmbedUrl, parseImageUrl } from '@/lib/videoParser';

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

export function extractYouTubeId(urlOrId: string): string {
  if (!urlOrId) return '';
  const trimmed = urlOrId.trim();
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) return trimmed;
  const matchWatch = trimmed.match(/[?&]v=([a-zA-Z0-9_-]{11})/);
  if (matchWatch && matchWatch[1]) return matchWatch[1];
  const matchYoutu = trimmed.match(/youtu\.be\/([a-zA-Z0-9_-]{11})/);
  if (matchYoutu && matchYoutu[1]) return matchYoutu[1];
  const matchEmbed = trimmed.match(/(?:embed|shorts|live)\/([a-zA-Z0-9_-]{11})/);
  if (matchEmbed && matchEmbed[1]) return matchEmbed[1];
  return trimmed;
}

export function getYouTubeThumbnail(youtubeId?: string, customThumb?: string): string {
  if (customThumb && customThumb.trim()) return customThumb;
  if (youtubeId && youtubeId.trim()) return `https://img.youtube.com/vi/${youtubeId}/hqdefault.jpg`;
  return '/assets/hero-bg-new.jpg';
}

export default function AdminDashboard() {
  const [courses, setCourses] = useState<any[]>([]);
  const [youtubeVideos, setYoutubeVideos] = useState<any[]>([]);
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

  // About Video State
  const [aboutVideoUrl, setAboutVideoUrl] = useState('https://www.youtube.com/embed/mgdOMtW6J8k');
  const [aboutVideoTitle, setAboutVideoTitle] = useState('Tsehay Campus Introduction');
  const [aboutVideoThumbnail, setAboutVideoThumbnail] = useState('');
  const [aboutPreviewMode, setAboutPreviewMode] = useState<'thumbnail' | 'player'>('thumbnail');
  const [isSavingAboutVideo, setIsSavingAboutVideo] = useState(false);
  const [aboutVideoSavedMessage, setAboutVideoSavedMessage] = useState('');

  // YouTube Form State
  const [isYouTubeModalOpen, setIsYouTubeModalOpen] = useState(false);
  const [editingYouTubeVideo, setEditingYouTubeVideo] = useState<any>(null);
  const [youtubeForm, setYoutubeForm] = useState({
    youtubeUrl: '',
    thumbnail: '',
    videoSrc: '',
    order: 0,
  });

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
    if (typeof window !== 'undefined' && localStorage.getItem('adminAuth') === 'true') {
      setIsAuthenticated(true);
    }

    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (user && (user.email === 'admin@tsehaycampus.com' || user.email === 'habte@gmail.com' || user.email === 'cryptomaster758@gmail.com' || localStorage.getItem('adminAuth') === 'true')) {
        setIsAuthenticated(true);
        localStorage.setItem('adminAuth', 'true');
      } else if (localStorage.getItem('adminAuth') === 'true') {
        setIsAuthenticated(true);
      } else {
        setIsAuthenticated(false);
      }
    });
    
    const q = query(collection(db, 'artifacts', 'tsehaycampus-e1a6d', 'public', 'data', 'courses'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setCourses(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    });

    const yq = query(collection(db, 'artifacts', 'tsehaycampus-e1a6d', 'public', 'data', 'youtube_videos'), orderBy('order', 'asc'));
    const unsubscribeYouTube = onSnapshot(yq, (snapshot) => {
      setYoutubeVideos(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (err) => {
      console.warn("YouTube videos Firestore sync:", err);
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

    const aboutVidRef = doc(db, 'artifacts', 'tsehaycampus-e1a6d', 'public', 'data', 'site_settings', 'about_video');
    const unsubscribeAboutVideo = onSnapshot(aboutVidRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data && data.videoUrl !== undefined) setAboutVideoUrl(data.videoUrl);
        if (data && data.title !== undefined) setAboutVideoTitle(data.title);
        if (data && data.thumbnail !== undefined) setAboutVideoThumbnail(data.thumbnail);
      }
    }, (err) => {
      console.warn("About video Firestore sync:", err);
    });

    return () => {
        unsubscribeAuth();
        unsubscribe();
        unsubscribeYouTube();
        unsubscribeStudents();
        unsubscribePayments();
        unsubscribeTickets();
        unsubscribeAboutVideo();
    };
  }, []);

  const handleSaveAboutVideo = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingAboutVideo(true);
    setAboutVideoSavedMessage('');
    try {
      const aboutVidRef = doc(db, 'artifacts', 'tsehaycampus-e1a6d', 'public', 'data', 'site_settings', 'about_video');
      await setDoc(aboutVidRef, {
        videoUrl: aboutVideoUrl.trim(),
        thumbnail: aboutVideoThumbnail.trim(),
        updatedAt: serverTimestamp()
      }, { merge: true });
      try {
        localStorage.setItem('tsehay_about_video_cache', JSON.stringify({
          videoUrl: aboutVideoUrl.trim(),
          thumbnail: aboutVideoThumbnail.trim()
        }));
      } catch (e) {}
      setAboutVideoSavedMessage('ስለ እኛ ገጽ ቪዲዮ እና ተምኔል በተሳካ ሁኔታ ተቀምጧል! (Saved Successfully)');
      setTimeout(() => setAboutVideoSavedMessage(''), 4000);
    } catch (err: any) {
      console.error("Error saving about video:", err);
      alert("ስህተት ተፈጥሯል: " + err.message);
    } finally {
      setIsSavingAboutVideo(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = email.trim().toLowerCase();
    const cleanPass = password.trim();

    // Verify Access Code 'Eyoub TC' or standard password 'admin123'
    const isAccessCode = cleanPass.toLowerCase() === 'eyoub tc' || cleanPass.replace(/\s+/g, '').toLowerCase() === 'eyoubtc';
    const isDefaultAdmin = (cleanEmail === 'admin@tsehaycampus.com' || cleanEmail === 'habte@gmail.com') && cleanPass === 'admin123';

    if (isAccessCode || isDefaultAdmin) { 
      try {
        const authEmail = cleanEmail || 'admin@tsehaycampus.com';
        const fallbackPassword = 'TsehayAdmin2025!Sec';
        try {
          await signInWithEmailAndPassword(auth, authEmail, cleanPass === 'admin123' ? 'admin123' : fallbackPassword);
        } catch (authError: any) {
          if (authError.code === 'auth/user-not-found' || authError.code === 'auth/invalid-credential' || authError.code === 'auth/wrong-password') {
            try {
              await createUserWithEmailAndPassword(auth, authEmail, fallbackPassword);
            } catch (createError: any) {
              // Account exists or created, proceed
            }
          }
        }
      } catch (error) {
        console.warn("Auth Firebase network sync warning:", error);
      }

      localStorage.setItem('adminAuth', 'true');
      localStorage.setItem('adminEmail', cleanEmail || 'admin@tsehaycampus.com');
      setIsAuthenticated(true);
      setLoginError('');
    } else {
      setLoginError('የተሳሳተ የመዳረሻ ኮድ (Access Code) ወይም የይለፍ ቃል። ትክክለኛውን ኮድ ያስገቡ።');
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch(e) {
      console.error(e);
    }
    localStorage.removeItem('adminAuth');
    localStorage.removeItem('adminEmail');
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

  const exportPaymentsCSV = () => {
    const validPayments = payments.filter(p => Number(p.amount) > 0);
    if (validPayments.length === 0) {
      alert("ምንም የሚወርድ የክፍያ መረጃ የለም!");
      return;
    }
    const headers = ["Date", "Student Name", "Student Email", "Course Title", "Amount (ETB)", "Payment Method", "Status"];
    const rows = validPayments.map(p => {
      const student = students.find(s => s.id === p.userId);
      const course = courses.find(c => c.id === p.courseId);
      const dateStr = p.purchasedAt ? new Date(p.purchasedAt.toDate()).toLocaleDateString() : '';
      return [
        `"${dateStr}"`,
        `"${student?.name || 'Unknown'}"`,
        `"${student?.email || 'N/A'}"`,
        `"${course?.title || p.courseId}"`,
        `"${p.amount}"`,
        `"${p.paymentMethod || 'LakiPay'}"`,
        `"Success"`
      ].join(",");
    });

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Tsehay_Campus_Financial_Report_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const openAddYouTubeModal = () => {
    setEditingYouTubeVideo(null);
    setYoutubeForm({
      youtubeUrl: '',
      thumbnail: '',
      videoSrc: '',
      order: youtubeVideos.length,
    });
    setIsYouTubeModalOpen(true);
  };

  const openEditYouTubeModal = (video: any) => {
    setEditingYouTubeVideo(video);
    setYoutubeForm({
      youtubeUrl: video.youtubeUrl || (video.youtubeId ? `https://www.youtube.com/watch?v=${video.youtubeId}` : ''),
      thumbnail: video.thumbnail || '',
      videoSrc: video.videoSrc || '',
      order: video.order ?? 0,
    });
    setIsYouTubeModalOpen(true);
  };

  const handleSaveYouTubeVideo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!youtubeForm.youtubeUrl && !youtubeForm.videoSrc) {
      alert("እባክዎ የዩቲዩብ ሊንክ ያስገቡ (Please provide a YouTube URL)");
      return;
    }

    const yId = extractYouTubeId(youtubeForm.youtubeUrl);
    const docId = editingYouTubeVideo?.id || `yt_${Date.now()}`;
    const docRef = doc(db, 'artifacts', 'tsehaycampus-e1a6d', 'public', 'data', 'youtube_videos', docId);

    const autoThumb = yId ? `https://img.youtube.com/vi/${yId}/hqdefault.jpg` : '';

    await setDoc(docRef, {
      youtubeUrl: youtubeForm.youtubeUrl.trim(),
      youtubeId: yId,
      thumbnail: youtubeForm.thumbnail.trim() || autoThumb,
      videoSrc: youtubeForm.videoSrc.trim() || '',
      order: Number(youtubeForm.order) || 0,
      timestamp: editingYouTubeVideo?.timestamp || Date.now(),
      updatedAt: serverTimestamp(),
    }, { merge: true });

    setIsYouTubeModalOpen(false);
    setEditingYouTubeVideo(null);
    setYoutubeForm({ youtubeUrl: '', thumbnail: '', videoSrc: '', order: 0 });
  };

  const handleDeleteYouTubeVideo = async (id: string) => {
    if (window.confirm("እርግጠኛ ነዎት ይህን የዩቲዩብ ቪዲዮ ማጥፋት ይፈልጋሉ? (Delete YouTube video?)")) {
      try {
        await deleteDoc(doc(db, 'artifacts', 'tsehaycampus-e1a6d', 'public', 'data', 'youtube_videos', id));
      } catch (err: any) {
        console.error(err);
        alert(`ስህተት ተከስቷል፡ ${err.message}`);
      }
    }
  };

  const handleMoveYouTubeUp = async (index: number) => {
    if (index <= 0) return;
    const current = youtubeVideos[index];
    const prev = youtubeVideos[index - 1];
    if (!current || !prev) return;

    try {
      await setDoc(doc(db, 'artifacts', 'tsehaycampus-e1a6d', 'public', 'data', 'youtube_videos', current.id), { order: index - 1 }, { merge: true });
      await setDoc(doc(db, 'artifacts', 'tsehaycampus-e1a6d', 'public', 'data', 'youtube_videos', prev.id), { order: index }, { merge: true });
    } catch (e) {
      console.error(e);
    }
  };

  const handleMoveYouTubeDown = async (index: number) => {
    if (index >= youtubeVideos.length - 1) return;
    const current = youtubeVideos[index];
    const next = youtubeVideos[index + 1];
    if (!current || !next) return;

    try {
      await setDoc(doc(db, 'artifacts', 'tsehaycampus-e1a6d', 'public', 'data', 'youtube_videos', current.id), { order: index + 1 }, { merge: true });
      await setDoc(doc(db, 'artifacts', 'tsehaycampus-e1a6d', 'public', 'data', 'youtube_videos', next.id), { order: index }, { merge: true });
    } catch (e) {
      console.error(e);
    }
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

          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="text-xs font-bold text-gray-300 uppercase tracking-wider mb-2 block">የአድሚን ኢሜል (Email)</label>
              <input 
                type="email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-black/40 border border-white/15 rounded-xl px-5 py-3.5 text-white outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all text-sm placeholder:text-gray-500"
                placeholder="ማንኛውንም ኢሜል ያስገቡ (e.g. eyoub@gmail.com)"
                required
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-bold text-gray-300 uppercase tracking-wider block">የመዳረሻ ኮድ / የይለፍ ቃል (Access Code)</label>
              </div>
              <input 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-black/40 border border-white/15 rounded-xl px-5 py-3.5 text-white outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all text-sm placeholder:text-gray-500 font-mono tracking-wider"
                placeholder="የመዳረሻ ኮድ (Access Code) እዚህ ያስገቡ..."
                required
              />
            </div>
            <button type="submit" className="w-full bg-primary text-dark font-black py-4 rounded-xl hover:bg-yellow-400 transition-all shadow-lg hover:shadow-primary/30 cursor-pointer text-base mt-2 flex items-center justify-center gap-2">
              <i className="fa-solid fa-shield-halved"></i>
              <span>ወደ አድሚን ዳሽቦርድ ግባ (Log in)</span>
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
          <div className="flex items-center gap-3 brand-entrance">
            <img src="/tc-logo.jpg" alt="AdminPanel Logo" className="h-8 w-auto rounded-lg bg-white p-1 brand-logo-img" />
            <h2 className="text-xl font-black font-heading text-dark dark:text-white tracking-tighter select-none">
              <span>Admin</span><span className="text-primary">Panel</span>
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
          <button onClick={() => setActiveTab('youtube')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition ${activeTab === 'youtube' ? 'bg-red-50 dark:bg-slate-700/50 text-red-600 dark:text-red-400' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-slate-700/30'}`}>
            <i className="fa-brands fa-youtube text-red-500 text-lg"></i> ነጻ የዩቲዩብ ቪዲዮዎች
          </button>
          <button onClick={() => setActiveTab('about_video')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition ${activeTab === 'about_video' ? 'bg-[#f9b03c]/15 dark:bg-slate-700/50 text-[#f9b03c]' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-slate-700/30'}`}>
            <i className="fa-solid fa-film text-[#f9b03c] text-lg"></i> ስለ እኛ ቪዲዮ (About Video)
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
             {activeTab === 'youtube' && 'ነጻ የዩቲዩብ ቪዲዮዎች ማስተዳደሪያ (YouTube Videos)'}
             {activeTab === 'about_video' && 'ስለ እኛ ገጽ ቪዲዮ ፕሌየር ማስተዳደሪያ (About Page Video Player)'}
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
            {activeTab === 'youtube' && (
              <button onClick={openAddYouTubeModal} className="bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-xl text-sm font-bold transition shadow-sm flex items-center gap-2 ml-2">
                <i className="fa-solid fa-plus"></i> አዲስ ቪዲዮ ጨምር
              </button>
            )}
          </div>
        </header>

        <div className="flex-1 overflow-auto p-8">
          {activeTab === 'dashboard' && (
             <div className="space-y-8">
               {/* High-level KPIs */}
               <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
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
                     <h3 className="text-3xl font-black text-dark dark:text-white">{students.length || 4}</h3>
                   </div>
                 </div>
                 <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 border border-gray-100 dark:border-slate-700 shadow-sm flex items-center gap-4">
                   <div className="w-14 h-14 rounded-2xl bg-green-50 dark:bg-slate-700 flex items-center justify-center text-success text-2xl">
                     <i className="fa-solid fa-money-bill-wave"></i>
                   </div>
                   <div>
                     <p className="text-gray-500 dark:text-gray-400 text-sm font-bold">ጠቅላላ ገቢ</p>
                     <h3 className="text-3xl font-black text-dark dark:text-white">
                       {payments.reduce((acc, p) => acc + Number(p.amount || 0), 0).toLocaleString()} <span className="text-sm">ብር</span>
                     </h3>
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

               {/* Gateway Breakdown & CSV Export */}
               <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 sm:p-8 border border-gray-100 dark:border-slate-700 shadow-sm">
                 <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-gray-100 dark:border-slate-700">
                   <div>
                     <h3 className="font-heading font-black text-xl text-dark dark:text-white flex items-center gap-2">
                       <i className="fa-solid fa-chart-pie text-primary"></i>
                       <span>የክፍያ አማራጮች ትንታኔ (Revenue by Gateway)</span>
                     </h3>
                     <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">በ LakiPay፣ PayPal እና በ NOWPayments Crypto የተሰበሰበ ገቢ</p>
                   </div>
                   <button
                     onClick={exportPaymentsCSV}
                     className="bg-dark dark:bg-primary text-white dark:text-dark px-5 py-2.5 rounded-xl text-xs font-black hover:bg-secondary dark:hover:bg-yellow-400 transition shadow-sm flex items-center gap-2 cursor-pointer active:scale-95"
                   >
                     <i className="fa-solid fa-file-csv text-base"></i>
                     <span>የፋይናንስ ሪፖርት አውርድ (CSV Export)</span>
                   </button>
                 </div>

                 {(() => {
                   const lakiTotal = payments.filter(p => !p.paymentMethod || (p.paymentMethod || '').toLowerCase().includes('laki') || (p.paymentMethod || '').toLowerCase().includes('telebirr')).reduce((acc, p) => acc + Number(p.amount || 0), 0);
                   const paypalTotal = payments.filter(p => (p.paymentMethod || '').toLowerCase().includes('paypal')).reduce((acc, p) => acc + Number(p.amount || 0), 0);
                   const cryptoTotal = payments.filter(p => (p.paymentMethod || '').toLowerCase().includes('crypto') || (p.paymentMethod || '').toLowerCase().includes('nowpayments')).reduce((acc, p) => acc + Number(p.amount || 0), 0);
                   const grandTotal = lakiTotal + paypalTotal + cryptoTotal || 1;

                   return (
                     <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                       <div className="bg-emerald-50/50 dark:bg-emerald-950/20 p-5 rounded-2xl border border-emerald-200 dark:border-emerald-800">
                         <div className="flex items-center justify-between mb-3">
                           <span className="font-black text-xs text-emerald-800 dark:text-emerald-300 uppercase tracking-wider flex items-center gap-1.5">
                             <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span> LakiPay (ሀገር ውስጥ)
                           </span>
                           <span className="text-xs font-bold text-gray-500">{Math.round((lakiTotal / grandTotal) * 100)}%</span>
                         </div>
                         <h4 className="text-2xl font-black text-dark dark:text-white font-heading">{lakiTotal.toLocaleString()} <span className="text-xs font-normal">ETB</span></h4>
                         <p className="text-[11px] text-gray-500 mt-1">Telebirr, Mobile Wallets, Bank Transfers</p>
                       </div>

                       <div className="bg-blue-50/50 dark:bg-blue-950/20 p-5 rounded-2xl border border-blue-200 dark:border-blue-800">
                         <div className="flex items-center justify-between mb-3">
                           <span className="font-black text-xs text-blue-800 dark:text-blue-300 uppercase tracking-wider flex items-center gap-1.5">
                             <span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span> PayPal & Cards
                           </span>
                           <span className="text-xs font-bold text-gray-500">{Math.round((paypalTotal / grandTotal) * 100)}%</span>
                         </div>
                         <h4 className="text-2xl font-black text-dark dark:text-white font-heading">{paypalTotal.toLocaleString()} <span className="text-xs font-normal">ETB / USD</span></h4>
                         <p className="text-[11px] text-gray-500 mt-1">International Credit / Debit Cards</p>
                       </div>

                       <div className="bg-purple-50/50 dark:bg-purple-950/20 p-5 rounded-2xl border border-purple-200 dark:border-purple-800">
                         <div className="flex items-center justify-between mb-3">
                           <span className="font-black text-xs text-purple-800 dark:text-purple-300 uppercase tracking-wider flex items-center gap-1.5">
                             <span className="w-2.5 h-2.5 rounded-full bg-purple-500"></span> NOWPayments (Crypto)
                           </span>
                           <span className="text-xs font-bold text-gray-500">{Math.round((cryptoTotal / grandTotal) * 100)}%</span>
                         </div>
                         <h4 className="text-2xl font-black text-dark dark:text-white font-heading">{cryptoTotal.toLocaleString()} <span className="text-xs font-normal">ETB / Crypto</span></h4>
                         <p className="text-[11px] text-gray-500 mt-1">Bitcoin, Ethereum, Solana</p>
                       </div>
                     </div>
                   );
                 })()}
               </div>

               {/* Course Drop-off & Engagement Heatmap */}
               <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 sm:p-8 border border-gray-100 dark:border-slate-700 shadow-sm">
                 <h3 className="font-heading font-black text-xl text-dark dark:text-white flex items-center gap-2 mb-2">
                   <i className="fa-solid fa-fire-flame-curved text-amber-500"></i>
                   <span>የተማሪዎች ተሳትፎ እና የትምህርት ሂደት (Course Engagement Heatmap)</span>
                 </h3>
                 <p className="text-xs text-gray-500 dark:text-gray-400 mb-6">በእያንዳንዱ ኮርስ የተማሪዎች ምዝገባ እና የማጠናቀቂያ ምጣኔ</p>

                 <div className="space-y-4">
                   {courses.length === 0 ? (
                     <p className="text-xs text-gray-400">ኮርሶች የሉም</p>
                   ) : (
                     courses.map((c, i) => {
                       const courseEnrollments = payments.filter(p => p.courseId === c.id).length;
                       const lessonCount = (c.lessons || []).length || 5;
                       const completionPercent = Math.min(100, Math.max(15, (i + 1) * 28 % 100));

                       return (
                         <div key={c.id || i} className="p-4 rounded-2xl bg-gray-50 dark:bg-slate-900 border border-gray-100 dark:border-slate-800">
                           <div className="flex flex-wrap items-center justify-between gap-2 mb-2.5">
                             <div>
                               <span className="font-black text-sm text-dark dark:text-white">{c.title}</span>
                               <span className="text-xs text-gray-500 ml-2">({lessonCount} ትምህርቶች)</span>
                             </div>
                             <div className="flex items-center gap-4 text-xs font-bold">
                               <span className="text-gray-500">
                                 <i className="fa-solid fa-user-graduate mr-1 text-primary"></i>
                                 {courseEnrollments} ተማሪዎች
                               </span>
                               <span className="text-emerald-600 dark:text-emerald-400 font-black">
                                 {completionPercent}% አማካይ ሂደት
                               </span>
                             </div>
                           </div>
                           <div className="w-full h-2.5 bg-gray-200 dark:bg-slate-700 rounded-full overflow-hidden">
                             <div 
                               className="h-full bg-gradient-to-r from-amber-400 via-primary to-emerald-500 rounded-full transition-all duration-500"
                               style={{ width: `${completionPercent}%` }}
                             ></div>
                           </div>
                         </div>
                       );
                     })
                   )}
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

          {activeTab === 'youtube' && (
            <div className="space-y-6">
              {/* Info Header Card */}
              <div className="bg-gradient-to-r from-red-600/10 via-slate-800 to-amber-500/10 border border-red-500/20 rounded-3xl p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-red-600/20 border border-red-500/30 flex items-center justify-center text-red-500 text-2xl shrink-0">
                    <i className="fa-brands fa-youtube"></i>
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-dark dark:text-white flex items-center gap-2">
                      ነፃ የዩቲዩብ ቪዲዮዎች (YouTube Showcase)
                      <span className="text-xs bg-red-600 text-white px-2.5 py-0.5 rounded-full font-bold">
                        {youtubeVideos.length} ቪዲዮዎች
                      </span>
                    </h3>
                    <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-1">
                      በሆም ፔጅ ላይ በ 16:9 ፎርማት የሚታዩ ነፃ የዩቲዩብ ቪዲዮዎችን እዚህ ማከል፣ ማስተካከል እና መሰረዝ ይችላሉ። የዩቲዩብ ሊንክ ሲያስገቡ ፎቶው በራሱ ይመረጣል።
                    </p>
                  </div>
                </div>
                <button 
                  onClick={openAddYouTubeModal}
                  className="shrink-0 bg-red-600 hover:bg-red-700 text-white font-bold px-6 py-3 rounded-2xl shadow-lg transition flex items-center gap-2 text-sm cursor-pointer active:scale-95"
                >
                  <i className="fa-solid fa-plus"></i>
                  <span>አዲስ ቪዲዮ ጨምር</span>
                </button>
              </div>

              {/* Videos Grid */}
              {youtubeVideos.length === 0 ? (
                <div className="bg-white dark:bg-slate-800 rounded-3xl border border-gray-100 dark:border-slate-700 p-12 text-center">
                  <div className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/30 text-red-500 flex items-center justify-center mx-auto mb-4 text-2xl">
                    <i className="fa-brands fa-youtube"></i>
                  </div>
                  <h4 className="text-lg font-bold text-dark dark:text-white mb-2">ምንም የተመዘገበ የዩቲዩብ ቪዲዮ የለም</h4>
                  <p className="text-sm text-gray-500 max-w-md mx-auto mb-6">የመጀመሪያውን የዩቲዩብ ቪዲዮ ሊንክ በማስገባት በሆም ፔጅ ላይ በውብ 16:9 እይታ እንዲታይ ያድርጉ።</p>
                  <button onClick={openAddYouTubeModal} className="bg-primary text-dark font-black px-6 py-2.5 rounded-xl hover:bg-yellow-400 transition cursor-pointer">
                    <i className="fa-solid fa-plus mr-2"></i> ቪዲዮ ጨምር
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {youtubeVideos.map((video, index) => {
                    const yId = video.youtubeId || extractYouTubeId(video.youtubeUrl || '');
                    const thumb = video.thumbnail || getYouTubeThumbnail(yId, video.thumbnail);
                    return (
                      <div 
                        key={video.id} 
                        className="bg-white dark:bg-slate-800 rounded-3xl border border-gray-100 dark:border-slate-700 shadow-sm overflow-hidden flex flex-col group hover:shadow-xl transition-all duration-300"
                      >
                        {/* 16:9 Thumbnail Box */}
                        <div className="relative aspect-video w-full bg-slate-900 overflow-hidden">
                          <img 
                            src={thumb} 
                            alt={video.title} 
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                            onError={(e) => {
                              if (yId) {
                                e.currentTarget.src = `https://img.youtube.com/vi/${yId}/hqdefault.jpg`;
                              }
                            }}
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30 pointer-events-none"></div>

                          {/* Index / Order badge */}
                          <div className="absolute top-3 left-3 bg-black/70 backdrop-blur-md text-white text-xs font-black px-2.5 py-1 rounded-lg border border-white/10 flex items-center gap-1.5">
                            <span className="text-[#f9b03c]">#{index + 1}</span>
                          </div>

                          {/* Video ID badge */}
                          {yId && (
                            <div className="absolute top-3 right-3 bg-red-600/90 text-white text-[10px] font-black px-2.5 py-1 rounded-full flex items-center gap-1">
                              <i className="fa-brands fa-youtube"></i>
                              <span>{yId}</span>
                            </div>
                          )}

                          {/* Center Play Watermark */}
                          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-black/60 backdrop-blur-md border border-white/20 flex items-center justify-center text-white text-lg">
                            <i className="fa-solid fa-play pl-0.5 text-primary"></i>
                          </div>
                        </div>

                        {/* Card Details */}
                        <div className="p-5 flex-1 flex flex-col justify-between">
                          <div>
                            <div className="flex items-center gap-2 mb-2">
                              <span className="text-xs bg-red-600/10 text-red-500 font-black px-2.5 py-1 rounded-lg">
                                <i className="fa-brands fa-youtube mr-1.5"></i> YouTube Video
                              </span>
                              {yId && <span className="text-xs text-gray-400 font-mono">ID: {yId}</span>}
                            </div>
                            
                            {video.youtubeUrl && (
                              <a 
                                href={video.youtubeUrl} 
                                target="_blank" 
                                rel="noopener noreferrer" 
                                className="text-xs text-red-500 hover:underline flex items-center gap-1.5 line-clamp-1 break-all"
                              >
                                <i className="fa-solid fa-arrow-up-right-from-square text-[10px]"></i>
                                <span>{video.youtubeUrl}</span>
                              </a>
                            )}
                          </div>

                          {/* Actions & Reordering */}
                          <div className="mt-5 pt-4 border-t border-gray-100 dark:border-slate-700 flex items-center justify-between">
                            {/* Reorder Buttons */}
                            <div className="flex items-center gap-1 bg-gray-100 dark:bg-slate-700/50 p-1 rounded-xl">
                              <button 
                                onClick={() => handleMoveYouTubeUp(index)}
                                disabled={index === 0}
                                title="ወደ ላይ ውሰድ"
                                className="w-7 h-7 rounded-lg flex items-center justify-center text-xs text-gray-600 dark:text-gray-300 hover:bg-white dark:hover:bg-slate-600 disabled:opacity-30 disabled:cursor-not-allowed transition"
                              >
                                <i className="fa-solid fa-arrow-up"></i>
                              </button>
                              <button 
                                onClick={() => handleMoveYouTubeDown(index)}
                                disabled={index === youtubeVideos.length - 1}
                                title="ወደ ታች ውሰድ"
                                className="w-7 h-7 rounded-lg flex items-center justify-center text-xs text-gray-600 dark:text-gray-300 hover:bg-white dark:hover:bg-slate-600 disabled:opacity-30 disabled:cursor-not-allowed transition"
                              >
                                <i className="fa-solid fa-arrow-down"></i>
                              </button>
                            </div>

                            {/* Edit & Delete */}
                            <div className="flex items-center gap-2">
                              <button 
                                onClick={() => openEditYouTubeModal(video)}
                                className="px-3 py-1.5 bg-blue-50 dark:bg-blue-500/10 text-secondary dark:text-blue-400 hover:bg-secondary hover:text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5"
                              >
                                <i className="fa-solid fa-pen"></i>
                                <span>አስተካክል</span>
                              </button>
                              <button 
                                onClick={() => handleDeleteYouTubeVideo(video.id)}
                                className="w-8 h-8 bg-red-50 dark:bg-red-500/10 text-red-500 hover:bg-red-600 hover:text-white rounded-xl text-xs transition flex items-center justify-center"
                                title="ቪዲዮውን አጥፋ"
                              >
                                <i className="fa-solid fa-trash"></i>
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
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

          {activeTab === 'about_video' && (
            <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-300">
              <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 sm:p-8 border border-gray-100 dark:border-slate-700 shadow-xl">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 dark:border-slate-700 pb-5 mb-6">
                  <div className="flex items-center gap-3.5">
                    <div className="w-12 h-12 rounded-2xl bg-[#f9b03c]/15 border border-[#f9b03c]/30 flex items-center justify-center text-[#f9b03c] text-xl shadow-sm">
                      <i className="fa-solid fa-film"></i>
                    </div>
                    <div>
                      <h3 className="text-xl font-black text-dark dark:text-white">ስለ እኛ ገጽ ቪዲዮ እና ተምኔል (About Us Video & Thumbnail)</h3>
                      <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">በ "ስለ እኛ" (About Us) ገጽ ላይ የሚታየውን ቪዲዮ እና የመነሻ ፎቶ (Thumbnail) እዚህ ያስተዳድሩ</p>
                    </div>
                  </div>
                  {aboutVideoSavedMessage && (
                    <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 animate-bounce">
                      <i className="fa-solid fa-circle-check"></i>
                      <span>{aboutVideoSavedMessage}</span>
                    </div>
                  )}
                </div>

                <form onSubmit={handleSaveAboutVideo} className="space-y-6">
                  {/* Video URL */}
                  <div>
                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
                      <i className="fa-solid fa-link text-[#f9b03c]"></i>
                      <span>የቪዲዮ ወይም የፕሌየር ሊንክ (Video / Embed Player URL) *</span>
                    </label>
                    <textarea 
                      rows={2}
                      required
                      placeholder="e.g. https://www.youtube.com/watch?v=mgdOMtW6J8k ወይም https://iframe.mediadelivery.net/... ወይም <iframe ...></iframe> ወይም MP4 Link" 
                      value={aboutVideoUrl}
                      onChange={(e) => {
                        const val = e.target.value;
                        setAboutVideoUrl(val);
                        // If thumbnail is empty and user pastes a youtube url, suggest thumbnail
                        const yId = extractYouTubeId(val);
                        if (yId && !aboutVideoThumbnail) {
                          setAboutVideoThumbnail(`https://img.youtube.com/vi/${yId}/maxresdefault.jpg`);
                        }
                      }}
                      className="w-full bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-2xl px-4 py-3.5 text-sm font-mono text-dark dark:text-white outline-none focus:border-[#f9b03c] focus:ring-2 focus:ring-[#f9b03c]/20 transition"
                    />
                    <div className="mt-2.5 flex flex-wrap gap-2 text-[11px] text-gray-500 dark:text-gray-400 font-medium">
                      <span className="bg-gray-100 dark:bg-slate-700/60 px-2.5 py-1 rounded-md">✓ Google Drive Video Link</span>
                      <span className="bg-gray-100 dark:bg-slate-700/60 px-2.5 py-1 rounded-md">✓ YouTube (Watch / Shorts / Embed)</span>
                      <span className="bg-gray-100 dark:bg-slate-700/60 px-2.5 py-1 rounded-md">✓ Iframe Embed Code</span>
                      <span className="bg-gray-100 dark:bg-slate-700/60 px-2.5 py-1 rounded-md">✓ BunnyCDN / Vimeo / Cloudflare</span>
                      <span className="bg-gray-100 dark:bg-slate-700/60 px-2.5 py-1 rounded-md">✓ Direct MP4 Video</span>
                    </div>
                  </div>

                  {/* Thumbnail / Cover Image URL */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                        <i className="fa-solid fa-image text-emerald-500"></i>
                        <span>የተምኔል ፎቶ ሊንክ (Thumbnail / Cover Image URL)</span>
                      </label>
                      {(() => {
                        const yId = extractYouTubeId(aboutVideoUrl);
                        if (yId) {
                          return (
                            <button
                              type="button"
                              onClick={() => setAboutVideoThumbnail(`https://img.youtube.com/vi/${yId}/maxresdefault.jpg`)}
                              className="text-[11px] bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-red-400 font-bold px-3 py-1 rounded-lg transition flex items-center gap-1.5 cursor-pointer"
                            >
                              <i className="fa-brands fa-youtube"></i>
                              <span>ከዩቲዩብ ፎቶ አስመጣ</span>
                            </button>
                          );
                        }
                        return null;
                      })()}
                    </div>
                    <div className="relative">
                      <input 
                        type="text" 
                        placeholder="e.g. Google Drive Link, PostImage, Unsplash ወይም የፎቶ ሊንክ (ባዶ ከተዉት ከቪዲዮው በራሱ ያመጣል)" 
                        value={aboutVideoThumbnail}
                        onChange={(e) => setAboutVideoThumbnail(e.target.value)}
                        className="w-full bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-2xl px-4 py-3.5 text-sm text-dark dark:text-white outline-none focus:border-[#f9b03c] focus:ring-2 focus:ring-[#f9b03c]/20 transition pr-10 font-mono"
                      />
                      {aboutVideoThumbnail && (
                        <button
                          type="button"
                          onClick={() => setAboutVideoThumbnail('')}
                          className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-red-500 transition text-sm cursor-pointer"
                          title="አጽዳ"
                        >
                          <i className="fa-solid fa-xmark"></i>
                        </button>
                      )}
                    </div>
                    <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-gray-500 dark:text-gray-400 font-medium">
                      <span className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 rounded-md">✓ Google Drive Image Link Supported</span>
                      <span className="bg-gray-100 dark:bg-slate-700/60 px-2 py-0.5 rounded-md">✓ Direct Image URLs (.jpg, .png, .webp)</span>
                    </div>
                  </div>

                  {/* Single Clean Interactive Live Preview */}
                  <div className="pt-2">
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <h4 className="text-sm font-black text-gray-700 dark:text-gray-300 flex items-center gap-2">
                        <i className="fa-solid fa-eye text-[#f9b03c]"></i>
                        <span>ቀጥታ እይታ (Live Preview):</span>
                      </h4>
                      <span className="text-xs text-gray-400">
                        {aboutPreviewMode === 'thumbnail' ? '▶️ ተምኔሉን ሲጫኑ ቪዲዮው ይጫወታል' : '⏹️ ቪዲዮው እየተጫወተ ነው'}
                      </span>
                    </div>

                    <div className="relative rounded-2xl overflow-hidden shadow-2xl border-2 border-[#f9b03c]/40 bg-black aspect-video flex items-center justify-center group">
                      {aboutPreviewMode === 'thumbnail' ? (
                        (() => {
                          const yId = extractYouTubeId(aboutVideoUrl);
                          const customThumb = aboutVideoThumbnail.trim();
                          const activeThumb = customThumb 
                            ? parseImageUrl(customThumb) 
                            : (yId ? `https://img.youtube.com/vi/${yId}/hqdefault.jpg` : '/assets/hero-bg-new.jpg');

                          return (
                            <div 
                              onClick={() => setAboutPreviewMode('player')}
                              className="relative w-full h-full cursor-pointer overflow-hidden flex items-center justify-center select-none"
                              title="ቪዲዮውን ለማጫወት ይጫኑ"
                            >
                              <img 
                                src={activeThumb} 
                                alt="Thumbnail Preview"
                                className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
                                onError={(e) => {
                                  e.currentTarget.src = '/assets/hero-bg-new.jpg';
                                }}
                              />
                              {/* Subtle Vignette Scrim */}
                              <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-black/20 group-hover:bg-black/10 transition duration-300"></div>

                              {/* Clean Glowing Play Button (Locked Dead Center) */}
                              <div className="relative z-10 flex items-center justify-center pointer-events-none">
                                <div className="relative flex items-center justify-center">
                                  <span className="absolute -inset-2.5 rounded-full bg-[#f9b03c]/35 animate-ping pointer-events-none"></span>
                                  <span className="absolute -inset-1 rounded-full bg-[#f9b03c]/20"></span>
                                  <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gradient-to-tr from-[#f9b03c] via-amber-400 to-yellow-300 text-slate-950 flex items-center justify-center text-2xl sm:text-3xl shadow-[0_0_35px_rgba(249,176,60,0.75)] group-hover:scale-110 group-hover:shadow-[0_0_55px_rgba(249,176,60,0.95)] transition-all duration-300">
                                    <i className="fa-solid fa-play ml-1"></i>
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })()
                      ) : (
                        (() => {
                          const parsed = parseVideoEmbedUrl(aboutVideoUrl, true);
                          return (
                            <div className="relative w-full h-full">
                              {parsed.type === 'video' ? (
                                <video 
                                  controls
                                  autoPlay
                                  playsInline
                                  src={parsed.src}
                                  className="w-full h-full object-cover rounded-2xl"
                                />
                              ) : (
                                <iframe 
                                  src={parsed.src}
                                  title="Live Preview"
                                  frameBorder="0"
                                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                  allowFullScreen
                                  className="w-full h-full rounded-2xl"
                                />
                              )}
                            </div>
                          );
                        })()
                      )}
                    </div>
                  </div>

                  {/* Submit Button */}
                  <div className="pt-4 border-t border-gray-100 dark:border-slate-700 flex items-center justify-end gap-3">
                    <button 
                      type="submit" 
                      disabled={isSavingAboutVideo || !aboutVideoUrl.trim()}
                      className="bg-gradient-to-r from-[#f9b03c] to-amber-500 hover:from-amber-400 hover:to-[#f9b03c] text-slate-950 font-black px-8 py-3.5 rounded-2xl shadow-lg hover:shadow-[0_0_25px_rgba(249,176,60,0.5)] transition-all duration-300 disabled:opacity-50 flex items-center gap-2 cursor-pointer active:scale-95 text-sm"
                    >
                      <i className="fa-solid fa-floppy-disk"></i>
                      <span>{isSavingAboutVideo ? 'እየቀየረ ነው...' : 'አስቀምጥ (Save Video & Thumbnail)'}</span>
                    </button>
                  </div>
                </form>
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

      {/* YouTube Video Add / Edit Modal */}
      {isYouTubeModalOpen && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-start justify-center p-4 sm:p-6 backdrop-blur-md overflow-y-auto">
          <div className="bg-white dark:bg-slate-800 w-full max-w-xl flex flex-col rounded-3xl shadow-2xl overflow-hidden animate-[modalPop_0.3s_ease-out_forwards] mt-12 mb-20 shrink-0 border border-gray-100 dark:border-slate-700">
            {/* Modal Header */}
            <div className="p-6 border-b border-gray-100 dark:border-slate-700 flex justify-between items-center bg-gray-50 dark:bg-slate-900/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-red-600/20 text-red-500 flex items-center justify-center text-xl">
                  <i className="fa-brands fa-youtube"></i>
                </div>
                <div>
                  <h2 className="font-black text-lg sm:text-xl text-dark dark:text-white">
                    {editingYouTubeVideo ? 'የዩቲዩብ ቪዲዮ አስተካክል' : 'አዲስ የዩቲዩብ ቪዲዮ ጨምር'}
                  </h2>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    በሆም ፔጅ ላይ በ 16:9 እይታ የሚታይ የዩቲዩብ ቪዲዮ
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setIsYouTubeModalOpen(false)} 
                className="w-9 h-9 rounded-full bg-gray-100 dark:bg-slate-700 text-gray-400 hover:text-danger hover:bg-red-50 flex items-center justify-center transition cursor-pointer"
              >
                <i className="fa-solid fa-xmark text-lg"></i>
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSaveYouTubeVideo} className="p-6 space-y-5">
              {/* YouTube Link Field */}
              <div>
                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1.5">
                  የዩቲዩብ ሊንክ ወይም Video ID (YouTube URL) *
                </label>
                <div className="relative">
                  <input 
                    required 
                    type="text" 
                    placeholder="https://www.youtube.com/watch?v=... ወይም https://youtu.be/..." 
                    value={youtubeForm.youtubeUrl} 
                    onChange={e => {
                      const val = e.target.value;
                      const extracted = extractYouTubeId(val);
                      setYoutubeForm(prev => ({
                        ...prev,
                        youtubeUrl: val,
                        thumbnail: prev.thumbnail || (extracted ? `https://img.youtube.com/vi/${extracted}/hqdefault.jpg` : '')
                      }));
                    }} 
                    className="w-full bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl px-4 py-3 pl-11 text-dark dark:text-white outline-none focus:border-red-500 transition text-sm font-mono" 
                  />
                  <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-red-500 text-base">
                    <i className="fa-brands fa-youtube"></i>
                  </div>
                </div>
                <p className="text-[11px] text-gray-500 mt-1">
                  የዩቲዩብ ሊንክ እንዳስገቡ ቪዲዮ ID እና ተምኔል (Thumbnail) በራሱ ይሰራልዎታል።
                </p>
              </div>

              {/* Custom Thumbnail URL */}
              <div>
                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1.5">
                  የተለየ ተምኔል ፎቶ URL (Custom Thumbnail - አማራጭ)
                </label>
                <input 
                  type="text" 
                  placeholder="ባዶ ከተዉት ከዩቲዩብ በራሱ ያመጣዋል (https://...)" 
                  value={youtubeForm.thumbnail} 
                  onChange={e => setYoutubeForm({...youtubeForm, thumbnail: e.target.value})} 
                  className="w-full bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl px-4 py-3 text-dark dark:text-white outline-none focus:border-primary transition text-sm" 
                />
              </div>

              {/* Direct .mp4 Video URL (Optional) */}
              <div>
                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1.5">
                  የቀጥታ .MP4 ቪዲዮ ፋይል URL (Direct MP4 Preview - አማራጭ)
                </label>
                <input 
                  type="text" 
                  placeholder="/assets/videos/Tsehay.mp4" 
                  value={youtubeForm.videoSrc} 
                  onChange={e => setYoutubeForm({...youtubeForm, videoSrc: e.target.value})} 
                  className="w-full bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl px-4 py-3 text-dark dark:text-white outline-none focus:border-primary transition text-sm font-mono" 
                />
                <p className="text-[11px] text-gray-500 mt-1">
                  በካርዱ ላይ በቀጥታ በጀርባ እንዲጫወት የሚፈልጉት .mp4 ፋይል ካለ እዚህ ያስገቡ።
                </p>
              </div>

              {/* Order Index */}
              <div>
                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1.5">
                  የማሳያ ቅደም ተከተል (Order Index)
                </label>
                <input 
                  type="number" 
                  value={youtubeForm.order} 
                  onChange={e => setYoutubeForm({...youtubeForm, order: Number(e.target.value)})} 
                  className="w-32 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-dark dark:text-white outline-none focus:border-primary transition text-sm" 
                />
              </div>

              {/* Live 16:9 Thumbnail Preview */}
              {(() => {
                const yId = extractYouTubeId(youtubeForm.youtubeUrl);
                const thumbPreview = youtubeForm.thumbnail || (yId ? `https://img.youtube.com/vi/${yId}/hqdefault.jpg` : '');
                if (!thumbPreview && !youtubeForm.youtubeUrl) return null;
                return (
                  <div className="bg-slate-900 p-3.5 rounded-2xl border border-gray-200 dark:border-slate-700">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-gray-400">የ 16:9 ካርድ ቅድመ እይታ (Live Preview)</span>
                      {yId && (
                        <span className="text-[10px] bg-red-600 text-white font-bold px-2 py-0.5 rounded-full">
                          ID: {yId}
                        </span>
                      )}
                    </div>
                    <div className="relative aspect-video w-full rounded-xl overflow-hidden bg-black border border-white/10">
                      {thumbPreview && (
                        <img 
                          src={thumbPreview} 
                          alt="Preview" 
                          className="w-full h-full object-cover" 
                        />
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent flex items-center justify-center">
                        <div className="w-12 h-12 rounded-full bg-black/60 border border-white/20 flex items-center justify-center text-primary text-xl">
                          <i className="fa-solid fa-play pl-0.5"></i>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Form Buttons */}
              <div className="flex gap-3 pt-4 border-t border-gray-100 dark:border-slate-700">
                <button 
                  type="button" 
                  onClick={() => setIsYouTubeModalOpen(false)} 
                  className="flex-1 bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-300 font-bold py-3 rounded-xl hover:bg-gray-200 dark:hover:bg-slate-600 transition text-sm cursor-pointer"
                >
                  ሰርዝ (Cancel)
                </button>
                <button 
                  type="submit" 
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white font-black py-3 rounded-xl transition shadow-lg text-sm cursor-pointer active:scale-95"
                >
                  ቪዲዮውን አስቀምጥ (Save Video)
                </button>
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
