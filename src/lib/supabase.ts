import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
})

export const ADMIN_EMAIL = 'notipersonales2026@gmail.com'
export const AUTH_VERSION = 'v1.0'
export const MAX_FILE_SIZE = 50 * 1024 * 1024
export const ALLOWED_EXTENSIONS = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/zip',
  'application/x-rar-compressed',
  'application/vnd.rar',
  'application/x-zip-compressed',
  'image/jpeg',
  'image/png',
]

export const ALLOWED_FILE_EXTS = ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'zip', 'rar', 'jpg', 'jpeg', 'png']
