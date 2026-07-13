const GLS_CONFIG = {
  apiKey: 'nFVvJqAffA6KTEmffqON9WlfMTuoBie2',
  secret: '7zZfF8KBSKMuAHJI',
  authUrl: 'https://api.gls-group.com/oauth/token',
  trackingUrl: 'https://api-sandbox.gls-group.net/track-and-trace-v1/tracking/simple/trackids',
  parcelsUrl: 'https://api-sandbox.gls-group.net/shipit-farm/v1/backend/rs/tracking/parcels',
};

async function getAccessToken() {
  const response = await fetch(GLS_CONFIG.authUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: GLS_CONFIG.apiKey,
      client_secret: GLS_CONFIG.secret,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Auth error:', errorText);
    throw new Error('Errore autenticazione GLS: ' + response.status);
  }

  const data = await response.json();
  return data.access_token;
}

export async function trackGLS(trackingNumber) {
  const token = await getAccessToken();

  const response = await fetch(`${GLS_CONFIG.trackingUrl}/${trackingNumber}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error('Tracking non trovato');
  }

  return await response.json();
}

export async function getAllParcels(filters = {}) {
  const token = await getAccessToken();

  const response = await fetch(GLS_CONFIG.parcelsUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify({
      tuListRequest: {
        dateFrom: filters.dateFrom || '2026-01-01',
        dateTo: filters.dateTo || new Date().toISOString().split('T')[0],
      },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Parcels error:', errorText);
    throw new Error('Nessuna spedizione trovata o accesso negato.');
  }

  return await response.json();
}