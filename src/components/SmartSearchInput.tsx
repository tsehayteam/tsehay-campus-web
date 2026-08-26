'use client';
import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { searchCourses } from '@/lib/smartSearch';

interface SmartSearchInputProps {
  courses: any[];
  placeholder?: string;
  onSearchChange?: (filteredCourses: any[], query: string) => void;
  className?: string;
  compact?: boolean;
}

export default function SmartSearchInput({
  courses = [],
  placeholder = "ኮርሶችን ይፈልጉ (e.g. Social Media, Facebook, ዌብሳይት, Python)...",
  onSearchChange,
  className = "",
  compact = false
}: SmartSearchInputProps) {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [filteredResults, setFilteredResults] = useState<any[]>([]);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    if (!query.trim()) {
      setFilteredResults([]);
      setIsOpen(false);
      if (onSearchChange) onSearchChange(courses, '');
      return;
    }

    const matched = searchCourses(courses, query);
    setFilteredResults(matched);
    setIsOpen(true);

    if (onSearchChange) {
      onSearchChange(matched, query);
    }
  }, [query, courses]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelectCourse = (courseId: string) => {
    setIsOpen(false);
    router.push(`/courses/${courseId}`);
  };

  return (
    <div className={`relative w-full ${className}`} ref={dropdownRef}>
      <div className={`relative group transition-all duration-300 ${compact ? 'rounded-xl' : 'rounded-2xl'}`}>
        {/* Glow ambient background on focus */}
        <div className={`absolute -inset-0.5 rounded-2xl bg-gradient-to-r from-[#f9b03c]/35 via-[#3268ba]/25 to-[#f9b03c]/35 blur-sm opacity-0 transition-opacity duration-500 pointer-events-none ${isFocused ? 'opacity-100' : 'group-hover:opacity-30'}`} />

        <div className="relative flex items-center">
          <div className={`absolute ${compact ? 'left-3' : 'left-5'} top-1/2 -translate-y-1/2 flex items-center pointer-events-none z-10`}>
            <i className={`fa-solid fa-magnifying-glass transition-colors duration-300 ${compact ? 'text-xs' : 'text-base sm:text-lg'} ${isFocused ? 'text-[#f9b03c]' : 'text-gray-400 group-hover:text-slate-300'}`}></i>
          </div>
          
          <input 
            type="text" 
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => { 
              setIsFocused(true);
              if (query.trim()) setIsOpen(true); 
            }}
            onBlur={() => setIsFocused(false)}
            placeholder={placeholder}
            className={
              compact 
                ? "w-full bg-slate-900/80 dark:bg-slate-950/80 backdrop-blur-xl border-2 border-[#f9b03c]/70 shadow-[0_0_14px_rgba(249,176,60,0.35)] animate-pulse focus:animate-none focus:border-[#f9b03c] focus:ring-1 focus:ring-[#f9b03c]/50 rounded-xl py-2 pl-9 pr-8 text-white font-medium outline-none transition-all duration-300 text-xs placeholder:text-gray-300"
                : "w-full bg-slate-900/70 dark:bg-[#0b0f19]/70 backdrop-blur-2xl border border-white/10 rounded-2xl py-4 sm:py-4.5 pl-13 sm:pl-14 pr-12 text-white font-medium outline-none focus:border-[#f9b03c] focus:ring-2 focus:ring-[#f9b03c]/25 focus:shadow-[0_0_30px_rgba(249,176,60,0.25)] transition-all duration-300 text-sm sm:text-base placeholder:font-normal placeholder:text-gray-400 shadow-[0_8px_30px_rgba(0,0,0,0.4)]"
            }
            style={{
              backdropFilter: 'blur(16px)',
              WebkitBackdropFilter: 'blur(16px)',
            }}
          />

          {query && (
            <button 
              type="button" 
              onClick={() => setQuery('')} 
              className={`absolute ${compact ? 'right-3 text-xs' : 'right-5 text-sm'} top-1/2 -translate-y-1/2 text-gray-400 hover:text-[#f9b03c] transition-colors cursor-pointer p-1`}
              aria-label="Clear search"
            >
              <i className="fa-solid fa-xmark"></i>
            </button>
          )}
        </div>
      </div>

      {/* Futuristic Glassmorphic Suggestions Dropdown */}
      {isOpen && (
        <div 
          className="absolute top-full left-0 right-0 mt-3 bg-slate-900/95 dark:bg-[#060a12]/95 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.8),0_0_30px_rgba(249,176,60,0.1)] overflow-hidden z-[100] max-h-[380px] overflow-y-auto animate-in slide-in-from-top-2 duration-200"
          style={{
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
          }}
        >
          <div className="p-3 bg-white/[0.03] border-b border-white/10 flex items-center justify-between">
            <span className="text-[11px] font-black uppercase text-[#f9b03c] tracking-wider flex items-center gap-1.5">
              <i className="fa-solid fa-sparkles text-[10px]"></i> ስማርት የኮርስ ፍለጋ ({filteredResults.length})
            </span>
            <span className="text-[10px] bg-[#3268ba]/20 text-[#5a93e8] border border-[#3268ba]/30 font-bold px-2.5 py-0.5 rounded-full">
              Amharic + English AI Search
            </span>
          </div>

          {filteredResults.length === 0 ? (
            <div className="p-6 text-center text-gray-400">
              <i className="fa-solid fa-magnifying-glass text-2xl mb-2 text-gray-500 block"></i>
              <p className="text-xs font-bold text-slate-300">ምንም የተዛመደ ኮርስ አልተገኘም ("{query}")</p>
              <p className="text-[11px] text-gray-500 mt-1">እባክዎ እንደ Digital Marketing, Facebook, ዌብሳይት ያሉ ቃላትን ይሞክሩ</p>
            </div>
          ) : (
            <div className="divide-y divide-white/5">
              {filteredResults.map(course => (
                <div 
                  key={course.id}
                  onClick={() => handleSelectCourse(course.id)}
                  className="p-3.5 hover:bg-[#f9b03c]/10 cursor-pointer transition-colors flex items-center justify-between group"
                >
                  <div className="flex items-center gap-3.5">
                    <img 
                      src={course.thumbnail || course.image || 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?q=80&w=200'} 
                      alt={course.title} 
                      className="w-12 h-12 rounded-xl object-cover border border-white/10 shrink-0" 
                    />
                    <div>
                      <h4 className="text-sm font-bold text-white group-hover:text-[#f9b03c] transition-colors line-clamp-1">
                        {course.title}
                      </h4>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[10px] font-bold bg-white/[0.06] text-slate-300 border border-white/10 px-2 py-0.5 rounded-md">
                          {course.category || 'General'}
                        </span>
                        {course.matchedReason && (
                          <span className="text-[10px] font-bold text-[#f9b03c]">
                            💡 {course.matchedReason}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black text-[#f9b03c]">
                      {course.isFree || course.price === 'Free' || course.price === '0' || course.price === 0 ? 'ነፃ (Free)' : `${Number(course.price).toLocaleString()} ብር`}
                    </span>
                    <i className="fa-solid fa-chevron-right text-xs text-gray-500 group-hover:text-[#f9b03c] group-hover:translate-x-1 transition-all"></i>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
