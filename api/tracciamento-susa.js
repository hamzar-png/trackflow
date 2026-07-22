export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const { trackingNumber } = req.query || {};
    if (!trackingNumber) {
      return res.status(400).json({ error: 'Tracking mancante' });
    }

    // Chiama l'API dettaglio SUSA
    const response = await fetch(
      `https://flex.susa.it/FixedPages/Common/tracking/tracking_dettaglio_articoli.php/L/IT/data_ini/-1/data_fin/-1/rif_mit/-1/rif_mit2/-1/dest/-1/loc/-1/anno_form/-1/fil_form/-1/pro/-1/p_ass/-1/p_fra/-1/cod_cli/-1/codclicol/-1/anno/MjAyNg==/fil/MQ==/key/${btoa(trackingNumber)}/psw/-`,
      {
        headers: { 'Accept': 'text/html', 'User-Agent': 'Mozilla/5.0' },
      }
    );

    const html = await response.text();

    // Estrai dati dall'HTML
    const events = [];

    // Cerca la tabella degli eventi
    const rows = html.match(/<tr[^>]*>[\s\S]*?<\/tr>/gi) || [];
    for (const row of rows) {
      const tds = row.match(/<td[^>]*>([\s\S]*?)<\/td>/gi);
      if (tds && tds.length >= 3) {
        const clean = (i) => tds[i] ? tds[i].replace(/<[^>]*>/g, '').trim() : '';
        const data = clean(0);
        const stato = clean(1);
        const luogo = clean(2);
        if (data && stato) {
          events.push({ data, stato, luogo });
        }
      }
    }

    // Estrai info spedizione
    const destinatario = (html.match(/Destinatario[^<]*<[^>]*>([^<]+)</i) || [])[1] || '';
    const ddt = (html.match(/Rif\. Mitt\.\s*<\/td>\s*<td[^>]*>([^<]+)</i) || [])[1] || '';

    return res.status(200).json({
      success: true,
      tracking: trackingNumber,
      info: { destinatario: destinatario.trim(), ddt: ddt.trim() },
      events: events,
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}