import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import Navbar from "@/components/Navbar";
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
  title: "Tsehay Campus - ፀሐይ ካምፓስ | የኦንላይን እና የተግባር የክህሎት ማሰልጠኛ ፕላትፎርም",
  description: "በፀሐይ ካምፓስ (Tsehay Campus) የቴክኖሎጂ፣ የዲጂታል ማርኬቲንግ፣ የኢኮሜርስ እና የቢዝነስ ክህሎቶችን በኦንላይን እና በተግባር ይማሩ። በ AI የታገዘ ዘመናዊ ስልጠና ወስደው ገቢዎን ያሳድጉ!",
  keywords: [
    "Tsehay Campus", "ፀሐይ ካምፓስ", "Eyoub Sahle", "የኦንላይን ትምህርት", "የክህሎት ስልጠና", 
    "ዲጂታል ማርኬቲንግ", "ኢኮሜርስ", "Python", "Full-Stack", "Online Learning Ethiopia", 
    "Ethiopian e-learning", "Social Media Marketing", "Dropshipping Ethiopia", "Digital Skills"
  ],
  authors: [{ name: "Eyoub Sahle" }, { name: "Tsehay Campus Team" }],
  creator: "Tsehay Campus",
  publisher: "Tsehay Campus",
  metadataBase: new URL("https://www.tsehaycampus.com"),
  alternates: {
    canonical: "https://www.tsehaycampus.com",
    languages: {
      "am-ET": "https://www.tsehaycampus.com",
      "en-US": "https://www.tsehaycampus.com",
    },
  },
  manifest: "/manifest.json",
  verification: {
    google: "sjgyVc7j64r1mVrfW1zLgxfjGQGNeE1ZUIy85yDf35o",
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "48x48", type: "image/png" },
      { url: "/favicon.png", type: "image/png", sizes: "192x192" },
      { url: "/icon.png", type: "image/png", sizes: "512x512" },
      { url: "/tc-logo.jpg", type: "image/jpeg", sizes: "512x512" }
    ],
    shortcut: "/favicon.ico",
    apple: "/apple-touch-icon.png"
  },
  openGraph: {
    title: "Tsehay Campus - ፀሐይ ካምፓስ | የኦንላይን እና የተግባር የክህሎት ማሰልጠኛ",
    description: "በማንኛውም ቦታና ሰዓት በሀገራችን ቋንቋ የቴክኖሎጂ፣ የቢዝነስ እና የዲጂታል ክህሎት ስልጠናዎችን በኦንላይን እና በተግባር የሚወስዱበት ዘመናዊ ፕላትፎርም።",
    url: "https://www.tsehaycampus.com",
    siteName: "Tsehay Campus",
    images: [
      {
        url: "https://www.tsehaycampus.com/tc-logo.jpg",
        width: 1200,
        height: 1200,
        alt: "Tsehay Campus - ፀሐይ ካምፓስ Logo"
      }
    ],
    locale: "am_ET",
    type: "website"
  },
  twitter: {
    card: "summary_large_image",
    title: "Tsehay Campus - ፀሐይ ካምፓስ | የኦንላይን እና የተግባር የክህሎት ማሰልጠኛ",
    description: "በሀገራችን ቋንቋ የቴክኖሎጂ፣ የቢዝነስ እና የዲጂታል ክህሎት ስልጠናዎች በኦንላይን እና በተግባር",
    images: ["https://www.tsehaycampus.com/tc-logo.jpg"]
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  other: {
    google: "notranslate",
  },
};

import Script from "next/script";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="am" className="dark notranslate" translate="no" suppressHydrationWarning>
      <head>
        <meta name="google" content="notranslate" />
        <meta name="googlebot" content="notranslate" />
        <meta name="google-site-verification" content="sjgyVc7j64r1mVrfW1zLgxfjGQGNeE1ZUIy85yDf35o" />
        <link rel="icon" href="/favicon.ico" sizes="48x48" type="image/png" />
        <link rel="icon" href="/favicon.png" type="image/png" sizes="192x192" />
        <link rel="icon" href="/icon.png" type="image/png" sizes="512x512" />
        <link rel="icon" href="/tc-logo.jpg" type="image/jpeg" sizes="512x512" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link rel="shortcut icon" href="/favicon.ico" />
        <link rel="icon" href="https://www.tsehaycampus.com/favicon.ico" sizes="48x48" type="image/png" />
        <link rel="icon" href="https://www.tsehaycampus.com/favicon.png" type="image/png" sizes="192x192" />
        <link rel="icon" href="https://www.tsehaycampus.com/icon.png" type="image/png" sizes="512x512" />
        <link rel="icon" href="https://www.tsehaycampus.com/tc-logo.jpg" type="image/jpeg" />
        <link rel="apple-touch-icon" href="https://www.tsehaycampus.com/apple-touch-icon.png" />
        <link rel="shortcut icon" href="https://www.tsehaycampus.com/favicon.ico" />
        <meta name="theme-color" content="#F9B03C" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="preconnect" href="https://firestore.googleapis.com" crossOrigin="anonymous" />
        <link rel="preconnect" href="https://identitytoolkit.googleapis.com" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://firestore.googleapis.com" />
        <link rel="dns-prefetch" href="https://identitytoolkit.googleapis.com" />
        <link rel="dns-prefetch" href="https://images.unsplash.com" />
        <link rel="preconnect" href="https://cdnjs.cloudflare.com" crossOrigin="anonymous" />
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" />
        <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;700;900&family=Inter:wght@400;500;700&family=Noto+Sans+Ethiopic:wght@400;700;900&family=Playfair+Display:ital,wght@0,700;1,700&family=Great+Vibes&display=swap" rel="stylesheet" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased pt-20 notranslate`}
        translate="no"
        suppressHydrationWarning
      >
        <Script
          id="schema-org"
          type="application/ld+json"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "EducationalOrganization",
              "name": "Tsehay Campus - ፀሐይ ካምፓስ",
              "alternateName": "Tsehay Campus",
              "url": "https://www.tsehaycampus.com",
              "logo": "https://www.tsehaycampus.com/tc-logo.jpg",
              "description": "የኦንላይን እና የተግባር የክህሎት ማሰልጠኛ ፕላትፎርም በኢትዮጵያ። የቴክኖሎጂ፣ የዲጂታል ማርኬቲንግ እና የቢዝነስ ስልጠናዎች።",
              "sameAs": [
                "https://t.me/EyoubSahle",
                "https://t.me/TsehayTeam"
              ],
              "founder": {
                "@type": "Person",
                "name": "Eyoub Sahle"
              }
            })
          }}
        />
        <Script
          id="theme-initializer"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{ __html: `
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
          ` }}
        />
        <LanguageProvider>
          <AuthProvider>
            <Navbar />
            {children}
            <TermsModal />
            <PaymentModal />
          </AuthProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}
