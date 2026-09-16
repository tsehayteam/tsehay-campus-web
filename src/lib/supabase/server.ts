import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://jzxgmikliwilyfpixskm.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp6eGdtaWtsaXdpbHlmcGl4c2ttIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk1Mzk4MDMsImV4cCI6MjEwNTExNTgwM30.fcUww9lCCTXebAHHKtS4TtsuIqgi8n4NqmQCd9N95Lc';

export const supabaseServiceRoleKey = (
  process.env.SUPABASE_SERVICE_ROLE_KEY || 
  process.env.SUPABASE_SERVICE_KEY || 
  process.env.SUPABASE_ADMIN_KEY || 
  process.env.SUPABASE_SECRET_KEY || 
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp6eGdtaWtsaXdpbHlmcGl4c2ttIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4OTUzOTgwMywiZXhwIjoyMTA1MTE1ODAzfQ.m8BM0mURaPoCmtVGN669wibHOTqCNCnyT0tB7ebE5TE'
).trim();

export function getSupabaseServer() {
  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

export function getSupabaseAdmin() {
  const key = supabaseServiceRoleKey || supabaseAnonKey;
  return createClient(supabaseUrl, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

export const supabaseServer = getSupabaseServer();
export const supabaseAdmin = getSupabaseAdmin();

