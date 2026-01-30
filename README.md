# InGress

**InGress** is a modern, streamlined Event Management and Ticketing solution designed to simplify the process of checking in participants at venues. It bridges the gap between digital registration and physical attendance with a seamless QR code-based workflow.

## 🚀 Purpose

The primary goal of InGress is to eliminate queues and manual attendance tracking at events. By equipping administrators with powerful management tools and gatekeepers with a fast, reliable scanning interface, InGress ensures a smooth entry experience for thousands of attendees.

## ✨ Key Features

### 👑 For Administrators

- **Event Command Center**: Create and manage multiple events with ease. Toggle events as "Live" or "Completed" to control access in real-time.
- **Live Analytics**: Monitor attendance as it happens. Watch the "Checked In" count and "Turnout" percentage update instantly as guests arrive.
- **Bulk Management**:
  - **Import**: Upload participant lists directly from Excel (.xlsx) files.
  - **Generate**: Create unique, secure QR codes for all participants in one click and download them as a ZIP bundle.
  - **Export**: Download the final attendance sheet including timestamps after the event.
- **User Management**: Create and manage dedicated accounts for Scanners to ensure security.

### 📱 For Scanners (Gatekeepers)

- **Rapid Scanning**: A mobile-optimized interface designed for speed.
- **Instant Validation**: Scans QR codes against the live database to verify entry eligibility immediately.
- **Clear Feedback**: Visual color-coded overlays (Green for Check-in, Red for Error/Duplicate) allow for high-volume processing without reading text.
- **Duplicate Prevention**: Smart logic prevents accidental double-scans, ensuring accurate data.

## 🛠️ Technology

Built with modern web technologies for performance and reliability:

- **Frontend**: Next.js (React)
- **Styling**: Tailwind CSS & Shadcn UI
- **Backend & Real-time Database**: Firebase
- **Authentication**: Secure Role-Based Access Control (RBAC)
