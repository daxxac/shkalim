import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
// Для запланированных функций CORS обычно не нужен, так как они вызываются не из браузера напрямую.
// import { corsHeaders } from '../_shared/cors.ts' 

serve(async (_req) => { // _req не используется, но serve ожидает его
  try {
    const supabaseAdminClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    console.log(`Attempting to delete links expired before: ${twentyFourHoursAgo}`);
    
    // Удаляем записи, у которых expires_at уже прошел
    const { data, error } = await supabaseAdminClient
      .from('shared_data_links')
      .delete()
      .lt('expires_at', new Date().toISOString()); // Удаляем те, что уже истекли

    if (error) {
      console.error('Error deleting expired links:', error);
      throw error;
    }

    // data после delete() может быть массивом удаленных объектов или null.
    // В некоторых версиях @supabase/supabase-js возвращаемый тип для delete().select() может быть более строгим.
    // Для .delete() без .select() data обычно null, а error содержит информацию об успехе/ошибке.
    // Если .delete().select() используется, то data будет массивом.
    // В данном случае мы не используем .select(), поэтому data, скорее всего, будет null при успехе,
    // а количество удаленных строк можно получить из error.details или error.count, если API это предоставляет.
    // Однако, для простоты и если API возвращает удаленные строки в data (что иногда бывает), оставим проверку.
    const count = Array.isArray(data) ? data.length : 0;
    // Если Supabase возвращает { count: number } в результате delete, то можно использовать это.
    // Например, если бы было: const { error, count: deletedCount } = await ...
    // console.log(`Successfully deleted ${deletedCount || 0} expired share links.`);
    // Пока оставим так, как есть, с предположением, что data может быть массивом.
    console.log(`Successfully deleted ${count} expired share links (Note: count might be 0 if API returns null on success without select).`);
    
    return new Response(JSON.stringify({ message: `Successfully deleted ${count} expired links.` }), {
      headers: { 'Content-Type': 'application/json' }, // CORS здесь не так важен
      status: 200,
    });

  } catch (error) {
    console.error('Error in cleanup-expired-links function:', error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { 'Content-Type': 'application/json' },
      status: 500, // Внутренняя ошибка сервера
    });
  }
})