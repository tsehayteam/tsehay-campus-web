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

    const newUserUid = (body.newUserUid || body.userId || '').trim();
    const referrerUid = (body.referrerUid || body.referredBy || '').trim();
    const newUserName = (body.newUserName || body.name || 'አዲስ ተማሪ').trim();
    const newUserEmail = (body.newUserEmail || body.email || '').trim().toLowerCase();

    if (!newUserUid || !referrerUid) {
      return NextResponse.json({
        success: false,
        error: 'newUserUid and referrerUid are required'
      }, { status: 400 });
    }

    // Prevent self-referral
    if (newUserUid === referrerUid) {
      return NextResponse.json({
        success: false,
        error: 'Self-referral is not allowed'
      }, { status: 400 });
    }

    const referralDocId = `ref_${newUserUid}`;

    // Check if this user was already attributed
    const { data: existing } = await supabaseServer
      .from('referrals')
      .select('id')
      .eq('id', referralDocId)
      .maybeSingle();

    if (existing) {
      return NextResponse.json({
        success: true,
        message: 'Referral already credited',
        alreadyRecorded: true
      });
    }

    const nowIso = new Date().toISOString();
    const referralData = {
      id: referralDocId,
      referrer_id: referrerUid,
      referred_id: newUserUid,
      referred_name: newUserName,
      referred_email: newUserEmail,
      created_at: nowIso,
      status: 'completed',
      points_awarded: 50
    };

    // 1. Save Referral Audit Log to Supabase
    await supabaseServer.from('referrals').upsert(referralData);

    // 2. Set 'referred_by' on the new user's profile
    await supabaseServer.from('profiles').upsert({
      id: newUserUid,
      name: newUserName,
      email: newUserEmail,
      referred_by: referrerUid,
      referred_at: nowIso
    });

    // 3. Increment referrer's referral count and check reward milestones
    let updatedReferralCount = 1;
    try {
      const { data: refProfile } = await supabaseServer
        .from('profiles')
        .select('*')
        .eq('id', referrerUid)
        .maybeSingle();

      const currentCount = Number(refProfile?.referral_count || refProfile?.referralCount || 0);
      updatedReferralCount = currentCount + 1;

      const updatePayload: Record<string, any> = {
        id: referrerUid,
        referral_count: updatedReferralCount,
        last_referral_at: nowIso
      };

      if (updatedReferralCount >= 5 && !refProfile?.has_free_course_reward) {
        updatePayload.has_free_course_reward = true;
        updatePayload.free_course_unlocked_at = nowIso;
      }

      if (updatedReferralCount >= 10 && !refProfile?.has_mentorship_reward) {
        updatePayload.has_mentorship_reward = true;
        updatePayload.mentorship_unlocked_at = nowIso;
      }

      await supabaseServer.from('profiles').upsert(updatePayload);
    } catch (incErr) {
      console.error('Error incrementing referrer count:', incErr);
    }

    return NextResponse.json({
      success: true,
      message: 'Referral successfully credited',
      referrerUid,
      newUserUid,
      newReferralCount: updatedReferralCount
    });
  } catch (err: any) {
    console.error('Referral record error:', err);
    return NextResponse.json({
      success: false,
      error: err.message || 'Internal server error'
    }, { status: 500 });
  }
}
