import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';

export async function POST(req: NextRequest) {
  try {
    let body: any = {};
    try {
      body = await req.json();
    } catch (e) {
      body = {};
    }

    const uid = (body.uid || body.userId || '').trim();
    const rewardType = body.rewardType as 'free_course' | 'mentorship';
    const courseId = body.courseId;
    const courseTitle = body.courseTitle || 'Tsehay Campus Premium Course';
    const notes = body.notes || '';
    const phone = body.phone || '';

    if (!uid || !rewardType) {
      return NextResponse.json({
        success: false,
        error: 'UID and rewardType are required'
      }, { status: 400 });
    }

    if (!adminDb) {
      return NextResponse.json({
        success: false,
        error: 'Database connection is initializing'
      }, { status: 503 });
    }

    // Verify student's referral eligibility
    const userProfileRef = adminDb.collection('artifacts').doc('tsehaycampus-e1a6d').collection('users').doc(uid).collection('profile').doc('info');
    const profileSnap = await userProfileRef.get();

    if (!profileSnap.exists) {
      return NextResponse.json({
        success: false,
        error: 'User profile not found'
      }, { status: 404 });
    }

    const profileData = profileSnap.data() || {};
    const referralCount = Number(profileData.referralCount || 0);
    const nowIso = new Date().toISOString();

    if (rewardType === 'free_course') {
      if (referralCount < 5 && !profileData.hasFreeCourseReward) {
        return NextResponse.json({
          success: false,
          error: 'ነፃ ኮርስ ለመውሰድ ቢያንስ 5 ጓደኞችዎን መጋበዝ አለብዎት (Minimum 5 referrals required).'
        }, { status: 403 });
      }

      if (!courseId) {
        return NextResponse.json({
          success: false,
          error: 'እባክዎ የሚፈልጉትን ኮርስ ይምረጡ (Course ID is required).'
        }, { status: 400 });
      }

      // Provision free course access directly in Firestore
      const purchasedCourseRef = adminDb.collection('artifacts').doc('tsehaycampus-e1a6d').collection('users').doc(uid).collection('purchased_courses').doc(courseId);
      await purchasedCourseRef.set({
        courseId,
        title: courseTitle,
        isUnlocked: true,
        grantedBy: 'Referral Reward (5 Invites)',
        purchasedAt: nowIso,
        progress: 0,
        completedLessons: []
      }, { merge: true });

      // Update user profile reward state
      await userProfileRef.set({
        claimedFreeCourse: true,
        freeCourseClaimedAt: nowIso,
        claimedCourseId: courseId,
        claimedCourseTitle: courseTitle
      }, { merge: true });

      return NextResponse.json({
        success: true,
        message: `🎉 እንኳን ደስ አሎት! የ"${courseTitle}" ኮርስ በነፃ ተከፍቶልዎታል!`
      });
    }

    if (rewardType === 'mentorship') {
      if (referralCount < 10 && !profileData.hasMentorshipReward) {
        return NextResponse.json({
          success: false,
          error: 'የግል ማማከር (Mentorship) ለማግኘት ቢያንስ 10 ጓደኞችዎን መጋበዝ አለብዎት (Minimum 10 referrals required).'
        }, { status: 403 });
      }

      // Record VIP mentorship booking
      const mentorshipRef = adminDb.collection('artifacts').doc('tsehaycampus-e1a6d').collection('mentorship_requests').doc(`mentor_${uid}`);
      await mentorshipRef.set({
        userId: uid,
        userName: profileData.name || 'ተማሪ',
        userEmail: profileData.email || '',
        userPhone: phone || profileData.phone || '',
        status: 'pending_scheduling',
        notes: notes || '1-on-1 Mentorship earned via 10 Referrals Milestone',
        requestedAt: nowIso,
        timestamp: FieldValue.serverTimestamp()
      }, { merge: true });

      // Update user profile reward state
      await userProfileRef.set({
        claimedMentorship: true,
        mentorshipClaimedAt: nowIso
      }, { merge: true });

      return NextResponse.json({
        success: true,
        message: '🚀 የ 1-on-1 Mentorship ጥያቄዎ ተመዝግቧል! አስተባባሪዎቻችን በስልክ/ቴሌግራም ያገኙዎታል።'
      });
    }

    return NextResponse.json({
      success: false,
      error: 'Invalid rewardType'
    }, { status: 400 });
  } catch (err: any) {
    console.error('Claim reward error:', err);
    return NextResponse.json({
      success: false,
      error: err.message || 'Internal server error'
    }, { status: 500 });
  }
}
