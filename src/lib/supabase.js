import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY

const supabase = (SUPABASE_URL && SUPABASE_ANON_KEY)
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : null

export async function loadFromCloud() {
  if (!supabase) throw new Error('Supabase not configured')
  const { data, error } = await supabase
    .from('layouts')
    .select('data')
    .eq('id', 'main')
    .single()
  if (error) throw error
  return data?.data
}

export async function saveToCloud(payload) {
  if (!supabase) throw new Error('Supabase not configured')
  const { error } = await supabase
    .from('layouts')
    .upsert({ id: 'main', data: payload })
  if (error) throw error
}
