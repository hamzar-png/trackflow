import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://wogthnhzdzgblqghwvja.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndvZ3Robmh6ZHpnYmxxZ2h3dmphIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM3NzY4MjUsImV4cCI6MjA5OTM1MjgyNX0.drbfHRnTeezViflEaqXDBED6H4zMzSq4-MRyTXHqt1E'
);

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  
  const { codice } = req.query;
  
  if (!codice) {
    return res.status(400).json({ error: 'Codice mancante' });
  }

  // Cerca il destinatario per codice cliente
  const { data } = await supabase
    .from('destinatari')
    .select('nome, cognome, azienda')
    .or(`codice_cliente.eq.${codice},id.eq.${codice}`)
    .single();

  if (data) {
    const nome = data.azienda || `${data.nome || ''} ${data.cognome || ''}`.trim();
    return res.status(200).json({ nome });
  }

  return res.status(404).json({ nome: null });
}