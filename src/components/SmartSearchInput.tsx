'use client';
import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { searchCourses } from '@/lib/smartSearch';

interface SmartSearchInputProps {
  courses: any[];
  placeholder?: string;
  onSearchChange?: (filteredCourses: any[], query: string) => void;
  className?: string;
}

export default function SmartSearchInput({
  courses = [],
  placeholder = "ኮርሶችን ይፈልጉ (e.g. Social Media, Facebook, ዌብሳይት, Python)...",
  onSearchChange,
  className = ""
}: SmartSearchInputProps) {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
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
      <div className="relative shadow-xl rounded-full group">
        <i className="fa-solid fa-magnifying-glass absolute left-5 top-1/2 -translate-y-1/2 text-gray-400 text-lg group-focus-within:text-primary transition-colors"></i>
        
        <input 
          type="text" 
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => { if (query.trim()) setIsOpen(true); }}
          placeholder={placeholder}
          className="w-full bg-white dark:bg-[#111111] border-2 border-gray-200 dark:border-slate-700 rounded-full py-4 pl-14 pr-12 text-dark dark:text-white font-bold outline-none focus:border-primary transition shadow-inner text-sm md:text-base placeholder:font-medium placeholder:text-gray-400"
        />

        {query && (
          <button 
            type="button"
            onClick={() => setQuery('')} 
            className="absolute right-5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-dark dark:hover:text-white text-sm"
          >
            <i className="fa-solid fa-xmark"></i>
          </button>
        )}
      </div>

      {/* YouTube-style Smart Suggestions Dropdown */}
      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-3xl shadow-2xl overflow-hidden z-[100] max-h-[380px] overflow-y-auto animate-in slide-in-from-top-2 duration-200">
          <div className="p-3 bg-gray-50 dark:bg-slate-800/60 border-b border-gray-100 dark:border-slate-700 flex items-center justify-between">
            <span className="text-[11px] font-black uppercase text-gray-500 tracking-wider">
              🔍 ስማርት የኮርስ ፍለጋ ውጤቶች ({filteredResults.length})
            </span>
            <span className="text-[10px] bg-primary/20 text-dark dark:text-primary font-bold px-2.5 py-0.5 rounded-full">
              Amharic + English AI Search
            </span>
          </div>

          {filteredResults.length === 0 ? (
            <div className="p-6 text-center text-gray-500">
              <i className="fa-solid fa-search text-3xl mb-2 text-gray-300 dark:text-gray-600 block"></i>
              <p className="text-xs font-bold">ምንም የተዛመደ ኮርስ አልተገኘም ("{query}")</p>
              <p className="text-[11px] text-gray-400 mt-1">እባክዎ እንደ Digital Marketing, Facebook, ዌብሳይት ያሉ ቃላትን ይሞክሩ</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100 dark:divide-slate-800">
              {filteredResults.map(course => (
                <div 
                  key={course.id}
                  onClick={() => handleSelectCourse(course.id)}
                  className="p-3.5 hover:bg-amber-500/10 dark:hover:bg-slate-800 cursor-pointer transition flex items-center justify-between group"
                >
                  <div className="flex items-center gap-3.5">
                    <img 
                      src={course.thumbnail || course.image || 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?q=80&w=200'} 
                      alt={course.title} 
                      className="w-12 h-12 rounded-xl object-cover border border-gray-200 dark:border-slate-700 shrink-0" 
                    />
                    <div>
                      <h4 className="text-sm font-bold text-dark dark:text-white group-hover:text-primary transition-colors line-clamp-1">
                        {course.title}
                      </h4>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[10px] font-bold bg-gray-100 dark:bg-slate-800 text-gray-500 dark:text-gray-400 px-2 py-0.5 rounded-md">
                          {course.category || 'General'}
                        </span>
                        {course.matchedReason && (
                          <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400">
                            💡 {course.matchedReason}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black text-emerald-600 dark:text-emerald-400">
                      {course.isFree || course.price === 'Free' || course.price === '0' || course.price === 0 ? 'ነፃ' : `${Number(course.price).toLocaleString()} ብር`}
                    </span>
                    <i className="fa-solid fa-chevron-right text-xs text-gray-400 group-hover:translate-x-1 transition-transform"></i>
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
