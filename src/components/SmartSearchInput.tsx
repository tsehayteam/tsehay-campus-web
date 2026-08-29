'use client';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { searchCourses } from '@/lib/smartSearch';
import { getCourseSlug } from '@/lib/courseCache';

interface SmartSearchInputProps {
  courses: any[];
  placeholder?: string;
  onSearchChange?: (filteredCourses: any[], query: string) => void;
  className?: string;
  compact?: boolean;
}

const PREDICTIVE_TOPICS = [
  { label: 'የሼን ኢምፖርት (Shein Import)', tag: 'shein', category: 'E-Commerce' },
  { label: 'የዩቲዩብ ሚስጥሮች (YouTube Secrets)', tag: 'youtube', category: 'YouTube' },
  { label: 'ዲጂታል ማርኬቲንግ (Digital Marketing)', tag: 'marketing', category: 'Marketing' },
  { label: 'ቻይና ቀጥታ ንግድ (China Import)', tag: 'import', category: 'E-Commerce' },
  { label: 'Faceless YouTube Channel', tag: 'faceless', category: 'Content Creation' },
  { label: 'Facebook & TikTok Ads', tag: 'ads', category: 'Marketing' }
];

export default function SmartSearchInput({
  courses = [],
  placeholder = "ኮርሶችን ይፈልጉ (e.g. Shein, YouTube, Marketing)...",
  onSearchChange,
  className = "",
  compact = false
}: SmartSearchInputProps) {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [filteredResults, setFilteredResults] = useState<any[]>([]);
  const [matchingTopics, setMatchingTopics] = useState<typeof PREDICTIVE_TOPICS>([]);
  const [selectedIndex, setSelectedIndex] = useState<number>(-1);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  // Real-time typeahead filtering
  useEffect(() => {
    const trimmed = query.trim().toLowerCase();
    if (!trimmed) {
      setFilteredResults([]);
      setMatchingTopics([]);
      setIsOpen(false);
      setSelectedIndex(-1);
      if (onSearchChange) onSearchChange(courses, '');
      return;
    }

    const matched = searchCourses(courses, query);
    setFilteredResults(matched);

    const matchedTopics = PREDICTIVE_TOPICS.filter(
      t => t.label.toLowerCase().includes(trimmed) || 
           t.tag.toLowerCase().includes(trimmed) || 
           t.category.toLowerCase().includes(trimmed)
    );
    setMatchingTopics(matchedTopics);

    setIsOpen(true);
    setSelectedIndex(-1);

    if (onSearchChange) {
      onSearchChange(matched, query);
    }
  }, [query, courses]);

  // Outside click listener
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelectCourse = useCallback((course: any) => {
    setIsOpen(false);
    const targetSlug = getCourseSlug(course) || course.id;
    router.push(`/courses/${targetSlug}`);
  }, [router]);

  const handleSelectTopic = (topicTag: string) => {
    setQuery(topicTag);
    inputRef.current?.focus();
  };

  // Keyboard navigation for YouTube-style experience
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen) return;

    const totalItems = matchingTopics.length + filteredResults.length;
    if (totalItems === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (prev + 1) % totalItems);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (prev <= 0 ? totalItems - 1 : prev - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (selectedIndex >= 0 && selectedIndex < matchingTopics.length) {
        handleSelectTopic(matchingTopics[selectedIndex].tag);
      } else if (selectedIndex >= matchingTopics.length) {
        const courseIdx = selectedIndex - matchingTopics.length;
        if (filteredResults[courseIdx]) {
          handleSelectCourse(filteredResults[courseIdx]);
        }
      } else if (filteredResults.length > 0) {
        handleSelectCourse(filteredResults[0]);
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  return (
    <div className={`relative w-full ${className}`} ref={dropdownRef}>
      <div className={`relative group transition-all duration-300 ${compact ? 'rounded-full' : 'rounded-2xl'}`}>
        
        {/* Ambient Neon Pulse Glow */}
        <div 
          className={`absolute -inset-0.5 ${compact ? 'rounded-full' : 'rounded-2xl'} bg-gradient-to-r from-[#3268ba]/60 via-[#f9b03c]/40 to-[#3268ba]/60 blur-md transition-opacity duration-500 pointer-events-none animate-pulse ${
            isFocused ? 'opacity-100' : 'opacity-60 group-hover:opacity-100'
          }`} 
        />

        <div className="relative flex items-center">
          <input 
            ref={inputRef}
            type="text" 
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => { 
              setIsFocused(true);
              if (query.trim()) setIsOpen(true); 
            }}
            onBlur={() => setIsFocused(false)}
            placeholder={placeholder}
            className={
              compact 
                ? "w-full bg-[#070c18]/95 dark:bg-black/95 backdrop-blur-xl border border-[#3268ba]/50 shadow-lg shadow-[#3268ba]/10 focus:border-[#f9b03c] focus:ring-1 focus:ring-[#f9b03c]/40 rounded-full py-2 pl-4 pr-16 text-white font-medium outline-none transition-all duration-300 text-xs placeholder:text-gray-400"
                : "w-full bg-slate-900/90 dark:bg-[#070b14]/95 backdrop-blur-2xl border border-[#3268ba]/50 shadow-lg shadow-[#3268ba]/10 rounded-2xl py-3.5 pl-5 pr-24 text-white font-medium outline-none focus:border-[#f9b03c] focus:ring-2 focus:ring-[#f9b03c]/30 focus:shadow-[0_0_25px_rgba(249,176,60,0.3)] transition-all duration-300 text-xs sm:text-sm placeholder:font-normal placeholder:text-gray-400"
            }
          />

          {/* Right-Aligned Search Actions & Trigger Button */}
          <div className="absolute right-1.5 sm:right-2 top-1/2 -translate-y-1/2 flex items-center gap-1.5 z-10">
            {query && (
              <button 
                type="button" 
                onClick={() => {
                  setQuery('');
                  setIsOpen(false);
                  inputRef.current?.focus();
                }} 
                className="w-6 h-6 rounded-full bg-white/10 hover:bg-white/20 text-gray-400 hover:text-white transition-colors cursor-pointer flex items-center justify-center text-[10px]"
                aria-label="Clear search"
              >
                <i className="fa-solid fa-xmark"></i>
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                if (filteredResults.length > 0) {
                  handleSelectCourse(filteredResults[0]);
                } else if (matchingTopics.length > 0) {
                  handleSelectTopic(matchingTopics[0].tag);
                } else {
                  inputRef.current?.focus();
                }
              }}
              className={`flex items-center justify-center rounded-xl bg-gradient-to-r from-[#3268ba] to-[#25549c] hover:from-[#f9b03c] hover:to-amber-500 text-white hover:text-slate-950 font-bold transition-all duration-300 cursor-pointer shadow-md active:scale-95 ${
                compact ? 'w-7 h-7 text-xs rounded-full' : 'px-3 py-2 text-xs gap-1.5'
              }`}
              title="ፈልግ (Search)"
            >
              <i className="fa-solid fa-magnifying-glass"></i>
              {!compact && <span className="hidden sm:inline text-[11px] font-black">ፈልግ</span>}
            </button>
          </div>
        </div>
      </div>

      {/* 🌟 Futuristic YouTube/Algolia Style Live Predictive Autocomplete Dropdown */}
      {isOpen && (
        <div 
          className={`absolute top-full mt-2 bg-black/95 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-2xl overflow-hidden z-[9999] max-h-[420px] overflow-y-auto animate-in slide-in-from-top-2 duration-200 divide-y divide-white/10 ${
            compact 
              ? 'right-0 w-[360px] sm:w-[440px] md:w-[460px] max-w-[92vw]' 
              : 'left-0 right-0 w-full'
          }`}
        >
          {/* Header Status Bar */}
          <div className="px-3.5 py-2 bg-gradient-to-r from-[#3268ba]/20 via-transparent to-[#f9b03c]/10 flex items-center justify-between">
            <span className="text-[10px] font-black uppercase text-[#f9b03c] tracking-wider flex items-center gap-1.5 font-heading">
              <i className="fa-solid fa-wand-magic-sparkles text-[9px]"></i> 
              <span>ተዛማጅ ውጤቶች ({filteredResults.length})</span>
            </span>
            <span className="text-[9px] bg-blue-500/20 text-blue-300 border border-blue-400/30 font-bold px-2 py-0.5 rounded-full font-mono">
              Live Typeahead
            </span>
          </div>

          {/* 1. Quick Topic Chips / Predictive Keywords */}
          {matchingTopics.length > 0 && (
            <div className="p-2.5 bg-white/[0.02]">
              <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5 px-1">
                የተጠቆሙ ርዕሶች (Topics)
              </div>
              <div className="flex flex-wrap gap-1.5">
                {matchingTopics.map((topic, tIdx) => {
                  const isItemActive = selectedIndex === tIdx;
                  return (
                    <button
                      key={`topic-${topic.tag}`}
                      type="button"
                      onClick={() => handleSelectTopic(topic.tag)}
                      className={`text-xs px-2.5 py-1 rounded-lg border transition-all duration-150 flex items-center gap-1.5 cursor-pointer ${
                        isItemActive
                          ? 'bg-[#3268ba] border-white text-white shadow-sm'
                          : 'bg-white/5 hover:bg-white/10 border-white/10 text-slate-300 hover:text-white'
                      }`}
                    >
                      <i className="fa-solid fa-magnifying-glass text-[9px] text-[#f9b03c]"></i>
                      <span className="font-semibold text-[11px]">{topic.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* 2. Course Matches List */}
          {filteredResults.length === 0 ? (
            <div className="p-6 text-center text-gray-400 space-y-1">
              <i className="fa-solid fa-magnifying-glass text-2xl text-gray-500 block mb-1"></i>
              <p className="text-xs font-bold text-slate-300">ምንም የተዛመደ ኮርስ አልተገኘም ("{query}")</p>
              <p className="text-[11px] text-gray-500">እንደ Shein, YouTube, Digital Marketing ያሉ ቃላትን ይሞክሩ</p>
            </div>
          ) : (
            <div className="divide-y divide-white/5">
              {filteredResults.map((course, cIdx) => {
                const globalIdx = matchingTopics.length + cIdx;
                const isItemActive = selectedIndex === globalIdx;
                const priceLabel = course.isFree || course.price === 'Free' || course.price === 0 || course.price === '0'
                  ? 'ነፃ (Free)'
                  : `${Number(course.price).toLocaleString()} ብር`;

                return (
                  <div 
                    key={course.id || `course-${cIdx}`}
                    onClick={() => handleSelectCourse(course)}
                    className={`p-3 hover:bg-[#3268ba]/20 cursor-pointer transition-colors flex items-center justify-between group ${
                      isItemActive ? 'bg-[#3268ba]/30' : ''
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0 pr-2">
                      <img 
                        src={course.thumbnail || course.image || 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?q=80&w=200'} 
                        alt={course.title} 
                        className="w-11 h-11 rounded-xl object-cover border border-white/15 shrink-0 group-hover:scale-105 transition-transform" 
                      />
                      <div className="min-w-0">
                        <h4 className="text-xs sm:text-sm font-bold text-white group-hover:text-[#f9b03c] transition-colors truncate">
                          {course.title}
                        </h4>
                        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                          <span className="text-[9px] font-black bg-white/10 text-slate-300 border border-white/10 px-1.5 py-0.5 rounded-md uppercase">
                            {course.category || 'General'}
                          </span>
                          {course.matchedReason && (
                            <span className="text-[10px] font-bold text-[#f9b03c] truncate">
                              💡 {course.matchedReason}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-xs font-black text-[#f9b03c] whitespace-nowrap">
                        {priceLabel}
                      </span>
                      <i className="fa-solid fa-arrow-right text-[11px] text-gray-500 group-hover:text-[#f9b03c] group-hover:translate-x-0.5 transition-all"></i>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Footer Quick Action */}
          <div className="p-2.5 bg-black/40 text-center">
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                router.push('/courses');
              }}
              className="text-[11px] font-bold text-blue-400 hover:text-blue-300 transition-colors flex items-center justify-center gap-1.5 mx-auto cursor-pointer"
            >
              <span>ሁሉንም ኮርሶች በዝርዝር ይመልከቱ (/courses)</span>
              <i className="fa-solid fa-arrow-right text-[10px]"></i>
            </button>
          </div>

        </div>
      )}
    </div>
  );
}
