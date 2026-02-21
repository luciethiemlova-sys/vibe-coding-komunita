import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

console.log('Vite env:', import.meta.env);

if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Supabase credentials missing! VITE_SUPABASE_URL:', supabaseUrl, 'VITE_SUPABASE_ANON_KEY:', supabaseAnonKey);
} else {
    console.log('Supabase credentials found. Initializing client...');
}

export const supabase = createClient(
    supabaseUrl || 'https://placeholder.supabase.co',
    supabaseAnonKey || 'placeholder'
)

