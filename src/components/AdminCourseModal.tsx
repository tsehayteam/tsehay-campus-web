'use client';

import React, { useState } from 'react';

export const COURSE_CATEGORIES = [
  'E-Commerce',
  'YouTube & Content Creation',
  'Marketing',
  'Brokerage',
  'Film Making',
  'Career Development',
] as const;

export type CourseCategory = (typeof COURSE_CATEGORIES)[number];

interface AdminCourseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (courseData: any) => Promise<void>;
  initialData?: any;
}

export default function AdminCourseModal({
  isOpen,
  onClose,
  onSave,
  initialData,
}: AdminCourseModalProps) {
  const [formData, setFormData] = useState({
    title: initialData?.title || '',
    category: initialData?.category || 'E-Commerce',
    instructor: initialData?.instructor || '',
    instructorImage: initialData?.instructorImage || '',
    instructorTelegram: initialData?.instructorTelegram || '@EyoubSahle',
    price: initialData?.price || '',
    oldPrice: initialData?.oldPrice || '',
    image: initialData?.image || '',
    thumbnail: initialData?.thumbnail || '',
    isFree: Boolean(initialData?.isFree),
    isFeatured: Boolean(initialData?.isFeatured),
    description: initialData?.description || '',
    telegramGroupUrl: initialData?.telegramGroupUrl || '',
  });

  const [saving, setSaving] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onSave(formData);
      onClose();
    } catch (err) {
      console.error('Error saving course:', err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-300">
      <div className="bg-[#0b0f19] border border-white/10 rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 sm:p-8 shadow-2xl space-y-6 text-white">
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <h2 className="text-xl sm:text-2xl font-black font-heading text-white flex items-center gap-2.5">
            <span className="w-3 h-3 rounded-full bg-[#f9b03c] animate-pulse"></span>
            <span>{initialData ? 'ኮርስ አርትዕ (Edit Course)' : 'አዲስ ኮርስ ጨምር (Add New Course)'}</span>
          </h2>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white flex items-center justify-center text-sm transition cursor-pointer"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Course Title */}
          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
              የኮርሱ ርዕስ (Title) *
            </label>
            <input
              type="text"
              required
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="e.g. Master E-Commerce & Dropshipping in Ethiopia"
              className="w-full bg-slate-900/80 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-[#f9b03c] outline-none transition"
            />
          </div>

          {/* 🌟 6 Specific Updated Course Categories */}
          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
              የኮርሱ ዘርፍ (Category) *
            </label>
            <select
              required
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              className="w-full bg-slate-900/80 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-[#f9b03c] outline-none transition"
            >
              {COURSE_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          {/* Instructor Name & Telegram */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                የአሰልጣኝ ስም (Instructor) *
              </label>
              <input
                type="text"
                required
                value={formData.instructor}
                onChange={(e) => setFormData({ ...formData, instructor: e.target.value })}
                placeholder="e.g. Eyoub Sahle"
                className="w-full bg-slate-900/80 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-[#f9b03c] outline-none transition"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                የቴሌግራም ዩዘርኔም (Telegram)
              </label>
              <input
                type="text"
                value={formData.instructorTelegram}
                onChange={(e) => setFormData({ ...formData, instructorTelegram: e.target.value })}
                placeholder="@EyoubSahle"
                className="w-full bg-slate-900/80 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-[#f9b03c] outline-none transition"
              />
            </div>
          </div>

          {/* Price & Old Price */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                ዋጋ በብር (Price ETB) *
              </label>
              <input
                type="text"
                required
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                placeholder="e.g. 1500 or Free"
                className="w-full bg-slate-900/80 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-[#f9b03c] outline-none transition"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                የቀድሞ ዋጋ (Old Price ETB)
              </label>
              <input
                type="text"
                value={formData.oldPrice}
                onChange={(e) => setFormData({ ...formData, oldPrice: e.target.value })}
                placeholder="e.g. 3000"
                className="w-full bg-slate-900/80 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-[#f9b03c] outline-none transition"
              />
            </div>
          </div>

          {/* Thumbnail / Image URL */}
          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
              የኮርሱ ምስል ሊንክ (Thumbnail URL)
            </label>
            <input
              type="text"
              value={formData.image || formData.thumbnail}
              onChange={(e) => setFormData({ ...formData, image: e.target.value, thumbnail: e.target.value })}
              placeholder="https://..."
              className="w-full bg-slate-900/80 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-[#f9b03c] outline-none transition"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
              የኮርሱ ማብራሪያ (Description)
            </label>
            <textarea
              rows={4}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="ስለ ኮርሱ አጭር ማብራሪያ..."
              className="w-full bg-slate-900/80 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-[#f9b03c] outline-none transition resize-none"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 font-bold text-xs transition cursor-pointer"
            >
              ሰርዝ (Cancel)
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#f9b03c] to-amber-500 text-slate-950 font-black text-xs shadow-lg hover:scale-105 active:scale-95 transition-all duration-300 cursor-pointer disabled:opacity-50 flex items-center gap-2"
            >
              {saving ? (
                <>
                  <i className="fa-solid fa-spinner fa-spin"></i>
                  <span>በማስቀመጥ ላይ...</span>
                </>
              ) : (
                <>
                  <i className="fa-solid fa-check"></i>
                  <span>አስቀምጥ (Save Course)</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
