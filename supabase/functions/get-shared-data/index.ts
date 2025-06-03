import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

serve(async (req) => {
  // Это для обработки preflight-запроса CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const url = new URL(req.url);
    const shareId = url.searchParams.get('share_id'); // Получаем share_id из query параметра

    if (!shareId) {
      throw new Error('Missing share_id query parameter');
    }

    // Используем обычный клиент Supabase, так как RLS должна справиться с доступом
    // Однако, для инкремента access_count может понадобиться service_role ключ,
    // если RLS не позволяет пользователю обновлять свою же запись таким образом.
    // Для простоты чтения пока используем обычный ключ, предполагая, что RLS на SELECT настроена.
    // Если будем добавлять access_count, то лучше перейти на service_role_key для обновления.
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '' // Используем anon key, RLS должна отработать
    );
    
    // Если вы решите инкрементировать access_count здесь, то лучше использовать supabaseAdminClient
    // const supabaseAdminClient = createClient(
    //   Deno.env.get('SUPABASE_URL') ?? '',
    //   Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    // );

    const { data, error } = await supabaseClient // или supabaseAdminClient если обновляем access_count
      .from('shared_data_links')
      .select('encrypted_blob, expires_at, access_limit, access_count')
      .eq('id', shareId)
      .single();

    if (error) {
      console.error('Supabase select error:', error);
      if (error.code === 'PGRST116') { // Код ошибки, если .single() не нашел запись
         throw new Error('Share link not found or already used.');
      }
      throw error;
    }

    if (!data) {
      throw new Error('Share link not found.');
    }

    // Проверка срока действия
    if (new Date(data.expires_at) < new Date()) {
      throw new Error('Share link has expired.');
    }

    // Проверка лимита доступа (если access_limit используется)
    // Эту логику лучше перенести в RLS или делать обновление access_count через admin-клиент
    // if (data.access_limit !== null && data.access_count >= data.access_limit) {
    //   throw new Error('Share link access limit reached.');
    // }

    // Если нужно инкрементировать access_count (лучше делать это до возврата данных, если используется лимит)
    // const { error: updateError } = await supabaseAdminClient
    //   .from('shared_data_links')
    //   .update({ access_count: (data.access_count || 0) + 1 })
    //   .eq('id', shareId);
    // if (updateError) {
    //   console.error('Failed to update access_count:', updateError);
    //   // Решить, критична ли эта ошибка для возврата данных
    // }
    
    return new Response(JSON.stringify({ encrypted_blob: data.encrypted_blob }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('Error in get-shared-data function:', error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: error.message.includes('not found') || error.message.includes('expired') || error.message.includes('limit reached') ? 404 : 400,
    });
  }
})