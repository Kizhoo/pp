import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  // Handle preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  // Hanya GET yang diizinkan
  if (req.method !== 'GET') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed. Use GET.'
    });
  }
  
  try {
    // Inisialisasi Supabase
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      return res.status(500).json({
        success: false,
        error: 'Database configuration missing'
      });
    }
    
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Ambil statistik total
    const { data: statsData, error: statsError } = await supabase
      .from('daily_stats')
      .select('message_count, photo_count')
      .order('stat_date', { ascending: false })
      .limit(30);
    
    if (statsError) {
      console.error('Stats error:', statsError);
      throw new Error('Failed to fetch statistics');
    }
    
    // Hitung total
    const totalMessages = statsData.reduce((sum, day) => sum + (day.message_count || 0), 0);
    const totalPhotos = statsData.reduce((sum, day) => sum + (day.photo_count || 0), 0);
    
    // Ambil statistik hari ini
    const today = new Date().toISOString().split('T')[0];
    const { data: todayData, error: todayError } = await supabase
      .from('daily_stats')
      .select('message_count, photo_count')
      .eq('stat_date', today)
      .single();
    
    const todayMessages = todayData?.message_count || 0;
    const todayPhotos = todayData?.photo_count || 0;
    
    // Ambil 5 pesan terbaru untuk display
    const { data: recentMessages, error: messagesError } = await supabase
      .from('messages')
      .select('sender_name, message_text, photo_count, created_at')
      .order('created_at', { ascending: false })
      .limit(5);
    
    return res.status(200).json({
      success: true,
      stats: {
        total: {
          messages: totalMessages,
          photos: totalPhotos
        },
        today: {
          messages: todayMessages,
          photos: todayPhotos
        },
        recent: recentMessages || []
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Stats API error:', error);
    
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch statistics',
      timestamp: new Date().toISOString()
    });
  }
}
