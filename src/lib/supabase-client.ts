import { createClient } from '@supabase/supabase-js';
import { Database } from '@/types/database';

export const createSupabaseClient = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl) {
    throw new Error('Missing environment variable: NEXT_PUBLIC_SUPABASE_URL');
  }

  return createClient<Database>(supabaseUrl, supabaseAnonKey);
};