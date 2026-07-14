export default async function handler(req, res) {
  try {
    const { sede, codiceCliente, password } = req.body || {};

    if (!sede || !codiceCliente || !password) {
      return res.status(400).json({ error: 'Credenziali mancanti' });
    }

    // Step 1: Login e segui i redirect
    let currentUrl = 'https://weblabeling.gls-italy.com/Home/Login';
    let cookies = '';
    let html = '';

    // Primo POST login
    const loginRes = await fetch(currentUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ Sede: sede.toUpperCase(), Cliente: codiceCliente, Password: password }),
      redirect: 'manual',
    });

    // Raccogli cookie
    const setCookie = loginRes.headers.get('set-cookie') || '';
    cookies = setCookie.split(',').map(c => c.split(';')[0].trim()).join('; ');

    if (!cookies) {
      return res.status(500).json({ error: 'Login fallito - nessun cookie' });
    }

    // Segui il redirect a Default.aspx
    const location = loginRes.headers.get('location') || '';
    if (location) {
      const redirectRes = await fetch('https://weblabeling.gls-italy.com' + (location.startsWith('/') ? location : '/' + location), {
        headers: { 'Cookie': cookies },
        redirect: 'manual',
      });
      
      const moreCookies = redirectRes.headers.get('set-cookie') || '';
      if (moreCookies) {
        cookies += '; ' + moreCookies.split(',').map(c => c.split(';')[0].trim()).join('; ');
      }

      const loc2 = redirectRes.headers.get('location') || '';
      if (loc2) {
        await fetch('https://weblabeling.gls-italy.com' + (loc2.startsWith('/') ? loc2 : '/' + loc2), {
          headers: { 'Cookie': cookies },
        });
      }
    }

    // Step 2: Ora visita TrackTrace
    const pageRes = await fetch('https://weblabeling.gls-italy.com/Secure_Page/TrackTrace.aspx', {
      headers: { 'Cookie': cookies },
    });
    html = await pageRes.text();

    // Estrai VIEWSTATE
    const getHidden = (name) => {
      const match = html.match(new RegExp(`id="${name}"\\s+value="([^"]*)"`));
      return match ? match[1] : '';
    };

    const today = new Date();
    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 14);
    const dd = (d) => String(d).padStart(2, '0');
    const dataDa = `${dd(weekAgo.getDate())}/${dd(weekAgo.getMonth() + 1)}/${weekAgo.getFullYear()}`;
    const dataA = `${dd(today.getDate())}/${dd(today.getMonth() + 1)}/${today.getFullYear()}`;

    // Step 3: Cerca
    const searchRes = await fetch('https://weblabeling.gls-italy.com/Secure_Page/TrackTrace.aspx', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
        'Cookie': cookies,
        'X-Requested-With': 'XMLHttpRequest',
        'X-MicrosoftAjax': 'Delta=true',
      },
      body: new URLSearchParams({
        ScriptManager1: 'UpdatePanel1|btnSearch',
        txtDataDa: dataDa,
        txtDataA: dataA,
        TIPO: 'rbPartenze',
        btnSearch: 'Cerca',
        HFCodiceContratto: codiceCliente,
        __VIEWSTATE: getHidden('__VIEWSTATE'),
        __VIEWSTATEGENERATOR: getHidden('__VIEWSTATEGENERATOR'),
        __EVENTVALIDATION: getHidden('__EVENTVALIDATION'),
        __ASYNCPOST: 'true',
      }),
    });

    const text = await searchRes.text();

    // Step 4: Estrai
    const spedizioni = [];
    const rows = text.match(/<tr[^>]*class="[^"]*dxgvDataRow[^"]*"[^>]*>([\s\S]*?)<\/tr>/gi);

    if (rows) {
      for (const row of rows) {
        const tds = row.match(/<td[^>]*>([\s\S]*?)<\/td>/gi);
        if (tds && tds.length >= 13) {
          const clean = (i) => tds[i] ? tds[i].replace(/<[^>]*>/g, '').replace(/&[^;]+;/g, '').trim() : '';
          spedizioni.push({
            dataPartenza: clean(2),
            spedizione: clean(3),
            ddt: clean(4),
            destinatario: clean(6),
            esito: clean(7),
            localita: clean(9),
            indirizzo: clean(10),
            provincia: clean(11),
            colli: clean(12),
            peso: clean(13),
          });
        }
      }
    }

    if (spedizioni.length === 0) {
      return res.status(200).json({ success: true, spedizioni: [], sample: text.substring(0, 400) });
    }

    return res.status(200).json({ success: true, spedizioni, totale: spedizioni.length });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}