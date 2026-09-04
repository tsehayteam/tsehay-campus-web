// @ts-nocheck
'use client';

import React, { useState, useMemo } from 'react';
import ReactPlayer from 'react-player';
import CourseQuiz from '@/components/CourseQuiz';
import CourseCertificate from '@/components/CourseCertificate';
import { getCleanCourseImage } from '@/lib/courseCache';

export interface ClassroomViewProps {
  activeCourse: any;
  courses: any[];
  modules: any[];
  activeLesson: any;
  setActiveLesson: (lesson: any) => void;
  progress: string[];
  markLessonCompleted: (lesson: any) => void;
  handlePrevLesson: () => void;
  handleNextLesson: () => void;
  isCourseCompleted: boolean;
  passedQuizzes: Record<string, { score: number; passedAt: string }>;
  handleQuizPass: (courseId: string, score: number) => void;
  hasTakenQuiz: boolean;
  playerRef: React.RefObject<any>;
  playbackSpeed: number;
  resumeToast: { seconds: number; timeStr: string } | null;
  setResumeToast: (toast: any) => void;
  setCurrentVideoPlayedFraction: (fraction: number) => void;
  showRatingModal: boolean;
  setShowRatingModal: (show: boolean) => void;
  ratedCourses: Record<string, boolean>;
  dismissedRatingOverlay: Record<string, boolean>;
  setDismissedRatingOverlay: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  studentNotes: any[];
  noteInput: string;
  setNoteInput: (text: string) => void;
  handleSaveNote: () => void;
  handleDeleteNote: (id: string) => void;
  noteSavedMessage: string | null;
  copiedNoteId: string | null;
  setCopiedNoteId: (id: string | null) => void;
  highlightedNoteId: string | null;
  lessonSummary: string | null;
  setLessonSummary: (summary: string | null) => void;
  studentTickets: any[];
  questionInput: string;
  setQuestionInput: (text: string) => void;
  handleAskAdmin: () => void;
  qaAttachment: any;
  setQaAttachment: (att: any) => void;
  handleQaFileUpload: (e: React.ChangeEvent<HTMLInputElement>, type?: 'image' | 'document' | 'audio') => void;
  isRecordingVoice: boolean;
  handleStartVoiceRecord: () => void;
  handleStopVoiceRecord: () => void;
  showAttachmentMenu: boolean;
  setShowAttachmentMenu: React.Dispatch<React.SetStateAction<boolean>>;
  questionSentMessage: string | null;
  user: any;
  studentDisplayName: string;
  studentPhotoUrl: string;
  earnedPoints: number;
  onBackToDashboard: () => void;
  updateUrlState?: (params: { view?: string; courseId?: string; lesson?: string | number }) => void;
  lang?: string;
  t?: (key: string) => string;
}

