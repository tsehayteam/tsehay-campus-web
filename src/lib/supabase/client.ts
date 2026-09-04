import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://vwkjmagzoemamssufgof.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ3a2ptYWd6b2VtYW1zc3VmZ29mIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg1NDQxMDYsImV4cCI6MjEwNDEyMDEwNn0.rife420s6h3FgTVclEEweAZ6ueyJs3aMYCA-UhwWsNw';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
});
