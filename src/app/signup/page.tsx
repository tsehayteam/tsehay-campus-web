'use client';

import React, { Suspense } from 'react';
import { AuthPageContent } from '@/app/login/page';

export default function SignupPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#03060d] flex items-center justify-center text-white">
          <i className="fa-solid fa-spinner fa-spin text-2xl text-[#f9b03c]" />
        </div>
      }
    >
      <AuthPageContent defaultSignup={true} />
    </Suspense>
  );
}
