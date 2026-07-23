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

    const key = Buffer.from(trackingNumber).toString('base64');

    const detailRes = await fetch(
      `https://flex.susa.it/FixedPages/Common/tracking/tracking_bolle.php/L/IT/data_ini/-1/data_fin/-1/rif_mit/-1/rif_mit2/-1/dest/-1/loc/-1/anno_form/-1/fil/MQ==/pro/-1/p_ass/-1/p_fra/-1/anno/MjAyNg==/key/${key}/cod_cli/-1`,
      {
        headers: { 
          'Cookie': cookieData.cookies,
          'User-Agent': 'Mozilla/5.0'
        },
      }
    );

    const html = await detailRes.text();

    // Estrai i dati con regex
    const getValue = (label) => {
      const regex = new RegExp(`<div class="col-2 box-scheda-label">${label}</div>\\s*<div class="[^"]*box-scheda-value[^"]*">([^<]*)</div>`, 'i');
      const match = html.match(regex);
      return match ? match[1].trim() : '';
    };

    const info = {
      bolla: getValue('Bolla SUSA'),
      data: getValue('Data'),
      mittente: getValue('Rag\\. soc\\. mit\\.'),
      destinatario: getValue('Rag\\. soc\\. dest\\.'),
      indirizzoDest: getValue('Indirizzo dest\\.'),
      localita: getValue('Localit'),
      provincia: getValue('Provincia'),
      cap: getValue('Cap'),
      colli: getValue('Numero colli'),
      peso: getValue('Peso'),
      riferimento: getValue('Riferimento'),
    };

    // Estrai lo stato
    const statoMatch = html.match(/<div class='box-step-nome'>([^<]+)<\/div>/);
    const stato = statoMatch ? statoMatch[1].trim() : '';
    
    const filMatch = html.match(/<div class='box-step-fil'>([^<]+)<\/div>/);
    const filiale = filMatch ? filMatch[1].trim() : '';

    // Cerca gli eventi nella timeline
    const events = [];
    if (stato) {
      events.push({
        data: info.data || '',
        stato: stato + (filiale ? ' - ' + filiale : ''),
        luogo: filiale || '',
      });
    }

    return res.status(200).json({
      success: true,
      tracking: trackingNumber,
      info: info,
      statoAttuale: stato + (filiale ? ' - ' + filiale : ''),
      events: events,
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}