import { createClient } from '@supabase/supabase-js';
import fetch from 'node-fetch';
import { FormData } from 'form-data';

// Konfigurasi Telegram (HARDCODED untuk Kizhoo saja)
const BOT_TOKEN = process.env.BOT_TOKEN || 'YOUR_BOT_TOKEN_HERE';
const CHAT_ID = process.env.CHAT_ID || 'YOUR_CHAT_ID_HERE';

// Helper untuk mendapatkan IP pengguna
function getClientIp(req) {
  return req.headers['x-forwarded-for']?.split(',')[0] || 
         req.headers['x-real-ip'] || 
         req.socket?.remoteAddress || 
         'unknown';
}

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS, GET');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  // Handle preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  // Handle GET untuk health check
  if (req.method === 'GET') {
    return res.status(200).json({
      status: 'online',
      service: 'To-Kizhoo Message API',
      version: '2.0.0',
      timestamp: new Date().toISOString()
    });
  }
  
  // Hanya POST yang diizinkan
  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed. Use POST.'
    });
  }
  
  try {
    console.log('📨 New message received');
    
    // Parse data
    let data;
    try {
      data = req.body;
      if (!data || typeof data !== 'object') {
        throw new Error('Invalid request body');
      }
    } catch (error) {
      return res.status(400).json({
        success: false,
        error: 'Invalid JSON data'
      });
    }
    
    const { username, message, photos = [] } = data;
    
    // Validasi
    if (!username || !username.trim()) {
      return res.status(400).json({
        success: false,
        error: 'VALIDASI_ERROR',
        details: 'Nama pengirim wajib diisi',
        solution: 'Silakan isi nama Anda sebelum mengirim pesan'
      });
    }
    
    if (!message || !message.trim()) {
      return res.status(400).json({
        success: false,
        error: 'VALIDASI_ERROR',
        details: 'Pesan wajib diisi',
        solution: 'Silakan tulis pesan Anda sebelum mengirim'
      });
    }
    
    if (username.length > 100) {
      return res.status(400).json({
        success: false,
        error: 'VALIDASI_ERROR',
        details: 'Nama terlalu panjang (maksimal 100 karakter)',
        solution: 'Persingkat nama Anda'
      });
    }
    
    if (message.length > 2000) {
      return res.status(400).json({
        success: false,
        error: 'VALIDASI_ERROR',
        details: 'Pesan terlalu panjang (maksimal 2000 karakter)',
        solution: 'Persingkat pesan Anda'
      });
    }
    
    if (photos.length > 5) {
      return res.status(400).json({
        success: false,
        error: 'VALIDASI_ERROR',
        details: 'Maksimal 5 foto yang dapat dikirim',
        solution: 'Kurangi jumlah foto yang diunggah'
      });
    }
    
    // Validasi base64 gambar
    for (let i = 0; i < photos.length; i++) {
      if (!photos[i] || !photos[i].includes('data:image/')) {
        return res.status(400).json({
          success: false,
          error: 'VALIDASI_ERROR',
          details: `Foto ${i + 1} format tidak valid`,
          solution: 'Unggah foto dengan format JPG, PNG, atau GIF yang valid'
        });
      }
    }
    
    // Inisialisasi Supabase
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      console.error('Supabase config missing');
      return res.status(500).json({
        success: false,
        error: 'SERVER_CONFIG_ERROR',
        details: 'Database configuration missing',
        solution: 'Contact administrator'
      });
    }
    
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Simpan ke database
    const { data: messageData, error: dbError } = await supabase
      .from('messages')
      .insert({
        sender_name: username.trim(),
        message_text: message.trim(),
        photo_count: photos.length,
        telegram_status: 'pending',
        user_ip: getClientIp(req),
        user_agent: req.headers['user-agent'] || 'unknown'
      })
      .select()
      .single();
    
    if (dbError) {
      console.error('Database error:', dbError);
      return res.status(500).json({
        success: false,
        error: 'DATABASE_ERROR',
        details: 'Failed to save message to database',
        solution: 'Please try again in a few minutes'
      });
    }
    
    console.log(`💾 Message saved with ID: ${messageData.id}`);
    
    // Kirim ke Telegram
    try {
      const telegramMessage = `📨 *PESAN BARU DARI TO-KIZHOO*\n\n👤 **Pengirim:** ${username.trim()}\n💬 **Pesan:**\n${message.trim()}\n\n🕒 **Waktu:** ${new Date().toLocaleString('id-ID')}`;
      
      let telegramResult;
      
      if (photos.length > 0) {
        // Kirim dengan foto
        console.log(`📷 Sending ${photos.length} photos to Telegram...`);
        
        // Kirim foto pertama dengan caption
        telegramResult = await sendTelegramPhoto(BOT_TOKEN, CHAT_ID, photos[0], telegramMessage);
        
        // Kirim foto tambahan tanpa caption
        for (let i = 1; i < photos.length; i++) {
          await sendTelegramPhoto(BOT_TOKEN, CHAT_ID, photos[i]);
          await sleep(500); // Delay untuk menghindari rate limiting
        }
      } else {
        // Kirim hanya teks
        console.log('📝 Sending text message to Telegram...');
        telegramResult = await sendTelegramMessage(BOT_TOKEN, CHAT_ID, telegramMessage);
      }
      
      // Update status di database
      await supabase
        .from('messages')
        .update({
          telegram_status: 'sent',
          telegram_message_id: telegramResult?.result?.message_id?.toString() || 'unknown'
        })
        .eq('id', messageData.id);
      
      console.log('✅ Message sent to Telegram successfully');
      
      return res.status(200).json({
        success: true,
        message: 'Pesan berhasil dikirim ke Kizhoo!',
        messageId: messageData.id,
        timestamp: new Date().toISOString()
      });
      
    } catch (telegramError) {
      console.error('Telegram API error:', telegramError);
      
      // Update status gagal di database
      await supabase
        .from('messages')
        .update({
          telegram_status: 'failed',
          telegram_error: telegramError.message.substring(0, 500)
        })
        .eq('id', messageData.id);
      
      let errorDetails = 'Gagal mengirim ke Telegram';
      let errorSolution = 'Coba lagi dalam beberapa menit';
      
      if (telegramError.message.includes('Bot token')) {
        errorDetails = 'Token bot Telegram tidak valid';
        errorSolution = 'Hubungi administrator untuk memperbaiki konfigurasi';
      } else if (telegramError.message.includes('chat not found')) {
        errorDetails = 'Chat ID tidak valid';
        errorSolution = 'Hubungi administrator untuk memperbaiki konfigurasi';
      } else if (telegramError.message.includes('network')) {
        errorDetails = 'Gagal terhubung ke Telegram API';
        errorSolution = 'Cek koneksi internet Anda';
      }
      
      return res.status(500).json({
        success: false,
        error: 'TELEGRAM_API_ERROR',
        details: errorDetails,
        solution: errorSolution,
        debug: telegramError.message.substring(0, 200)
      });
    }
    
  } catch (error) {
    console.error('🔥 Server error:', error);
    
    return res.status(500).json({
      success: false,
      error: 'SERVER_ERROR',
      details: 'Internal server error occurred',
      solution: 'Please try again later',
      timestamp: new Date().toISOString()
    });
  }
}

