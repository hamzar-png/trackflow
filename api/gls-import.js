export default async function handler(req, res) {
  try {
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

    const authText = await authResponse.text();

    return res.status(200).json({
      status: authResponse.status,
      ok: authResponse.ok,
      body: authText.substring(0, 300),
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}