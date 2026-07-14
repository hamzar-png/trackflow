export default async function handler(req, res) {
  try {
    const { sede, codiceCliente, password } = req.body || {};

    if (!sede || !codiceCliente || !password) {
      return res.status(400).json({ error: 'Credenziali mancanti' });
    }

    // Step 1: Login e segui il redirect
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
      redirect: 'follow', // Segui il redirect!
    });

    const html = await loginResponse.text();
    const finalUrl = loginResponse.url;

    if (html.includes('Login') || html.length < 500) {
      return res.status(500).json({ 
        error: 'Login fallito o pagina vuota.',
        url: finalUrl,
        length: html.length 
      });
    }

    // Cerca link nel menu
    const links = html.match(/href="([^"]*)"[^>]*>([^<]*)</gi) || [];
    const menuLinks = links
      .map(l => l.match(/href="([^"]*)"/)?.[1])
      .filter(l => l && (l.toLowerCase().includes('sped') || l.toLowerCase().includes('list')));

    return res.status(200).json({
      success: true,
      message: 'Login OK. URL finale: ' + finalUrl,
      length: html.length,
      menuLinks: menuLinks || [],
      htmlPreview: html.substring(0, 2000),
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}