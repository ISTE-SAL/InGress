import { Timestamp } from 'firebase/firestore';

export type UserRole = 'admin' | 'scanner';

export interface UserProfile {
  uid: string;
  name: string;
  email: string;
  role: UserRole;
}

export interface IngressEvent {
  id: string; // Firestore Doc ID
  name: string;
  date: string; // ISO Date or formatted string
  venue: string;
  isActive: boolean;
}

export interface Participant {
  id: string; // Firestore Doc ID
  name: string;
  enrollment: string;
  email: string;
  checkedIn: boolean;
  checkedInAt: Timestamp | null;
}

export interface QRPayload {
  eventId: string;
  participantId: string;
  signature: string; // Simple hash or secret
}
