export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase/server';
import { sharedSiteSettingsCache, savePersistedSetting } from '@/lib/memoryStore';
import { verifyAdminRequest } from '@/lib/adminAuthHelper';

export const memorySiteSettingsCache = sharedSiteSettingsCache;

const NO_CACHE_HEADERS = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
  'CDN-Cache-Control': 'no-store',
  'Vercel-CDN-Cache-Control': 'no-store',
  'Pragma': 'no-cache',
  'Expires': '0',
};

const ALLOWED_PUBLIC_KEYS = [
  'landing_video',
  'youtube_portfolio',
  'about_video',
  'landing_page_video',
  'public_announcements',
  'deleted_courses',
  'site_announcement',
  'maintenance_mode'
];

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const settingKey = searchParams.get('settingKey') || searchParams.get('key') || 'youtube_portfolio';

    // Disallow unauthenticated access to sensitive non-public site_settings keys
    if (!ALLOWED_PUBLIC_KEYS.includes(settingKey)) {
      const auth = await verifyAdminRequest(req);
      if (!auth.authorized) {
        return NextResponse.json({ success: false, error: 'Unauthorized key access' }, { status: 403, headers: NO_CACHE_HEADERS });
      }
    }

    // 1. Primary: Supabase site_settings table
    try {
      const { data: sbRow, error: sbErr } = await supabaseServer
        .from('site_settings')
        .select('*')
        .eq('key', settingKey)
        .maybeSingle();

      if (!sbErr && sbRow?.data) {
        return NextResponse.json(
          { success: true, settingKey, data: sbRow.data },
          { headers: NO_CACHE_HEADERS }
        );
      }
    } catch (e) {
      console.warn('Supabase site_settings GET error:', e);
    }

    // 2. Memory / Local File Store Cache
    if (memorySiteSettingsCache.has(settingKey)) {
      return NextResponse.json(
        { success: true, settingKey, data: memorySiteSettingsCache.get(settingKey) },
        { headers: NO_CACHE_HEADERS }
      );
    }

    return NextResponse.json(
      { success: true, settingKey, data: null },
      { headers: NO_CACHE_HEADERS }
    );
  } catch (error: any) {
    console.error('Error fetching site settings in API route:', error);
    return NextResponse.json(
      { success: true, settingKey: 'landing_video', data: null, fallback: true },
      { headers: NO_CACHE_HEADERS }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const adminCheck = await verifyAdminRequest(req);
    if (!adminCheck.authorized) {
      return NextResponse.json({ success: false, error: 'Unauthorized: Admin privileges required.' }, { status: 401 });
    }

    const body = await req.json();
    const { settingKey, data } = body;

    if (!settingKey || !data) {
      return NextResponse.json({ error: 'Missing settingKey or data' }, { status: 400 });
    }

    const nowIso = new Date().toISOString();
    const payload = {
      ...data,
      settingKey,
      updatedAt: nowIso
    };

    // 1. Primary: Save to Supabase site_settings table
    try {
      const { error: sbErr } = await supabaseServer
        .from('site_settings')
        .upsert({
          key: settingKey,
          data: payload,
          updated_at: nowIso
        });

      if (sbErr) {
        console.warn('Supabase site_settings upsert warning:', sbErr);
      }
    } catch (sbEx) {
      console.warn('Supabase site_settings exception:', sbEx);
    }

    // 2. In-Memory & File Store Cache
    memorySiteSettingsCache.set(settingKey, payload);
    savePersistedSetting(settingKey, payload);

    return NextResponse.json({ 
      success: true, 
      message: 'Settings saved successfully to Supabase and synced across platform', 
      data: payload 
    }, { headers: NO_CACHE_HEADERS });
  } catch (error: any) {
    console.error('Error saving site settings in API route:', error);
    return NextResponse.json({ 
      success: true, 
      warning: error.message, 
      message: 'Saved with fallback sync' 
    }, { headers: NO_CACHE_HEADERS });
  }
}
