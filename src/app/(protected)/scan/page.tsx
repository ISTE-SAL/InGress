'use client';

import { useAuth } from '@/context/AuthContext';
import { db } from '@/lib/firebase';
import { IngressEvent, Participant } from '@/types';
import { collection, query, where, getDocs, doc, getDoc, updateDoc, serverTimestamp, runTransaction } from 'firebase/firestore';
import { Html5QrcodeScanner, Html5QrcodeScanType } from 'html5-qrcode';
import { Loader2, ScanLine, XCircle, CheckCircle, LogOut, Camera, KeyRound, Check } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState, useRef } from 'react';

type ScanResult = 
  | { status: 'idle' }
  | { status: 'success'; participant: Participant }
  | { status: 'error'; message: string };

export default function ScannerPage() {
  const { logout } = useAuth();
  const [activeEvents, setActiveEvents] = useState<IngressEvent[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<IngressEvent | null>(null);
  const [loading, setLoading] = useState(true);
  const [scanResult, setScanResult] = useState<ScanResult>({ status: 'idle' });
  const [isScanning, setIsScanning] = useState(false);
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);
  const lastScannedRef = useRef<{ text: string, time: number } | null>(null);

  useEffect(() => {
    const fetchActiveEvents = async () => {
      try {
        const q = query(collection(db, 'events'), where('isActive', '==', true));
        const snapshot = await getDocs(q);
        const eventsList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as IngressEvent));
        
        setActiveEvents(eventsList);
        
        // Persist selection
        const savedId = localStorage.getItem('ingress_selected_event_id');
        const savedEvent = eventsList.find(e => e.id === savedId);
        
        if (savedEvent) {
            setSelectedEvent(savedEvent);
        } else if (eventsList.length > 0) {
            setSelectedEvent(eventsList[0]);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchActiveEvents();
  }, []);

  useEffect(() => {
    if (!selectedEvent || loading || !isScanning) return;

    // Initialize Scanner
    const timer = setTimeout(() => {
        // Clear any existing instance first
        if (scannerRef.current) {
            scannerRef.current.clear().catch(console.error);
        }

        const scanner = new Html5QrcodeScanner(
            "reader",
            { 
                fps: 10, 
                qrbox: { width: 250, height: 250 },
                supportedScanTypes: [Html5QrcodeScanType.SCAN_TYPE_CAMERA]
            },
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
  }, [selectedEvent, loading, isScanning]);

  const onScanSuccess = async (decodedText: string, decodedResult: any) => {
      // Prevent frequent duplicate scans (e.g., if camera is still pointing at same code)
      const now = Date.now();
      if (lastScannedRef.current && 
          lastScannedRef.current.text === decodedText && 
          (now - lastScannedRef.current.time) < 3000) {
          console.log("Ignored duplicate scan");
          return;
      }

      if (!selectedEvent) return;
      
      // Update last scanned (do this before async ops to prevent race conditions)
      lastScannedRef.current = { text: decodedText, time: now };

      if (scannerRef.current) {
          try {
             await scannerRef.current.pause(true); // Pause scanning
          } catch(e) {}
      }

      try {
          const payload = JSON.parse(decodedText);
          const { eventId, participantId, signature } = payload;

          // 1. Validation Logic
          if (eventId !== selectedEvent.id) {
              throw new Error(`QR is for a different event. This scanner is set to: ${selectedEvent.name}`);
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

  return (
    <div className="min-h-screen bg-neutral-950 flex flex-col relative">
       {/* Global Overlay for Success/Error */}
       {scanResult.status !== 'idle' && (
           <div className={`absolute inset-0 z-50 flex flex-col items-center justify-center p-6 text-center text-white animate-in fade-in duration-300 ${scanResult.status === 'success' ? 'bg-green-600' : 'bg-red-600'}`}>
               {scanResult.status === 'success' ? (
                   <>
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
                   </>
               ) : (
                   <>
                       <XCircle className="h-32 w-32 mb-6" />
                       <h1 className="text-4xl font-bold mb-2">Access Denied</h1>
                       <p className="text-2xl font-medium opacity-90">{scanResult.message}</p>
                       
                       <button 
                           onClick={resetScanner}
                           className="mt-12 w-full max-w-xs rounded-full bg-white px-8 py-4 text-xl font-bold text-red-700 shadow-lg hover:bg-red-50 transition-all"
                       >
                           Try Again
                       </button>
                   </>
               )}
           </div>
       )}

       {/* Header */}
       <div className="flex items-center justify-between p-4 bg-neutral-900 border-b border-neutral-800 z-10">
           {loading ? (
               <div className="text-white">Loading...</div>
           ) : selectedEvent ? (
               <div className="flex flex-col">
                   <h2 className="text-white font-semibold text-lg">{selectedEvent.name}</h2>
                   <p className="text-xs text-green-400 flex items-center gap-1 mt-0.5">
                       <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse"/> LIVE SCANNING
                   </p>
               </div>
           ) : (
               <div className="text-neutral-400">No active events</div>
           )}
           
           <div className="flex items-center gap-3">
               <Link 
                   href="/change-password"
                   className="p-2 text-neutral-400 hover:text-white"
                   title="Change Password"
               >
                   <KeyRound className="h-5 w-5" />
               </Link>
               <button onClick={logout} className="p-2 text-neutral-400 hover:text-white" title="Logout">
                   <LogOut className="h-5 w-5" />
               </button>
           </div>
       </div>

       {/* Scanner View */}
       <div className="flex-1 flex flex-col items-center pt-8 px-4">
           {/* If no active event, show empty state */}
           {!selectedEvent && !loading && (
                <div className="flex flex-col items-center justify-center h-full text-center text-white">
                    <ScanLine className="h-16 w-16 mb-4 text-neutral-500" />
                    <h1 className="text-2xl font-bold">No Active Event</h1>
                    <p className="text-neutral-500 mt-2">Ask an admin to activate an event.</p>
                </div>
           )}

           {/* Scanner Container */}
           {selectedEvent && (
                isScanning ? (
                    <>
                        {/* We use specific ID for styling to hide file input if library leaks it */}
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
                    <div className="flex flex-col items-center justify-center space-y-6 mt-12 text-center w-full max-w-sm">
                        <div className="p-6 bg-rose-500/10 rounded-full border border-rose-500/20">
                            <Camera className="h-12 w-12 text-rose-500" />
                        </div>
                        
                        <div className="w-full space-y-3">
                             <label className="text-sm font-medium text-neutral-400">Select Event to Scan</label>
                             <div className="space-y-2 max-h-60 overflow-y-auto custom-scrollbar px-1">
                                 {activeEvents.map(evt => (
                                     <button
                                         key={evt.id}
                                         onClick={() => {
                                             setSelectedEvent(evt);
                                             localStorage.setItem('ingress_selected_event_id', evt.id);
                                         }}
                                         className={`w-full flex items-center justify-between p-4 rounded-xl border transition-all ${
                                             selectedEvent.id === evt.id 
                                             ? 'border-rose-500 bg-rose-500/10 text-white shadow-[0_0_15px_rgba(225,29,72,0.15)] ring-1 ring-rose-500' 
                                             : 'border-neutral-800 bg-neutral-900/50 text-neutral-400 hover:bg-neutral-900 hover:border-neutral-700'
                                         }`}
                                     >
                                        <span className="font-semibold">{evt.name}</span>
                                        {selectedEvent.id === evt.id && (
                                            <div className="bg-rose-500 rounded-full p-1">
                                                <Check className="h-3 w-3 text-white" />
                                            </div>
                                        )}
                                     </button>
                                 ))}
                             </div>
                        </div>

                        <button
                            onClick={() => setIsScanning(true)}
                            className="w-full px-8 py-4 bg-white hover:bg-neutral-200 text-black font-bold rounded-xl transition-colors shadow-lg mt-4"
                        >
                            Start Scanning
                        </button>
                    </div>
                )
           )}
       </div>
    </div>
  );
}
