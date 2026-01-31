'use client';

import { useAuth } from '@/context/AuthContext';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Loader2, ShieldAlert } from 'lucide-react';

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, userProfile, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [isAuthorized, setIsAuthorized] = useState(false);

  useEffect(() => {
    if (loading) return;

    if (!user) {
      router.push('/login');
      return;
    }

    if (!userProfile) {
      // User logged in but no profile/role -> Deny
      return; 
    }

    // Role-based protection
    if (pathname.startsWith('/admin')) {
      if (userProfile.role !== 'admin' && userProfile.role !== 'admin_scanner') {
        router.push(userProfile.role === 'scanner' ? '/scan' : '/login');
        return;
      }
    } else if (pathname.startsWith('/scan')) {
      if (userProfile.role !== 'scanner' && userProfile.role !== 'admin_scanner') {
        router.push(userProfile.role === 'admin' ? '/admin' : '/login');
        return;
      }
    }

    setIsAuthorized(true);
  }, [user, userProfile, loading, pathname, router]);

  if (loading || !isAuthorized) {
    if (!loading && user && !userProfile) {
        return (
            <div className="flex h-screen flex-col items-center justify-center bg-neutral-950 text-white gap-4">
                <ShieldAlert className="h-16 w-16 text-red-500" />
                <h1 className="text-2xl font-bold">Unauthorized Access</h1>
                <p className="text-neutral-400">Your account does not have a valid role assigned.</p>
                <button onClick={() => window.location.reload()} className="text-sm underline hover:text-white">Refresh</button>
            </div>
        )
    }
    return (
      <div className="flex h-screen w-full items-center justify-center bg-neutral-950">
        <Loader2 className="h-8 w-8 animate-spin text-rose-500" />
      </div>
    );
  }

  return <>{children}</>;
}
