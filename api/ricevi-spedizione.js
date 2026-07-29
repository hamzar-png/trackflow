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
    
    const { 
      apiKey, tracking, destinatario, localita, provincia, 
      indirizzo, cap, colli, peso, data, corriere 
    } = req.body || {};
    
    const corriereFinale = corriere || 'GLS';

    if (!apiKey || !tracking) {
      return res.status(400).json({ error: 'Dati mancanti (apiKey e tracking obbligatori)' });
    }

    const { data: imp } = await supabase
      .from('impostazioni')
      .select('user_id')
      .eq('api_key', apiKey)
      .single();

    const userId = imp?.user_id || 'c9ac4541-e872-460c-87e7-309501a294d8';

    const trackingId = 'TRK-' + Date.now().toString(36).toUpperCase() + 
                       '-' + Math.floor(Math.random() * 1000).toString().padStart(3, '0');

    // Aggiungi prefisso AK solo per GLS se mancante
    let trackingFinale = tracking;
    if (corriereFinale === 'GLS' && !tracking.startsWith('AK')) {
      trackingFinale = 'AK' + tracking;
    }

    const nuovaSpedizione = {
      tracking_id: trackingId,
      cliente: destinatario || 'Da assegnare',
      corriere: corriereFinale,
      tracking: trackingFinale,
      stato: 'In transito',
      data: data || new Date().toLocaleDateString('it-IT'),
      tipo: 'tracking',
      ddt: '',
      partenza: provincia || '',
      destinazione: localita || '',
      note: indirizzo ? `${indirizzo}, ${cap || ''}` : '',
      user_id: userId
    };

    console.log('📦 Inserimento spedizione:', nuovaSpedizione);

    const { error } = await supabase
      .from('spedizioni')
      .insert([nuovaSpedizione]);

    if (error) {
      console.error('❌ Errore Supabase:', error);
      return res.status(500).json({ error: error.message });
    }

    console.log('✅ Spedizione inserita con successo');
    
    return res.status(200).json({ 
      success: true, 
      message: 'Spedizione ricevuta!',
      tracking_id: trackingId,
      corriere: corriereFinale
    });
    
  } catch (error) {
    console.error('❌ Errore server:', error);
    return res.status(500).json({ error: error.message });
  }
}