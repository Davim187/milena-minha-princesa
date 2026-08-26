import { createClient, type SupabaseClient } from '@supabase/supabase-js'

function normalizeUrl(value: string) {
  return value
    .trim()
    .replace(/\/+$/, '')
    .replace(/\/rest\/v1$/i, '')
}

function isPublicKey(value: string) {
  const key = value.trim()
  if (!key) return false
  if (key.startsWith('sb_secret_')) return false
  if (key.includes('service_role')) return false
  return key.startsWith('sb_publishable_') || key.startsWith('eyJ')
}

const rawUrl = String(import.meta.env.VITE_SUPABASE_URL ?? '')
const rawKey = String(import.meta.env.VITE_SUPABASE_ANON_KEY ?? '')
const supabaseUrl = normalizeUrl(rawUrl)
const supabaseAnonKey = rawKey.trim()

export const isSupabaseConfigured = Boolean(supabaseUrl && isPublicKey(supabaseAnonKey))

if (typeof window !== 'undefined' && rawKey.trim().startsWith('sb_secret_')) {
  console.error(
    '[Projeto: Ela] A chave do .env é SECRET. Troque por anon ou Publishable key (sb_publishable_... ou eyJ...).',
  )
}

if (typeof window !== 'undefined' && rawUrl.includes('/rest/v1')) {
  console.error(
    '[Projeto: Ela] VITE_SUPABASE_URL deve ser só a URL do projeto, sem /rest/v1/.',
  )
}

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    })
  : null

if (typeof window !== 'undefined') {
  if (isSupabaseConfigured) {
    console.info('[Projeto: Ela] Supabase conectado:', new URL(supabaseUrl).host)
  } else {
    console.error('[Projeto: Ela] Supabase NÃO configurado. Confira VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY e reinicie o npm run dev.')
  }
}
