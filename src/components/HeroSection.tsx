"use client";

import React, { useState, useEffect, useMemo } from "react";
import { ArrowRight } from "lucide-react";
import { parseVideoUrl, extractYouTubeId } from "@/lib/videoParser";

interface HeroSectionProps {
  videoSrc?: string;
  videoThumbnail?: string;
}

export default function HeroSection({
  videoSrc,
  videoThumbnail
}: HeroSectionProps = {}) {
  // 1. የ Typing Animation ሎጂክ ለ STAND APART
  const fullText = "STAND APART";
  const [displayText, setDisplayText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [loopNum, setLoopNum] = useState(0);
  const [typingSpeed, setTypingSpeed] = useState(150);

  useEffect(() => {
    let timer: NodeJS.Timeout;

    const handleTyping = () => {
      setDisplayText((prev) =>
        isDeleting
          ? fullText.substring(0, prev.length - 1)
          : fullText.substring(0, prev.length + 1)
      );

      // የመጻፊያና የመሰረዣ ፍጥነት ማስተካከያ
      if (!isDeleting && displayText === fullText) {
        timer = setTimeout(() => setIsDeleting(true), 2500); // ቃሉ ሞልቶ ሲያበቃ ለ 2.5 ሰከንድ ቆም ይላል
        setTypingSpeed(100);
      } else if (isDeleting && displayText === "") {
        setIsDeleting(false);
        setLoopNum((prev) => prev + 1);
        setTypingSpeed(150);
      } else {
        setTypingSpeed(isDeleting ? 60 : 140);
      }
    };

    timer = setTimeout(handleTyping, typingSpeed);
    return () => clearTimeout(timer);
  }, [displayText, isDeleting, loopNum, typingSpeed]);

  // Video resolution
  const effectiveVideo = videoSrc || "https://www.youtube.com/watch?v=mgdOMtW6J8k";

  const parsed = useMemo(() => {
    return parseVideoUrl(effectiveVideo, false);
  }, [effectiveVideo]);

  const ytId = useMemo(() => {
    return extractYouTubeId(effectiveVideo) || "mgdOMtW6J8k";
  }, [effectiveVideo]);

  const embedSrc = parsed.isYouTube || ytId
    ? `https://www.youtube.com/embed/${ytId}?rel=0&modestbranding=1`
    : (parsed.src || "https://www.youtube.com/embed/mgdOMtW6J8k?rel=0&modestbranding=1");

  return (
    <section className="relative overflow-hidden bg-neutral-950 pt-20 pb-28" id="home">
      {/* የጀርባ ለስላሳ ድምቀት */}
      <div className="pointer-events-none absolute -top-40 left-1/2 -z-10 -translate-x-1/2 transform-gpu blur-3xl sm:-top-80">
        <div
          className="aspect-[1155/678] w-[68rem] bg-gradient-to-tr from-[#3268ba]/20 via-[#f9b03c]/15 to-transparent opacity-40"
          style={{
            clipPath:
              "polygon(74.1% 44.1%, 100% 61.6%, 97.5% 26.9%, 85.5% 0.1%, 80.7% 2%, 72.5% 32.5%, 60.2% 62.4%, 52.4% 68.1%, 47.5% 58.3%, 45.2% 34.5%, 27.5% 76.7%, 0.1% 64.9%, 17.9% 100%, 27.6% 76.8%, 76.1% 97.7%, 74.1% 44.1%)",
          }}
        />
      </div>

      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center text-center">
          {/* ዋናው Typing Animation ስሎጋን (ከላይ የነበረው ባጅ ተወግዷል) */}
          <div className="min-h-[4.5rem] sm:min-h-[6rem] lg:min-h-[7.5rem] flex items-center justify-center">
            <h1 className="text-5xl font-black tracking-tight text-white sm:text-7xl lg:text-8xl uppercase font-heading">
              {displayText.startsWith("STAND") ? (
                <>
                  STAND{" "}
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#f9b03c] to-amber-300">
                    {displayText.replace("STAND", "").trimStart()}
                  </span>
                </>
              ) : (
                displayText
              )}
              {/* ብልጭ ድርግም የሚል ከርሰር (Blinking Cursor) */}
              <span className="ml-1 inline-block h-10 w-1.5 sm:h-16 sm:w-2 lg:h-20 lg:w-2.5 bg-[#f9b03c] animate-pulse align-middle" />
            </h1>
          </div>

          {/* ንዑስ መግለጫ */}
          <p className="mx-auto mt-5 max-w-2xl text-base sm:text-xl font-normal leading-relaxed text-neutral-400">
            The right skills. The right guidance. A career that sets you apart.
          </p>

          {/* Action Buttons */}
          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <a
              href="#courses"
              className="inline-flex items-center gap-2 rounded-xl bg-[#f9b03c] px-8 py-3.5 text-sm sm:text-base font-bold text-neutral-950 shadow-[0_0_25px_rgba(249,176,60,0.3)] transition-all hover:bg-[#e09b30] hover:scale-105 active:scale-95 cursor-pointer font-heading"
            >
              <span>EXPLORE COURSES</span>
              <ArrowRight className="h-4 w-4" />
            </a>
            <a
              href="#events"
              className="rounded-xl border border-neutral-800 bg-neutral-900/70 px-8 py-3.5 text-sm sm:text-base font-semibold text-neutral-200 backdrop-blur-sm transition-all hover:bg-neutral-800 hover:text-white cursor-pointer font-heading"
            >
              UPCOMING EVENTS
            </a>
          </div>
        </div>

        {/* 2. የቀደመው የቪዲዮ አኒሜሽን (Restored Smooth Float/Pulse Animation) */}
        <div className="relative mx-auto mt-16 max-w-5xl transition-all duration-700 hover:scale-[1.01]">
          {/* የተንሳፋፊ ብርሃን አኒሜሽን (Ambient Animated Halo) */}
          <div className="pointer-events-none absolute -inset-1 rounded-3xl bg-gradient-to-r from-[#f9b03c]/20 via-[#3268ba]/20 to-[#f9b03c]/20 opacity-70 blur-xl animate-pulse" />

          {/* የቪዲዮ ፍሬም */}
          <div className="relative rounded-2xl border border-neutral-800/80 bg-neutral-900/50 p-2 shadow-2xl backdrop-blur-xl sm:p-4 transition-transform duration-500 ease-out hover:-translate-y-1">
            <div className="relative aspect-video w-full overflow-hidden rounded-xl border border-neutral-800 bg-neutral-950">
              {parsed.isDirectVideo ? (
                <video
                  className="h-full w-full object-cover"
                  src={parsed.src}
                  poster={videoThumbnail || "/assets/hero-bg-new.jpg"}
                  controls
                  playsInline
                />
              ) : (
                <iframe
                  className="h-full w-full object-cover"
                  src={embedSrc}
                  title="Tsehay Campus Introduction"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
