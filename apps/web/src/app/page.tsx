'use client';

import { useRouter } from 'next/navigation';

import { logout } from '@/lib/auth-api';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';

// Placeholder landing page — the real Dashboard (board grid, workspace switcher)
// is Story 2.10. This just closes the loop for Story 1.9's auth flows.
export default function Home() {
  const router = useRouter();
  const { user, loading, setUser } = useAuth();

  if (loading) return null;

  if (!user) {
    router.replace('/login');
    return null;
  }

  async function handleLogout() {
    await logout();
    setUser(null);
    router.push('/login');
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-8">
      <p className="text-sm text-muted-foreground">Signed in as</p>
      <p className="text-lg font-medium">{user.name}</p>
      <p className="text-sm text-muted-foreground">{user.email}</p>
      <Button variant="outline" onClick={handleLogout}>
        Log out
      </Button>
    </div>
  );
}
