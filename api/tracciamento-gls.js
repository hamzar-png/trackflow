export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const { trackingNumber } = req.query || {};
    if (!trackingNumber) {
      return res.status(400).json({ error: 'Tracking number mancante' });
    }

    // Usa il tracking pubblico GLS (scraping leggero)
    const response = await fetch(
      `https://gls-group.eu/IT/it/ricerca-spedizione?match=${trackingNumber}`,
      {
        headers: {
          'User-Agent': 'Mozilla/5.0',
          'Accept': 'text/html',
        },
      }
    );

    const html = await response.text();

    // Estrai eventi semplici dalla pagina pubblica
    const events = [];
    
    // Cerca lo stato attuale
    if (html.includes('Consegnato')) {
      events.push({ data: new Date().toLocaleDateString('it-IT'), stato: 'Consegnato', luogo: '' });
    } else if (html.includes('In transito')) {
      events.push({ data: new Date().toLocaleDateString('it-IT'), stato: 'In transito', luogo: '' });
    } else if (html.includes('In consegna')) {
      events.push({ data: new Date().toLocaleDateString('it-IT'), stato: 'In consegna', luogo: '' });
    }

    return res.status(200).json({
      success: true,
      tracking: trackingNumber,
      events: events,
      note: 'Tracciamento semplificato da pagina pubblica GLS',
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}