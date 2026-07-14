export default async function handler(req, res) {
  try {
    const { sede, codiceCliente, password } = req.body || {};

    if (!sede || !codiceCliente || !password) {
      return res.status(400).json({ error: 'Credenziali mancanti' });
    }

    // Step 1: Login al portale WebLabeling
    const loginResponse = await fetch('https://weblabeling.gls-italy.com/Home/Login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        Sede: sede,
        Cliente: codiceCliente,
        Password: password,
      }),
      redirect: 'manual',
    });

    // Prendi i cookie di sessione
    const cookies = loginResponse.headers.get('set-cookie') || '';

    if (!cookies) {
      return res.status(500).json({ error: 'Login fallito. Verifica le credenziali.' });
    }

    // Step 2: Recupera la lista spedizioni
    const spedizioniResponse = await fetch('https://weblabeling.gls-italy.com/Spedizioni/Lista', {
      method: 'GET',
      headers: {
        'Cookie': cookies,
        'Accept': 'text/html',
      },
    });

    const html = await spedizioniResponse.text();

    if (html.includes('Login') || html.includes('login')) {
      return res.status(500).json({ error: 'Sessione scaduta. Credenziali non valide.' });
    }

    // Per ora restituiamo un messaggio di successo con l'HTML
    // Dopo facciamo il parsing dei dati
    return res.status(200).json({
      success: true,
      message: 'Login riuscito! Ricevuti ' + html.length + ' caratteri di dati.',
      htmlPreview: html.substring(0, 500),
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}