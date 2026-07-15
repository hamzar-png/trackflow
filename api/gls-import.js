function mergeCookies(list) {
  const jar = {};
  list.forEach(c => {
    const [name, value] = c.split(';')[0].split('=');
    if (name && value) jar[name.trim()] = value.trim();
  });
  return Object.entries(jar).map(([k, v]) => `${k}=${v}`).join('; ');
}

export default async function handler(req, res) {
  try {
    const { sede, codiceCliente, password } = req.body || {};
    if (!sede || !codiceCliente || !password) {
      return res.status(400).json({ error: 'Credenziali mancanti' });
    }

    // Step 0: Inizializza sessione
    const initRes = await fetch('https://weblabeling.gls-italy.com/Home/Login');
    let cookieJar = [...(initRes.headers.getSetCookie?.() || [])];

    // Step 1: Login con i campi CORRETTI (UserName non Cliente!)
    const loginRes = await fetch('https://weblabeling.gls-italy.com/Home/Login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Cookie': mergeCookies(cookieJar),
      },
      body: new URLSearchParams({
        Sede: sede.toLowerCase(),
        UserName: codiceCliente,
        Password: password,
        LoginButton: 'Log In',
        __EVENTTARGET: 'LoginButton',
        __EVENTARGUMENT: '',
      }),
      redirect: 'manual',
    });

    console.log("LOGIN STATUS:", loginRes.status);
    console.log("LOGIN LOCATION:", loginRes.headers.get("location"));
    console.log("LOGIN COOKIES:", loginRes.headers.getSetCookie?.());

    cookieJar.push(...(loginRes.headers.getSetCookie?.() || []));
    const cookies = mergeCookies(cookieJar);

    // Step 2: Segui redirect dopo login
    const location = loginRes.headers.get('location') || '';
    if (location) {
      const redirectUrl = location.startsWith('http')
        ? location
        : `https://weblabeling.gls-italy.com${location.startsWith('/') ? '' : '/'}${location}`;

      const followRes = await fetch(redirectUrl, {
        headers: { 'Cookie': cookies },
        redirect: 'manual',
      });

      cookieJar.push(...(followRes.headers.getSetCookie?.() || []));

      const loc2 = followRes.headers.get('location') || '';
      if (loc2) {
        const redirectUrl2 = loc2.startsWith('http')
          ? loc2
          : `https://weblabeling.gls-italy.com${loc2.startsWith('/') ? '' : '/'}${loc2}`;

        await fetch(redirectUrl2, {
          headers: { 'Cookie': mergeCookies(cookieJar) },
        });
      }
    }

    const finalCookies = mergeCookies(cookieJar);

    // Step 3: GET TrackTrace per VIEWSTATE
    const getRes = await fetch('https://weblabeling.gls-italy.com/Secure_Page/TrackTrace.aspx', {
      headers: { 'Cookie': finalCookies },
    });

    cookieJar.push(...(getRes.headers.getSetCookie?.() || []));
    const trackCookies = mergeCookies(cookieJar);
    const html = await getRes.text();

    // Estrai VIEWSTATE
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

    // Step 4: POST ricerca
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
        'Cookie': trackCookies,
        'X-Requested-With': 'XMLHttpRequest',
        'X-MicrosoftAjax': 'Delta=true',
      },
      body: bodyParams.toString(),
    });

    const text = await searchRes.text();

    const spedizioni = [];
    const rows = text.match(/<tr[^>]*class="[^"]*dxgvDataRow[^"]*"[^>]*>([\s\S]*?)<\/tr>/gi);

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
      debug: text.substring(0, 400),
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}