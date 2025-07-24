import { createClient } from '@supabase/supabase-js'

// Debug: Log all environment variables that start with VITE_
console.log('All VITE_ environment variables:', 
  Object.keys(import.meta.env)
    .filter(key => key.startsWith('VITE_'))
    .reduce((obj, key) => {
      obj[key] = import.meta.env[key] ? '***SET***' : 'undefined'
      return obj
    }, {})
)

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

console.log("Supabase URL:", supabaseUrl ? "***SET***" : "undefined");
console.log("Supabase Key:", supabaseAnonKey ? "***SET***" : "undefined");

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables')
  console.error('VITE_SUPABASE_URL:', supabaseUrl)
  console.error('VITE_SUPABASE_ANON_KEY:', supabaseAnonKey)
  throw new Error('Missing Supabase environment variables')
}

// Create Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey)