export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const { trackingNumber } = req.query || {};
    if (!trackingNumber) {
      return res.status(400).json({ error: 'Tracking mancante' });
    }

    const response = await fetch(
      `https://webservices.arcospedizioni.it/api/ArTrackingDetails/${trackingNumber}/TrackingDetail`,
      {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Mozilla/5.0',
        },
      }
    );

    const data = await response.json();

    // Estrai dati spedizione
    const tracking = data?.arTracking?.[0] || {};

    // Estrai eventi
    const events = [];
    const details = data?.arTrackingDetails || [];

    for (const d of details) {
      events.push({
        data: d.dataEvento + ' ' + (d.oraEvento || '00:00'),
        stato: d.descrizioneEvento || '',
        codice: d.codEvento || '',
      });
    }

    return res.status(200).json({
      success: true,
      tracking: trackingNumber,
      info: {
        mittente: tracking.ragioneSocialeMittente || '',
        destinatario: tracking.ragioneSocialeDestinatario || '',
        colli: tracking.numeroColli || '',
        peso: tracking.peso || '',
        ddt: tracking.riferimentoCliente || '',
        stato: tracking.noteStato || tracking.ultimoStato || '',
      },
      events: events,
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}