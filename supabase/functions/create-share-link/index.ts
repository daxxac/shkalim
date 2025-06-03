import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

interface ShareLinkPayload {
  encrypted_blob: string;
  expires_in_hours?: number;
  // access_limit?: number; // Пока не будем реализовывать access_limit для упрощения
}

serve(async (req) => {
  // Это для обработки preflight-запроса CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const payload = (await req.json()) as ShareLinkPayload;
    if (!payload.encrypted_blob) {
      throw new Error('Missing encrypted_blob in payload');
    }

    const supabaseAdminClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const expiresInHours = payload.expires_in_hours || 24; // По умолчанию 24 часа
    const expiresAt = new Date(Date.now() + expiresInHours * 60 * 60 * 1000).toISOString();

    // Получаем ID аутентифицированного пользователя, если он есть
    // Для этого функция должна быть вызвана с Authorization: Bearer <USER_JWT>
    // Если вы хотите разрешить анонимное создание, эту часть можно убрать или сделать опциональной
    let creatorUserId: string | null = null;
    const authHeader = req.headers.get('Authorization');
    if (authHeader) {
      try {
        const jwt = authHeader.replace('Bearer ', '');
        const { data: { user } } = await supabaseAdminClient.auth.getUser(jwt);
        if (user) {
          creatorUserId = user.id;
        }
      } catch (authError) {
        console.warn('Auth header present but failed to get user:', authError.message);
        // Не прерываем, если аутентификация опциональна
      }
    }

    const { data, error } = await supabaseAdminClient
      .from('shared_data_links')
      .insert({
        encrypted_blob: payload.encrypted_blob,
        expires_at: expiresAt,
        creator_user_id: creatorUserId, // Может быть null
        // access_limit: payload.access_limit || 1, // Если будете использовать
      })
      .select('id')
      .single();

    if (error) {
      console.error('Supabase insert error:', error);
      throw error;
    }

    if (!data || !data.id) {
      throw new Error('Failed to create share link or retrieve ID.');
    }
    
    return new Response(JSON.stringify({ shareId: data.id }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    console.error('Error in create-share-link function:', error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
})