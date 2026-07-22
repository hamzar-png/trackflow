export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  
  try {
    const { trackingNumber } = req.query || {};
    if (!trackingNumber) {
      return res.status(400).json({ error: 'Tracking mancante' });
    }

    // SUSA richiede login, quindi usiamo i dati già importati
    return res.status(200).json({
      success: true,
      tracking: trackingNumber,
      message: 'Dati SUSA disponibili dopo import',
      events: [],
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}