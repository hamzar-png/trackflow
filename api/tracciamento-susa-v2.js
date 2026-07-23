import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://wogthnhzdzgblqghwvja.supabase.co',
  'sb_secret_3uNk8MLrMk1GdXQ5znRhgw_AdZTSgij'
);

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const { trackingNumber } = req.query || {};
    if (!trackingNumber) {
      return res.status(400).json({ error: 'Tracking mancante' });
    }

    // Prendi i cookie SUSA salvati
    const { data: cookieData } = await supabase
      .from('cookies_corrieri')
      .select('cookies')
      .eq('corriere', 'SUSA')
      .order('updated_at', { ascending: false })
      .limit(1)
      .single();

    if (!cookieData || !cookieData.cookies) {
      return res.status(500).json({ error: 'Cookie SUSA non disponibili. Apri il portale SUSA per aggiornarli.' });
    }

    // Chiama il dettaglio tracking con i cookie
    const key = Buffer.from(trackingNumber).toString('base64');

    const detailRes = await fetch(
      `https://flex.susa.it/FixedPages/Common/tracking/tracking_bolle.php/L/IT/data_ini/-1/data_fin/-1/rif_mit/-1/rif_mit2/-1/dest/-1/loc/-1/anno_form/-1/fil/MQ==/pro/-1/p_ass/-1/p_fra/-1/anno/MjAyNg==/key/${key}/cod_cli/-1`,
      {
        headers: { 'Cookie': cookieData.cookies },
      }
    );

    const html = await detailRes.text();

    return res.status(200).json({
      success: true,
      tracking: trackingNumber,
      htmlPreview: html.substring(0, 2000),
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}