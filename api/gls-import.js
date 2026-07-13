export default async function handler(req, res) {
  // Consenti solo POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Ottieni token
    const authResponse = await fetch('https://api.gls-group.com/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: 'nFVvJqAffA6KTEmffqON9WlfMTuoBie2',
        client_secret: '7zZfF8KBSKMuAHJI',
      }),
    });

  if (!authResponse.ok) {
  const errText = await authResponse.text();
  console.error('Auth failed:', authResponse.status, errText);
  return res.status(500).json({ error: 'Auth failed: ' + authResponse.status, details: errText });
}

    const authData = await authResponse.json();
    const token = authData.access_token;

    // Chiama parcels
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
  console.error('Parcels failed:', parcelsResponse.status, errText);
  return res.status(500).json({ error: 'Parcels failed: ' + parcelsResponse.status, details: errText });
}

    const data = await parcelsResponse.json();
    return res.status(200).json(data);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Step 1: Auth
    console.log('Chiamando auth GLS...');
    const authResponse = await fetch('https://api.gls-group.com/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: 'nFVvJqAffA6KTEmffqON9WlfMTuoBie2',
        client_secret: '7zZfF8KBSKMuAHJI',
      }),
    });

    console.log('Auth status:', authResponse.status);
    
    if (!authResponse.ok) {
      const errText = await authResponse.text();
      console.error('Auth error:', errText);
      return res.status(500).json({ 
        error: 'Errore autenticazione GLS', 
        status: authResponse.status,
        details: errText.substring(0, 200)
      });
    }

    const authData = await authResponse.json();
    console.log('Token ricevuto:', authData.access_token ? 'SI' : 'NO');

    // Step 2: Parcels
    console.log('Chiamando parcels...');
    const parcelsResponse = await fetch(
      'https://api-sandbox.gls-group.net/shipit-farm/v1/backend/rs/tracking/parcels',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authData.access_token}`,
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

    console.log('Parcels status:', parcelsResponse.status);

    if (!parcelsResponse.ok) {
      const errText = await parcelsResponse.text();
      console.error('Parcels error:', errText);
      return res.status(500).json({
        error: 'Errore recupero spedizioni',
        status: parcelsResponse.status,
        details: errText.substring(0, 200)
      });
    }

    const data = await parcelsResponse.json();
    console.log('Dati ricevuti:', JSON.stringify(data).substring(0, 200));
    
    return res.status(200).json(data);
  } catch (error) {
    console.error('Errore generale:', error.message);
    return res.status(500).json({ error: error.message });
  }
}