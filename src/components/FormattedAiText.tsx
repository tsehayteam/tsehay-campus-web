'use client';

import React from 'react';

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
    <div className="space-y-2 font-body text-slate-100 leading-relaxed">
      {lines.map((line, lineIdx) => {
        const trimmed = line.trim();

        // Empty line -> spacing
        if (!trimmed) {
          return <div key={lineIdx} className="h-1.5" />;
        }

        // Section Headers (e.g. ### Header or **Header:** or [Header])
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
