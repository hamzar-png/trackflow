const GLS_CONFIG = {
  apiKey: 'nFVvJqAffA6KTEmffqON9WlfMTuoBie2',
  secret: '7zZfF8KBSKMuAHJI',
  authUrl: 'https://api-sandbox.gls-group.net/oauth2/v2/token',
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
    throw new Error('Errore autenticazione GLS');
  }

  const data = await response.json();
  return data.access_token;
}

// Traccia un singolo tracking
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

// Ottieni TUTTE le spedizioni dell'account
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
        ...filters,
      },
    }),
  });

  if (!response.ok) {
    throw new Error('Errore nel recupero spedizioni');
  }

  return await response.json();
}