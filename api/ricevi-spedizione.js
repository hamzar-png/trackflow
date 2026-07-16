export default async function handler(req, res) {
  // CORS
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

    const { apiKey, tracking, destinatario, localita, provincia, indirizzo, cap, colli, peso, data } = req.body || {};

    if (!apiKey || !tracking) {
      return res.status(400).json({ error: 'Dati mancanti' });
    }

    // Import Supabase
    const { supabase } = await import('../src/supabaseClient.js');

    // Trova utente dalla API key
    const { data: imp } = await supabase
      .from('impostazioni')
      .select('user_id')
      .eq('api_key', apiKey)
      .single();

    if (!imp || !imp.user_id) {
      return res.status(401).json({ error: 'API key non valida' });
    }

    const { error } = await supabase.from('spedizioni').insert([{
      tracking_id: 'TRK-' + String(Math.floor(Math.random() * 1000)).padStart(3, '0'),
      cliente: destinatario || 'Da assegnare',
      corriere: 'GLS',
      tracking: 'AK' + tracking,
      stato: 'In transito',
      data: data || new Date().toLocaleDateString('it-IT'),
      tipo: 'tracking',
      ddt: '',
      partenza: '',
      destinazione: localita || '',
      note: indirizzo ? `${indirizzo}, ${cap || ''}` : '',
      user_id: imp.user_id,
    }]);

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    return res.status(200).json({ success: true, message: 'Spedizione ricevuta!' });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}