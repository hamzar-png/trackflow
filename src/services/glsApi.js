const GLS_CONFIG = {
  apiKey: 'nFVvJqAffA6KTEmffqON9WlfMTuoBie2',
  secret: '7zZfF8KBSKMuAHJI',
  authUrl: 'https://api.gls-group.com/oauth/token',
  trackingUrl: 'https://api-sandbox.gls-group.net/track-and-trace-v1/tracking/simple/trackids',
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

  const data = await response.json();
  return data;
}