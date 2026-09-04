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

    if (!adminDb) {
      return NextResponse.json({
        success: false,
        error: 'Database connection is initializing'
      }, { status: 503 });
    }

    const referralDocId = `ref_${newUserUid}`;
    const referralRef = adminDb.collection('artifacts').doc('tsehaycampus-e1a6d').collection('referrals').doc(referralDocId);
    const rootReferralRef = adminDb.collection('referrals').doc(referralDocId);

    // Check if this user was already attributed
    const existingSnap = await referralRef.get();
    if (existingSnap.exists) {
      return NextResponse.json({
        success: true,
        message: 'Referral already credited',
        alreadyRecorded: true
      });
    }

    const nowIso = new Date().toISOString();
    const referralData = {
      id: referralDocId,
      referrerUid,
      referredUid: newUserUid,
      referredName: newUserName,
      referredEmail: newUserEmail,
      createdAt: nowIso,
      status: 'completed',
      pointsAwarded: 50
    };

    // 1. Save Referral Audit Log to Firestore
    await Promise.allSettled([
      referralRef.set({ ...referralData, timestamp: FieldValue.serverTimestamp() }, { merge: true }),
      rootReferralRef.set({ ...referralData, timestamp: FieldValue.serverTimestamp() }, { merge: true })
    ]);

    // 2. Set 'referredBy' on the new user's profile
    const newUserProfileRef1 = adminDb.collection('artifacts').doc('tsehaycampus-e1a6d').collection('users').doc(newUserUid).collection('profile').doc('info');
    const newUserProfileRef2 = adminDb.collection('users').doc(newUserUid);
    await Promise.allSettled([
      newUserProfileRef1.set({ referredBy: referrerUid, referredAt: nowIso }, { merge: true }),
      newUserProfileRef2.set({ referredBy: referrerUid, referredAt: nowIso }, { merge: true })
    ]);

    // 3. Atomically increment referrer's referral count and check reward milestones
    const referrerProfileRef1 = adminDb.collection('artifacts').doc('tsehaycampus-e1a6d').collection('users').doc(referrerUid).collection('profile').doc('info');
    const referrerProfileRef2 = adminDb.collection('users').doc(referrerUid);

    let updatedReferralCount = 1;
    try {
      const snap = await referrerProfileRef1.get();
      if (snap.exists) {
        const currentData = snap.data() || {};
        const currentCount = Number(currentData.referralCount || 0);
        updatedReferralCount = currentCount + 1;

        const updatePayload: Record<string, any> = {
          referralCount: FieldValue.increment(1),
          lastReferralAt: nowIso
        };

        // Milestone 1 (5 Invites) = 1 Free Course
        if (updatedReferralCount >= 5 && !currentData.hasFreeCourseReward) {
          updatePayload.hasFreeCourseReward = true;
          updatePayload.freeCourseUnlockedAt = nowIso;
        }

        // Milestone 2 (10 Invites) = Free 1-on-1 Mentorship
        if (updatedReferralCount >= 10 && !currentData.hasMentorshipReward) {
          updatePayload.hasMentorshipReward = true;
          updatePayload.mentorshipUnlockedAt = nowIso;
        }

        await Promise.allSettled([
          referrerProfileRef1.set(updatePayload, { merge: true }),
          referrerProfileRef2.set(updatePayload, { merge: true })
        ]);
      } else {
        await Promise.allSettled([
          referrerProfileRef1.set({ referralCount: 1, lastReferralAt: nowIso }, { merge: true }),
          referrerProfileRef2.set({ referralCount: 1, lastReferralAt: nowIso }, { merge: true })
        ]);
      }
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
