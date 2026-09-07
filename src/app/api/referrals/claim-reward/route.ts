import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase/server';

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

    // Verify student's referral eligibility
    const { data: profileData } = await supabaseServer
      .from('profiles')
      .select('*')
      .eq('id', uid)
      .maybeSingle();

    if (!profileData) {
      return NextResponse.json({
        success: false,
        error: 'User profile not found'
      }, { status: 404 });
    }

    const referralCount = Number(profileData.referral_count || profileData.referralCount || 0);
    const nowIso = new Date().toISOString();

    if (rewardType === 'free_course') {
      if (referralCount < 5 && !profileData.has_free_course_reward) {
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

      // Provision free course access directly in Supabase enrollments
      await supabaseServer.from('enrollments').upsert({
        id: `${uid}_${courseId}`,
        user_id: uid,
        course_id: courseId,
        title: courseTitle,
        payment_method: 'referral_reward',
        amount: 0,
        status: 'active',
        created_at: nowIso
      });

      // Update user profile reward state
      await supabaseServer.from('profiles').upsert({
        id: uid,
        claimed_free_course: true,
        free_course_claimed_at: nowIso,
        claimed_course_id: courseId,
        claimed_course_title: courseTitle
      });

      return NextResponse.json({
        success: true,
        message: `🎉 እንኳን ደስ አሎት! የ"${courseTitle}" ኮርስ በነፃ ተከፍቶልዎታል!`
      });
    }

    if (rewardType === 'mentorship') {
      if (referralCount < 10 && !profileData.has_mentorship_reward) {
        return NextResponse.json({
          success: false,
          error: 'የግል ማማከር (Mentorship) ለማግኘት ቢያንስ 10 ጓደኞችዎን መጋበዝ አለብዎት (Minimum 10 referrals required).'
        }, { status: 403 });
      }

      // Record VIP mentorship booking
      await supabaseServer.from('mentorship_bookings').upsert({
        id: `MNTR-REF-${uid}`,
        user_id: uid,
        name: profileData.name || 'ተማሪ',
        email: profileData.email || '',
        phone: phone || profileData.phone || '',
        topic: notes || '1-on-1 Mentorship earned via 10 Referrals Milestone',
        tier: '5-Hour VIP Intensive Blueprint',
        amount: 0,
        meeting_mode: 'online',
        payment_method: 'referral_milestone',
        status: 'pending_scheduling',
        created_at: nowIso
      });

      // Update user profile reward state
      await supabaseServer.from('profiles').upsert({
        id: uid,
        claimed_mentorship: true,
        mentorship_claimed_at: nowIso
      });

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
