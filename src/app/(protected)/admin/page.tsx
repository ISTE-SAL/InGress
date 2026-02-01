'use client';

import { useAuth } from '@/context/AuthContext';
import { db } from '@/lib/firebase';
import { IngressEvent } from '@/types';
import { collection, getDocs, query, orderBy, where } from 'firebase/firestore';
import { Plus, Calendar, MapPin, Loader2, ChevronRight, LogOut, UserPlus, KeyRound } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';

export default function AdminDashboard() {
  const { userProfile, logout } = useAuth();
  const [events, setEvents] = useState<IngressEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const q = query(collection(db, 'events')); // Order by date if possible, but simplicity first
        const snapshot = await getDocs(q);
        const eventList = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        } as IngressEvent));
        setEvents(eventList);
      } catch (error) {
        console.error('Error fetching events', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchEvents();
  }, []);

  return (
    <div className="min-h-screen bg-neutral-950 p-6 md:p-12">
      <div className="mx-auto max-w-5xl space-y-8">
        {/* Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-white mb-1">Dashboard</h1>
            <p className="text-neutral-400">Welcome, {userProfile?.name} ({userProfile?.role === 'admin_scanner' ? 'Super Admin' : 'Admin'})</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link 
                href="/change-password"
                className="flex items-center gap-2 px-4 py-2 bg-neutral-900 border border-neutral-800 rounded-lg text-sm font-medium text-neutral-400 hover:bg-neutral-800 transition-colors"
                title="Change Password"
            >
                <KeyRound className="w-4 h-4" />
                <span className="hidden sm:inline">Password</span>
            </Link>
            <button 
                onClick={() => logout()}
                className="flex items-center gap-2 px-4 py-2 bg-neutral-900 border border-neutral-800 rounded-lg text-sm font-medium text-neutral-400 hover:bg-neutral-800 transition-colors"
            >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">Logout</span>
            </button>
            {userProfile?.role === 'admin_scanner' && (
              <Link 
                href="/admin/users/new"
                className="flex items-center gap-2 px-4 py-2 bg-neutral-900 border border-neutral-800 rounded-lg text-sm font-medium text-neutral-400 hover:bg-neutral-800 transition-colors"
              >
                  <UserPlus className="w-4 h-4" />
                  <span className="hidden sm:inline">Create User</span>
              </Link>
            )}
            <Link 
              href="/admin/events/new"
              className="flex items-center gap-2 rounded-lg bg-rose-600 px-4 py-2 text-sm font-medium text-white hover:bg-rose-500 transition-colors shadow-[0_0_20px_rgba(225,29,72,0.3)]"
            >
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Create Event</span>
            </Link>
          </div>
        </div>

        {/* Event List */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-white">Your Events</h2>
          
          {loading ? (
             <div className="flex justify-center p-12">
               <Loader2 className="h-8 w-8 animate-spin text-neutral-500" />
             </div>
          ) : events.length === 0 ? (
            <div className="rounded-xl border border-dashed border-neutral-800 bg-neutral-900/50 p-12 text-center">
              <p className="text-neutral-500">No events found. Create your first event.</p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {events.map((event) => (
                <Link 
                  key={event.id} 
                  href={`/admin/events/${event.id}`}
                  className="group relative overflow-hidden rounded-xl border border-neutral-800 bg-neutral-900/50 p-6 transition-all hover:border-neutral-700 hover:bg-neutral-900"
                >
                    <div className="absolute top-0 right-0 p-4 opacity-0 transition-opacity group-hover:opacity-100">
                        <ChevronRight className="h-5 w-5 text-neutral-500" />
                    </div>
                    <div className="space-y-4">
                       <div>
                         <h3 className="text-lg font-semibold text-white group-hover:text-rose-500 transition-colors">{event.name}</h3>
                         <div className="mt-2 flex items-center gap-2 text-sm text-neutral-400">
                           <Calendar className="h-4 w-4" />
                           <span>{event.date}</span> 
                         </div>
                         <div className="mt-1 flex items-center gap-2 text-sm text-neutral-400">
                           <MapPin className="h-4 w-4" />
                           <span>{event.venue}</span>
                         </div>
                       </div>
                       
                       <div className="flex items-center gap-2">
                           <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ring-1 ring-inset ${event.isActive ? 'bg-green-400/10 text-green-400 ring-green-400/20' : 'bg-neutral-400/10 text-neutral-400 ring-neutral-400/20'}`}>
                               {event.isActive ? 'Active' : 'Inactive'}
                           </span>
                       </div>
                    </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
