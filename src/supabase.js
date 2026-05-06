import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://szqsansojklzsuxirpye.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN6cXNhbnNvamtsenN1eGlycHllIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgwNzAzNzksImV4cCI6MjA5MzY0NjM3OX0.NGdkPuT8s_lk9qpNun6_fZlkdnU6Pd_ECby8ZAFqzlA'

export const supabase = createClient(supabaseUrl, supabaseKey)
