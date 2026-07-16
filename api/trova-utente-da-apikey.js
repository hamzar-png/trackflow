import { supabase } from '../src/supabaseClient.js';

export default async function handler(req, res) {
  const { key } = req.query;

  if (!key) {
    return res.status(400).json({ error: 'API key mancante' });
  }

  const { data } = await supabase
    .from('impostazioni')
    .select('user_id')
    .eq('api_key', key)
    .single();

  return res.status(200).json(data || {});
}