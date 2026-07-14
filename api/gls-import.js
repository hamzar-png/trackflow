export default async function handler(req, res) {
  try {
    const { sede, codiceCliente, password } = req.body || {};

    if (!sede || !codiceCliente || !password) {
      return res.status(400).json({ error: 'Credenziali mancanti' });
    }

    // Step 1: Login
    const loginResponse = await fetch('https://weblabeling.gls-italy.com/Home/Login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ Sede: sede.toUpperCase(), Cliente: codiceCliente, Password: password }),
      redirect: 'manual',
    });

    const allCookies = loginResponse.headers.get('set-cookie') || '';
    if (!allCookies || allCookies.length < 10) {
      return res.status(500).json({ error: 'Login fallito.' });
    }

    const cookies = allCookies.split(',').map(c => c.split(';')[0].trim()).join('; ');

    // Step 2: Visita TrackTrace
    const pageRes = await fetch('https://weblabeling.gls-italy.com/Secure_Page/TrackTrace.aspx', {
      headers: { 'Cookie': cookies },
    });
    const pageHtml = await pageRes.text();

    const getHidden = (name) => {
      const match = pageHtml.match(new RegExp(`id="${name}"\\s+value="([^"]*)"`));
      return match ? match[1] : '';
    };

    const today = new Date();
    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 30);
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

    // Step 4: Estrai spedizioni
    const spedizioni = [];
    const rowRegex = /<tr[^>]*class="[^"]*dxgvDataRow[^"]*"[^>]*>([\s\S]*?)<\/tr>/gi;
    const rows = text.match(rowRegex);

    if (rows) {
      for (const row of rows) {
        const tds = row.match(/<td[^>]*>([\s\S]*?)<\/td>/gi);
        if (tds && tds.length >= 13) {
          const clean = (i) => tds[i] ? tds[i].replace(/<[^>]*>/g, '').replace(/&[^;]+;/g, '').trim() : '';

          spedizioni.push({
            dataPartenza: clean(2),
            spedizione: clean(3),
            ddt: clean(4),
            contratto: clean(5),
            destinatario: clean(6),
            esito: clean(7),
            dataOra: clean(8),
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
      return res.status(200).json({
        success: true,
        spedizioni: [],
        totale: 0,
        htmlSample: text.indexOf('<tr') >= 0 ? text.substring(text.indexOf('<tr'), text.indexOf('<tr') + 500) : text.substring(0, 500),
      });
    }

    return res.status(200).json({ success: true, spedizioni, totale: spedizioni.length });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}