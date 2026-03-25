import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

export async function loadFromCloud() {
  const { data, error } = await supabase
    .from('layouts')
    .select('data')
    .eq('id', 'main')
    .single()
  if (error) throw error
  return data.data
}

export async function saveToCloud(payload) {
  const { error } = await supabase
    .from('layouts')
    .update({ data: payload })
    .eq('id', 'main')
  if (error) throw error
}
