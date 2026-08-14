'use client';
import React, { useState, useEffect } from 'react';
import { db } from '@/lib/firebase/config';
import { collection, addDoc, doc, setDoc, updateDoc, serverTimestamp, getDocs, query, where } from 'firebase/firestore';

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
  const [hasExistingReview, setHasExistingReview] = useState(false);

  // Load existing user review if already submitted
  useEffect(() => {
    if (!isOpen || !user?.uid || !courseId) return;

    let isMounted = true;
    const loadUserExistingReview = async () => {
      try {
        const reviewsRef = collection(db, 'artifacts', 'tsehaycampus-e1a6d', 'public', 'data', 'reviews');
        const q = query(reviewsRef, where('courseId', '==', courseId), where('userId', '==', user.uid));
        const snap = await getDocs(q);
        if (isMounted && !snap.empty) {
          const data = snap.docs[0].data();
          if (data.rating) setRating(data.rating);
          if (data.comment) setComment(data.comment);
          setHasExistingReview(true);
        } else {
          setHasExistingReview(false);
        }
      } catch (err) {
        console.warn("Could not fetch previous review:", err);
      }
    };
    loadUserExistingReview();

    return () => { isMounted = false; };
  }, [isOpen, user?.uid, courseId]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !courseId) return;

    setIsSubmitting(true);
    try {
      const reviewsRef = collection(db, 'artifacts', 'tsehaycampus-e1a6d', 'public', 'data', 'reviews');
      const qUserReview = query(reviewsRef, where('courseId', '==', courseId), where('userId', '==', user.uid));
      const userReviewSnap = await getDocs(qUserReview);

      // 1. Ensure 1 review per user per course (update existing or create new)
      if (!userReviewSnap.empty) {
        const existingDocRef = userReviewSnap.docs[0].ref;
        await setDoc(existingDocRef, {
          courseId,
          userId: user.uid,
          userName: user.displayName || 'Tsehay Student',
          userPhoto: user.photoURL || '',
          rating,
          comment: comment.trim(),
          updatedAt: serverTimestamp()
        }, { merge: true });
      } else {
        await addDoc(reviewsRef, {
          courseId,
          userId: user.uid,
          userName: user.displayName || 'Tsehay Student',
          userPhoto: user.photoURL || '',
          rating,
          comment: comment.trim(),
          createdAt: serverTimestamp()
        });
      }

      // 2. Recalculate average course rating
      const allCourseReviewsQuery = query(reviewsRef, where('courseId', '==', courseId));
      const allReviewsSnap = await getDocs(allCourseReviewsQuery);
      let totalRating = 0;
      let count = 0;
      allReviewsSnap.forEach(docSnap => {
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

      // 3. Mark hasRated in user's purchased_courses
      try {
        const userPurchasedRef = doc(db, 'artifacts', 'tsehaycampus-e1a6d', 'users', user.uid, 'purchased_courses', courseId);
        await setDoc(userPurchasedRef, {
          hasRated: true,
          userRating: rating,
          userComment: comment.trim(),
          ratedAt: serverTimestamp()
        }, { merge: true });
      } catch (userErr) {
        console.warn("Could not save hasRated in user doc:", userErr);
      }

      // 4. Save to localStorage
      localStorage.setItem('rated_course_' + courseId, 'true');
      setIsSubmitted(true);
      if (onRatingSubmitted) onRatingSubmitted();

      setTimeout(() => {
        setIsSubmitted(false);
        onClose();
      }, 1200);
    } catch (err) {
      console.error("Failed to submit rating:", err);
      alert("ይቅርታ፣ ሬቲንግ ለማስገባት አልተቻለም። እባክዎ ድጋሚ ይሞክሩ።");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-3xl max-w-md w-full p-6 sm:p-7 shadow-2xl relative">
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-dark dark:hover:text-white text-sm font-bold w-8 h-8 rounded-full bg-gray-100 dark:bg-slate-800 flex items-center justify-center transition cursor-pointer hover:bg-gray-200"
          title="ዝጋ (Close)"
        >
          ✕
        </button>

        {isSubmitted ? (
          <div className="py-8 text-center space-y-3 animate-in zoom-in-95 duration-200">
            <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center text-3xl mx-auto">
              ✓
            </div>
            <h3 className="text-xl font-black text-dark dark:text-white">እናመሰግናለን!</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 font-bold">የሰጡት ሬቲንግ እና አስተያየት በተሳካ ሁኔታ ተመዝግቧል።</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="text-center pt-2">
              <div className="inline-flex items-center gap-1.5 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/40 text-amber-700 dark:text-amber-400 text-[11px] font-black px-3 py-1 rounded-full mb-2">
                <i className="fa-solid fa-star text-amber-500"></i>
                <span>{hasExistingReview ? 'የተሰጠ ሬቲንግ ማስተካከያ' : 'የኮርስ ሬቲንግ'}</span>
              </div>
              <h3 className="text-lg sm:text-xl font-black text-dark dark:text-white line-clamp-1">
                {courseTitle}
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                ለትምህርቱ እና ለመምህሩ ከ 1 እስከ 5 ኮከብ ይስጡ
              </p>
            </div>

            {/* Interactive Star Selection */}
            <div className="flex justify-center items-center gap-2 py-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  type="button"
                  key={star}
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHoverRating(star)}
                  onMouseLeave={() => setHoverRating(0)}
                  className="p-1 focus:outline-none transition-transform hover:scale-125 cursor-pointer"
                >
                  <i 
                    className={`fa-solid fa-star text-3xl sm:text-4xl transition-colors ${
                      star <= (hoverRating || rating)
                        ? 'text-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.6)]'
                        : 'text-gray-200 dark:text-slate-700'
                    }`}
                  ></i>
                </button>
              ))}
            </div>

            <div className="text-center font-black text-xs sm:text-sm text-amber-600 dark:text-amber-400">
              {rating === 5 && '🌟 በጣም እጅግ ጥሩ (5/5)'}
              {rating === 4 && '👍 በጣም ጥሩ (4/5)'}
              {rating === 3 && '👌 ጥሩ (3/5)'}
              {rating === 2 && '😐 መካከለኛ (2/5)'}
              {rating === 1 && '👎 ማስተካከያ ይፈልጋል (1/5)'}
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-600 dark:text-gray-300 mb-1.5">
                ተጨማሪ አስተያየት (አማራጭ)፦
              </label>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="ስለ ኮርሱ እና መምህሩ ያለዎትን አስተያየት እዚህ ይጻፉ..."
                className="w-full bg-gray-50 dark:bg-slate-800/80 border border-gray-200 dark:border-slate-700 rounded-2xl p-3 text-xs sm:text-sm text-dark dark:text-white outline-none focus:border-amber-400 transition min-h-[80px]"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 bg-gradient-to-r from-amber-400 via-primary to-yellow-400 hover:from-amber-300 hover:to-yellow-300 text-dark font-black rounded-2xl transition shadow-md flex items-center justify-center gap-2 text-sm cursor-pointer active:scale-95 disabled:opacity-50"
            >
              {isSubmitting ? (
                <span>በማስገባት ላይ...</span>
              ) : (
                <>
                  <i className="fa-solid fa-paper-plane"></i>
                  <span>{hasExistingReview ? 'ሬቲንግ አድስ' : 'ሬቲንግ አስገባ'}</span>
                </>
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

