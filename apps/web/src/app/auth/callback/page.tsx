'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect } from 'react';

import { apiFetch, setAccessToken } from '@/lib/api-client';
import { useAuth } from '@/lib/auth-context';

function OAuthCallback() {
  const router = useRouter();
  const { setUser } = useAuth();
  const token = useSearchParams().get('accessToken');

  useEffect(() => {
    if (!token) {
      router.replace('/login?error=oauth_failed');
      return;
    }

    setAccessToken(token);
    apiFetch<{ id: string; email: string; name: string; avatarUrl: string | null }>('/users/me')
      .then((user) => {
        setUser(user);
        router.replace('/');
      })
      .catch(() => router.replace('/login?error=oauth_failed'));
  }, [token, router, setUser]);

  return <p className="text-center text-sm text-muted-foreground">Signing you in…</p>;
}

export default function OAuthCallbackPage() {
  return (
    <Suspense>
      <OAuthCallback />
    </Suspense>
  );
}
