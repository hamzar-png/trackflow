export default async function handler(req, res) {
  try {
    const { sede, codiceCliente, password } = req.body || {};

    if (!sede || !codiceCliente || !password) {
      return res.status(400).json({ error: 'Credenziali mancanti' });
    }

    // Login e ottieni cookie
    const loginRes = await fetch('https://weblabeling.gls-italy.com/Home/Login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ Sede: sede.toUpperCase(), Cliente: codiceCliente, Password: password }),
      redirect: 'manual',
    });

    const setCookie = loginRes.headers.get('set-cookie') || '';
    const sessionId = setCookie.match(/ASP\.NET_SessionId=([^;]+)/)?.[1] || '';
    const formsAuth = setCookie.match(/\.ASPXFORMSAUTH=([^;]+)/)?.[1] || '';

    if (!sessionId || !formsAuth) {
      return res.status(500).json({ error: 'Login fallito. Cookie non trovati.', sessionId: !!sessionId, formsAuth: !!formsAuth });
    }

    const cookies = `ASP.NET_SessionId=${sessionId}; .ASPXFORMSAUTH=${formsAuth}`;

    // Richiesta diretta con parametri esatti
    const today = new Date();
    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 14);
    const dd = (d) => String(d).padStart(2, '0');
    const dataDa = `${dd(weekAgo.getDate())}%2F${dd(weekAgo.getMonth() + 1)}%2F${weekAgo.getFullYear()}`;
    const dataA = `${dd(today.getDate())}%2F${dd(today.getMonth() + 1)}%2F${today.getFullYear()}`;

    const searchRes = await fetch('https://weblabeling.gls-italy.com/Secure_Page/TrackTrace.aspx', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
        'Cookie': cookies,
        'X-Requested-With': 'XMLHttpRequest',
        'X-MicrosoftAjax': 'Delta=true',
      },
      body: `ScriptManager1=UpdatePanel1%7CbtnSearch&txtDataDa=${dataDa}&txtDataA=${dataA}&TIPO=rbPartenze&btnSearch=Cerca&HFCodiceContratto=${codiceCliente}&__ASYNCPOST=true`,
    });

    const text = await searchRes.text();

    // Estrai spedizioni
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