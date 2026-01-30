'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { db } from '@/lib/firebase';
import { collection, addDoc } from 'firebase/firestore';
import { Loader2, ArrowLeft, Calendar as CalendarIcon } from 'lucide-react';
import Link from 'next/link';
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

export default function CreateEventPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    venue: '',
    isActive: true
  });
  const [date, setDate] = useState<Date>();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!date) {
        alert("Please select a date");
        return;
    }
    setLoading(true);

    try {
      const docRef = await addDoc(collection(db, 'events'), {
        ...formData,
        date: format(date, "yyyy-MM-dd"),
        createdAt: new Date()
      });
      router.push(`/admin/events/${docRef.id}`);
    } catch (error) {
      console.error('Error creating event:', error);
      alert('Failed to create event');
    } finally {
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
            <h1 className="text-2xl font-bold text-white">Create New Event</h1>
            <p className="text-neutral-400">Set up the details for your upcoming event.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-medium text-neutral-300">Event Name</label>
              <input
                required
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full rounded-lg border border-neutral-800 bg-black/50 px-4 py-3 text-white placeholder-neutral-500 focus:border-rose-500 focus:ring-1 focus:ring-rose-500 outline-none transition-all"
                placeholder="e.g. Annual Tech Summit 2026"
              />
            </div>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <div className="space-y-2 flex flex-col">
                <label className="text-sm font-medium text-neutral-300">Date</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant={"outline"}
                      className={cn(
                        "w-full justify-start text-left font-normal bg-black/50 border-neutral-800 hover:bg-neutral-900 hover:text-white text-white/90 py-6",
                        !date && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {date ? format(date, "PPP") : <span>Pick a date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 bg-neutral-900 border-neutral-800 text-white" align="start">
                    <Calendar
                      mode="single"
                      selected={date}
                      onSelect={setDate}
                      initialFocus
                      className="bg-neutral-900" 
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-neutral-300">Venue</label>
                <input
                  required
                  type="text"
                  value={formData.venue}
                  onChange={(e) => setFormData({ ...formData, venue: e.target.value })}
                  className="w-full rounded-lg border border-neutral-800 bg-black/50 px-4 py-3 text-white placeholder-neutral-500 focus:border-rose-500 focus:ring-1 focus:ring-rose-500 outline-none transition-all"
                  placeholder="e.g. Main Auditorium"
                />
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <input
                type="checkbox"
                id="isActive"
                checked={formData.isActive}
                onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                className="h-4 w-4 rounded border-neutral-800 bg-black/50 text-rose-500 focus:ring-rose-500"
              />
              <label htmlFor="isActive" className="text-sm text-neutral-300">Set as Active Event</label>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-rose-600 px-4 py-3 font-semibold text-white hover:bg-rose-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_20px_rgba(225,29,72,0.3)] hover:shadow-[0_0_30px_rgba(225,29,72,0.5)]"
            >
              {loading ? (
                <div className="flex items-center justify-center">
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Creating...
                </div>
              ) : (
                'Create Event'
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
