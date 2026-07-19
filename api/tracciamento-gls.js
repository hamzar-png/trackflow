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

    // Estrai gli eventi
    const events = [];
    const tuStatus = data?.tuStatus || [];
    
    for (const status of tuStatus) {
      events.push({
        data: status.evtDate || '',
        stato: status.description || status.status || '',
        luogo: status.city || status.address || '',
      });
    }

    return res.status(200).json({
      success: true,
      tracking: trackingNumber,
      events: events.length > 0 ? events : [],
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}