export default function ClassroomView({
  activeCourse,
  courses,
  modules,
  activeLesson,
  setActiveLesson,
  progress,
  markLessonCompleted,
  handlePrevLesson,
  handleNextLesson,
  isCourseCompleted,
  passedQuizzes,
  handleQuizPass,
  hasTakenQuiz,
  playerRef,
  playbackSpeed = 1,
  resumeToast,
  setResumeToast,
  setCurrentVideoPlayedFraction,
  showRatingModal,
  setShowRatingModal,
  ratedCourses,
  dismissedRatingOverlay,
  setDismissedRatingOverlay,
  studentNotes,
  noteInput,
  setNoteInput,
  handleSaveNote,
  handleDeleteNote,
  noteSavedMessage,
  copiedNoteId,
  setCopiedNoteId,
  highlightedNoteId,
  lessonSummary,
  setLessonSummary,
  studentTickets,
  questionInput,
  setQuestionInput,
  handleAskAdmin,
  qaAttachment,
  setQaAttachment,
  handleQaFileUpload,
  isRecordingVoice,
  handleStartVoiceRecord,
  handleStopVoiceRecord,
  showAttachmentMenu,
  setShowAttachmentMenu,
  questionSentMessage,
  user,
  studentDisplayName,
  studentPhotoUrl,
  earnedPoints,
  onBackToDashboard,
  updateUrlState,
  lang = 'am',
  t = (k: string) => k,
}: ClassroomViewProps) {
  // Focus Mode / Syllabus collapsed state
  const [isSyllabusOpen, setIsSyllabusOpen] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'resources' | 'qa' | 'exam'>('overview');
  const [notesSubTab, setNotesSubTab] = useState<'details' | 'notes'>('details');

  // Flatten lessons for navigation and progress calculations
  const allFlatLessons = useMemo(() => {
    const list: any[] = [];
    modules.forEach((m: any, mIdx: number) => {
      (m.lessons || []).forEach((l: any, lIdx: number) => {
        list.push({ ...l, moduleIndex: mIdx, lessonIndex: lIdx });
      });
    });
    return list;
  }, [modules]);

  const currentLessonIndex = useMemo(() => {
    if (!activeLesson) return 0;
    return allFlatLessons.findIndex((l) => l.title === activeLesson.title);
  }, [allFlatLessons, activeLesson]);

  const hasPrev = currentLessonIndex > 0;
  const hasNext = currentLessonIndex >= 0 && currentLessonIndex < allFlatLessons.length - 1;
  const isCurrentCompleted = activeLesson && progress.includes(activeLesson.title);

  const totalLessonsCount = allFlatLessons.length || 1;
  const completedLessonsCount = allFlatLessons.filter((l) => progress.includes(l.title)).length;
  const courseProgressPercent = Math.min(100, Math.round((completedLessonsCount / totalLessonsCount) * 100));

  // Resolved video URL
  const rawVideoUrl =
    activeLesson?.video ||
    activeLesson?.videoUrl ||
    activeLesson?.url ||
    activeCourse?.video ||
    activeCourse?.videoUrl ||
    activeCourse?.promoVideo ||
    activeCourse?.previewVideo;

  let cleanVideoUrl = rawVideoUrl ? rawVideoUrl.trim() : null;
  if (cleanVideoUrl && cleanVideoUrl.includes('<iframe') && cleanVideoUrl.includes('src="')) {
    const match = cleanVideoUrl.match(/src="([^"]+)"/);
    if (match) cleanVideoUrl = match[1];
  }
  if (cleanVideoUrl) {
    cleanVideoUrl = cleanVideoUrl.replace(/&amp;/g, '&');
  }

  const isBunnyCdn = cleanVideoUrl?.includes('mediadelivery.net');
  const isGoogleDrive = cleanVideoUrl?.includes('drive.google.com');

  const bunnyEmbedUrl = useMemo(() => {
    if (!cleanVideoUrl || !isBunnyCdn) return null;
    let url = cleanVideoUrl.replace('/play/', '/embed/').replace('video.mediadelivery.net', 'iframe.mediadelivery.net');
    if (!url.includes('autoplay=')) {
      url += (url.includes('?') ? '&' : '?') + 'autoplay=true';
    }
    return url;
  }, [cleanVideoUrl, isBunnyCdn]);

  const googleDriveEmbedUrl = useMemo(() => {
    if (!cleanVideoUrl || !isGoogleDrive) return null;
    return cleanVideoUrl.replace(/\/view.*$/, '/preview').replace(/\/edit.*$/, '/preview');
  }, [cleanVideoUrl, isGoogleDrive]);

  return (
    <div className="min-h-screen bg-[#0B0F17] text-slate-100 flex flex-col font-body selection:bg-[#f9b03c]/30 selection:text-slate-950">
      {/* ========================================================================= */}
      {/* 1. Minimalist Top Navigation (Single Header Bar)                          */}
      {/* ========================================================================= */}
      <header className="h-16 px-3 sm:px-6 bg-[#0B0F17]/95 border-b border-white/[0.08] backdrop-blur-xl flex items-center justify-between sticky top-0 z-40 shrink-0">
        {/* Left: Back to Dashboard + Subtle Course Title */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <button
            type="button"
            onClick={onBackToDashboard}
            className="flex items-center gap-2 px-2.5 sm:px-3.5 py-1.5 rounded-xl bg-white/[0.04] hover:bg-[#f9b03c]/15 text-slate-300 hover:text-[#f9b03c] border border-white/[0.08] hover:border-[#f9b03c]/30 transition-all duration-200 text-xs sm:text-sm font-black cursor-pointer group active:scale-95 shrink-0"
            title="ወደ ዳሽቦርድ ተመለስ (Back to Dashboard)"
          >
            <svg
              className="w-4 h-4 text-current transition-transform duration-200 group-hover:-translate-x-1"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="2.5"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
            </svg>
            <span className="font-heading tracking-tight hidden xs:inline">ወደ ዋና ዳሽቦርድ</span>
          </button>

          <div className="h-4 w-px bg-white/10 hidden sm:block shrink-0" />

          <div className="min-w-0 flex items-center gap-2">
            <h1 className="text-xs sm:text-sm font-heading font-black text-white truncate max-w-[130px] xs:max-w-[200px] md:max-w-[320px] lg:max-w-[420px]">
              {activeCourse?.title || 'የመማሪያ ክፍል (Classroom)'}
            </h1>
            {activeCourse?.category && (
              <span className="hidden lg:inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#f9b03c]/10 text-[#f9b03c] border border-[#f9b03c]/20 shrink-0">
                {activeCourse.category}
              </span>
            )}
          </div>
        </div>

        {/* Center / Right: Progress Bar + Focus Mode Toggle + Points + Avatar */}
        <div className="flex items-center gap-2 sm:gap-3.5 shrink-0">
          {/* Subtle Progress Bar */}
          <div className="hidden sm:flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-white/[0.03] border border-white/[0.06]">
            <div className="w-20 md:w-28 h-1.5 bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-amber-400 to-[#f9b03c] rounded-full transition-all duration-500 shadow-sm"
                style={{ width: `${courseProgressPercent}%` }}
              />
            </div>
            <span className="text-[11px] font-bold text-slate-300 whitespace-nowrap">
              {courseProgressPercent}% ተጠናቋል
            </span>
          </div>

          {/* Toggle Syllabus / Focus Mode Button */}
          <button
            type="button"
            onClick={() => setIsSyllabusOpen((prev) => !prev)}
            className={`p-2 rounded-xl transition-all duration-200 cursor-pointer flex items-center gap-1.5 text-xs font-bold border ${
              !isSyllabusOpen
                ? 'bg-[#f9b03c]/15 text-[#f9b03c] border-[#f9b03c]/30 shadow-[0_0_15px_rgba(249,176,60,0.2)]'
                : 'bg-white/[0.04] text-slate-300 hover:text-white border-white/[0.08] hover:bg-white/[0.08]'
            }`}
            title={isSyllabusOpen ? 'የትኩረት ሁኔታ (Focus Cinema Mode)' : 'ይዘቱን ክፈት (Open Syllabus)'}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.2">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5"
              />
            </svg>
            <span className="hidden md:inline font-heading text-[11px]">
              {isSyllabusOpen ? 'የትኩረት ሁነታ' : 'ማውጫ ክፈት'}
            </span>
          </button>

          {/* Points Pill Badge */}
          <div
            className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1 rounded-full bg-amber-500/10 border border-[#f9b03c]/30 text-xs font-black text-amber-400 shadow-[0_0_15px_rgba(249,176,60,0.12)] cursor-default"
            title="የተከማቹ ፖይንቶች (Earned Points)"
          >
            <svg className="w-3.5 h-3.5 text-[#f9b03c] fill-current" viewBox="0 0 24 24">
              <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
            </svg>
            <span className="font-heading">{earnedPoints ?? 100} Pts</span>
          </div>

          {/* User Avatar */}
          <div className="relative group/avatar">
            <img
              src={studentPhotoUrl}
              alt={studentDisplayName}
              className="w-8 h-8 rounded-full object-cover ring-2 ring-[#f9b03c]/40 cursor-pointer shadow-sm"
              onError={(e) => {
                (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(
                  studentDisplayName
                )}&background=f9b03c&color=111827&bold=true`;
              }}
            />
          </div>
        </div>
      </header>

      {/* ========================================================================= */}
      {/* 2. Main Learning Area (Split Cinema Layout)                               */}
      {/* ========================================================================= */}
      <div className="flex-1 w-full max-w-[1720px] mx-auto p-3 sm:p-5 lg:p-6 pb-28">
        <div
          className={`grid grid-cols-1 gap-6 items-start transition-all duration-300 ${
            isSyllabusOpen ? 'lg:grid-cols-12' : 'max-w-6xl mx-auto'
          }`}
        >
          {/* ===================================================================== */}
          {/* Left / Center: Main Canvas (70% or 100% in Focus Mode)                */}
          {/* ===================================================================== */}
          <main className={`flex flex-col gap-6 w-full ${isSyllabusOpen ? 'lg:col-span-8 xl:col-span-9' : 'col-span-1'}`}>
            {/* 16:9 Video Canvas */}
            <div className="relative aspect-video w-full rounded-2xl overflow-hidden bg-[#050811] shadow-2xl shadow-black/80 border border-white/[0.08] flex items-center justify-center group/player">
              {/* Auto-Resume Floating Toast */}
              {resumeToast && (
                <div className="absolute top-4 left-4 z-40 bg-slate-900/90 backdrop-blur-md text-white border border-amber-400/40 px-3.5 py-2 rounded-xl shadow-xl flex items-center gap-3 animate-in slide-in-from-top duration-300">
                  <i className="fa-solid fa-clock-rotate-left text-amber-400 text-sm"></i>
                  <div className="text-xs">
                    <span className="font-bold block text-[11px] text-amber-300">
                      ያቆሙበት ደቂቃ፦ {resumeToast.timeStr}
                    </span>
                    <span className="text-[10px] text-gray-300">ከዚህ ሰኮንድ ይቀጥሉ?</span>
                  </div>
                  <button
                    onClick={() => {
                      if (playerRef.current && typeof playerRef.current.seekTo === 'function') {
                        playerRef.current.seekTo(resumeToast.seconds);
                      }
                      setResumeToast(null);
                    }}
                    className="bg-amber-400 hover:bg-amber-300 text-slate-950 font-black px-2.5 py-1 rounded-lg text-[11px] transition cursor-pointer"
                  >
                    ይቀጥሉ
                  </button>
                  <button onClick={() => setResumeToast(null)} className="text-gray-400 hover:text-white text-xs px-1">
                    ✕
                  </button>
                </div>
              )}

              {/* Dynamic Course Completion & Rating Overlay */}
              {isCourseCompleted &&
                activeCourse?.id &&
                !ratedCourses[activeCourse.id] &&
                !(typeof window !== 'undefined' && localStorage.getItem(`rated_course_${activeCourse.id}`)) &&
                !dismissedRatingOverlay[activeCourse.id] && (
                  <div className="absolute inset-0 z-40 bg-black/90 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-300">
                    <button
                      onClick={() => setDismissedRatingOverlay((prev) => ({ ...prev, [activeCourse.id]: true }))}
                      className="absolute top-4 right-4 text-gray-400 hover:text-white text-sm font-bold w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition cursor-pointer"
                      title="ዝጋ (Close)"
                    >
                      ✕
                    </button>
                    <div className="w-14 h-14 bg-amber-400/20 text-[#f9b03c] rounded-full flex items-center justify-center text-2xl mb-3 border-2 border-[#f9b03c] animate-bounce">
                      <i className="fa-solid fa-star"></i>
                    </div>
                    <h3 className="text-lg md:text-xl font-black text-white font-heading mb-1.5">
                      እንኳን ደስ አሎት! ኮርሱን አጠናቀዋል።
                    </h3>
                    <p className="text-xs text-gray-300 mb-5 max-w-sm">
                      እባክዎ ለኮርሱ እና ለአስተማሪው ያለዎትን ሬቲንግ እና አስተያየት ይስጡ።
                    </p>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => setShowRatingModal(true)}
                        className="bg-[#f9b03c] text-slate-950 font-black px-5 py-2.5 rounded-xl hover:bg-yellow-400 transition shadow-lg text-xs transform hover:scale-105 cursor-pointer active:scale-95"
                      >
                        ⭐ ሬቲንግ ስጥ (Rate Course)
                      </button>
                      <button
                        onClick={() => setDismissedRatingOverlay((prev) => ({ ...prev, [activeCourse.id]: true }))}
                        className="bg-white/10 text-white font-bold px-4 py-2.5 rounded-xl hover:bg-white/20 transition text-xs cursor-pointer"
                      >
                        አሁን ይለፈኝ
                      </button>
                    </div>
                  </div>
                )}

              {/* Video Player Rendering */}
              {isBunnyCdn && bunnyEmbedUrl ? (
                <iframe
                  src={bunnyEmbedUrl}
                  className="absolute inset-0 w-full h-full border-none"
                  allow="accelerometer;gyroscope;autoplay;encrypted-media;picture-in-picture;"
                  allowFullScreen
                  referrerPolicy="no-referrer-when-downgrade"
                />
              ) : isGoogleDrive && googleDriveEmbedUrl ? (
                <iframe
                  src={googleDriveEmbedUrl}
                  loading="lazy"
                  className="absolute inset-0 w-full h-full border-none"
                  allow="autoplay; encrypted-media"
                  allowFullScreen
                />
              ) : cleanVideoUrl ? (
                <ReactPlayer
                  ref={playerRef}
                  key={cleanVideoUrl}
                  url={cleanVideoUrl}
                  width="100%"
                  height="100%"
                  controls={true}
                  playing={true}
                  playbackRate={playbackSpeed}
                  onProgress={({ played, playedSeconds }: { played: number; playedSeconds: number }) => {
                    setCurrentVideoPlayedFraction(played);
                    if (activeCourse?.id && activeLesson?.title && playedSeconds > 5) {
                      try {
                        localStorage.setItem(
                          `tsehay_resume_${activeCourse.id}_${encodeURIComponent(activeLesson.title)}`,
                          Math.floor(playedSeconds).toString()
                        );
                      } catch (e) {}
                    }
                    if (played >= 0.9 && activeLesson && !progress.includes(activeLesson.title)) {
                      markLessonCompleted(activeLesson);
                    }
                  }}
                  onEnded={async () => {
                    if (activeLesson) {
                      await markLessonCompleted(activeLesson);
                    }
                    await handleNextLesson();
                  }}
                  className="absolute inset-0"
                />
              ) : (
                <div className="relative w-full h-full flex items-center justify-center">
                  <img
                    src={getCleanCourseImage(activeCourse) || 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?q=80&w=1200'}
                    className="absolute inset-0 w-full h-full object-cover opacity-40"
                    alt="Video cover"
                  />
                  <div className="relative z-10 text-center p-6 bg-black/60 backdrop-blur-md rounded-2xl border border-white/10 max-w-sm mx-auto">
                    <div className="w-12 h-12 rounded-xl bg-white/10 text-amber-400 flex items-center justify-center mx-auto mb-3 text-xl">
                      <i className="fa-solid fa-play"></i>
                    </div>
                    <p className="text-sm font-heading font-black text-white">ለዚህ ክፍል ቪዲዮ አልተገኘም</p>
                    <p className="text-xs text-slate-400 mt-1">የትምህርቱን ማብራሪያና ፋይሎች ከታች ይመልከቱ።</p>
                  </div>
                </div>
              )}
            </div>

            {/* Lesson Title & Quick Badges Directly Under Video */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-1">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-bold text-[#f9b03c]">
                    ክፍል {currentLessonIndex + 1} ከ {allFlatLessons.length}
                  </span>
                  {activeLesson?.duration && (
                    <>
                      <span className="text-slate-600">•</span>
                      <span className="text-xs text-slate-400 flex items-center gap-1">
                        <i className="fa-regular fa-clock text-[10px]"></i> {activeLesson.duration}
                      </span>
                    </>
                  )}
                  {isCurrentCompleted && (
                    <span className="text-[10px] font-black bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full flex items-center gap-1">
                      <i className="fa-solid fa-check text-[9px]"></i> ተጠናቋል
                    </span>
                  )}
                </div>
                <h2 className="text-lg sm:text-2xl font-black font-heading text-white">
                  {activeLesson?.title || activeCourse?.title}
                </h2>
              </div>

              {/* Quick Actions */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowRatingModal(true)}
                  className="px-3 py-1.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-xs font-bold text-slate-300 hover:text-[#f9b03c] border border-white/[0.08] transition flex items-center gap-1.5 cursor-pointer"
                  title="ኮርሱን ገምግም (Rate Course)"
                >
                  <i className="fa-solid fa-star text-amber-400 text-xs"></i>
                  <span>ሬቲንግ</span>
                </button>
                <button
                  type="button"
                  onClick={() => window.dispatchEvent(new CustomEvent('tsehay_open_feedback_modal', { detail: { category: 'course' } }))}
                  className="px-3 py-1.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-xs font-bold text-slate-300 hover:text-white border border-white/[0.08] transition flex items-center gap-1.5 cursor-pointer"
                  title="አስተያየት ይስጡ (Feedback)"
                >
                  <i className="fa-regular fa-comment-dots text-xs"></i>
                  <span>አስተያየት</span>
                </button>
              </div>
            </div>

            {/* Clean Tabs Directly Beneath Video */}
            <div className="bg-[#0C1220]/80 backdrop-blur-2xl rounded-2xl border border-white/[0.08] overflow-hidden shadow-xl">
              {/* Tab Header Bar */}
              <div className="flex items-center border-b border-white/[0.08] px-2 sm:px-4 gap-1 sm:gap-2 overflow-x-auto no-scrollbar bg-black/20">
                <button
                  type="button"
                  onClick={() => setActiveTab('overview')}
                  className={`px-3 sm:px-4 py-3.5 font-heading text-xs sm:text-sm font-black whitespace-nowrap flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
                    activeTab === 'overview'
                      ? 'text-[#f9b03c] border-[#f9b03c] bg-[#f9b03c]/5'
                      : 'text-slate-400 hover:text-white border-transparent hover:bg-white/[0.02]'
                  }`}
                >
                  <i className="fa-solid fa-circle-info text-xs"></i>
                  <span>ስለ ትምህርቱ (Overview & Notes)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('resources')}
                  className={`px-3 sm:px-4 py-3.5 font-heading text-xs sm:text-sm font-black whitespace-nowrap flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
                    activeTab === 'resources'
                      ? 'text-[#f9b03c] border-[#f9b03c] bg-[#f9b03c]/5'
                      : 'text-slate-400 hover:text-white border-transparent hover:bg-white/[0.02]'
                  }`}
                >
                  <i className="fa-solid fa-folder-open text-xs"></i>
                  <span>ፋይሎች (Resources)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('qa')}
                  className={`px-3 sm:px-4 py-3.5 font-heading text-xs sm:text-sm font-black whitespace-nowrap flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
                    activeTab === 'qa'
                      ? 'text-[#f9b03c] border-[#f9b03c] bg-[#f9b03c]/5'
                      : 'text-slate-400 hover:text-white border-transparent hover:bg-white/[0.02]'
                  }`}
                >
                  <i className="fa-solid fa-comments text-xs"></i>
                  <span>ውይይት / ጥያቄ እና መልስ (Discussion / Q&A)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('exam')}
                  className={`px-3 sm:px-4 py-3.5 font-heading text-xs sm:text-sm font-black whitespace-nowrap flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
                    activeTab === 'exam'
                      ? 'text-[#f9b03c] border-[#f9b03c] bg-[#f9b03c]/5'
                      : 'text-slate-400 hover:text-white border-transparent hover:bg-white/[0.02]'
                  }`}
                >
                  <i className="fa-solid fa-graduation-cap text-xs"></i>
                  <span>ፈተና እና ሰርተፊኬት (Exam & Certificate)</span>
                </button>
              </div>

              {/* Tab Content Body */}
              <div className="p-4 sm:p-6 lg:p-7">
                {/* 1. OVERVIEW & NOTES TAB */}
                {activeTab === 'overview' && (
                  <div className="space-y-6">
                    {/* Sub-Switch: Details vs My Notes */}
                    <div className="flex items-center gap-2 p-1 bg-white/[0.03] rounded-xl border border-white/[0.06] w-fit">
                      <button
                        type="button"
                        onClick={() => setNotesSubTab('details')}
                        className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                          notesSubTab === 'details'
                            ? 'bg-[#f9b03c] text-slate-950 font-black shadow-sm'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        የትምህርቱ ማብራሪያ (Lesson Synopsis)
                      </button>
                      <button
                        type="button"
                        onClick={() => setNotesSubTab('notes')}
                        className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                          notesSubTab === 'notes'
                            ? 'bg-[#f9b03c] text-slate-950 font-black shadow-sm'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        <span>የእኔ ማስታወሻዎች</span>
                        {studentNotes.length > 0 && (
                          <span
                            className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${
                              notesSubTab === 'notes' ? 'bg-slate-950 text-[#f9b03c]' : 'bg-white/10 text-white'
                            }`}
                          >
                            {studentNotes.length}
                          </span>
                        )}
                      </button>
                    </div>

                    {notesSubTab === 'details' ? (
                      <>
                        {/* AI Summary Box if present */}
                        {lessonSummary && (
                          <div className="bg-amber-500/10 border border-amber-400/30 p-4 sm:p-5 rounded-2xl shadow-md animate-in fade-in duration-300">
                            <div className="flex items-center justify-between mb-2.5 pb-2.5 border-b border-amber-400/20">
                              <div className="flex items-center gap-2">
                                <i className="fa-solid fa-sparkles text-[#f9b03c]"></i>
                                <h4 className="font-black text-sm text-white font-heading">
                                  የትምህርቱ ዋና ዋና ነጥቦች (AI Key Takeaways)
                                </h4>
                              </div>
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => {
                                    navigator.clipboard.writeText(lessonSummary);
                                    alert('ማጠቃለያው ኮፒ ተደርጓል!');
                                  }}
                                  className="text-xs bg-slate-900 px-2.5 py-1 rounded-lg border border-white/10 text-slate-300 hover:text-[#f9b03c] transition cursor-pointer"
                                >
                                  <i className="fa-solid fa-copy mr-1"></i> ኮፒ
                                </button>
                                <button
                                  onClick={() => setLessonSummary(null)}
                                  className="text-slate-400 hover:text-white text-xs px-1 cursor-pointer"
                                >
                                  ✕
                                </button>
                              </div>
                            </div>
                            <p className="text-sm text-slate-200 leading-relaxed font-body whitespace-pre-wrap">
                              {lessonSummary}
                            </p>
                          </div>
                        )}

                        {/* Active Lesson Description */}
                        {activeLesson?.desc && (
                          <div className="space-y-2">
                            <h3 className="font-heading font-black text-base sm:text-lg text-white">
                              ስለዚህ ክፍል ማብራሪያ፦
                            </h3>
                            <p className="text-slate-300 font-body leading-relaxed text-sm sm:text-base">
                              {activeLesson.desc}
                            </p>
                          </div>
                        )}

                        {/* Instructor Banner Card */}
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-2xl bg-white/[0.03] border border-white/[0.06]">
                          <div className="flex items-center gap-3.5">
                            <div className="w-13 h-13 rounded-full border-2 border-[#f9b03c]/40 overflow-hidden shrink-0 bg-slate-800">
                              <img
                                src={
                                  activeCourse?.instructorImage ||
                                  `https://ui-avatars.com/api/?name=${encodeURIComponent(
                                    activeCourse?.instructor || 'Instructor'
                                  )}&background=F9B03C&color=111827&bold=true`
                                }
                                alt={activeCourse?.instructor || 'Instructor'}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(
                                    activeCourse?.instructor || 'Instructor'
                                  )}&background=F9B03C&color=111827&bold=true`;
                                }}
                              />
                            </div>
                            <div>
                              <p className="font-heading font-black text-white text-sm sm:text-base">
                                {activeCourse?.instructor || 'Eyoub Sahle'}
                              </p>
                              <p className="text-xs text-[#f9b03c] font-bold">
                                {activeCourse?.instructorTitle || 'የኮርሱ መሪ አሰልጣኝ (Lead Instructor)'}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 self-end sm:self-center">
                            <a
                              href={`https://t.me/${(activeCourse?.instructorTelegram || 'EyoubSahle')
                                .replace('@', '')
                                .trim()}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-3.5 py-2 rounded-xl bg-[#26A5E4]/15 hover:bg-[#26A5E4]/25 text-[#26A5E4] border border-[#26A5E4]/30 text-xs font-black transition flex items-center gap-1.5"
                            >
                              <i className="fa-brands fa-telegram text-sm"></i>
                              <span>ቴሌግራም</span>
                            </a>
                          </div>
                        </div>

                        {/* Course Overall Synopsis */}
                        {activeCourse?.desc && (
                          <div className="space-y-2 pt-2 border-t border-white/[0.06]">
                            <h4 className="font-heading font-black text-sm text-slate-300">
                              ስለ ኮርሱ አጠቃላይ ገለጻ፦
                            </h4>
                            <p className="text-slate-400 font-body leading-relaxed text-xs sm:text-sm">
                              {activeCourse.desc}
                            </p>
                          </div>
                        )}
                      </>
                    ) : (
                      /* My Notes Section */
                      <div className="space-y-5">
                        {/* Note Input Card */}
                        <div className="bg-white/[0.03] p-4 sm:p-5 rounded-2xl border border-white/[0.08]">
                          <h4 className="font-heading font-black text-sm text-white mb-1.5 flex items-center gap-2">
                            <i className="fa-solid fa-pen-to-square text-[#f9b03c]"></i>
                            <span>አዲስ ማስታወሻ መዝግብ (Quick Lesson Note)</span>
                          </h4>
                          <p className="text-xs text-slate-400 mb-3">
                            ለዚህ ክፍል ({activeLesson?.title || 'ትምህርት'}) የሚረዱዎትን ዋና ዋና ነጥቦች እዚህ ይፃፉ።
                          </p>
                          <textarea
                            value={noteInput}
                            onChange={(e) => setNoteInput(e.target.value)}
                            placeholder="ማስታወሻዎን እዚህ ይፃፉ..."
                            rows={3}
                            className="w-full bg-slate-900/80 border border-white/10 rounded-xl p-3 text-xs sm:text-sm text-white outline-none focus:border-[#f9b03c] transition resize-none placeholder-slate-500"
                          />
                          <div className="flex justify-between items-center mt-3">
                            {noteSavedMessage && (
                              <span className="text-xs font-bold text-emerald-400 flex items-center gap-1 animate-pulse">
                                <i className="fa-solid fa-circle-check"></i> {noteSavedMessage}
                              </span>
                            )}
                            <button
                              onClick={() => handleSaveNote()}
                              className="ml-auto bg-[#f9b03c] text-slate-950 font-black px-4 py-2 rounded-xl hover:bg-yellow-400 transition text-xs shadow-sm flex items-center gap-1.5 cursor-pointer"
                            >
                              <i className="fa-solid fa-floppy-disk"></i>
                              <span>ማስታወሻ አስቀምጥ</span>
                            </button>
                          </div>
                        </div>

                        {/* Saved Notes List */}
                        <div className="space-y-3">
                          <h5 className="font-heading font-black text-xs sm:text-sm text-white">
                            የተመዘገቡ ማስታወሻዎች ({studentNotes.length})
                          </h5>
                          {studentNotes.length === 0 ? (
                            <div className="text-center py-8 bg-white/[0.02] rounded-2xl border border-dashed border-white/[0.08]">
                              <i className="fa-regular fa-note-sticky text-3xl text-slate-600 mb-2"></i>
                              <p className="text-xs font-bold text-slate-400">እስካሁን ምንም ማስታወሻ አልተመዘገበም።</p>
                            </div>
                          ) : (
                            studentNotes.map((note) => {
                              const isHighlighted =
                                highlightedNoteId === note.id ||
                                (highlightedNoteId && note.id.includes(highlightedNoteId));
                              return (
                                <div
                                  key={note.id}
                                  id={`student-note-${note.id}`}
                                  className={`p-4 rounded-2xl border transition-all ${
                                    isHighlighted
                                      ? 'border-[#f9b03c] bg-amber-500/10'
                                      : 'bg-white/[0.02] border-white/[0.06] hover:border-white/15'
                                  }`}
                                >
                                  <div className="flex justify-between items-start mb-2 gap-2">
                                    <span className="text-[11px] font-bold text-[#f9b03c] bg-[#f9b03c]/10 px-2 py-0.5 rounded-md">
                                      {note.lessonTitle || activeCourse?.title || 'ማስታወሻ'}
                                    </span>
                                    <div className="flex items-center gap-1.5">
                                      <span className="text-[10px] text-slate-500">{note.createdAt}</span>
                                      <button
                                        onClick={() => {
                                          navigator.clipboard.writeText(note.text);
                                          setCopiedNoteId(note.id);
                                          setTimeout(() => setCopiedNoteId(null), 2000);
                                        }}
                                        className="p-1 rounded text-slate-400 hover:text-white transition cursor-pointer"
                                        title="ኮፒ አድርግ"
                                      >
                                        <i
                                          className={`fa-solid ${
                                            copiedNoteId === note.id ? 'fa-check text-emerald-400' : 'fa-copy'
                                          } text-xs`}
                                        />
                                      </button>
                                      <button
                                        onClick={() => handleDeleteNote(note.id)}
                                        className="p-1 rounded text-slate-400 hover:text-rose-400 transition cursor-pointer"
                                        title="ሰርዝ"
                                      >
                                        <i className="fa-solid fa-trash text-xs" />
                                      </button>
                                    </div>
                                  </div>
                                  <p className="text-xs sm:text-sm text-slate-200 font-body leading-relaxed whitespace-pre-wrap">
                                    {note.text}
                                  </p>
                                </div>
                              );
                            })
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* 2. RESOURCES TAB */}
                {activeTab === 'resources' && (
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Main Course PDF */}
                      <div className="bg-white/[0.03] p-5 rounded-2xl border border-white/[0.08] flex flex-col justify-between hover:border-[#f9b03c]/40 transition">
                        <div className="flex items-start gap-3.5 mb-4">
                          <div className="w-12 h-12 rounded-xl bg-red-500/15 text-red-400 flex items-center justify-center text-xl shrink-0">
                            <i className="fa-solid fa-file-pdf"></i>
                          </div>
                          <div>
                            <h4 className="font-heading font-black text-sm text-white leading-tight">
                              {activeCourse?.pdfTitle || 'የኮርስ መማሪያ ሰነድ (Course Manual PDF)'}
                            </h4>
                            <p className="text-xs text-slate-400 mt-1">ሙሉ የትምህርቱ የተዘጋጀ ማስታወሻ እና መመሪያ</p>
                          </div>
                        </div>

                        {activeCourse?.pdfUrl ? (
                          <a
                            href={(() => {
                              const url = activeCourse.pdfUrl;
                              const match = url.match(/(?:file\/d\/|id=|\/d\/)([a-zA-Z0-9_-]{20,})/);
                              if (match && match[1]) {
                                return `https://drive.google.com/file/d/${match[1]}/view?usp=sharing`;
                              }
                              return url;
                            })()}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-full bg-red-500/10 hover:bg-red-500 hover:text-white text-red-400 font-bold py-2.5 rounded-xl text-xs flex items-center justify-center gap-2 border border-red-500/30 transition cursor-pointer"
                          >
                            <i className="fa-solid fa-download"></i>
                            <span>PDF አውርድ / ይመልከቱ (Download)</span>
                          </a>
                        ) : (
                          <div className="text-xs text-slate-500 italic bg-white/[0.02] p-2.5 rounded-xl text-center">
                            ማቴሪያሉ በቅርቡ ይጨመራል
                          </div>
                        )}
                      </div>

                      {/* Practical Assets */}
                      <div className="bg-white/[0.03] p-5 rounded-2xl border border-white/[0.08] flex flex-col justify-between hover:border-[#f9b03c]/40 transition">
                        <div className="flex items-start gap-3.5 mb-4">
                          <div className="w-12 h-12 rounded-xl bg-amber-500/15 text-amber-400 flex items-center justify-center text-xl shrink-0">
                            <i className="fa-solid fa-layer-group"></i>
                          </div>
                          <div>
                            <h4 className="font-heading font-black text-sm text-white leading-tight">
                              የተግባር ልምምድ ፋይሎች (Practice Assets)
                            </h4>
                            <p className="text-xs text-slate-400 mt-1">የትምህርቱ ማስፈንጠሪያዎች፣ ቴምፕሌቶች እና የኮድ ናሙናዎች</p>
                          </div>
                        </div>

                        <button
                          onClick={() => setActiveTab('overview')}
                          className="w-full bg-white/[0.04] hover:bg-[#f9b03c] hover:text-slate-950 text-slate-300 font-bold py-2.5 rounded-xl text-xs flex items-center justify-center gap-2 border border-white/[0.08] transition cursor-pointer"
                        >
                          <i className="fa-solid fa-arrow-up-right-from-square"></i>
                          <span>የትምህርቱን ማብራሪያ ይመልከቱ</span>
                        </button>
                      </div>
                    </div>

                    {/* VIP Community Card */}
                    <div className="p-5 sm:p-6 rounded-2xl bg-gradient-to-r from-[#26A5E4]/10 via-slate-900 to-[#26A5E4]/5 border border-[#26A5E4]/25 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <i className="fa-brands fa-telegram text-[#26A5E4] text-lg"></i>
                          <h4 className="font-heading font-black text-sm sm:text-base text-white">
                            የፀሐይ ካምፓስ VIP ተማሪዎች ማህበረሰብ
                          </h4>
                        </div>
                        <p className="text-xs text-slate-300 max-w-lg leading-relaxed">
                          ከተመዘገቡ ተማሪዎችና ከአሰልጣኞች ጋር በቀጥታ ይገናኙ፣ ጥያቄ ይጠይቁ፣ አዳዲስ እድሎችን ያግኙ።
                        </p>
                      </div>
                      <a
                        href="https://t.me/TsehayTeam"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-4 py-2.5 rounded-xl bg-[#26A5E4] hover:bg-[#1f8ec4] text-white text-xs font-black transition flex items-center gap-2 shrink-0 shadow-md shadow-[#26A5E4]/30"
                      >
                        <i className="fa-brands fa-telegram"></i>
                        <span>ቴሌግራም ግሩፕ ይቀላቀሉ</span>
                      </a>
                    </div>
                  </div>
                )}

                {/* 3. DISCUSSION / Q&A TAB */}
                {activeTab === 'qa' && (
                  <div className="space-y-4">
                    {/* Header */}
                    <div className="flex items-center justify-between p-3.5 bg-white/[0.03] rounded-2xl border border-white/[0.06]">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-[#f9b03c]/20 text-[#f9b03c] flex items-center justify-center text-sm font-black">
                          <i className="fa-solid fa-chalkboard-user"></i>
                        </div>
                        <div>
                          <h4 className="font-heading font-black text-xs sm:text-sm text-white">
                            ከመምህሩ ጋር ጥያቄና መልስ (Ask Instructor)
                          </h4>
                          <p className="text-[11px] text-slate-400">ጥያቄዎን፣ ፎቶ ወይም ድምፅ ለአሰልጣኙ ይላኩ</p>
                        </div>
                      </div>
                      <span className="text-[11px] font-bold text-slate-300 bg-white/[0.04] px-2.5 py-1 rounded-full border border-white/[0.08]">
                        አሰልጣኝ፦ {activeCourse?.instructor || 'Eyoub Sahle'}
                      </span>
                    </div>

                    {/* Questions Feed */}
                    <div className="space-y-3 max-h-[380px] overflow-y-auto no-scrollbar pr-1">
                      {studentTickets.filter((t: any) => !activeCourse || t.courseId === activeCourse.id).length === 0 ? (
                        <div className="text-center py-12 bg-white/[0.02] rounded-2xl border border-dashed border-white/[0.08]">
                          <i className="fa-solid fa-comments text-3xl text-slate-600 mb-2"></i>
                          <p className="text-xs font-bold text-slate-300">ለዚህ ኮርስ እስካሁን ምንም ጥያቄ አልላኩም።</p>
                          <p className="text-[11px] text-slate-500 mt-1">ያልገባዎትን ጥያቄ ከታች ባለው ሳጥን ይላኩ።</p>
                        </div>
                      ) : (
                        studentTickets
                          .filter((t: any) => !activeCourse || t.courseId === activeCourse.id)
                          .map((ticket: any) => (
                            <div
                              key={ticket.id}
                              className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-3.5 sm:p-4 space-y-2.5"
                            >
                              <div className="flex justify-between items-start">
                                <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                                  <span className="w-2 h-2 rounded-full bg-[#f9b03c]"></span>
                                  የእርስዎ ጥያቄ፦
                                </span>
                                <span
                                  className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                                    ticket.status === 'replied'
                                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                      : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                                  }`}
                                >
                                  {ticket.status === 'replied' ? '✓ መልስ ተሰጥቷል' : '⏳ በመጠባበቅ ላይ'}
                                </span>
                              </div>

                              {ticket.message && (
                                <p className="text-xs sm:text-sm text-slate-200 bg-black/30 p-3 rounded-xl border border-white/5 font-body leading-relaxed">
                                  {ticket.message}
                                </p>
                              )}

                              {ticket.attachment && (
                                <div className="mt-1">
                                  {ticket.attachment.type === 'image' && (
                                    <img
                                      src={ticket.attachment.url}
                                      alt={ticket.attachment.name}
                                      className="max-w-[240px] max-h-[180px] rounded-xl border border-white/10 shadow-sm"
                                    />
                                  )}
                                  {ticket.attachment.type === 'document' && (
                                    <a
                                      href={ticket.attachment.url}
                                      download={ticket.attachment.name}
                                      className="inline-flex items-center gap-1.5 text-xs text-sky-400 hover:underline"
                                    >
                                      <i className="fa-solid fa-file-pdf text-red-400"></i>
                                      <span>{ticket.attachment.name}</span>
                                    </a>
                                  )}
                                  {ticket.attachment.type === 'audio' && (
                                    <audio controls src={ticket.attachment.url} className="h-8 max-w-[240px]" />
                                  )}
                                </div>
                              )}

                              {ticket.replies && ticket.replies.length > 0 ? (
                                <div className="mt-2 pl-3 border-l-2 border-[#f9b03c] space-y-1.5">
                                  {ticket.replies.map((reply: any, rIdx: number) => (
                                    <div key={rIdx} className="bg-emerald-500/10 border border-emerald-500/20 p-3 rounded-xl">
                                      <span className="text-[11px] font-black text-emerald-400 block mb-1">
                                        የመምህሩ መልስ፦
                                      </span>
                                      <p className="text-xs sm:text-sm text-slate-200 font-body leading-relaxed">
                                        {reply.message}
                                      </p>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <p className="text-[11px] text-slate-500 italic">
                                  መምህሩ ጥያቄዎን ተመልክተው በቅርቡ መልስ ይሰጡዎታል።
                                </p>
                              )}
                            </div>
                          ))
                      )}
                    </div>

                    {/* Question Composer Box */}
                    <div className="pt-2 border-t border-white/[0.08]">
                      {questionSentMessage && (
                        <div className="mb-2 text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                          <i className="fa-solid fa-circle-check"></i>
                          <span>{questionSentMessage}</span>
                        </div>
                      )}

                      {qaAttachment && (
                        <div className="mb-2 p-2 bg-[#f9b03c]/10 border border-[#f9b03c]/30 rounded-xl flex items-center justify-between text-xs font-bold">
                          <span className="truncate max-w-[200px] text-white">{qaAttachment.name}</span>
                          <button
                            onClick={() => setQaAttachment(null)}
                            className="text-slate-400 hover:text-red-400 p-1 cursor-pointer"
                          >
                            <i className="fa-solid fa-xmark"></i>
                          </button>
                        </div>
                      )}

                      <div className="flex items-center gap-2 bg-slate-900/90 border border-white/10 rounded-2xl p-1.5 pl-2.5 focus-within:border-[#f9b03c] transition shadow-inner">
                        <div className="relative">
                          <button
                            type="button"
                            onClick={() => setShowAttachmentMenu((prev) => !prev)}
                            className="w-8 h-8 rounded-xl bg-white/[0.06] hover:bg-[#f9b03c] hover:text-slate-950 text-slate-300 flex items-center justify-center transition cursor-pointer"
                            title="ፋይል አያይዝ"
                          >
                            <i className="fa-solid fa-paperclip text-xs"></i>
                          </button>

                          {showAttachmentMenu && (
                            <div className="absolute bottom-11 left-0 bg-[#0c1428] border border-white/15 rounded-xl shadow-2xl p-1.5 z-50 flex flex-col gap-1 w-48">
                              <label className="flex items-center gap-2 p-2 rounded-lg hover:bg-white/10 cursor-pointer text-xs font-bold text-white transition">
                                <i className="fa-solid fa-image text-emerald-400"></i> ፎቶ / ስክሪንሾት
                                <input
                                  type="file"
                                  accept="image/*"
                                  onChange={(e) => handleQaFileUpload(e, 'image')}
                                  className="hidden"
                                />
                              </label>
                              <label className="flex items-center gap-2 p-2 rounded-lg hover:bg-white/10 cursor-pointer text-xs font-bold text-white transition">
                                <i className="fa-solid fa-file-pdf text-red-400"></i> ሰነድ / PDF
                                <input
                                  type="file"
                                  accept=".pdf,.doc,.docx,.txt,.zip"
                                  onChange={(e) => handleQaFileUpload(e, 'document')}
                                  className="hidden"
                                />
                              </label>
                              {isRecordingVoice ? (
                                <button
                                  onClick={handleStopVoiceRecord}
                                  className="flex items-center gap-2 p-2 rounded-lg bg-red-500 text-white text-xs font-bold w-full transition"
                                >
                                  <i className="fa-solid fa-stop animate-pulse"></i> አቁም
                                </button>
                              ) : (
                                <button
                                  onClick={handleStartVoiceRecord}
                                  className="flex items-center gap-2 p-2 rounded-lg hover:bg-white/10 text-xs font-bold text-white w-full transition cursor-pointer"
                                >
                                  <i className="fa-solid fa-microphone text-[#f9b03c]"></i> ድምፅ መቅጃ
                                </button>
                              )}
                            </div>
                          )}
                        </div>

                        <input
                          type="text"
                          value={questionInput}
                          onChange={(e) => setQuestionInput(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && handleAskAdmin()}
                          placeholder="ለኮርሱ መምህር የሚያስተላልፉትን ጥያቄ እዚህ ይፃፉ..."
                          className="flex-1 bg-transparent px-2 py-1.5 text-xs sm:text-sm outline-none text-white placeholder-slate-500"
                        />

                        <button
                          onClick={handleAskAdmin}
                          className="px-4 py-2 bg-[#f9b03c] hover:bg-yellow-400 text-slate-950 font-black rounded-xl flex items-center gap-1.5 transition shadow-sm text-xs cursor-pointer active:scale-95 shrink-0"
                        >
                          <i className="fa-solid fa-paper-plane text-xs"></i>
                          <span className="hidden sm:inline">ላክ</span>
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* 4. EXAM & CERTIFICATE TAB */}
                {activeTab === 'exam' && (
                  <div className="space-y-6">
                    <CourseQuiz
                      course={activeCourse}
                      user={user}
                      onPass={(score) => handleQuizPass(activeCourse?.id, score)}
                      onViewCertificate={() => {}}
                    />

                    {passedQuizzes[activeCourse?.id] || hasTakenQuiz ? (
                      <div className="pt-6 border-t border-white/10">
                        <CourseCertificate
                          course={activeCourse}
                          user={user}
                          score={passedQuizzes[activeCourse?.id]?.score || 90}
                          issueDate={passedQuizzes[activeCourse?.id]?.passedAt}
                        />
                      </div>
                    ) : null}
                  </div>
                )}
              </div>
            </div>
          </main>

          {/* ===================================================================== */}
          {/* Right: Collapsible Course Syllabus Sidebar (30% Width)                 */}
          {/* ===================================================================== */}
          {isSyllabusOpen && (
            <aside className="lg:col-span-4 xl:col-span-3 w-full animate-in fade-in slide-in-from-right-3 duration-300">
              <div className="bg-[#0C1220]/90 backdrop-blur-2xl rounded-2xl border border-white/[0.08] shadow-2xl flex flex-col h-[calc(100vh-130px)] sticky top-20 overflow-hidden">
                {/* Syllabus Header */}
                <div className="p-4 sm:p-5 border-b border-white/[0.08] flex items-start justify-between gap-3 bg-black/20">
                  <div className="min-w-0">
                    <h3 className="font-heading font-black text-sm sm:text-base text-white truncate">
                      የኮርስ ይዘት (Course Syllabus)
                    </h3>
                    <div className="flex items-center gap-2 mt-1 text-xs text-slate-400">
                      <span>{modules.length} ምዕራፎች</span>
                      <span>•</span>
                      <span className="text-[#f9b03c] font-bold">
                        {completedLessonsCount}/{totalLessonsCount} ተጠናቋል
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setIsSyllabusOpen(false)}
                    className="w-7 h-7 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-slate-400 hover:text-white border border-white/10 flex items-center justify-center transition cursor-pointer shrink-0 mt-0.5"
                    title="ይዘቱን እጠፍ (Collapse Sidebar)"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                {/* Vertically Scrollable Accordion List */}
                <div className="flex-1 overflow-y-auto no-scrollbar p-3 sm:p-3.5 space-y-3">
                  {modules.length === 0 ? (
                    <div className="p-8 text-center text-slate-500 text-xs font-bold">
                      ምንም ትምህርት አልተገኘም
                    </div>
                  ) : (
                    (() => {
                      let currentGlobalIdx = 0;
                      return modules.map((mod: any, mIdx: number) => (
                        <div
                          key={mod.id || mIdx}
                          className="bg-white/[0.02] border border-white/[0.06] rounded-xl overflow-hidden"
                        >
                          {/* Module Header */}
                          <div className="p-3 bg-white/[0.03] border-b border-white/[0.04] flex items-center justify-between">
                            <h4 className="font-heading font-black text-xs text-slate-200 truncate pr-2">
                              ክፍል {mIdx + 1}: {mod.title}
                            </h4>
                            <span className="text-[10px] text-slate-400 font-bold px-1.5 py-0.5 rounded bg-white/[0.05] shrink-0">
                              {(mod.lessons || []).length}
                            </span>
                          </div>

                          {/* Lessons inside Module */}
                          <div className="p-1.5 space-y-1">
                            {(mod.lessons || []).map((lesson: any, lIdx: number) => {
                              const globalIdx = currentGlobalIdx++;
                              const isActive = activeLesson?.title === lesson.title;
                              const isCompleted = progress.includes(lesson.title);
                              const prevLessonTitle = globalIdx > 0 ? allFlatLessons[globalIdx - 1]?.title : null;
                              const isUnlocked =
                                isCourseCompleted ||
                                globalIdx === 0 ||
                                (prevLessonTitle ? progress.includes(prevLessonTitle) : true);

                              return (
                                <button
                                  key={lIdx}
                                  type="button"
                                  onClick={() => {
                                    if (!isUnlocked) {
                                      alert('🔒 ይህ ትምህርት አልተከፈተም! እባክዎ መጀመሪያ የቀደመውን ትምህርት አይተው ያጠናቁ።');
                                      return;
                                    }
                                    const selected = { ...lesson, moduleIndex: mIdx, lessonIndex: lIdx };
                                    setActiveLesson(selected);
                                    try {
                                      localStorage.setItem('tsehay_user_active_lesson', JSON.stringify(selected));
                                    } catch (e) {}
                                    if (updateUrlState) {
                                      updateUrlState({ view: 'classroom', courseId: activeCourse?.id, lesson: lIdx });
                                    }
                                    window.scrollTo({ top: 0, behavior: 'smooth' });
                                  }}
                                  className={`w-full text-left p-2.5 rounded-xl transition-all duration-200 flex items-center justify-between gap-2.5 cursor-pointer border ${
                                    !isUnlocked
                                      ? 'opacity-40 cursor-not-allowed bg-transparent border-transparent'
                                      : isActive
                                      ? 'bg-[#f9b03c]/15 border-[#f9b03c]/40 text-white shadow-sm'
                                      : isCompleted
                                      ? 'bg-white/[0.01] hover:bg-white/[0.04] border-transparent text-slate-300'
                                      : 'bg-white/[0.02] hover:bg-white/[0.05] border-transparent text-slate-200'
                                  }`}
                                >
                                  <div className="flex items-center gap-2.5 min-w-0">
                                    {isActive ? (
                                      <div className="w-5 h-5 rounded-full bg-[#f9b03c] text-slate-950 flex items-center justify-center text-[10px] shrink-0 animate-pulse">
                                        <i className="fa-solid fa-play"></i>
                                      </div>
                                    ) : isCompleted ? (
                                      <div className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-[10px] shrink-0">
                                        <i className="fa-solid fa-check"></i>
                                      </div>
                                    ) : !isUnlocked ? (
                                      <div className="w-5 h-5 rounded-full bg-white/5 text-slate-500 flex items-center justify-center text-[10px] shrink-0">
                                        <i className="fa-solid fa-lock"></i>
                                      </div>
                                    ) : (
                                      <div className="w-5 h-5 rounded-full bg-white/5 text-slate-400 flex items-center justify-center text-[10px] shrink-0">
                                        <i className="fa-regular fa-circle-play"></i>
                                      </div>
                                    )}

                                    <div className="min-w-0">
                                      <p
                                        className={`text-xs font-bold truncate ${
                                          isActive
                                            ? 'text-[#f9b03c]'
                                            : isCompleted
                                            ? 'text-slate-200'
                                            : !isUnlocked
                                            ? 'text-slate-500'
                                            : 'text-slate-300'
                                        }`}
                                      >
                                        {lesson.title}
                                      </p>
                                      <div className="flex items-center gap-2 text-[10px] text-slate-500 mt-0.5">
                                        <span>{lesson.duration || '00:00'}</span>
                                        {lesson.points && (
                                          <span className="text-[#f9b03c]/80">+{lesson.points} ነጥብ</span>
                                        )}
                                      </div>
                                    </div>
                                  </div>

                                  {isActive && (
                                    <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-[#f9b03c] text-slate-950 shrink-0">
                                      አሁን
                                    </span>
                                  )}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      ));
                    })()
                  )}
                </div>
              </div>
            </aside>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. Bottom Floating Action Bar (Sticky / Low-profile)                      */}
      {/* ========================================================================= */}
      <footer className="fixed bottom-0 inset-x-0 z-40 bg-[#0B0F17]/95 backdrop-blur-2xl border-t border-white/[0.08] px-3 sm:px-8 py-3.5 shadow-2xl">
        <div className="max-w-[1720px] mx-auto flex items-center justify-between gap-3">
          {/* Previous Lesson */}
          <button
            type="button"
            onClick={handlePrevLesson}
            disabled={!hasPrev}
            className={`px-3.5 sm:px-5 py-2.5 rounded-xl text-xs sm:text-sm font-black transition-all flex items-center gap-2 border ${
              hasPrev
                ? 'bg-white/[0.05] hover:bg-white/[0.1] text-white border-white/10 hover:border-white/20 cursor-pointer active:scale-95'
                : 'bg-white/[0.01] text-slate-600 border-transparent cursor-not-allowed opacity-40'
            }`}
            title={hasPrev ? 'የቀደመው ትምህርት (Previous Lesson)' : ''}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
            </svg>
            <span className="font-heading hidden xs:inline">የቀደመ ትምህርት</span>
          </button>

          {/* Mark as Complete Action */}
          <button
            type="button"
            onClick={() => markLessonCompleted(activeLesson)}
            className={`px-4 sm:px-6 py-2.5 rounded-xl text-xs sm:text-sm font-black transition-all duration-200 flex items-center gap-2 cursor-pointer active:scale-95 border ${
              isCurrentCompleted
                ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40 hover:bg-emerald-500/25'
                : 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white border-emerald-400/40 shadow-lg shadow-emerald-600/30'
            }`}
          >
            <div
              className={`w-4 h-4 rounded-md flex items-center justify-center text-[10px] ${
                isCurrentCompleted ? 'bg-emerald-400 text-slate-950 font-black' : 'border border-white/40'
              }`}
            >
              {isCurrentCompleted && <i className="fa-solid fa-check"></i>}
            </div>
            <span className="font-heading">
              {isCurrentCompleted ? 'ተጠናቋል ✓' : 'እንደተጠናቀቀ ምልክት አድርግ'}
            </span>
            {!isCurrentCompleted && (
              <span className="text-[10px] bg-[#f9b03c] text-slate-950 font-black px-1.5 py-0.5 rounded-md ml-1 shadow-xs">
                +{activeLesson?.points || 25}
              </span>
            )}
          </button>

          {/* Next Lesson or Final Exam */}
          <button
            type="button"
            onClick={handleNextLesson}
            className={`px-4 sm:px-6 py-2.5 rounded-xl text-xs sm:text-sm font-black transition-all flex items-center gap-2 cursor-pointer active:scale-95 border shadow-lg ${
              hasNext
                ? 'bg-gradient-to-r from-amber-400 via-[#f9b03c] to-amber-500 hover:brightness-110 text-slate-950 border-amber-300/60 shadow-[#f9b03c]/20'
                : 'bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-400 text-white border-emerald-300/70 shadow-emerald-500/30 animate-pulse'
            }`}
          >
            <span className="font-heading">{hasNext ? 'የሚቀጥለው ትምህርት' : 'ወደ ፈተናው ይሂዱ 🎯'}</span>
            <svg className="w-4 h-4 text-current" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
            </svg>
          </button>
        </div>
      </footer>
    </div>
  );
}
