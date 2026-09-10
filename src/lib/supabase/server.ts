import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://vwkjmagzoemamssufgof.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ3a2ptYWd6b2VtYW1zc3VmZ29mIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg1NDQxMDYsImV4cCI6MjEwNDEyMDEwNn0.rife420s6h3FgTVclEEweAZ6ueyJs3aMYCA-UhwWsNw';

export const supabaseServiceRoleKey = (
  process.env.SUPABASE_SERVICE_ROLE_KEY || 
  process.env.SUPABASE_SERVICE_KEY || 
  process.env.SUPABASE_ADMIN_KEY || 
  process.env.SUPABASE_SECRET_KEY || 
  ''
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

