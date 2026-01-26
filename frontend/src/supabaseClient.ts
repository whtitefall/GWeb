import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://uznwhjugzxtovgbcirze.supabase.com'
const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV6bndoanVnenh0b3ZnYmNpcnplIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkzOTY1ODYsImV4cCI6MjA4NDk3MjU4Nn0._OWoIaD_se51P5dw0L2yRi5TxchOR9rrFGrLaNANyoc'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
