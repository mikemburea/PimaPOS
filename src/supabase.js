import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}
console.log("Supabase URL:", supabaseUrl);
console.log("Supabase   Key:", supabaseAnonKey);
// Create Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey)

