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

    const text = await response.text();

    // Prova a fare parsing JSON
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      return res.status(200).json({
        success: false,
        message: 'Risposta non JSON',
        raw: text.substring(0, 500),
      });
    }

    return res.status(200).json({
      success: true,
      tracking: trackingNumber,
      rawResponse: JSON.stringify(data).substring(0, 1500),
      events: [],
    });
  } catch (error) {
    return res.status(500).json({ error: error.message, stack: error.stack?.substring(0, 300) });
  }
}