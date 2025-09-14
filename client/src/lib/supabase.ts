import { createClient } from '@supabase/supabase-js'
import type { Database } from '../types/database'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || "https://xtljjcdpusjumjextmir.supabase.co"
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh0bGpqY2RwdXNqdW1qZXh0bWlyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc3NzE5NTYsImV4cCI6MjA3MzM0Nzk1Nn0.ao2lcp-Oih2nJAfjKnpKow0KRGnTIYAEBxmYeyCq6bU"

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey)
