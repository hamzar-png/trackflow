import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  'https://wogthnhzdzgblqghwvja.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndvZ3Robmh6ZHpnYmxxZ2h3dmphIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4Mzc3NjgyNSwiZXhwIjoyMDk5MzUyODI1fQ.P05KHCAjHwQ9OkT-GTuLp8_85FtM_1A0LANX7dwdUa4'
);

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const { action, trackingId, userId, fileData, fileName } = req.body || {};

    if (action === 'upload') {
      // Converti base64 in buffer
      const buffer = Buffer.from(fileData, 'base64');
      const filePath = `${userId}/${trackingId}_DDT.pdf`;

      const { error } = await supabaseAdmin.storage
        .from('ddt')
        .upload(filePath, buffer, { upsert: true, contentType: 'application/pdf' });

      if (error) return res.status(500).json({ error: error.message });

      const publicUrl = `https://wogthnhzdzgblqghwvja.supabase.co/storage/v1/object/public/ddt/${filePath}`;

      const { error: updateError } = await supabaseAdmin
        .from('spedizioni')
        .update({ ddt_url: publicUrl })
        .eq('tracking_id', trackingId);

      if (updateError) return res.status(500).json({ error: updateError.message });

      return res.status(200).json({ success: true, url: publicUrl });
    }

    if (action === 'delete') {
      const filePath = `${userId}/${trackingId}_DDT.pdf`;

      await supabaseAdmin.storage.from('ddt').remove([filePath]);
      await supabaseAdmin.from('spedizioni').update({ ddt_url: null }).eq('tracking_id', trackingId);

      return res.status(200).json({ success: true });
    }

    return res.status(400).json({ error: 'Azione non valida' });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}