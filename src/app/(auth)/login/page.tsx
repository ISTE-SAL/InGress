'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { Loader2, Mail, Lock } from 'lucide-react';
import { cn } from '@/lib/utils';


export default function LoginPage() {
  const { loginWithEmail, userProfile, user, loading } = useAuth();
  const router = useRouter();
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [error, setError] = useState('');
  
  // Form State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  useEffect(() => {
    if (!loading && user && userProfile) {
      if (userProfile.role === 'admin') router.push('/admin');
      else if (userProfile.role === 'scanner') router.push('/scan');
    }
  }, [loading, user, userProfile, router]);

  const handleLogin = async (e: React.FormEvent) => {
      e.preventDefault();
      setIsLoggingIn(true);
      setError('');
      try {
          await loginWithEmail(email, password);
      } catch (err: any) {
          setError('Invalid credentials.');
          setIsLoggingIn(false);
      }
  };

  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-neutral-950">
        <Loader2 className="h-8 w-8 animate-spin text-rose-500" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0a0a0a] bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(120,119,198,0.3),rgba(255,255,255,0))] px-4">
      <div className="w-full max-w-md space-y-6">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold tracking-tight text-white">Ingress</h2>
            <p className="mt-2 text-sm text-neutral-400">Restricted Event Access System</p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-black/50 p-6 backdrop-blur-xl shadow-2xl">
              <div className="mb-6">
                  <h3 className="text-lg font-semibold text-white">Sign In</h3>
                  <p className="text-sm text-neutral-400">Enter your credentials to continue</p>
              </div>

              {error && (
                <div className="mb-6 rounded-md bg-red-500/10 p-4 text-center text-sm text-red-500 border border-red-500/20">
                    {error}
                </div>
              )}

              <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-2">
                      <label className="text-sm font-medium text-neutral-300">Email</label>
                      <div className="relative">
                          <Mail className="absolute left-3 top-3 h-4 w-4 text-neutral-500" />
                          <input 
                              type="email" 
                              required
                              value={email}
                              onChange={(e) => setEmail(e.target.value)}
                              className="w-full rounded-lg border border-neutral-800 bg-neutral-900/50 p-2.5 pl-10 text-white placeholder:text-neutral-600 focus:border-rose-500/50 focus:ring-rose-500/20"
                              placeholder="name@example.com"
                          />
                      </div>
                  </div>
                  
                  <div className="space-y-2">
                      <label className="text-sm font-medium text-neutral-300">Password</label>
                      <div className="relative">
                          <Lock className="absolute left-3 top-3 h-4 w-4 text-neutral-500" />
                          <input 
                              type="password" 
                              required
                              value={password}
                              onChange={(e) => setPassword(e.target.value)}
                              className="w-full rounded-lg border border-neutral-800 bg-neutral-900/50 p-2.5 pl-10 text-white placeholder:text-neutral-600 focus:border-rose-500/50 focus:ring-rose-500/20"
                              placeholder="••••••••"
                          />
                      </div>
                  </div>

                  <button
                      type="submit"
                      disabled={isLoggingIn}
                      className="w-full rounded-lg bg-white p-2.5 font-medium text-black hover:bg-neutral-200 disabled:opacity-50 transition-colors"
                  >
                      {isLoggingIn ? <Loader2 className="mr-2 h-4 w-4 animate-spin inline" /> : null}
                      {isLoggingIn ? 'Signing in...' : 'Sign in'}
                  </button>
              </form>
          </div>
          
          <div className="text-center text-xs text-neutral-600">
             Unsure of your role? Contact an Administrator.
          </div>
      </div>
    </div>
  );
}
