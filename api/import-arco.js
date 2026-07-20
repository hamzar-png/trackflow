export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');

  try {
    const { username, password, user_id } = req.body || {};

    if (!username || !password) {
      return res.status(400).json({ error: 'Credenziali mancanti' });
    }

    const loginRes = await fetch('https://webservices.arcospedizioni.it/api/Login/Login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password, appId: 1 }),
    });

    if (!loginRes.ok) {
      return res.status(401).json({ error: 'Login Arco fallito' });
    }

    const tokenData = await loginRes.json();
    const token = tokenData?.token || tokenData?.jwtToken || '';

    if (!token) {
      return res.status(401).json({ error: 'Token non ricevuto' });
    }

    const today = new Date().toISOString().split('T')[0];
    const lastWeek = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const trackingRes = await fetch('https://webservices.arcospedizioni.it/api/ArTrackings/GetTracking', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': token },
      body: JSON.stringify({ dataPartenza: lastWeek, dataFinale: today, statoSpedizione: 'TUTTI', porto: 'TUTTI', codiceCliente: 'TUTTI', nazioneDestinatario: 'TUTTI' }),
    });

    if (!trackingRes.ok) {
      const errText = await trackingRes.text();
      return res.status(500).json({ error: 'Errore recupero: ' + errText.substring(0, 200) });
    }

    const spedizioni = await trackingRes.json();
    return res.status(200).json({ success: true, spedizioni, totale: spedizioni.length });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}