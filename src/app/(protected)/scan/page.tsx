'use client';

import { useAuth } from '@/context/AuthContext';
import { db } from '@/lib/firebase';
import { IngressEvent, Participant } from '@/types';
import { collection, query, where, getDocs, doc, getDoc, updateDoc, serverTimestamp, runTransaction } from 'firebase/firestore';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { Loader2, ScanLine, XCircle, CheckCircle, LogOut, Camera } from 'lucide-react';
import { useEffect, useState, useRef } from 'react';

type ScanResult = 
  | { status: 'idle' }
  | { status: 'success'; participant: Participant }
  | { status: 'error'; message: string };

export default function ScannerPage() {
  const { logout } = useAuth();
  const [activeEvent, setActiveEvent] = useState<IngressEvent | null>(null);
  const [loading, setLoading] = useState(true);
  const [scanResult, setScanResult] = useState<ScanResult>({ status: 'idle' });
  const [isScanning, setIsScanning] = useState(false);
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);

  useEffect(() => {
    const fetchActiveEvent = async () => {
      try {
        const q = query(collection(db, 'events'), where('isActive', '==', true));
        const snapshot = await getDocs(q);
        if (!snapshot.empty) {
          // Pick the first active event (or logic to select latest)
          const eventDoc = snapshot.docs[0];
          setActiveEvent({ id: eventDoc.id, ...eventDoc.data() } as IngressEvent);
        } else {
          // No active event
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchActiveEvent();
  }, []);

  useEffect(() => {
    if (!activeEvent || loading || !isScanning) return;

    // Initialize Scanner
    const timer = setTimeout(() => {
        // Clear any existing instance first
        if (scannerRef.current) {
            scannerRef.current.clear().catch(console.error);
        }

        const scanner = new Html5QrcodeScanner(
            "reader",
            { fps: 10, qrbox: { width: 250, height: 250 } },
            /* verbose= */ false
        );
        scannerRef.current = scanner;

        scanner.render(onScanSuccess, onScanFailure);
    }, 100);

    return () => {
        clearTimeout(timer);
        if (scannerRef.current) {
            scannerRef.current.clear().catch(err => console.error("Failed to clear html5-qrcode", err));
        }
    };
  }, [activeEvent, loading, isScanning]);

  const onScanSuccess = async (decodedText: string, decodedResult: any) => {
      if (!activeEvent) return;
      if (scannerRef.current) {
          try {
             await scannerRef.current.pause(true); // Pause scanning
          } catch(e) {}
      }

      try {
          const payload = JSON.parse(decodedText);
          const { eventId, participantId, signature } = payload;

          // 1. Validation Logic
          if (eventId !== activeEvent.id) {
              throw new Error('QR invalid for this event');
          }
          // Verify signature here if implemented

          // 2. Transaction to check & update
          await runTransaction(db, async (transaction) => {
              const pRef = doc(db, 'events', eventId, 'participants', participantId);
              const pDoc = await transaction.get(pRef);
              
              if (!pDoc.exists()) {
                  throw new Error('Participant not found');
              }
              
              const pData = pDoc.data() as Participant;

              if (pData.checkedIn) {
                  throw new Error('Already checked in!');
              }

              transaction.update(pRef, {
                  checkedIn: true,
                  checkedInAt: serverTimestamp()
              });
              
                setScanResult({ status: 'success', participant: { ...pData, id: pDoc.id } });
          });

      } catch (error: any) {
          console.error('Scan Error', error);
          setScanResult({ status: 'error', message: error.message || 'Invalid QR Code' });
      }
      
      // Auto-resume after delay? Or manual?
  };

  const onScanFailure = (error: any) => {
     // handle scanning failure, usually better to ignore frame errors
  };

  const resetScanner = async () => {
      setScanResult({ status: 'idle' });
      if (scannerRef.current) {
         try { 
             await scannerRef.current.resume(); 
         } catch(e) {
             // If resume fails (or wasn't paused), we might need to re-render
             // Usually pause(true) -> resume() works.
         }
      }
  };

  if (loading) return <div className="bg-black h-screen flex items-center justify-center text-white">Loading...</div>;

  if (!activeEvent) {
      return (
          <div className="flex h-screen flex-col items-center justify-center bg-neutral-950 p-6 text-center text-white">
              <ScanLine className="h-16 w-16 mb-4 text-neutral-500" />
              <h1 className="text-2xl font-bold">No Active Event</h1>
              <p className="text-neutral-400 mt-2">There are no events currently marked as active.</p>
               <button onClick={logout} className="mt-8 text-rose-500 underline">Logout</button>
          </div>
      );
  }

  // Full Screen Results
  if (scanResult.status === 'success') {
      return (
          <div className="flex h-screen flex-col items-center justify-center bg-green-600 p-6 text-center text-white animate-in fade-in duration-300">
              <CheckCircle className="h-32 w-32 mb-6" />
              <h1 className="text-4xl font-bold mb-2">Access Granted</h1>
              <div className="bg-white/20 p-6 rounded-xl backdrop-blur-md w-full max-w-sm mt-4">
                 <p className="text-xl font-semibold">{scanResult.participant.name}</p>
                 <p className="text-green-100">{scanResult.participant.enrollment}</p>
              </div>
              <button 
                onClick={resetScanner}
                className="mt-12 w-full max-w-xs rounded-full bg-white px-8 py-4 text-xl font-bold text-green-700 shadow-lg hover:bg-green-50 transition-all"
              >
                  Scan Next
              </button>
          </div>
      );
  }

  if (scanResult.status === 'error') {
      return (
           <div className="flex h-screen flex-col items-center justify-center bg-red-600 p-6 text-center text-white animate-in fade-in duration-300">
              <XCircle className="h-32 w-32 mb-6" />
              <h1 className="text-4xl font-bold mb-2">Access Denied</h1>
              <p className="text-2xl font-medium opacity-90">{scanResult.message}</p>
              
              <button 
                onClick={resetScanner}
                className="mt-12 w-full max-w-xs rounded-full bg-white px-8 py-4 text-xl font-bold text-red-700 shadow-lg hover:bg-red-50 transition-all"
              >
                  Try Again
              </button>
          </div>
      );
  }

  return (
    <div className="min-h-screen bg-neutral-950 flex flex-col">
       {/* Header */}
       <div className="flex items-center justify-between p-4 bg-neutral-900 border-b border-neutral-800">
           <div>
               <h2 className="text-white font-semibold">{activeEvent.name}</h2>
               <p className="text-xs text-green-400 flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-400 animate-pulse"/> LIVE SCANNING</p>
           </div>
           <button onClick={logout} className="p-2 text-neutral-400 hover:text-white">
               <LogOut className="h-5 w-5" />
           </button>
       </div>

       {/* Scanner View */}
       <div className="flex-1 flex flex-col items-center pt-8 px-4">
           {isScanning ? (
               <>
                   <div className="w-full max-w-md overflow-hidden rounded-2xl border-2 border-rose-500/50 shadow-[0_0_40px_rgba(225,29,72,0.2)] bg-black relative">
                        <div id="reader" className="w-full h-full"></div>
                   </div>
                   <p className="mt-6 text-center text-neutral-400 text-sm max-w-xs">
                       Position the QR code within the frame to scan.
                   </p>
                   <button 
                       onClick={() => setIsScanning(false)}
                       className="mt-4 text-xs text-neutral-500 underline"
                   >
                       Stop Camera
                   </button>
               </>
           ) : (
               <div className="flex flex-col items-center justify-center space-y-6 mt-12 text-center">
                   <div className="p-6 bg-rose-500/10 rounded-full border border-rose-500/20">
                       <Camera className="h-12 w-12 text-rose-500" />
                   </div>
                   <div className="space-y-2">
                       <h3 className="text-xl font-bold text-white">Camera Access Required</h3>
                       <p className="text-neutral-400 max-w-xs text-sm">
                           Please enable camera access to scan participant QR codes.
                       </p>
                   </div>
                   <button
                       onClick={() => setIsScanning(true)}
                       className="px-8 py-3 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-lg transition-colors shadow-lg shadow-rose-600/20"
                   >
                       Request Access & Start
                   </button>
               </div>
           )}
       </div>
    </div>
  );
}
