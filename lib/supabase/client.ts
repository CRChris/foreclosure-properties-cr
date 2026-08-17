import { createBrowserClient } from '@supabase/ssr';

export const DEFAULT_SUPABASE_URL = 'https://ijaglkjaphanjzgcchik.supabase.co';
export const DEFAULT_SUPABASE_ANON_KEY = 'sb_publishable_jttxmv7b-lnRWtG8QTVwBQ_CGkslfNh';

export function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || DEFAULT_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || DEFAULT_SUPABASE_ANON_KEY;

  return createBrowserClient(supabaseUrl, supabaseKey);
}

export function isSupabaseConfigured(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || DEFAULT_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || DEFAULT_SUPABASE_ANON_KEY;
  return Boolean(url && key && !url.includes('placeholder'));
}
