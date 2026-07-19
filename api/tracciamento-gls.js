export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const { trackingNumber } = req.query || {};
    if (!trackingNumber) {
      return res.status(400).json({ error: 'Tracking number mancante' });
    }

    const fullTracking = trackingNumber.startsWith('AK') ? trackingNumber : 'AK' + trackingNumber;
    const millis = Date.now();

    const response = await fetch(
      `https://gls-group.com/app/service/open/rest/IT/it/rstt030?match=${fullTracking}&type=NAT&caller=witt002&millis=${millis}`,
      {
        headers: {
          'Accept': 'application/json',
          'Cookie': 'gls-cookie-policy=accepted',
          'User-Agent': 'Mozilla/5.0',
        },
      }
    );

    const data = await response.json();
    const tuStatus = data?.tuStatus?.[0] || {};

    // Estrai la history degli eventi
    const events = [];
    const history = tuStatus.history || [];
    
    for (const h of history) {
      events.push({
        data: h.date + ' ' + (h.time || '00:00'),
        ora: h.time || '',
        stato: h.evtDscr || '',
        luogo: h.address?.city || '',
      });
    }

    // Stato attuale
    const progressBar = tuStatus.progressBar || {};
    const currentStatus = progressBar.statusText || '';
    const statusInfo = progressBar.statusInfo || '';

    // Dettagli spedizione
    const references = tuStatus.references || [];
    const addresses = tuStatus.addresses || [];
    const infos = tuStatus.infos || [];

    return res.status(200).json({
      success: true,
      tracking: trackingNumber,
      statoAttuale: currentStatus || statusInfo,
      progressBar: progressBar.statusBar || [],
      references: references.map(r => ({ tipo: r.name, valore: r.value })),
      addresses: addresses.map(a => ({ tipo: a.name, valore: a.value?.name1 || '' })),
      infos: infos.map(i => ({ tipo: i.name, valore: i.value })),
      events: events,
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}