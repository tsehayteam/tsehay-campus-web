'use client';

import React from 'react';
import dynamic from 'next/dynamic';

const PaymentModal = dynamic(() => import('@/components/PaymentModal'), { ssr: false });
const TermsModal = dynamic(() => import('@/components/TermsModal'), { ssr: false });
const PWAInstallBanner = dynamic(() => import('@/components/PWAInstallBanner'), { ssr: false });
const FloatingAIButton = dynamic(() => import('@/components/FloatingAIButton'), { ssr: false });
const StudentFeedbackModal = dynamic(() => import('@/components/StudentFeedbackModal'), { ssr: false });

export default function GlobalModals() {
  return (
    <>
      <TermsModal />
      <PaymentModal />
      <PWAInstallBanner />
      <FloatingAIButton />
      <StudentFeedbackModal />
    </>
  );
}
