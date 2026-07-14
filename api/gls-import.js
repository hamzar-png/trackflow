export default async function handler(req, res) {
  try {
    const { sede, codiceCliente, password } = req.body || {};

    if (!sede || !codiceCliente || !password) {
      return res.status(400).json({ error: 'Credenziali mancanti' });
    }

    // Step 1: Login
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

    const cookies = loginResponse.headers.get('set-cookie') || '';

    if (!cookies) {
      return res.status(500).json({ error: 'Login fallito.' });
    }

    // Step 2: Prova diversi URL
    const urls = [
      '/Spedizioni',
      '/Spedizioni/Lista',
      '/Spedizioni/Elenco',
      '/ListaSpedizioni',
      '/Home/Spedizioni',
      '/Home',
      '/',
    ];

    let html = '';
    let foundUrl = '';

    for (const url of urls) {
      const response = await fetch('https://weblabeling.gls-italy.com' + url, {
        method: 'GET',
        headers: {
          'Cookie': cookies,
          'Accept': 'text/html',
        },
        redirect: 'manual',
      });

      const text = await response.text();

      // Controlla se non è un 404
      if (response.status === 200 && !text.includes('404') && text.length > 500) {
        html = text;
        foundUrl = url;
        break;
      }
    }

    if (!html) {
      return res.status(500).json({ error: 'Nessuna pagina spedizioni trovata. Prova URL diversi.' });
    }

    return res.status(200).json({
      success: true,
      message: 'Pagina trovata: ' + foundUrl,
      htmlPreview: html.substring(0, 1500),
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}