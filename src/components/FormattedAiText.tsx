'use client';

import React from 'react';
import Link from 'next/link';

interface FormattedAiTextProps {
  text: string;
  isUser?: boolean;
}

export default function FormattedAiText({ text, isUser = false }: FormattedAiTextProps) {
  if (!text) return null;

  if (isUser) {
    return <div className="whitespace-pre-wrap font-body">{text}</div>;
  }

  // Parse markdown-style text into beautifully structured, styled elements
  const lines = text.split('\n');

  return (
    <div className="space-y-2.5 font-body text-slate-100 leading-relaxed">
      {lines.map((line, lineIdx) => {
        const trimmed = line.trim();

        // Empty line -> spacing
        if (!trimmed) {
          return <div key={lineIdx} className="h-1.5" />;
        }

        // 🌟 Interactive Course CTA Card
        // Format: [COURSE_CTA: slug: Title: Price] or [COURSE_CTA: slug: Title]
        if (trimmed.startsWith('[COURSE_CTA:') && trimmed.endsWith(']')) {
          const content = trimmed.slice(12, -1);
          const parts = content.split(':').map(p => p.trim());
          const slug = parts[0] || 'courses';
          const title = parts[1] || 'የፀሐይ ካምፓስ ስልጠና';
          const price = parts[2] || '';

          return (
            <div 
              key={lineIdx}
              className="my-4 p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-[#121c33]/95 via-[#1a2542]/95 to-[#161f38]/95 border-2 border-[#f9b03c]/60 shadow-[0_10px_35px_rgba(0,0,0,0.6),0_0_25px_rgba(249,176,60,0.25)] relative overflow-hidden group"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-[#f9b03c]/15 rounded-full blur-2xl pointer-events-none group-hover:scale-125 transition-transform duration-500" />
              
              <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-3.5">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-full bg-[#f9b03c]/20 text-[#f9b03c] border border-[#f9b03c]/40 text-[10px] font-black uppercase tracking-wider">
                      🎓 RECOMMENDED MASTERCLASS
                    </span>
                    {price && (
                      <span className="text-xs font-black text-amber-300">
                        {price}
                      </span>
                    )}
                  </div>
                  <h4 className="text-sm sm:text-base font-black text-white font-heading group-hover:text-[#f9b03c] transition-colors">
                    {title}
                  </h4>
                  <p className="text-xs text-slate-300">
                    ሙሉውን ተግባራዊ ስልጠና፣ የቪዲዮ ትምህርቶች እና የ 24/7 የግል AI መምህር ድጋፍ በክላስሩም ውስጥ ያግኙ።
                  </p>
                </div>

                <Link
                  href={`/courses/${slug}`}
                  className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#f9b03c] via-amber-400 to-[#e09825] hover:from-amber-300 hover:to-amber-500 text-slate-950 font-black text-xs flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(249,176,60,0.4)] hover:scale-105 active:scale-95 transition-all duration-200 shrink-0 whitespace-nowrap cursor-pointer"
                >
                  <i className="fa-solid fa-graduation-cap text-xs"></i>
                  <span>ኮርሱን አሁኑኑ ይመዝገቡ (Enroll)</span>
                  <i className="fa-solid fa-arrow-right text-[10px]"></i>
                </Link>
              </div>
            </div>
          );
        }

        // 💡 Blockquote / Urgency Callout (e.g. > 💡 ...)
        if (trimmed.startsWith('>')) {
          const quoteText = trimmed.replace(/^>\s*/, '');
          return (
            <div
              key={lineIdx}
              className="my-3 p-3.5 rounded-xl bg-gradient-to-r from-[#f9b03c]/15 via-amber-500/10 to-transparent border-l-4 border-[#f9b03c] text-xs font-semibold text-amber-200/95 leading-relaxed shadow-sm backdrop-blur-md"
            >
              {renderInlineStyles(quoteText)}
            </div>
          );
        }

        // Section Headers (e.g. ### Header or ## Header or # Header)
        if (trimmed.startsWith('###') || trimmed.startsWith('##') || trimmed.startsWith('#')) {
          const cleanHeader = trimmed.replace(/^#+\s*/, '');
          return (
            <h4 key={lineIdx} className="font-heading font-black text-amber-400 text-sm mt-3 mb-1 flex items-center gap-1.5 border-b border-amber-500/20 pb-1">
              <span>{cleanHeader}</span>
            </h4>
          );
        }

        // Bullet Points (e.g. • item, - item, * item)
        if (trimmed.startsWith('•') || trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
          const cleanBullet = trimmed.replace(/^[•\-\*]\s*/, '');
          return (
            <div key={lineIdx} className="flex items-start gap-2 pl-1 my-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[#f9b03c] mt-2 shrink-0 shadow-[0_0_6px_rgba(249,176,60,0.8)]" />
              <div className="flex-1 text-slate-200">
                {renderInlineStyles(cleanBullet)}
              </div>
            </div>
          );
        }

        // Numbered Lists (e.g. 1. item, 2. item)
        const numberedMatch = trimmed.match(/^(\d+)[\.\)]\s*(.*)$/);
        if (numberedMatch) {
          const num = numberedMatch[1];
          const content = numberedMatch[2];
          return (
            <div key={lineIdx} className="flex items-start gap-2.5 pl-1 my-1.5">
              <span className="w-5 h-5 rounded-lg bg-[#f9b03c]/20 border border-[#f9b03c]/40 text-[#f9b03c] text-[11px] font-black flex items-center justify-center shrink-0 mt-0.5 shadow-xs">
                {num}
              </span>
              <div className="flex-1 text-slate-200">
                {renderInlineStyles(content)}
              </div>
            </div>
          );
        }

        // Standard Paragraph
        return (
          <p key={lineIdx} className="text-slate-200">
            {renderInlineStyles(trimmed)}
          </p>
        );
      })}
    </div>
  );
}

// Helper to render bold (**text**), inline highlights, and links
function renderInlineStyles(text: string): React.ReactNode[] {
  // Regex splitting by bold tokens **...**
  const parts = text.split(/(\*\*.*?\*\*)/g);

  return parts.map((part, idx) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      const boldText = part.slice(2, -2);
      return (
        <strong key={idx} className="font-black text-amber-300">
          {boldText}
        </strong>
      );
    }
    return <span key={idx}>{part}</span>;
  });
}
