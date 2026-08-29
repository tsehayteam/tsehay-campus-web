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
  { label: 'የዩቲዩብ ሚስጥሮች (YouTube Secrets)', tag: 'youtube', category: 'YouTube & Content Creation' },
  { label: 'ዲጂታል ማርኬቲንግ (Digital Marketing)', tag: 'marketing', category: 'Marketing' },
  { label: 'ቻይና ቀጥታ ንግድ (China Import)', tag: 'import', category: 'E-Commerce' },
  { label: 'Faceless YouTube Channel', tag: 'faceless', category: 'YouTube & Content Creation' },
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
          className={`absolute -inset-0.5 rounded-full bg-gradient-to-r from-[#3268ba]/50 via-[#f9b03c]/40 to-[#3268ba]/50 blur-md transition-opacity duration-300 pointer-events-none ${
            isFocused ? 'opacity-100 animate-pulse' : 'opacity-0 group-hover:opacity-40'
          }`} 
        />

        <div className="relative flex items-center">
          <div className={`absolute ${compact ? 'left-3' : 'left-4'} top-1/2 -translate-y-1/2 flex items-center pointer-events-none z-10`}>
            <i className={`fa-solid fa-magnifying-glass transition-colors duration-300 ${compact ? 'text-xs' : 'text-sm'} ${isFocused ? 'text-[#f9b03c]' : 'text-gray-400 group-hover:text-slate-200'}`}></i>
          </div>
          
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
                ? "w-full bg-[#070c18]/90 dark:bg-black/90 backdrop-blur-xl border border-[#3268ba]/40 shadow-[0_0_20px_rgba(50,104,186,0.25)] focus:border-[#f9b03c] focus:ring-1 focus:ring-[#f9b03c]/40 rounded-full py-2 pl-9 pr-8 text-white font-medium outline-none transition-all duration-300 text-xs placeholder:text-gray-400"
                : "w-full bg-slate-900/80 dark:bg-[#070b14]/90 backdrop-blur-2xl border border-white/10 rounded-2xl py-3.5 pl-11 pr-10 text-white font-medium outline-none focus:border-[#3268ba] focus:ring-2 focus:ring-[#3268ba]/30 focus:shadow-[0_0_25px_rgba(50,104,186,0.3)] transition-all duration-300 text-xs sm:text-sm placeholder:font-normal placeholder:text-gray-400 shadow-[0_8px_30px_rgba(0,0,0,0.5)]"
            }
          />

          {query && (
            <button 
              type="button" 
              onClick={() => {
                setQuery('');
                setIsOpen(false);
                inputRef.current?.focus();
              }} 
              className={`absolute ${compact ? 'right-2.5 text-xs' : 'right-3 text-sm'} top-1/2 -translate-y-1/2 text-gray-400 hover:text-[#f9b03c] transition-colors cursor-pointer p-1`}
              aria-label="Clear search"
            >
              <i className="fa-solid fa-xmark"></i>
            </button>
          )}
        </div>
      </div>

      {/* 🌟 Futuristic YouTube/Algolia Style Live Predictive Autocomplete Dropdown */}
      {isOpen && (
        <div 
          className="absolute top-full left-0 right-0 mt-2 bg-[#070b14]/98 backdrop-blur-2xl border border-[#3268ba]/40 rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.95),0_0_30px_rgba(50,104,186,0.25)] overflow-hidden z-[100] max-h-[420px] overflow-y-auto animate-in slide-in-from-top-2 duration-200 divide-y divide-white/10"
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
