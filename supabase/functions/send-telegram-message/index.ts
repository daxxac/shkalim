import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { corsHeaders } from '../_shared/cors.ts'

// Use the VITE_ prefix as per user's Supabase secret naming
const TELEGRAM_BOT_TOKEN = Deno.env.get('VITE_TELEGRAM_BOT_TOKEN')
const TELEGRAM_CHAT_ID = Deno.env.get('VITE_TELEGRAM_CHAT_ID')

serve(async (req) => {
  // This is needed if you're planning to invoke your function from a browser.
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
    console.error('Telegram bot token or chat ID is missing in environment variables.')
    return new Response(
      JSON.stringify({ error: 'Telegram configuration missing on server.' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    )
  }

  try {
    const { name, email, message } = await req.json()

    if (!name || !email || !message) {
      return new Response(
        JSON.stringify({ error: 'Missing name, email, or message in request body.' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      )
    }

    const messageText = `New Contact Form Submission:\n\nName: ${name}\nEmail: ${email}\nMessage: ${message}`
    const telegramApiUrl = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`

    const response = await fetch(telegramApiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: TELEGRAM_CHAT_ID,
        text: messageText,
      }),
    })

    if (!response.ok) {
      const errorData = await response.json()
      console.error('Telegram API error:', errorData)
      throw new Error(`Telegram API Error: ${errorData.description || response.statusText}`)
    }

    return new Response(JSON.stringify({ success: true, message: 'Message sent to Telegram.' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    console.error('Error processing request:', error)
    return new Response(JSON.stringify({ error: error.message || 'Failed to send message.' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})