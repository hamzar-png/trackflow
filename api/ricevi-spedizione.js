import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://wogthnhzdzgblqghwvja.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndvZ3Robmh6ZHpnYmxxZ2h3dmphIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM3NzY4MjUsImV4cCI6MjA5OTM1MjgyNX0.drbfHRnTeezViflEaqXDBED6H4zMzSq4-MRyTXHqt1E'
);

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }
    const { apiKey, tracking, destinatario, localita, provincia, indirizzo, cap, colli, peso, data, corriere } = req.body || {};
    const corriereFinale = corriere || 'GLS';

    if (!apiKey || !tracking) {
      return res.status(400).json({ error: 'Dati mancanti' });
    }

    // ... resto uguale ...

    const { error } = await supabase.from('spedizioni').insert([{
      tracking_id: 'TRK-' + String(Math.floor(Math.random() * 1000)).padStart(3, '0'),
      cliente: destinatario || 'Da assegnare',
      corriere: corriereFinale,
      tracking: corriereFinale === 'GLS' ? 'AK' + tracking : tracking,
      stato: 'In transito',
      data: data || new Date().toLocaleDateString('it-IT'),
      tipo: 'tracking',
      ddt: '',
      partenza: '',
      destinazione: localita || '',
      note: indirizzo ? `${indirizzo}, ${cap || ''}` : '',
      user_id: imp.user_id,
      destinatario_id: destinatario_id,
    }]);

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    return res.status(200).json({ 
      success: true, 
      message: 'Spedizione ricevuta!',
      assegnata: !!destinatario_id
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}