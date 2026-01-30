'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { Loader2, ShieldCheck, Mail, Lock, ScanLine, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AnimatePresence, motion } from 'framer-motion';

export default function LoginPage() {
  const { signInWithGoogle, loginWithEmail, userProfile, user, loading } = useAuth();
  const router = useRouter();
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [error, setError] = useState('');
  const [role, setRole] = useState<'admin' | 'scanner'>('scanner');
  
  // Scanner Form State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  useEffect(() => {
    if (!loading && user && userProfile) {
      if (userProfile.role === 'admin') router.push('/admin');
      else if (userProfile.role === 'scanner') router.push('/scan');
    }
  }, [loading, user, userProfile, router]);

  const handleGoogleLogin = async () => {
    setIsLoggingIn(true);
    setError('');
    try {
      await signInWithGoogle();
    } catch (err: any) {
      setError('Failed to sign in. Please try again.');
      setIsLoggingIn(false);
    }
  };

  const handleEmailLogin = async (e: React.FormEvent) => {
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
                  <p className="text-sm text-neutral-400">Select your role to continue</p>
              </div>

              {/* Role Toggle */}
              <div className="grid grid-cols-2 gap-1 bg-neutral-900/50 p-1 rounded-lg mb-6 border border-neutral-800">
                  <button
                    onClick={() => setRole('scanner')}
                    className={cn(
                        "relative flex items-center justify-center gap-2 py-2 text-sm font-medium rounded-md transition-all",
                        role === 'scanner' ? "text-white" : "text-neutral-500 hover:text-neutral-300"
                    )}
                  >
                      {role === 'scanner' && (
                          <motion.div
                              layoutId="activeRole"
                              className="absolute inset-0 bg-neutral-800 rounded-md shadow-sm"
                              transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                          />
                      )}
                      <span className="relative z-10 flex items-center gap-2"><ScanLine className="w-4 h-4" /> Scanner</span>
                  </button>
                  <button
                    onClick={() => setRole('admin')}
                    className={cn(
                        "relative flex items-center justify-center gap-2 py-2 text-sm font-medium rounded-md transition-all",
                        role === 'admin' ? "text-white" : "text-neutral-500 hover:text-neutral-300"
                    )}
                  >
                      {role === 'admin' && (
                          <motion.div
                              layoutId="activeRole"
                              className="absolute inset-0 bg-neutral-800 rounded-md shadow-sm"
                              transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                          />
                      )}
                      <span className="relative z-10 flex items-center gap-2"><ShieldCheck className="w-4 h-4" /> Admin</span>
                  </button>
              </div>

              {error && (
                <div className="mb-6 rounded-md bg-red-500/10 p-4 text-center text-sm text-red-500 border border-red-500/20">
                    {error}
                </div>
              )}

              <AnimatePresence mode="wait">
                  {role === 'scanner' ? (
                      <motion.form 
                        key="scanner"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        onSubmit={handleEmailLogin} 
                        className="space-y-4"
                      >
                          <div className="space-y-2">
                              <label className="text-xs font-medium text-neutral-300 uppercase">Email</label>
                              <div className="relative">
                                  <Mail className="absolute left-3 top-3 h-4 w-4 text-neutral-500" />
                                  <input
                                      type="email"
                                      required
                                      value={email}
                                      onChange={(e) => setEmail(e.target.value)}
                                      className="w-full rounded-lg border border-neutral-800 bg-black/50 pl-10 pr-4 py-2.5 text-white placeholder-neutral-600 focus:border-rose-500 focus:ring-1 focus:ring-rose-500 outline-none text-sm"
                                      placeholder="scanner@ingress.com"
                                  />
                              </div>
                          </div>
                          <div className="space-y-2">
                              <label className="text-xs font-medium text-neutral-300 uppercase">Password</label>
                              <div className="relative">
                                  <Lock className="absolute left-3 top-3 h-4 w-4 text-neutral-500" />
                                  <input
                                      type="password"
                                      required
                                      value={password}
                                      onChange={(e) => setPassword(e.target.value)}
                                      className="w-full rounded-lg border border-neutral-800 bg-black/50 pl-10 pr-4 py-2.5 text-white placeholder-neutral-600 focus:border-rose-500 focus:ring-1 focus:ring-rose-500 outline-none text-sm"
                                      placeholder="••••••••"
                                  />
                              </div>
                          </div>

                          <button
                            type="submit"
                            disabled={isLoggingIn}
                            className={cn(
                                "w-full rounded-lg bg-white py-2.5 text-sm font-bold text-black hover:bg-neutral-200 transition-colors disabled:opacity-70",
                                isLoggingIn && "opacity-70 cursor-wait"
                            )}
                          >
                             {isLoggingIn ? 'Verifying...' : 'Login as Scanner'}
                          </button>
                      </motion.form>
                  ) : (
                      <motion.div
                        key="admin"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="space-y-4"
                      >
                         <div className="p-4 bg-rose-500/5 border border-rose-500/10 rounded-lg text-xs text-rose-200/70 text-center mb-4">
                            Admin access requires a verified Google account linked to the organization.
                         </div>
                         <button
                            onClick={handleGoogleLogin}
                            disabled={isLoggingIn}
                            className="group relative flex w-full items-center justify-center gap-3 rounded-lg bg-white py-2.5 px-4 text-sm font-bold text-black transition-all hover:bg-neutral-200 focus:outline-none focus:ring-2 focus:ring-white/20 disabled:opacity-70 disabled:cursor-not-allowed"
                        >
                            <svg className="h-5 w-5" viewBox="0 0 24 24">
                                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                            </svg>
                            {isLoggingIn ? 'Redirecting...' : 'Sign in with Google'}
                        </button>
                      </motion.div>
                  )}
              </AnimatePresence>
          </div>
          
          <div className="text-center text-xs text-neutral-600">
             Unsure of your role? Contact an Administrator.
          </div>
      </div>
    </div>
  );
}
