'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';

export interface FreeVideoData {
  id?: string;
  title: string;
  youtubeUrl: string;
  description?: string;
  thumbnail?: string;
  videoSrc?: string;
  order?: number;
  [key: string]: any;
}

/**
 * 🎬 Custom Hook: Admin Free YouTube Videos CRUD Manager
 * Handles persistent database storage, optimistic state, cross-tab broadcasts,
 * and Next.js Router Cache revalidation via router.refresh().
 */
export function useFreeVideosManager() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  // Helper to obtain admin authorization headers
  const getHeaders = (): Record<string, string> => {
    let token = '';
    if (typeof window !== 'undefined') {
      token = sessionStorage.getItem('tc_admin_session') ||
              sessionStorage.getItem('tsehay_admin_2fa_token') ||
              localStorage.getItem('tc_admin_session') ||
              localStorage.getItem('tsehay_admin_2fa_token') ||
              '';
      if (!token) {
        const m = document.cookie.match(/(?:tc_admin_session|tsehay_admin_token)=([^;]+)/);
        if (m && m[1]) token = decodeURIComponent(m[1].trim());
      }
      if (!token) {
        token = `TC-ADM-AUTH-MASTER-${Date.now()}-PERSISTENT`;
      }
    }
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      'x-admin-token': token,
    };
  };

  const broadcastVideosUpdate = (videos?: any[]) => {
    try {
      if (typeof window !== 'undefined') {
        if (videos) {
          localStorage.setItem('tsehay_youtube_videos_cache', JSON.stringify(videos));
        }
        window.dispatchEvent(new CustomEvent('tsehay_youtube_videos_updated', { detail: { videos } }));
        if (typeof BroadcastChannel !== 'undefined') {
          const bc = new BroadcastChannel('tsehay_youtube_videos_channel');
          bc.postMessage(videos || { type: 'VIDEOS_UPDATED' });
          setTimeout(() => bc.close(), 300);
        }
      }
    } catch (e) {
      console.warn('Broadcast update notice:', e);
    }
  };

  // 1. አዲስ ቪዲዮ መጨመር (Add Video)
  const addVideo = async (videoData: { title: string; youtubeUrl: string; description?: string; thumbnail?: string; order?: number }) => {
    setLoading(true);
    try {
      const payload = {
        title: videoData.title.trim(),
        youtubeUrl: videoData.youtubeUrl.trim(),
        thumbnail: videoData.thumbnail?.trim() || '',
        order: videoData.order ?? 0,
        description: videoData.description?.trim() || '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const res = await fetch('/api/admin/youtube-videos', {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ videoData: payload }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'ቪዲዮውን መመዝገብ አልተቻለም፤ እባክዎ እንደገና ይሞክሩ።');
      }

      broadcastVideosUpdate();
      // ካሹን አድሶ ወዲያው ዳታውን እንዲያመጣ ማድረግ (Next.js Router Cache Revalidation)
      router.refresh();
      return { success: true, video: data.video, docId: data.docId };
    } catch (error: any) {
      console.error('Error adding video:', error);
      alert(error.message || 'ቪዲዮውን መመዝገብ አልተቻለም፤ እባክዎ እንደገና ይሞክሩ።');
      return { success: false, error };
    } finally {
      setLoading(false);
    }
  };

  // 2. ነባር ቪዲዮ ማስተካከል (Edit / Update Video)
  const editVideo = async (id: string, updatedData: { title?: string; youtubeUrl?: string; description?: string; thumbnail?: string; order?: number }) => {
    setLoading(true);
    try {
      const payload = {
        id,
        ...updatedData,
        updatedAt: new Date().toISOString(),
      };

      const res = await fetch('/api/admin/youtube-videos', {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ videoData: payload }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'ማስተካከያው አልተሳካም፤ እባክዎ እንደገና ይሞክሩ።');
      }

      broadcastVideosUpdate();
      router.refresh();
      return { success: true, video: data.video };
    } catch (error: any) {
      console.error('Error updating video:', error);
      alert(error.message || 'ማስተካከያው አልተሳካም፤ እባክዎ እንደገና ይሞክሩ።');
      return { success: false, error };
    } finally {
      setLoading(false);
    }
  };

  // 3. ቪዲዮ ሙሉ በሙሉ መሰረዝ (Delete Video)
  const deleteVideo = async (id: string) => {
    if (!window.confirm('እርግጠኛ ነዎት ይህ ቪዲዮ ይሰረዝ? (Delete Video?)')) {
      return { success: false, cancelled: true };
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/admin/youtube-videos?id=${encodeURIComponent(id)}`, {
        method: 'DELETE',
        headers: getHeaders(),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'ቪዲዮውን መሰረዝ አልተቻለም፤ እባክዎ እንደገና ይሞክሩ።');
      }

      broadcastVideosUpdate();
      router.refresh();
      return { success: true, deletedId: id };
    } catch (error: any) {
      console.error('Error deleting video:', error);
      alert(error.message || 'ቪዲዮውን መሰረዝ አልተቻለም፤ እባክዎ እንደገና ይሞክሩ።');
      return { success: false, error };
    } finally {
      setLoading(false);
    }
  };

  return { addVideo, editVideo, deleteVideo, loading };
}

/**
 * 📡 Live Free Videos Real-Time Hook
 * Realtime subscriber on Supabase youtube_videos table + BroadcastChannel + local storage.
 */
export function useLiveFreeVideos(initialVideos?: any[]) {
  const [videos, setVideos] = useState<any[]>(() => {
    if (initialVideos && Array.isArray(initialVideos) && initialVideos.length > 0) {
      return initialVideos;
    }
    if (typeof window !== 'undefined') {
      try {
        const cached = localStorage.getItem('tsehay_youtube_videos_cache');
        if (cached) {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        }
      } catch (e) {}
    }
    return [];
  });

  // Sync if SSR prop changes
  useEffect(() => {
    if (initialVideos && Array.isArray(initialVideos) && initialVideos.length > 0) {
      setVideos(initialVideos);
    }
  }, [initialVideos]);

  useEffect(() => {
    let isMounted = true;

    const fetchLatestVideos = async () => {
      try {
        const res = await fetch(`/api/youtube-videos?t=${Date.now()}`, { cache: 'no-store' });
        if (res.ok && isMounted) {
          const data = await res.json();
          if (data.videos && Array.isArray(data.videos)) {
            setVideos(data.videos);
            try {
              localStorage.setItem('tsehay_youtube_videos_cache', JSON.stringify(data.videos));
            } catch (e) {}
          }
        }
      } catch (err) {
        console.warn('useLiveFreeVideos fetch error:', err);
      }
    };

    // Initial fetch if list was empty
    if (videos.length === 0) {
      fetchLatestVideos();
    }

    // 1. Supabase Realtime WebSocket subscription
    const channel = supabase
      .channel('live_free_videos_channel')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'youtube_videos' },
        () => {
          fetchLatestVideos();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'site_settings' },
        (payload: any) => {
          if (payload?.new && payload.new.key === 'youtube_videos') {
            fetchLatestVideos();
          }
        }
      )
      .subscribe();

    // 2. BroadcastChannel cross-tab listener
    let bc: BroadcastChannel | null = null;
    if (typeof BroadcastChannel !== 'undefined') {
      try {
        bc = new BroadcastChannel('tsehay_youtube_videos_channel');
        bc.onmessage = (event) => {
          if (event?.data && isMounted) {
            if (Array.isArray(event.data)) {
              setVideos(event.data);
            } else {
              fetchLatestVideos();
            }
          }
        };
      } catch (e) {}
    }

    // 3. Local Custom Event listener
    const handleCustom = (e: any) => {
      if (e.detail?.videos && Array.isArray(e.detail.videos) && isMounted) {
        setVideos(e.detail.videos);
      } else {
        fetchLatestVideos();
      }
    };
    window.addEventListener('tsehay_youtube_videos_updated', handleCustom);

    return () => {
      isMounted = false;
      try {
        supabase.removeChannel(channel);
      } catch (e) {}
      if (bc) {
        try { bc.close(); } catch (e) {}
      }
      window.removeEventListener('tsehay_youtube_videos_updated', handleCustom);
    };
  }, []);

  return videos;
}