// Helper functions
async function sendTelegramMessage(botToken, chatId, text) {
  const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
  
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text: text,
      parse_mode: 'Markdown',
      disable_web_page_preview: true
    })
  });
  
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(`Telegram API error: ${JSON.stringify(errorData)}`);
  }
  
  return response.json();
}

async function sendTelegramPhoto(botToken, chatId, photoBase64, caption = '') {
  const url = `https://api.telegram.org/bot${botToken}/sendPhoto`;
  
  // Ekstrak data base64
  const match = photoBase64.match(/^data:image\/(\w+);base64,/);
  if (!match) {
    throw new Error('Invalid base64 image data');
  }
  
  const base64Data = photoBase64.replace(/^data:image\/\w+;base64,/, '');
  const buffer = Buffer.from(base64Data, 'base64');
  
  const formData = new FormData();
  formData.append('chat_id', chatId);
  
  if (caption) {
    formData.append('caption', caption.substring(0, 1024));
    formData.append('parse_mode', 'Markdown');
  }
  
  formData.append('photo', buffer, {
    filename: `photo_${Date.now()}.jpg`,
    contentType: 'image/jpeg'
  });
  
  const response = await fetch(url, {
    method: 'POST',
    body: formData
  });
  
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(`Telegram Photo API error: ${JSON.stringify(errorData)}`);
  }
  
  return response.json();
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
