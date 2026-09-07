'use client';

import React, { useState } from 'react';
import { parseVideoUrl, parseImageUrl, formatCloudStorageUrl } from '@/lib/videoParser';

export const COURSE_CATEGORIES = [
  'E-Commerce',
  'YouTube',
  'Content Creation',
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
    instructor: initialData?.instructor || initialData?.instructorName || '',
    instructorImage: initialData?.instructorImage || initialData?.instructorPhoto || initialData?.instructor_image || initialData?.instructor_photo || '',
    instructorTelegram: initialData?.instructorTelegram || '@EyoubSahle',
    price: initialData?.price || '',
    oldPrice: initialData?.oldPrice || '',
    image: initialData?.image || initialData?.thumbnailUrl || initialData?.thumbnail || '',
    thumbnail: initialData?.thumbnail || initialData?.thumbnailUrl || initialData?.image || '',
    thumbnailUrl: initialData?.thumbnailUrl || initialData?.image || initialData?.thumbnail || '',
    video: initialData?.video || initialData?.previewVideoUrl || initialData?.videoUrl || '',
    videoUrl: initialData?.videoUrl || initialData?.previewVideoUrl || initialData?.video || '',
    previewVideoUrl: initialData?.previewVideoUrl || initialData?.videoUrl || initialData?.video || '',
    isFree: Boolean(initialData?.isFree),
    isFeatured: Boolean(initialData?.isFeatured),
    description: initialData?.description || initialData?.desc || '',
    telegramGroupUrl: initialData?.telegramGroupUrl || '',
    modules: initialData?.modules || [],
    lessons: initialData?.lessons || [],
  });

  const [saving, setSaving] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const rawImage = formData.thumbnailUrl || formData.image || formData.thumbnail;
      const cleanImg = formatCloudStorageUrl(rawImage) || rawImage;
      const cleanInstructorImg = formatCloudStorageUrl(formData.instructorImage) || formData.instructorImage;

      await onSave({
        ...formData,
        previewVideoUrl: formData.previewVideoUrl || formData.video || formData.videoUrl,
        videoUrl: formData.previewVideoUrl || formData.video || formData.videoUrl,
        video: formData.previewVideoUrl || formData.video || formData.videoUrl,
        thumbnailUrl: cleanImg,
        image: cleanImg,
        thumbnail: cleanImg,
        instructorImage: cleanInstructorImg,
        instructorPhoto: cleanInstructorImg,
      });
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

          {/* Instructor Photo URL */}
          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
              የአሰልጣኝ ፎቶ ሊንክ (Instructor Photo / Drive URL)
            </label>
            <input
              type="text"
              value={formData.instructorImage}
              onChange={(e) => setFormData({ ...formData, instructorImage: e.target.value })}
              placeholder="https://drive.google.com/file/d/... or image URL"
              className="w-full bg-slate-900/80 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-[#f9b03c] outline-none transition"
            />
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
            <div className="flex items-center justify-between mb-2">
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
                የኮርሱ ምስል ሊንክ (Thumbnail URL)
              </label>
              {(() => {
                const curImg = formData.image || formData.thumbnail || formData.thumbnailUrl;
                if (!curImg) return null;
                const lower = curImg.toLowerCase();
                if (lower.includes('dropbox.com') || lower.includes('dropboxusercontent.com')) {
                  return (
                    <span className="text-[10px] bg-sky-500/20 text-sky-400 border border-sky-500/30 font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                      <i className="fa-brands fa-dropbox text-[9px]"></i>
                      <span>Dropbox</span>
                    </span>
                  );
                }
                if (lower.includes('drive.google.com') || lower.includes('googleusercontent.com')) {
                  return (
                    <span className="text-[10px] bg-amber-500/20 text-[#f9b03c] border border-amber-500/30 font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                      <i className="fa-brands fa-google-drive text-[9px]"></i>
                      <span>Google Drive</span>
                    </span>
                  );
                }
                return null;
              })()}
            </div>
            <input
              type="text"
              value={formData.image || formData.thumbnail || formData.thumbnailUrl}
              onChange={(e) => setFormData({ ...formData, image: e.target.value, thumbnail: e.target.value, thumbnailUrl: e.target.value })}
              placeholder="e.g. Google Drive, Dropbox (dropbox.com/s/...), ወይም ምስል URL"
              className="w-full bg-slate-900/80 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-[#f9b03c] outline-none transition"
            />
            {(formData.image || formData.thumbnail || formData.thumbnailUrl) && (
              <div className="mt-2 relative aspect-video w-full max-w-[200px] rounded-xl overflow-hidden bg-black border border-white/10 shadow-md">
                <img 
                  src={parseImageUrl(formData.image || formData.thumbnail || formData.thumbnailUrl)} 
                  alt="Thumbnail Preview" 
                  className="w-full h-full object-cover"
                  onError={(e) => { (e.target as HTMLImageElement).src = '/assets/hero-bg-new.jpg'; }}
                />
              </div>
            )}
            <p className="text-[11px] text-slate-400 mt-1">
              💡 Google Drive ወይም Dropbox ሊንኮችን ሲስተሙ በራሱ በቀጥታ ያሳያል።
            </p>
          </div>

          {/* Preview Video / Embed URL */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
                የማስተዋወቂያ ቪዲዮ ሊንክ (Preview Video / Universal URL)
              </label>
              {(() => {
                const curVideo = formData.previewVideoUrl || formData.video || formData.videoUrl;
                if (!curVideo) return null;
                const parsed = parseVideoUrl(curVideo);
                const badgeLabel = parsed.isYouTube 
                  ? 'YouTube' 
                  : parsed.isGoogleDrive 
                  ? 'Google Drive' 
                  : parsed.isDropbox 
                  ? 'Dropbox' 
                  : parsed.isVimeo 
                  ? 'Vimeo' 
                  : parsed.isDirectVideo 
                  ? 'Direct MP4' 
                  : 'Universal Embed';
                return (
                  <span className="text-[10px] bg-amber-400/20 text-[#f9b03c] border border-amber-400/30 font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                    <i className="fa-solid fa-circle-play text-[9px]"></i>
                    <span>{badgeLabel}</span>
                  </span>
                );
              })()}
            </div>
            <input
              type="text"
              value={formData.previewVideoUrl || formData.video || formData.videoUrl}
              onChange={(e) => {
                const val = e.target.value;
                const parsed = parseVideoUrl(val);
                setFormData(prev => ({
                  ...prev,
                  previewVideoUrl: val,
                  video: val,
                  videoUrl: val,
                  // Auto-suggest thumbnail if empty and thumbnail is available
                  thumbnailUrl: !prev.thumbnailUrl && parsed.thumbnailUrl ? parsed.thumbnailUrl : prev.thumbnailUrl,
                  image: !prev.image && parsed.thumbnailUrl ? parsed.thumbnailUrl : prev.image,
                  thumbnail: !prev.thumbnail && parsed.thumbnailUrl ? parsed.thumbnailUrl : prev.thumbnail,
                }));
              }}
              placeholder="YouTube (Watch, Shorts), Google Drive, Dropbox, Vimeo, ወይም .mp4 ሊንክ"
              className="w-full bg-slate-900/80 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-[#f9b03c] outline-none transition font-mono text-xs"
            />

            {/* Live Video Preview Box */}
            {(() => {
              const curVideo = formData.previewVideoUrl || formData.video || formData.videoUrl;
              if (!curVideo || !curVideo.trim()) return null;
              const parsed = parseVideoUrl(curVideo);
              if (!parsed.src) return null;

              return (
                <div className="mt-3 rounded-2xl overflow-hidden border border-white/15 bg-black/60 shadow-lg p-2 space-y-2">
                  <div className="flex items-center justify-between px-2 text-xs text-slate-400">
                    <span className="flex items-center gap-1.5 font-bold text-slate-300">
                      <i className="fa-solid fa-eye text-[#f9b03c]"></i>
                      <span>የቪዲዮ ቅድመ-እይታ (Live Preview)</span>
                    </span>
                    {parsed.thumbnailUrl && (
                      <button
                        type="button"
                        onClick={() => {
                          setFormData(prev => ({
                            ...prev,
                            image: parsed.thumbnailUrl || prev.image,
                            thumbnail: parsed.thumbnailUrl || prev.thumbnail,
                            thumbnailUrl: parsed.thumbnailUrl || prev.thumbnailUrl
                          }));
                        }}
                        className="text-[11px] text-[#f9b03c] hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        <i className="fa-solid fa-image"></i>
                        <span>እንደ ምስል ተጠቀም (Use Thumbnail)</span>
                      </button>
                    )}
                  </div>
                  <div className="relative aspect-video w-full rounded-xl overflow-hidden bg-black">
                    {parsed.type === 'video' ? (
                      <video
                        src={parsed.src}
                        controls
                        playsInline
                        className="w-full h-full object-contain"
                      />
                    ) : (
                      <iframe
                        src={parsed.src}
                        title="Live Course Video Preview"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                        className="w-full h-full border-none"
                      />
                    )}
                  </div>
                </div>
              );
            })()}
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
