// supabase/functions/_shared/cors.ts
export const corsHeaders = {
  'Access-Control-Allow-Origin': '*', // Или ваш конкретный домен фронтенда
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}