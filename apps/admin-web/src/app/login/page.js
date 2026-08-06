'use client';
import { Suspense } from 'react';
import { LoginScreen } from '@cocarr/layouts';

// Suspense is required, not decorative: LoginScreen reads useSearchParams (for
// ?expired and ?next), and Next refuses to prerender a page that does so unless
// it sits inside a Suspense boundary.
export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#151515]" />}>
      <LoginScreen label="Cocarr Platform Administration" />
    </Suspense>
  );
}
