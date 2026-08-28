import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const uid = (searchParams.get('uid') || '').trim();

    if (!uid) {
      return NextResponse.json({
        success: false,
        error: 'UID is required'
      }, { status: 400 });
    }

    if (!adminDb) {
      return NextResponse.json({
        success: false,
        error: 'Database connection is initializing'
      }, { status: 503 });
    }

    // 1. Fetch user profile stats
    const profileRef = adminDb.collection('artifacts').doc('tsehaycampus-e1a6d').collection('users').doc(uid).collection('profile').doc('info');
    const profileSnap = await profileRef.get();
    const profileData = profileSnap.exists ? (profileSnap.data() || {}) : {};

    const referralCount = Number(profileData.referralCount || 0);
    const hasFreeCourseReward = Boolean(profileData.hasFreeCourseReward || referralCount >= 5);
    const hasMentorshipReward = Boolean(profileData.hasMentorshipReward || referralCount >= 10);
    const claimedFreeCourse = Boolean(profileData.claimedFreeCourse);
    const claimedMentorship = Boolean(profileData.claimedMentorship);

    // 2. Query referred friends list
    const referralsRef = adminDb.collection('artifacts').doc('tsehaycampus-e1a6d').collection('referrals');
    const qSnap = await referralsRef.where('referrerUid', '==', uid).limit(50).get();

    const referredFriends = qSnap.docs.map(doc => {
      const d = doc.data();
      // Mask email for student privacy: e.g. e***@gmail.com
      let maskedEmail = d.referredEmail || '';
      if (maskedEmail && maskedEmail.includes('@')) {
        const [local, domain] = maskedEmail.split('@');
        maskedEmail = `${local.charAt(0)}***@${domain}`;
      }

      return {
        id: doc.id,
        name: d.referredName || 'አዲስ ተማሪ',
        email: maskedEmail,
        createdAt: d.createdAt || '',
        status: d.status || 'completed'
      };
    });

    return NextResponse.json({
      success: true,
      uid,
      referralCount,
      milestones: {
        nextMilestone: referralCount < 5 ? 5 : referralCount < 10 ? 10 : 10,
        freeCourseUnlocked: hasFreeCourseReward,
        mentorshipUnlocked: hasMentorshipReward,
        freeCourseClaimed: claimedFreeCourse,
        mentorshipClaimed: claimedMentorship,
        progressToFreeCourse: Math.min(100, Math.round((referralCount / 5) * 100)),
        progressToMentorship: Math.min(100, Math.round((referralCount / 10) * 100))
      },
      referredFriends
    });
  } catch (err: any) {
    console.error('Referral stats error:', err);
    return NextResponse.json({
      success: false,
      error: err.message || 'Internal server error'
    }, { status: 500 });
  }
}
