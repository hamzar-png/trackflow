export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');

  try {
    const { username, password, user_id } = req.body || {};

    if (!username || !password || !user_id) {
      return res.status(400).json({ error: 'Credenziali mancanti' });
    }

    // Step 1: Login a SUSA
    const loginRes = await fetch('https://flex.susa.it/cm/pages/CommunityLoginOut.php/L/IT/login/1', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        username: username,
        password: password,
        Login: 'Accedi',
      }),
      redirect: 'manual',
    });

    const cookies = loginRes.headers.get('set-cookie') || '';
    if (!cookies) {
      return res.status(401).json({ error: 'Login SUSA fallito' });
    }

    // Step 2: Recupera la pagina tracking
    const today = new Date();
    const lastMonth = new Date(today);
    lastMonth.setMonth(lastMonth.getMonth() - 1);

    const dd = (d) => String(d.getDate()).padStart(2, '0');
    const mm = (d) => String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = (d) => d.getFullYear();

    const dataIni = `${dd(lastMonth)}/${mm(lastMonth)}/${yyyy(lastMonth)}`;
    const dataFin = `${dd(today)}/${mm(today)}/${yyyy(today)}`;

    const trackingRes = await fetch(
      `https://flex.susa.it/FixedPages/Common/trackingprese/tracking_view.php/L/IT/data_ini/${btoa(dataIni)}/data_fin/${btoa(dataFin)}/codcli/-1/ragione_sociale/-/localita/-/cap/-/provincia/-/numero_ordine/-/esito/-1`,
      {
        headers: { 'Cookie': cookies },
      }
    );

    const html = await trackingRes.text();

    // Step 3: Estrai le spedizioni dall'HTML
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(
      'https://wogthnhzdzgblqghwvja.supabase.co',
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndvZ3Robmh6ZHpnYmxxZ2h3dmphIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4Mzc3NjgyNSwiZXhwIjoyMDk5MzUyODI1fQ.P05KHCAjHwQ9OkT-GTuLp8_85FtM_1A0LANX7dwdUa4'
    );

    let importate = 0;
    const rows = html.match(/<tr class='riga_tabella'>[\s\S]*?<\/tr>/gi) || [];

    for (const row of rows) {
      const tds = row.match(/<td[^>]*>([\s\S]*?)<\/td>/gi) || [];
      if (tds.length < 10) continue;

      const clean = (i) => tds[i] ? tds[i].replace(/<[^>]*>/g, '').trim() : '';

      const stato = clean(0);
      const tracking = clean(1).replace(/<[^>]*>/g, '').trim();
      const data = clean(2);
      const cliente = clean(3);
      const ddt = clean(4);
      const indirizzo = clean(5);
      const localita = clean(6);
      const provincia = clean(7);
      const cap = clean(8);

      if (!tracking) continue;

      // Controlla se esiste già
      const { data: esiste } = await supabase
        .from('spedizioni')
        .select('tracking_id')
        .eq('tracking', tracking)
        .eq('user_id', user_id)
        .single();

      if (esiste) continue;

      await supabase.from('spedizioni').insert([{
        tracking_id: 'TRK-' + String(Math.floor(Math.random() * 1000)).padStart(3, '0'),
        cliente: cliente || 'Da assegnare',
        corriere: 'SUSA',
        tracking: tracking,
        stato: stato || 'In transito',
        data: data || today.toLocaleDateString('it-IT'),
        tipo: 'tracking',
        ddt: ddt || '',
        partenza: '',
        destinazione: localita || '',
        note: indirizzo ? `${indirizzo}, ${cap || ''}` : '',
        user_id: user_id,
      }]);
      importate++;
    }

    return res.status(200).json({ success: true, importate, totale: rows.length });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}