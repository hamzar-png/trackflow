export default async function handler(req, res) {
  try {
    const { sede, codiceCliente, password } = req.body || {};
    if (!sede || !codiceCliente || !password) {
      return res.status(400).json({ error: 'Credenziali mancanti' });
    }

    // Step 1: Login
    const loginRes = await fetch('https://weblabeling.gls-italy.com/Home/Login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ Sede: sede.toUpperCase(), Cliente: codiceCliente, Password: password }),
      redirect: 'manual',
    });

    // Prendi TUTTI i cookie
    const rawCookies = loginRes.headers.getSetCookie?.() || [];
    const cookies = rawCookies.map(c => c.split(';')[0]).join('; ');

    // Verifica login
    const location = loginRes.headers.get('location') || '';
    if (!cookies.includes('.ASPXFORMSAUTH')) {
      return res.status(500).json({ error: 'Login fallito', status: loginRes.status, location });
    }

    // Step 2: GET TrackTrace per VIEWSTATE
    const getRes = await fetch('https://weblabeling.gls-italy.com/Secure_Page/TrackTrace.aspx', {
      headers: { 'Cookie': cookies },
    });
    // Aggiorna cookie se la pagina ne ha impostati di nuovi
    const newCookies = getRes.headers.getSetCookie?.() || [];
    if (newCookies.length > 0) {
      const updatedCookies = [...rawCookies, ...newCookies].map(c => c.split(';')[0]).join('; ');
    }
    const finalCookies = newCookies.length > 0 
      ? [...rawCookies, ...newCookies].map(c => c.split(';')[0]).join('; ')
      : cookies;

    const html = await getRes.text();

    // Estrai VIEWSTATE (cerca name="xxx" non id="xxx")
    const extract = (name) => {
      const m = html.match(new RegExp(`name="${name}"[^>]+value="([^"]*)"`, 'i'));
      return m ? m[1] : '';
    };

    const today = new Date();
    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 14);
    const dd = (d) => String(d).padStart(2, '0');
    const dataDa = `${dd(weekAgo.getDate())}/${dd(weekAgo.getMonth() + 1)}/${weekAgo.getFullYear()}`;
    const dataA = `${dd(today.getDate())}/${dd(today.getMonth() + 1)}/${today.getFullYear()}`;

    // Step 3: POST ricerca (senza doppio encoding!)
    const bodyParams = new URLSearchParams();
    bodyParams.append('ScriptManager1', 'UpdatePanel1|btnSearch');
    bodyParams.append('txtDataDa', dataDa);
    bodyParams.append('txtDataA', dataA);
    bodyParams.append('TIPO', 'rbPartenze');
    bodyParams.append('btnSearch', 'Cerca');
    bodyParams.append('HFCodiceContratto', codiceCliente);
    bodyParams.append('__VIEWSTATE', extract('__VIEWSTATE'));
    bodyParams.append('__VIEWSTATEGENERATOR', extract('__VIEWSTATEGENERATOR'));
    bodyParams.append('__EVENTVALIDATION', extract('__EVENTVALIDATION'));
    bodyParams.append('__ASYNCPOST', 'true');

    const searchRes = await fetch('https://weblabeling.gls-italy.com/Secure_Page/TrackTrace.aspx', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
        'Cookie': finalCookies,
        'X-Requested-With': 'XMLHttpRequest',
        'X-MicrosoftAjax': 'Delta=true',
      },
      body: bodyParams.toString(),
    });

    const text = await searchRes.text();

    // Debug: log dei primi 1000 caratteri
    console.log('Response start:', text.substring(0, 500));
    console.log('VIEWSTATE length:', extract('__VIEWSTATE').length);
    console.log('Cookies auth:', finalCookies.includes('.ASPXFORMSAUTH'));

    // Estrai spedizioni dal delta AJAX o dall'HTML
    const spedizioni = [];
    const rowRegex = /<tr[^>]*class="[^"]*dxgvDataRow[^"]*"[^>]*>([\s\S]*?)<\/tr>/gi;
    const rows = text.match(rowRegex);

    if (rows) {
      for (const row of rows) {
        const tds = row.match(/<td[^>]*>([\s\S]*?)<\/td>/gi);
        if (tds && tds.length >= 13) {
          const clean = (i) => tds[i] ? tds[i].replace(/<[^>]*>/g, '').replace(/&[^;]+;/g, '').trim() : '';
          spedizioni.push({
            dataPartenza: clean(1),
            spedizione: clean(2),
            ddt: clean(3),
            destinatario: clean(5),
            esito: clean(6),
            localita: clean(8),
            indirizzo: clean(9),
          });
        }
      }
    }

    return res.status(200).json({
      success: true,
      spedizioni,
      totale: spedizioni.length,
      debug: text.substring(0, 300),
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}