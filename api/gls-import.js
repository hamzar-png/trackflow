export default async function handler(req, res) {
  try {
    const { sede, codiceCliente, password } = req.body || {};

    if (!sede || !codiceCliente || !password) {
      return res.status(400).json({ error: 'Credenziali mancanti' });
    }

    // Step 1: Login e prendi TUTTI i cookie
    const loginResponse = await fetch('https://weblabeling.gls-italy.com/Home/Login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        Sede: sede.toUpperCase(),
        Cliente: codiceCliente,
        Password: password,
      }),
      redirect: 'manual',
    });

    const allCookies = loginResponse.headers.get('set-cookie') || '';
    console.log('Login status:', loginResponse.status);
    console.log('Cookies ricevuti:', allCookies.substring(0, 200));

    if (!allCookies || allCookies.length < 10) {
      return res.status(500).json({ 
        error: 'Login fallito. Nessun cookie ricevuto.',
        status: loginResponse.status,
        location: loginResponse.headers.get('location') || 'nessuna'
      });
    }

    // Estrai tutti i cookie in formato nome=valore
    const cookiePairs = allCookies
      .split(',')
      .map(c => c.split(';')[0].trim())
      .join('; ');

    console.log('Cookie estratti:', cookiePairs.substring(0, 200));

    // Step 2: Accedi alla pagina TrackTrace
    const today = new Date();
    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 30);

    const dd = (d) => String(d).padStart(2, '0');
    const dataDa = `${dd(weekAgo.getDate())}/${dd(weekAgo.getMonth() + 1)}/${weekAgo.getFullYear()}`;
    const dataA = `${dd(today.getDate())}/${dd(today.getMonth() + 1)}/${today.getFullYear()}`;

    const searchResponse = await fetch('https://weblabeling.gls-italy.com/Secure_Page/TrackTrace.aspx', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
        'Cookie': cookiePairs,
        'X-Requested-With': 'XMLHttpRequest',
        'X-MicrosoftAjax': 'Delta=true',
      },
      body: new URLSearchParams({
        txtDataDa: dataDa,
        txtDataA: dataA,
        TIPO: 'rbPartenze',
        btnSearch: 'Cerca',
        HFCodiceContratto: codiceCliente,
        __ASYNCPOST: 'true',
      }),
    });

    const text = await searchResponse.text();

    return res.status(200).json({
      success: true,
      length: text.length,
      preview: text.substring(0, 2500),
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}