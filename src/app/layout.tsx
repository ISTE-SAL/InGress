import type { Metadata } from "next";
// import localFont from "next/font/local";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";

export const metadata: Metadata = {
  title: "Ingress | ISTE",
  description: "Internal Event Management System",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased bg-neutral-950 text-neutral-100 selection:bg-rose-500/30">
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
