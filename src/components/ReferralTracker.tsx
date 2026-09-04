'use client';
import { useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { captureReferralParam } from '@/lib/referralTrackingService';

export default function ReferralTracker() {
  const searchParams = useSearchParams();

  useEffect(() => {
    if (!searchParams) return;
    const ref = searchParams.get('ref') || searchParams.get('referrer') || searchParams.get('referral');
    if (ref) {
      captureReferralParam(ref);
    }
  }, [searchParams]);

  return null;
}
