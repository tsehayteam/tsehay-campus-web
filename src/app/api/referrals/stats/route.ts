import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase/server';

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

    // 1. Fetch user profile stats
    const { data: profileData } = await supabaseServer
      .from('profiles')
      .select('*')
      .eq('id', uid)
      .maybeSingle();

    const referralCount = Number(profileData?.referral_count || profileData?.referralCount || 0);
    const hasFreeCourseReward = Boolean(profileData?.has_free_course_reward || referralCount >= 5);
    const hasMentorshipReward = Boolean(profileData?.has_mentorship_reward || referralCount >= 10);
    const claimedFreeCourse = Boolean(profileData?.claimed_free_course);
    const claimedMentorship = Boolean(profileData?.claimed_mentorship);

    // 2. Query referred friends list
    const { data: refRows } = await supabaseServer
      .from('referrals')
      .select('*')
      .eq('referrer_id', uid)
      .limit(50);

    const referredFriends = (refRows || []).map((d: any) => {
      let maskedEmail = d.referred_email || d.email || '';
      if (maskedEmail && maskedEmail.includes('@')) {
        const [local, domain] = maskedEmail.split('@');
        maskedEmail = `${local.charAt(0)}***@${domain}`;
      }

      return {
        id: d.id,
        name: d.referred_name || d.name || 'አዲስ ተማሪ',
        email: maskedEmail,
        createdAt: d.created_at || '',
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
