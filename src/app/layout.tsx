import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import Navbar from "@/components/Navbar";
import FloatingAIButton from "@/components/FloatingAIButton";
import AuthModal from "@/components/AuthModal";
import PaymentModal from "@/components/PaymentModal";
import TermsModal from "@/components/TermsModal";
import { LanguageProvider } from "@/context/LanguageContext";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Tsehay Campus - The Future of Learning",
  description: "Learn tech in Amharic.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" />
        <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;700;900&family=Inter:wght@400;500;700&family=Noto+Sans+Ethiopic:wght@400;700;900&family=Playfair+Display:ital,wght@0,700;1,700&family=Great+Vibes&display=swap" rel="stylesheet" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased pt-20`}
      >
        <LanguageProvider>
          <AuthProvider>
            <Navbar />
            {children}
            <FloatingAIButton />
            <TermsModal />
            <PaymentModal />
          </AuthProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}
