import type { Metadata } from "next";
import { Suspense } from "react";
import Script from "next/script";
import { Geist, Geist_Mono, Montserrat, Noto_Sans_Ethiopic } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import Navbar from "@/components/Navbar";
import ContentProtection from "@/components/ContentProtection";
import ReferralTracker from "@/components/ReferralTracker";
import { LanguageProvider } from "@/context/LanguageContext";
import SmoothScrollAndScrollyProvider from "@/components/scrollytelling/SmoothScrollAndScrollyProvider";
import PageTransitionWrapper from "@/components/scrollytelling/PageTransitionWrapper";
import TsehayExperienceProvider from "@/components/experience/TsehayExperienceProvider";

import GlobalModals from "@/components/GlobalModals";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const montserrat = Montserrat({
  variable: "--font-heading-var",
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500", "600", "700", "800", "900"],
});

const notoSansEthiopic = Noto_Sans_Ethiopic({
  variable: "--font-ethiopic-var",
  subsets: ["ethiopic"],
  display: "swap",
  weight: ["400", "500", "600", "700", "800", "900"],
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
        <style
          id="tsehay-preloader-shield"
          dangerouslySetInnerHTML={{
            __html: `
              html.tsehay-loading:not(.tsehay-curtain-revealing) #tsehay-page-wrapper {
                opacity: 0 !important;
                visibility: hidden !important;
                pointer-events: none !important;
              }
              html.tsehay-curtain-revealing #tsehay-page-wrapper {
                visibility: visible !important;
                pointer-events: auto !important;
              }
              html:not(.tsehay-loading) #tsehay-lusion-preloader {
                display: none !important;
                opacity: 0 !important;
                pointer-events: none !important;
              }
              #tsehay-page-wrapper {
                will-change: transform, opacity;
              }
            `,
          }}
        />
        <script
          id="tsehay-preloader-session-detector"
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  // 1. Strict Back/Forward Navigation Guard: NEVER lock page or show preloader on history pop
                  var nav = window.performance && window.performance.getEntriesByType && window.performance.getEntriesByType('navigation')[0];
                  var isBackForward = (nav && nav.type === 'back_forward') || (window.performance && window.performance.navigation && window.performance.navigation.type === 2);
                  if (isBackForward) {
                    document.documentElement.classList.remove('tsehay-loading');
                    return;
                  }

                  var p = location.pathname;
                  var isLanding = (p === '/' || p === '');
                  var seen = sessionStorage.getItem('tsehay_preloader_shown') === 'true' || 
                             sessionStorage.getItem('tsehay_preloader_seen') === 'true' ||
                             localStorage.getItem('tsehay_preloader_seen') === 'true';
                  var userCached = Boolean(localStorage.getItem('tsehay_auth_user_cache'));

                  if (isLanding && !seen && !userCached) {
                    document.documentElement.classList.add('tsehay-loading');
                  } else {
                    document.documentElement.classList.remove('tsehay-loading');
                  }

                  // 2. Proactive listeners to immediately unlock on popstate (browser back/forward) or pageshow (BFCache restore)
                  window.addEventListener('popstate', function() {
                    document.documentElement.classList.remove('tsehay-loading');
                    var pl = document.getElementById('tsehay-lusion-preloader');
                    if (pl) pl.style.display = 'none';
                  }, { passive: true });

                  window.addEventListener('pageshow', function() {
                    document.documentElement.classList.remove('tsehay-loading');
                    var pl = document.getElementById('tsehay-lusion-preloader');
                    if (pl) pl.style.display = 'none';
                  }, { passive: true });

                } catch (e) {
                  document.documentElement.classList.remove('tsehay-loading');
                }
              })();
            `,
          }}
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${montserrat.variable} ${notoSansEthiopic.variable} antialiased pt-0 notranslate`}
        translate="no"
        suppressHydrationWarning
      >
        <Script
          id="schema-org"
          type="application/ld+json"
          strategy="afterInteractive"
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
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{ __html: `
            (function() {
              try {
                var savedTheme = localStorage.getItem('theme');
                if (savedTheme === 'light') {
                  document.documentElement.classList.remove('dark');
                } else {
                  document.documentElement.classList.add('dark');
                }
              } catch (e) {
                document.documentElement.classList.add('dark');
              }
              // Auto-update Service Worker & purge old cache to ensure latest live version everywhere
              if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
                navigator.serviceWorker.getRegistrations().then(function(registrations) {
                  for (var reg of registrations) {
                    reg.update().catch(function() {});
                  }
                }).catch(function() {});
              }
            })();
          `}}
        />

        <LanguageProvider>
          <AuthProvider>
            <SmoothScrollAndScrollyProvider>
              {/*  Lusion.co-Level Solar Gravity Atmosphere & Synesthetic Audio Engine */}
              <TsehayExperienceProvider />
              
              <div id="tsehay-page-wrapper" className="w-full min-h-screen">
                <ContentProtection />
                <Navbar />
                
                <PageTransitionWrapper>
                  {children}
                </PageTransitionWrapper>
                
                <Suspense fallback={null}>
                  <ReferralTracker />
                </Suspense>
                
                <GlobalModals />
              </div>
            </SmoothScrollAndScrollyProvider>
          </AuthProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}
