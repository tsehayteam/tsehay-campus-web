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
  title: "Tsehay Campus - ፀሐይ ካምፓስ | የኦንላይን እና የተዋሃደ (Hybrid) ትምህርት ፕላትፎርም",
  description: "ፀሐይ ካምፓስ (Tsehay Campus) - በማንኛውም ቦታና ሰዓት በሀገራችን ቋንቋ የቴክኖሎጂ፣ የቢዝነስ እና የክህሎት ስልጠናዎችን የሚወስዱበት ዘመናዊ የኢ-ለርኒንግ ፕላትፎርም።",
  metadataBase: new URL("https://tsehaycampus.com"),
  icons: {
    icon: [
      { url: "/tc-logo.jpg", type: "image/jpeg" },
      { url: "/favicon.ico" }
    ],
    shortcut: "/tc-logo.jpg",
    apple: "/tc-logo.jpg"
  },
  openGraph: {
    title: "Tsehay Campus - ፀሐይ ካምፓስ",
    description: "በማንኛውም ቦታና ሰዓት በሀገራችን ቋንቋ የቴክኖሎጂ፣ የቢዝነስ እና የክህሎት ስልጠናዎችን የሚወስዱበት ዘመናዊ የኢ-ለርኒንግ ፕላትፎርም።",
    url: "https://tsehaycampus.com",
    siteName: "Tsehay Campus",
    images: [
      {
        url: "https://tsehaycampus.com/tc-logo.jpg",
        width: 800,
        height: 800,
        alt: "Tsehay Campus Logo"
      }
    ],
    locale: "am_ET",
    type: "website"
  },
  twitter: {
    card: "summary_large_image",
    title: "Tsehay Campus - ፀሐይ ካምፓስ",
    description: "በሀገራችን ቋንቋ የቴክኖሎጂ እና የክህሎት ስልጠናዎች",
    images: ["https://tsehaycampus.com/tc-logo.jpg"]
  }
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="am" className="dark">
      <head>
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="icon" href="/favicon.png" type="image/png" />
        <link rel="icon" href="/icon.png" type="image/png" />
        <link rel="icon" href="/tc-logo.jpg" type="image/jpeg" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link rel="shortcut icon" href="/favicon.ico" />
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" />
        <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;700;900&family=Inter:wght@400;500;700&family=Noto+Sans+Ethiopic:wght@400;700;900&family=Playfair+Display:ital,wght@0,700;1,700&family=Great+Vibes&display=swap" rel="stylesheet" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "Organization",
              "name": "Tsehay Campus",
              "url": "https://tsehaycampus.com",
              "logo": "https://tsehaycampus.com/tc-logo.jpg",
              "sameAs": ["https://t.me/EyoubSahle"]
            })
          }}
        />
        <script dangerouslySetInnerHTML={{ __html: `
          (function() {
            try {
              var savedTheme = localStorage.getItem('theme');
              if (savedTheme === 'light') {
                document.documentElement.classList.remove('dark');
              } else {
                document.documentElement.classList.add('dark');
              }
            } catch (e) {}
          })();
        ` }} />
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
