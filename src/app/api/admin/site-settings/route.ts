export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

import { NextRequest, NextResponse } from 'next/server';
import { sharedSiteSettingsCache, savePersistedSetting } from '@/lib/memoryStore';
import { supabase } from '@/lib/supabase/client';

export const memorySiteSettingsCache = sharedSiteSettingsCache;

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const settingKey = searchParams.get('settingKey') || searchParams.get('key') || 'youtube_portfolio';

    // 1. Primary Supabase Lookup
    try {
      const { data: sbRow, error: sbErr } = await supabase
        .from('site_settings')
        .select('*')
        .eq('key', settingKey)
        .maybeSingle();

      if (sbRow && !sbErr && sbRow.data) {
        return NextResponse.json({ success: true, settingKey, data: sbRow.data });
      }
    } catch (sbE) {}

    // 2. Memory cache fallback
    if (memorySiteSettingsCache.has(settingKey)) {
      return NextResponse.json({ success: true, settingKey, data: memorySiteSettingsCache.get(settingKey) });
    }

    return NextResponse.json({ success: true, settingKey, data: null });
  } catch (error: any) {
    console.error('Error fetching admin site settings:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { settingKey, data } = body;

    if (!settingKey) {
      return NextResponse.json({ error: 'Missing settingKey' }, { status: 400 });
    }

    const payload = data || body;
    memorySiteSettingsCache.set(settingKey, payload);
    savePersistedSetting(settingKey, payload);

    // Save to Supabase site_settings table
    try {
      await supabase.from('site_settings').upsert({
        key: settingKey,
        data: payload,
        updated_at: new Date().toISOString()
      });
    } catch (sbErr) {
      console.warn('Supabase site_settings save warning:', sbErr);
    }

    return NextResponse.json({ success: true, message: `Setting ${settingKey} saved successfully`, data: payload });
  } catch (error: any) {
    console.error('Error saving admin site settings:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
