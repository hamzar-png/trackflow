import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://wogthnhzdzgblqghwvja.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndvZ3Robmh6ZHpnYmxxZ2h3dmphIiwicm9zZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4Mzc3NjgyNSwiZXhwIjoyMDk5MzUyODI1fQ.P05KHCAjHwQ9OkT-GTuLp8_85FtM_1A0LANX7dwdUa4'
);

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
        // Test connessione Supabase
    const { data: test, error: testErr } = await supabase.from('impostazioni').select('count');
    console.log('Test Supabase:', test, testErr);
    const { trackingNumber, userId } = req.query || {};
    if (!trackingNumber) {
      return res.status(400).json({ error: 'Tracking mancante' });
    }

    // Prendi le credenziali SUSA per questo utente
        // Prendi le credenziali SUSA (prima riga disponibile)
        // Query diretta
    const { data: allImp, error: queryErr } = await supabase
      .from('impostazioni')
      .select('*')
      .limit(1);

    console.log('Query result:', allImp);
    console.log('Query error:', queryErr);

    const imp = allImp && allImp.length > 0 ? allImp[0] : null;

    if (!imp) {
      return res.status(500).json({ 
        error: 'Nessuna impostazione trovata',
        debug: { count: allImp?.length, error: queryErr?.message }
      });
    }

    if (!imp.susa_username) {
      return res.status(500).json({ 
        error: 'Credenziali SUSA non configurate',
        debug: { hasUsername: !!imp.susa_username, hasPassword: !!imp.susa_password }
      });
    }
    // Step 1: Login a SUSA
    const loginRes = await fetch('https://flex.susa.it/cm/pages/CommunityLoginOut.php/L/IT/login/1', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        username: imp.susa_username,
        password: imp.susa_password,
        Login: 'Accedi',
      }),
      redirect: 'manual',
    });

    const cookies = loginRes.headers.get('set-cookie') || '';
    if (!cookies) {
      return res.status(500).json({ error: 'Login SUSA fallito' });
    }

    // Step 2: Chiama il dettaglio tracking
    const key = Buffer.from(trackingNumber).toString('base64');

    const detailRes = await fetch(
      `https://flex.susa.it/FixedPages/Common/tracking/tracking_bolle.php/L/IT/data_ini/-1/data_fin/-1/rif_mit/-1/rif_mit2/-1/dest/-1/loc/-1/anno_form/-1/fil/MQ==/pro/-1/p_ass/-1/p_fra/-1/anno/MjAyNg==/key/${key}/cod_cli/-1`,
      {
        headers: { 'Cookie': cookies },
      }
    );

    const html = await detailRes.text();

    // Estrai dati dall'HTML
    const events = [];
    
    // Cerca la tabella degli stati
    const tableMatch = html.match(/<table[^>]*class='tabella'[^>]*>([\s\S]*?)<\/table>/i);
    if (tableMatch) {
      const rows = tableMatch[1].match(/<tr[^>]*>[\s\S]*?<\/tr>/gi) || [];
      for (const row of rows) {
        const tds = row.match(/<td[^>]*>([\s\S]*?)<\/td>/gi);
        if (tds && tds.length >= 3) {
          const clean = (i) => tds[i] ? tds[i].replace(/<[^>]*>/g, '').trim() : '';
          if (clean(0) && clean(1)) {
            events.push({
              data: clean(0),
              stato: clean(1),
              luogo: clean(2) || '',
            });
          }
        }
      }
    }

    // Estrai info base
    const destinatario = (html.match(/Destinatario[^<]*<[^>]*>([^<]+)</i) || [])[1] || '';
    const ddt = (html.match(/Rif\.\s*Mitt[^<]*<[^>]*>([^<]+)</i) || [])[1] || '';
    const stato = events.length > 0 ? events[0].stato : '';

    return res.status(200).json({
      success: true,
      tracking: trackingNumber,
      info: { destinatario: destinatario.trim(), ddt: ddt.trim(), stato: stato },
      events: events,
      debug: html.substring(0, 500),
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}