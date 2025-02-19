"use client";
import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';

export default function AuthCallback() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const token = searchParams.get('token');
    if (token) {
      localStorage.setItem('token', token);
      toast.success('Successfully logged in with Google!');
      router.push('/dashboard');
    } else {
      toast.error('Authentication failed');
      router.push('/');
    }
  }, [router, searchParams]);

  return (
    <div className="flex h-screen items-center justify-center">
      <div>Completing authentication...</div>
    </div>
  );
}