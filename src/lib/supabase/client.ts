import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://jzxgmikliwilyfpixskm.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp6eGdtaWtsaXdpbHlmcGl4c2ttIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk1Mzk4MDMsImV4cCI6MjEwNTExNTgwM30.fcUww9lCCTXebAHHKtS4TtsuIqgi8n4NqmQCd9N95Lc';

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
