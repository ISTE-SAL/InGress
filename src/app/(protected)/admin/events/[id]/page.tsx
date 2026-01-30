'use client';

import { useAuth } from '@/context/AuthContext';
import { db } from '@/lib/firebase';
import { IngressEvent, Participant } from '@/types';
import { doc, getDoc, collection, getDocs, writeBatch, Timestamp, updateDoc, onSnapshot } from 'firebase/firestore';
import { Loader2, ArrowLeft, Upload, QrCode, Users, Trash2, Download } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState, use } from 'react';
import { useParams } from 'next/navigation';
import * as XLSX from 'xlsx';
import { QRCodeSVG } from 'qrcode.react';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import QRCode from 'qrcode';

export default function EventDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [event, setEvent] = useState<IngressEvent | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [activeTab, setActiveTab] = useState<'list' | 'import' | 'qr'>('list');

  useEffect(() => {
    let unsubscribeParticipants: () => void;

    const fetchData = async () => {
      if (!id) return;
      try {
        const eventDocRef = doc(db, 'events', id);
        const eventDoc = await getDoc(eventDocRef);
        
        if (eventDoc.exists()) {
          setEvent({ id: eventDoc.id, ...eventDoc.data() } as IngressEvent);
          
          // Real-time listener for participants
          const pCol = collection(db, 'events', id, 'participants');
          unsubscribeParticipants = onSnapshot(pCol, (snapshot) => {
              const pList = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Participant));
              setParticipants(pList);
          }, (error) => {
              console.error("Error fetching participants realtime:", error);
          });
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();

    return () => {
        if (unsubscribeParticipants) unsubscribeParticipants();
    };
  }, [id]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0] || !id) return;
    setImporting(true);
    const file = e.target.files[0];
    
    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const sheetDetail = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(sheetDetail) as any[];

      console.log('Raw XLSX Data:', jsonData); // Debug log

      const batch = writeBatch(db);
      const newParticipants: Participant[] = [];
      let skippedCount = 0;

      jsonData.forEach((row, index) => {
        // Normalize keys to lowercase and trim
        const normalizedRow: any = {};
        Object.keys(row).forEach(key => {
            normalizedRow[key.trim().toLowerCase()] = row[key];
        });

        // Debug first row to see structure
        if (index === 0) console.log('Normalized First Row:', normalizedRow);

        // Flexible matching for Name
        const name = normalizedRow['name'] || 
                     normalizedRow['full name'] || 
                     normalizedRow['student name'] || 
                     normalizedRow['student full name'] || 
                     normalizedRow['participant name'] ||
                     normalizedRow['candidate name'];

        // Flexible matching for Enrollment
        const enrollment = normalizedRow['enrollment'] || 
                           normalizedRow['enrollment no'] || 
                           normalizedRow['enrollment number'] || 
                           normalizedRow['roll no'] || 
                           normalizedRow['roll number'] ||
                           normalizedRow['reg no'] ||
                           normalizedRow['registration number'];

        // Flexible matching for Email
        const email = normalizedRow['email'] || 
                      normalizedRow['student email'] ||
                      normalizedRow['email id'] ||
                      normalizedRow['contact email'];

        if (name && enrollment) {
            const pRef = doc(collection(db, 'events', id, 'participants'));
            const pData: any = {
                name: String(name).trim(),
                enrollment: String(enrollment).trim(),
                // Normalize email to lowercase
                email: email ? String(email).trim().toLowerCase() : '',
                checkedIn: false,
                checkedInAt: null
            };
            batch.set(pRef, pData);
            newParticipants.push({ id: pRef.id, ...pData } as Participant);
        } else {
            skippedCount++;
        }
      });

      if (newParticipants.length > 0) {
          await batch.commit();
          setParticipants(prev => [...prev, ...newParticipants]);
          alert(`Success! Imported ${newParticipants.length} participants.${skippedCount > 0 ? ` (Skipped ${skippedCount} invalid rows)` : ''}`);
          setActiveTab('list');
      } else {
          alert('No valid participants found. Please check your column headers (Name, Enrollment, Email). View console for details.');
      }

    } catch (error) {
       console.error('Import Error:', error);
       alert('Error parsing or uploading file. See console for details.');
    } finally {
      setImporting(false);
      // Reset file input value to allow re-uploading same file if needed
      e.target.value = '';
    }
  };
  
  const exportCheckedIn = () => {
    const checkedInParticipants = participants.filter(p => p.checkedIn);
    if (checkedInParticipants.length === 0) {
        alert("No participants have checked in yet.");
        return;
    }

    const dataToExport = checkedInParticipants.map((p, index) => ({
        'Sr No.': index + 1,
        'Name': p.name,
        'Enrollment': p.enrollment,
        'Email': p.email,
        'Checked In At': p.checkedInAt ? new Date(p.checkedInAt.seconds * 1000).toLocaleString() : 'N/A'
    }));

    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Attendance");
    const filename = `${event?.name.replace(/[^a-z0-9]/gi, '_') || 'Event'}_Attendance.xlsx`;
    XLSX.writeFile(wb, filename);
  };

  const generateQRPayload = (pId: string) => {
     // QR payload format: { eventId, participantId, signature }
     // Signature is simple hash for now (simulate security)
     return JSON.stringify({
         eventId: id,
         participantId: pId,
         signature: 'valid' // Real impl would sign this with a secret
     });
  };

  const downloadZip = async () => {
    if (participants.length === 0) return;
    const zip = new JSZip();
    const folderName = event?.name ? event.name.replace(/[^a-z0-9]/gi, '_').trim() : "Participants_QRs";
    const folder = zip.folder(folderName);
    
    // We notify user standard alert for now, real UI would have progress bar
    const originalText = document.getElementById('download-btn')?.innerText;
    if(originalText) document.getElementById('download-btn')!.innerText = 'Generating...';

    try {
        await Promise.all(participants.map(async (p) => {
            const payload = generateQRPayload(p.id);
            // Generate Data URL
            const url = await QRCode.toDataURL(payload, { width: 300, margin: 1 });
            // Clean filename
            const safeName = p.name.replace(/[^a-z0-9]/gi, '_').trim();
            const filename = `${safeName}_${p.enrollment}.png`;
            
            // Remove "data:image/png;base64," prefix
            const base64Data = url.split(',')[1];
            folder?.file(filename, base64Data, { base64: true });
        }));

        const content = await zip.generateAsync({ type: "blob" });
        saveAs(content, `${event?.name.replace(/[^a-z0-9]/gi, '_') || 'Event'}_QRs.zip`);
        
    } catch (e) {
        console.error("Zip Error:", e);
        alert("Failed to generate ZIP");
    } finally {
        if(originalText) document.getElementById('download-btn')!.innerText = originalText;
    }
  };

  const toggleEventStatus = async () => {
      if (!event) return;
      // Confirmation
      const newStatus = !event.isActive;
      const confirmMsg = newStatus 
        ? "Are you sure you want to RE-OPEN this event? Scanners will be able to check people in again." 
        : "Are you sure you want to CLOSE this event? Scanners will no longer be able to check people in.";
      
      if (!confirm(confirmMsg)) return;

      try {
          const eventRef = doc(db, 'events', event.id);
          await updateDoc(eventRef, { isActive: newStatus });
          setEvent({ ...event, isActive: newStatus });
      } catch (e) {
          console.error("Error updating status:", e);
          alert("Failed to update event status");
      }
  };

  if (loading) return <div className="flex h-screen items-center justify-center bg-neutral-950"><Loader2 className="animate-spin text-rose-500" /></div>;
  if (!event) return <div className="p-12 text-white">Event not found</div>;

  return (
    <div className="min-h-screen bg-neutral-950 p-6 md:p-12">
      <div className="mx-auto max-w-6xl space-y-8">
        {/* Header */}
         <div className="space-y-4">
             <Link href="/admin" className="flex items-center text-neutral-400 hover:text-white transition-colors">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Dashboard
             </Link>
             <div className="flex items-end justify-between">
                 <div>
                    <div className="flex items-center gap-3">
                        <h1 className="text-3xl font-bold text-white">{event.name}</h1>
                        <span className={`px-3 py-1 rounded-full text-xs font-bold border ${event.isActive ? 'bg-green-500/10 text-green-500 border-green-500/20' : 'bg-red-500/10 text-red-500 border-red-500/20'}`}>
                            {event.isActive ? 'LIVE' : 'COMPLETED'}
                        </span>
                    </div>
                    <div className="flex items-center gap-4 text-neutral-400">
                        <p>{event.date} • {event.venue}</p>
                        <button 
                            onClick={toggleEventStatus}
                            className="text-xs hover:text-white underline decoration-dotted underline-offset-4"
                        >
                            Mark as {event.isActive ? 'Completed' : 'Live'}
                        </button>
                    </div>
                 </div>
                 <div className="flex gap-2">
                     <button
                        onClick={() => setActiveTab('list')}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'list' ? 'bg-white text-black' : 'bg-neutral-900 text-neutral-400 hover:bg-neutral-800'}`}
                     >
                        Participants ({participants.length})
                     </button>
                     <button
                        onClick={() => setActiveTab('import')}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'import' ? 'bg-white text-black' : 'bg-neutral-900 text-neutral-400 hover:bg-neutral-800'}`}
                     >
                        Import XLSX
                     </button>
                      <button
                        onClick={() => setActiveTab('qr')}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'qr' ? 'bg-white text-black' : 'bg-neutral-900 text-neutral-400 hover:bg-neutral-800'}`}
                     >
                        Generate QRs
                     </button>
                 </div>
             </div>
         </div>

         {/* Content */}
         <div className="rounded-2xl border border-neutral-800 bg-neutral-900/30 p-6 min-h-[400px]">
            {activeTab === 'list' && (
                <div className="space-y-4">
                    <div className="flex justify-between items-center bg-neutral-900/50 p-3 rounded-lg border border-neutral-800">
                        <div className="text-sm text-neutral-400">
                            Showing <span className="text-white font-bold">{participants.length}</span> participants
                        </div>
                        <button
                            onClick={exportCheckedIn}
                            className="flex items-center gap-2 px-3 py-1.5 bg-green-600/10 text-green-500 border border-green-600/20 rounded-md text-xs font-bold hover:bg-green-600/20 transition-colors"
                        >
                            <Download className="w-3 h-3" />
                            Export Attendance (XLSX)
                        </button>
                    </div>
                    
                    <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm text-neutral-400">
                        <thead className="bg-neutral-900/50 text-xs uppercase text-neutral-500">
                            <tr>
                                <th className="px-4 py-3">Sr No.</th>
                                <th className="px-4 py-3">Name</th>
                                <th className="px-4 py-3">Enrollment</th>
                                <th className="px-4 py-3">Email</th>
                                <th className="px-4 py-3">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-neutral-800">
                            {participants.map((p, index) => (
                                <tr key={p.id} className="hover:bg-neutral-900/50">
                                    <td className="px-4 py-3 text-neutral-500">{index + 1}</td>
                                    <td className="px-4 py-3 text-white font-medium">{p.name}</td>
                                    <td className="px-4 py-3">{p.enrollment}</td>
                                    <td className="px-4 py-3">{p.email}</td>
                                    <td className="px-4 py-3">
                                        {p.checkedIn ? (
                                            <span className="text-green-400 bg-green-400/10 px-2 py-1 rounded text-xs">Checked In</span>
                                        ) : (
                                            <span className="text-neutral-500 bg-neutral-800 px-2 py-1 rounded text-xs">Pending</span>
                                        )}
                                    </td>
                                </tr>
                            ))}
                            {participants.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="px-4 py-8 text-center text-neutral-600">No participants yet. Import them.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
                </div>
            )}

            {activeTab === 'import' && (
                <div className="flex flex-col items-center justify-center py-12 space-y-4">
                    <div className="p-4 bg-neutral-900 rounded-full">
                        <Upload className="h-8 w-8 text-rose-500" />
                    </div>
                    <div className="text-center">
                        <h3 className="text-lg font-medium text-white">Upload Participant List</h3>
                        <p className="text-sm text-neutral-500 mt-1">Supports .xlsx files with columns: Name, Enrollment, Email</p>
                    </div>
                    <label className="cursor-pointer relative mt-4">
                        <input type="file" accept=".xlsx, .xls" onChange={handleFileUpload} className="sr-only" disabled={importing} />
                        <span className={`inline-flex items-center gap-2 rounded-lg bg-rose-600 px-6 py-3 font-semibold text-white hover:bg-rose-500 transition-all ${importing ? 'opacity-50' : ''}`}>
                            {importing ? 'Importing...' : 'Select File'}
                        </span>
                    </label>
                </div>
            )}

            {activeTab === 'qr' && (
                <div className="space-y-6">
                    <div className="flex justify-between items-center bg-white/5 p-4 rounded-lg border border-white/10">
                        <div>
                            <h3 className="text-white font-medium">Bulk Actions</h3>
                            <p className="text-neutral-500 text-sm">Download valid QR codes for all participants</p>
                        </div>
                        <button 
                            id="download-btn"
                            onClick={downloadZip}
                            disabled={participants.length === 0}
                            className="bg-white text-black px-4 py-2 rounded-lg font-bold text-sm hover:bg-neutral-200 transition-colors disabled:opacity-50"
                        >
                            Download All (ZIP)
                        </button>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                        {participants.map(p => (
                            <div key={p.id} className="flex flex-col items-center bg-white p-4 rounded-lg gap-3">
                                <QRCodeSVG value={generateQRPayload(p.id)} size={128} />
                                <div className="text-center">
                                    <p className="text-black font-bold text-sm truncate w-32" title={p.name}>{p.name}</p>
                                    <p className="text-gray-500 text-xs">{p.enrollment}</p>
                                </div>
                            </div>
                        ))}
                        {participants.length === 0 && (
                            <div className="col-span-full text-center text-neutral-500 py-12">No participants to generate QRs for.</div>
                        )}
                    </div>
                </div>
            )}
         </div>
      </div>
    </div>
  );
}
