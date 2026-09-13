import { createClient } from '@supabase/supabase-js';
export function createUserClient(token) {
  return createClient(process.env.SUPABASE_URL,process.env.SUPABASE_ANON_KEY,{
    auth:{persistSession:false,autoRefreshToken:false},
    ...(token?{global:{headers:{Authorization:`Bearer ${token}`}}}:{}),
  });
}
