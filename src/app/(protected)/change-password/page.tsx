'use client';

import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { Loader2, ArrowLeft, Lock, KeyRound, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import Link from 'next/link';

export default function ChangePasswordPage() {
  const { changePassword } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.newPassword !== formData.confirmPassword) {
        setError("New passwords do not match");
        return;
    }
    if (formData.newPassword.length < 6) {
        setError("New password must be at least 6 characters long");
        return;
    }

    setLoading(true);
    setError('');

    try {
        await changePassword(formData.currentPassword, formData.newPassword);
        setSuccess(true);
        setTimeout(() => {
            router.back();
        }, 2000);
    } catch (err: any) {
        if (err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
            setError("Incorrect current password");
        } else {
            setError("Failed to update password. Please try again.");
            console.error(err);
        }
    } finally {
        setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-950 p-6 flex flex-col items-center justify-center">
        <div className="w-full max-w-md">
            <button onClick={() => router.back()} className="flex items-center text-neutral-400 hover:text-white mb-8 transition-colors">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
            </button>

            <div className="rounded-2xl border border-neutral-800 bg-neutral-900/50 p-8 shadow-xl">
                <div className="flex items-center gap-3 mb-6">
                    <div className="p-3 rounded-lg bg-rose-500/10 text-rose-500">
                        <KeyRound className="h-6 w-6" />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-white">Change Password</h1>
                        <p className="text-sm text-neutral-400">Secure your account with a new password</p>
                    </div>
                </div>

                {success ? (
                    <div className="flex flex-col items-center justify-center py-8 text-center animate-in fade-in zoom-in duration-300">
                        <div className="bg-green-500/10 p-3 rounded-full text-green-500 mb-4">
                            <CheckCircle className="h-8 w-8" />
                        </div>
                        <h3 className="text-lg font-semibold text-white">Password Updated!</h3>
                        <p className="text-neutral-400 text-sm mt-1">Redirecting you back...</p>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="space-y-4">
                        {error && (
                            <div className="rounded-md bg-red-500/10 p-3 text-sm text-red-500 border border-red-500/20">
                                {error}
                            </div>
                        )}
                        
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-neutral-300">Current Password</label>
                            <input 
                                type="password" 
                                required
                                value={formData.currentPassword}
                                onChange={(e) => setFormData({...formData, currentPassword: e.target.value})}
                                className="w-full rounded-lg border border-neutral-800 bg-black/50 p-2.5 text-white placeholder-neutral-600 focus:border-rose-500 focus:ring-1 focus:ring-rose-500 outline-none"
                                placeholder="••••••••"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-neutral-300">New Password</label>
                            <input 
                                type="password" 
                                required
                                value={formData.newPassword}
                                onChange={(e) => setFormData({...formData, newPassword: e.target.value})}
                                className="w-full rounded-lg border border-neutral-800 bg-black/50 p-2.5 text-white placeholder-neutral-600 focus:border-rose-500 focus:ring-1 focus:ring-rose-500 outline-none"
                                placeholder="••••••••"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-neutral-300">Confirm New Password</label>
                            <input 
                                type="password" 
                                required
                                value={formData.confirmPassword}
                                onChange={(e) => setFormData({...formData, confirmPassword: e.target.value})}
                                className="w-full rounded-lg border border-neutral-800 bg-black/50 p-2.5 text-white placeholder-neutral-600 focus:border-rose-500 focus:ring-1 focus:ring-rose-500 outline-none"
                                placeholder="••••••••"
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className={cn(
                                "w-full rounded-lg bg-white mt-4 py-2.5 font-bold text-black hover:bg-neutral-200 transition-colors disabled:opacity-50",
                                loading && "opacity-70 cursor-wait"
                            )}
                        >
                            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin inline" /> : null}
                            {loading ? 'Updating...' : 'Update Password'}
                        </button>
                    </form>
                )}
            </div>
        </div>
    </div>
  );
}
