'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { db } from '@/lib/firebase';
import { getFirestore, doc, setDoc } from 'firebase/firestore';
import { initializeApp, getApps, getApp, deleteApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import { Loader2, ArrowLeft, UserPlus, Shield, ScanLine } from 'lucide-react';
import Link from 'next/link';

// Use same config as main app
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

export default function CreateUserPage() {
  const { userProfile, loading: authLoading } = useAuth(); // Get profile
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [role, setRole] = useState<'scanner' | 'admin' | 'admin_scanner'>('scanner');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: ''
  });

  useEffect(() => {
    if (!authLoading && userProfile?.role !== 'admin_scanner') {
        router.push('/admin');
    }
  }, [userProfile, authLoading, router]);

  if (authLoading || userProfile?.role !== 'admin_scanner') {
      return (
          <div className="flex h-screen w-full items-center justify-center bg-neutral-950">
            <Loader2 className="h-8 w-8 animate-spin text-rose-500" />
          </div>
      );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    let secondaryApp: any = null;

    try {
      // 1. Create a secondary app instance to create user without logging out current admin
      const appName = 'secondary-app-for-creation';
      const existingApps = getApps();
      const foundApp = existingApps.find(app => app.name === appName);
      
      if (foundApp) {
         secondaryApp = foundApp;
      } else {
         secondaryApp = initializeApp(firebaseConfig, appName);
      }

      const secondaryAuth = getAuth(secondaryApp);
      const secondaryDb = getFirestore(secondaryApp);

      // 2. Create Authentication User
      const userCredential = await createUserWithEmailAndPassword(
        secondaryAuth, 
        formData.email, 
        formData.password
      );
      const newUser = userCredential.user;

      // 3. Create Firestore User Document using SECONDARY app (authenticated as new user)
      // This will pass the "allow write: if request.auth.uid == uid" rule
      await setDoc(doc(secondaryDb, 'users', newUser.uid), {
        name: formData.name,
        email: formData.email,
        role: role,
        createdAt: new Date(),
        isActive: true
      });

      // 4. Clean up secondary auth
      await signOut(secondaryAuth);
      
      alert(`Successfully created ${role} user: ${formData.name}`);
      router.push('/admin');

    } catch (error: any) {
      console.error('Error creating user:', error);
      if (error.code === 'auth/email-already-in-use') {
          alert('This email is already registered.');
      } else {
          alert('Failed to create user. Check console for details.');
      }
    } finally {
      // Cleanup app if possible, or just leave it for reuse
      // await deleteApp(secondaryApp); 
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-950 p-6 md:p-12">
      <div className="mx-auto max-w-2xl">
        <Link href="/admin" className="flex items-center text-neutral-400 hover:text-white mb-8 transition-colors">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Dashboard
        </Link>
        
        <div className="space-y-6 rounded-2xl border border-neutral-800 bg-neutral-900/50 p-8">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                <UserPlus className="h-6 w-6 text-rose-500" />
                Create New User
            </h1>
            <p className="text-neutral-400">Create a profile for a Scanner or another Admin.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            
            {/* Role Selection */}
            <div className="grid grid-cols-3 gap-4">
                <button
                    type="button"
                    onClick={() => setRole('scanner')}
                    className={`flex flex-col items-center justify-center p-4 rounded-xl border transition-all ${role === 'scanner' ? 'bg-rose-600/10 border-rose-600 text-white' : 'bg-black/50 border-neutral-800 text-neutral-400 hover:bg-neutral-900'}`}
                >
                    <ScanLine className={`h-8 w-8 mb-2 ${role === 'scanner' ? 'text-rose-500' : 'text-neutral-500'}`} />
                    <span className="font-medium text-sm">Scanner</span>
                </button>
                <button
                    type="button"
                    onClick={() => setRole('admin')}
                    className={`flex flex-col items-center justify-center p-4 rounded-xl border transition-all ${role === 'admin' ? 'bg-rose-600/10 border-rose-600 text-white' : 'bg-black/50 border-neutral-800 text-neutral-400 hover:bg-neutral-900'}`}
                >
                    <Shield className={`h-8 w-8 mb-2 ${role === 'admin' ? 'text-rose-500' : 'text-neutral-500'}`} />
                    <span className="font-medium text-sm">Admin</span>
                </button>
                <button
                    type="button"
                    onClick={() => setRole('admin_scanner')}
                    className={`flex flex-col items-center justify-center p-4 rounded-xl border transition-all ${role === 'admin_scanner' ? 'bg-rose-600/10 border-rose-600 text-white' : 'bg-black/50 border-neutral-800 text-neutral-400 hover:bg-neutral-900'}`}
                >
                    <UserPlus className={`h-8 w-8 mb-2 ${role === 'admin_scanner' ? 'text-rose-500' : 'text-neutral-500'}`} />
                    <span className="font-medium text-sm">Both</span>
                </button>
            </div>

            <div className="space-y-4">
                <div className="space-y-2">
                    <label className="text-sm font-medium text-neutral-300">Full Name</label>
                    <input
                        required
                        type="text"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="w-full rounded-lg border border-neutral-800 bg-black/50 px-4 py-3 text-white placeholder-neutral-500 focus:border-rose-500 focus:ring-1 focus:ring-rose-500 outline-none transition-all"
                        placeholder="e.g. John Scanner"
                    />
                </div>

                <div className="space-y-2">
                    <label className="text-sm font-medium text-neutral-300">Email Address</label>
                    <input
                        required
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        className="w-full rounded-lg border border-neutral-800 bg-black/50 px-4 py-3 text-white placeholder-neutral-500 focus:border-rose-500 focus:ring-1 focus:ring-rose-500 outline-none transition-all"
                        placeholder="e.g. scanner@ingress.com"
                    />
                </div>

                <div className="space-y-2">
                    <label className="text-sm font-medium text-neutral-300">Password</label>
                    <input
                        required
                        type="password"
                        value={formData.password}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        className="w-full rounded-lg border border-neutral-800 bg-black/50 px-4 py-3 text-white placeholder-neutral-500 focus:border-rose-500 focus:ring-1 focus:ring-rose-500 outline-none transition-all"
                        placeholder="Min. 6 characters"
                        minLength={6}
                    />
                    <p className="text-xs text-neutral-500">
                        {role === 'scanner' ? 'Scanner' : 'Admin'} will use these credentials to log in.
                    </p>
                </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-rose-600 px-4 py-3 font-semibold text-white hover:bg-rose-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_20px_rgba(225,29,72,0.3)] hover:shadow-[0_0_30px_rgba(225,29,72,0.5)]"
            >
              {loading ? (
                <div className="flex items-center justify-center">
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Creating User...
                </div>
              ) : (
                'Create User'
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
