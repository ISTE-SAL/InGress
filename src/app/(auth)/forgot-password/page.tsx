'use client';

import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Loader2, Mail, ArrowLeft, CheckCircle } from 'lucide-react';
import Link from 'next/link';

export default function ForgotPasswordPage() {
  const { resetPassword } = useAuth();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
        await resetPassword(email);
        setSuccess(true);
    } catch (err: any) {
        if (err.code === 'auth/user-not-found') {
            // For security, don't reveal if user exists, or treat as same as success to prevent enumeration
            // But usually for UX we might say "If account exists..."
            // Let's just say success or "Failed".
            // Actually, for internal apps, it's often fine to show error. 
            // Better behavior: "If an account exists for {email}, you will receive a reset email."
            setSuccess(true);
        } else if (err.code === 'auth/invalid-email') {
            setError("Invalid email address.");
        } else {
            setError("Failed to send reset email. Please try again.");
            console.error(err);
        }
    } finally {
        setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0a0a0a] bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(120,119,198,0.3),rgba(255,255,255,0))] px-4">
      <div className="w-full max-w-md space-y-6">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold tracking-tight text-white mb-2">Forgot Password?</h2>
            <p className="text-sm text-neutral-400">Enter your email to receive a reset link</p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-black/50 p-6 backdrop-blur-xl shadow-2xl">
              {success ? (
                  <div className="flex flex-col items-center justify-center py-6 text-center animate-in fade-in zoom-in duration-300">
                      <div className="bg-green-500/10 p-3 rounded-full text-green-500 mb-4">
                          <CheckCircle className="h-8 w-8" />
                      </div>
                      <h3 className="text-lg font-semibold text-white">Check your email</h3>
                      <p className="text-neutral-400 text-sm mt-1 mb-6">
                          We have sent a password reset link to <span className="text-white font-medium">{email}</span>
                      </p>
                      <Link 
                        href="/login"
                        className="w-full rounded-lg bg-white p-2.5 font-medium text-black hover:bg-neutral-200 transition-colors"
                      >
                        Return to Login
                      </Link>
                  </div>
              ) : (
                  <form onSubmit={handleSubmit} className="space-y-4">
                      {error && (
                        <div className="rounded-md bg-red-500/10 p-4 text-center text-sm text-red-500 border border-red-500/20">
                            {error}
                        </div>
                      )}

                      <div className="space-y-2">
                          <label className="text-sm font-medium text-neutral-300">Email Address</label>
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

                      <button
                          type="submit"
                          disabled={loading}
                          className="w-full rounded-lg bg-white p-2.5 font-medium text-black hover:bg-neutral-200 disabled:opacity-50 transition-colors"
                      >
                          {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin inline" /> : null}
                          {loading ? 'Sending Link...' : 'Send Reset Link'}
                      </button>

                      <div className="text-center pt-2">
                          <Link href="/login" className="text-sm text-neutral-400 hover:text-white transition-colors flex items-center justify-center gap-2">
                              <ArrowLeft className="w-3 h-3" /> Back to Login
                          </Link>
                      </div>
                  </form>
              )}
          </div>
      </div>
    </div>
  );
}
