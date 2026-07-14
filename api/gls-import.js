export default async function handler(req, res) {
  try {
    // Ricevi le credenziali dal frontend
    const { username, password } = req.body || {};

    if (!username || !password) {
      return res.status(400).json({ error: 'Credenziali mancanti' });
    }

    // Auth GLS
    const authResponse = await fetch('https://api.gls-group.com/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: username,
        client_secret: password,
      }),
    });

    if (!authResponse.ok) {
      const errText = await authResponse.text();
      return res.status(500).json({
        error: 'Errore autenticazione GLS',
        status: authResponse.status,
        details: errText.substring(0, 300),
      });
    }

    const authData = await authResponse.json();
    const token = authData.access_token;

    // Recupera tutte le spedizioni
    const parcelsResponse = await fetch(
      'https://api-sandbox.gls-group.net/shipit-farm/v1/backend/rs/tracking/parcels',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          tuListRequest: {
            dateFrom: '2026-01-01',
            dateTo: '2026-12-31',
          },
        }),
      }
    );

    if (!parcelsResponse.ok) {
      const errText = await parcelsResponse.text();
      return res.status(500).json({
        error: 'Errore recupero spedizioni',
        status: parcelsResponse.status,
        details: errText.substring(0, 300),
      });
    }

    const data = await parcelsResponse.json();
    return res.status(200).json(data);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}