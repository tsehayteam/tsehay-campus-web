'use client';
import React, { useState } from 'react';
import { db } from '@/lib/firebase/config';
import { collection, addDoc, doc, getDoc, updateDoc, serverTimestamp, getDocs, query, where } from 'firebase/firestore';

interface CourseRatingModalProps {
  isOpen: boolean;
  onClose: () => void;
  courseId: string;
  courseTitle: string;
  user: any;
  onRatingSubmitted?: () => void;
}

export default function CourseRatingModal({
  isOpen,
  onClose,
  courseId,
  courseTitle,
  user,
  onRatingSubmitted
}: CourseRatingModalProps) {
  const [rating, setRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !courseId) return;

    setIsSubmitting(true);
    try {
      // 1. Save individual review in Firestore
      const reviewsRef = collection(db, 'artifacts', 'tsehaycampus-e1a6d', 'public', 'data', 'reviews');
      await addDoc(reviewsRef, {
        courseId,
        userId: user.uid,
        userName: user.displayName || 'Tsehay Student',
        userPhoto: user.photoURL || '',
        rating,
        comment: comment.trim(),
        createdAt: serverTimestamp()
      });

      // 2. Recalculate course average rating & update course document
      const q = query(reviewsRef, where('courseId', '==', courseId));
      const snapshot = await getDocs(q);
      let totalRating = 0;
      let count = 0;
      snapshot.forEach(docSnap => {
        totalRating += docSnap.data().rating || 5;
        count++;
      });

      const avgRating = count > 0 ? Number((totalRating / count).toFixed(1)) : rating;

      const courseRef = doc(db, 'artifacts', 'tsehaycampus-e1a6d', 'public', 'data', 'courses', courseId);
      await updateDoc(courseRef, {
        ratingAvg: avgRating,
        ratingCount: count,
        instructorRatingAvg: avgRating
      });

      localStorage.setItem('rated_course_' + courseId, 'true');
      setIsSubmitted(true);
      if (onRatingSubmitted) onRatingSubmitted();
      setTimeout(() => {
        setIsSubmitted(false);
        onClose();
      }, 2000);
    } catch (err) {
      console.error("Failed to submit rating:", err);
      alert("ይቅርታ፣ ሬቲንግ ለማስገባት አልተቻለም። እባክዎ ድጋሚ ይሞክሩ።");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-3xl max-w-lg w-full p-6 md:p-8 shadow-2xl relative">
        <button 
          onClick={onClose}
          className="absolute top-5 right-5 text-gray-400 hover:text-dark dark:hover:text-white text-lg font-bold w-8 h-8 rounded-full bg-gray-100 dark:bg-slate-800 flex items-center justify-center transition"
        >
          ✕
        </button>

        {isSubmitted ? (
          <div className="py-8 text-center space-y-4">
            <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center text-3xl mx-auto animate-bounce">
              ✓
            </div>
            <h3 className="text-2xl font-black text-dark dark:text-white">እናመሰግናለን!</h3>
            <p className="text-sm text-gray-500 font-bold">የሰጡት ሬቲንግ እና አስተያየት በተሳካ ሁኔታ ተመዝግቧል!</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="text-center">
              <div className="inline-flex items-center gap-2 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/40 text-amber-700 dark:text-amber-400 text-xs font-black px-3.5 py-1.5 rounded-full mb-3">
                <i className="fa-solid fa-star"></i> የኮርስ እና መምህር ሬቲንግ
              </div>
              <h3 className="text-xl md:text-2xl font-black text-dark dark:text-white line-clamp-1">
                {courseTitle}
              </h3>
              <p className="text-xs text-gray-500 mt-1">
                ለትምህርቱ እና ለመምህሩ ከ 1 እስከ 5 ኮከብ ደረጃ ይስጡ
              </p>
            </div>

            {/* Interactive Star Selection */}
            <div className="flex justify-center items-center gap-2 py-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  type="button"
                  key={star}
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHoverRating(star)}
                  onMouseLeave={() => setHoverRating(0)}
                  className="p-1.5 focus:outline-none transition-transform hover:scale-125"
                >
                  <i 
                    className={`fa-solid fa-star text-3xl md:text-4xl transition-colors ${
                      star <= (hoverRating || rating)
                        ? 'text-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.6)]'
                        : 'text-gray-200 dark:text-slate-700'
                    }`}
                  ></i>
                </button>
              ))}
            </div>

            <div className="text-center font-black text-sm text-amber-600 dark:text-amber-400">
              {rating === 5 && '🌟 በጣም እጅግ በጣም ጥሩ (Excellent)'}
              {rating === 4 && '👍 በጣም ጥሩ (Very Good)'}
              {rating === 3 && '👌 ጥሩ (Good)'}
              {rating === 2 && '😐 መካከለኛ (Fair)'}
              {rating === 1 && '👎 ማስተካከያ ያስፈልገዋል (Needs Work)'}
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-600 dark:text-gray-300 mb-2">
                ተጨማሪ አስተያየት (አማራጭ)፦
              </label>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="ስለ ኮርሱ እና መምህሩ ያለዎትን አስተያየት እዚህ ይጻፉ..."
                className="w-full bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-2xl p-3.5 text-sm text-dark dark:text-white outline-none focus:border-amber-400 transition min-h-[90px]"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3.5 bg-primary text-dark font-black rounded-2xl hover:bg-yellow-400 transition shadow-lg flex items-center justify-center gap-2 text-base"
            >
              {isSubmitting ? (
                <span>በማስገባት ላይ...</span>
              ) : (
                <>
                  <i className="fa-solid fa-paper-plane"></i>
                  <span>ሬቲንግ አስገባ</span>
                </>
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
