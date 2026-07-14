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
        Sede: sede.toUpperCase(),
        Cliente: codiceCliente,
        Password: password,
      }),
      redirect: 'manual',
    });

    const setCookie = loginResponse.headers.get('set-cookie') || '';

    if (!setCookie) {
      return res.status(500).json({ error: 'Login fallito.' });
    }

    // Estrai i cookie principali
    const sessionMatch = setCookie.match(/ASP\.NET_SessionId=([^;]+)/);
    const authMatch = setCookie.match(/\.ASPXFORMSAUTH=([^;]+)/);
    
    if (!sessionMatch || !authMatch) {
      return res.status(500).json({ error: 'Cookie sessione non trovati.' });
    }

    const cookies = `ASP.NET_SessionId=${sessionMatch[1]}; .ASPXFORMSAUTH=${authMatch[1]}`;

    // Step 2: Prima visita la pagina TrackTrace per ottenere VIEWSTATE
    const firstPage = await fetch('https://weblabeling.gls-italy.com/Secure_Page/TrackTrace.aspx', {
      method: 'GET',
      headers: {
        'Cookie': cookies,
      },
    });

    const pageHtml = await firstPage.text();

    // Estrai VIEWSTATE e altri parametri
    const viewstateMatch = pageHtml.match(/id="__VIEWSTATE" value="([^"]*)"/);
    const viewstateGeneratorMatch = pageHtml.match(/id="__VIEWSTATEGENERATOR" value="([^"]*)"/);
    const eventValidationMatch = pageHtml.match(/id="__EVENTVALIDATION" value="([^"]*)"/);

    const today = new Date();
    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 30);

    const formatDate = (d) => {
      const dd = String(d.getDate()).padStart(2, '0');
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const yyyy = d.getFullYear();
      return `${dd}%2F${mm}%2F${yyyy}`;
    };

    // Step 3: Chiama TrackTrace con la ricerca
    const searchResponse = await fetch('https://weblabeling.gls-italy.com/Secure_Page/TrackTrace.aspx', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
        'Cookie': cookies,
        'X-MicrosoftAjax': 'Delta=true',
        'X-Requested-With': 'XMLHttpRequest',
      },
      body: new URLSearchParams({
        ScriptManager1: 'UpdatePanel1|btnSearch',
        txtDataDa: formatDate(weekAgo),
        txtDataA: formatDate(today),
        TIPO: 'rbPartenze',
        btnSearch: 'Cerca',
        __VIEWSTATE: viewstateMatch ? viewstateMatch[1] : '',
        __VIEWSTATEGENERATOR: viewstateGeneratorMatch ? viewstateGeneratorMatch[1] : '',
        __EVENTVALIDATION: eventValidationMatch ? eventValidationMatch[1] : '',
        __ASYNCPOST: 'true',
        HFCodiceContratto: codiceCliente,
      }),
    });

    const responseText = await searchResponse.text();

    if (responseText.length < 200) {
      return res.status(500).json({ error: 'Risposta troppo corta. Possibile errore di sessione.' });
    }

    return res.status(200).json({
      success: true,
      message: 'Ricerca completata',
      length: responseText.length,
      htmlPreview: responseText.substring(0, 2000),
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}