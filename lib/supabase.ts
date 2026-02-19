import { createClient } from '@supabase/supabase-js';
// This code creates the connection using the keys we just saved
export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);
