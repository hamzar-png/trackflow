export default async function handler(req, res) {
  try {
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(
      'https://wogthnhzdzgblqghwvja.supabase.co',
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndvZ3Robmh6ZHpnYmxxZ2h3dmphIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4Mzc3NjgyNSwiZXhwIjoyMDk5MzUyODI1fQ.P05KHCAjHwQ9OkT-GTuLp8_85FtM_1A0LANX7dwdUa4'
    );

    // Prendi le credenziali GLS dalle impostazioni
    const { data: imp } = await supabase
      .from('impostazioni')
      .select('user_id, gls_sede, gls_username, gls_password')
      .not('gls_username', 'is', null)
      .single();

    if (!imp) {
      return res.status(200).json({ message: 'Credenziali GLS non configurate' });
    }

    // Prendi tutte le spedizioni GLS non consegnate di questo utente
    const { data: spedizioni } = await supabase
      .from('spedizioni')
      .select('*')
      .eq('user_id', imp.user_id)
      .eq('corriere', 'GLS')
      .not('stato', 'eq', 'Consegnata')
      .not('stato', 'eq', 'Consegnato');

    if (!spedizioni || spedizioni.length === 0) {
      return res.status(200).json({ message: 'Nessuna spedizione da aggiornare' });
    }

    // Login a WebLabeling
    const loginRes = await fetch('https://weblabeling.gls-italy.com/Home/Login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        Sede: imp.gls_sede.toUpperCase(),
        UserName: imp.gls_username,
        Password: imp.gls_password,
        LoginButton: 'Log In',
        __EVENTTARGET: 'LoginButton',
        __EVENTARGUMENT: '',
      }),
      redirect: 'manual',
    });

    const setCookie = loginRes.headers.get('set-cookie') || '';
    const sessionId = (setCookie.match(/ASP\.NET_SessionId=([^;]+)/) || [])[1] || '';
    const formsAuth = (setCookie.match(/\.ASPXFORMSAUTH=([^;]+)/) || [])[1] || '';

    if (!sessionId || !formsAuth) {
      return res.status(200).json({ message: 'Login WebLabeling fallito' });
    }

    const cookies = `ASP.NET_SessionId=${sessionId}; .ASPXFORMSAUTH=${formsAuth}`;

    // Per ogni spedizione, cerca lo stato su TrackTrace
    let aggiornate = 0;

    for (const sped of spedizioni) {
      const trackingNumber = sped.tracking?.replace('AK', '') || '';
      if (!trackingNumber) continue;

      try {
        // GET TrackTrace per VIEWSTATE
        const pageRes = await fetch('https://weblabeling.gls-italy.com/Secure_Page/TrackTrace.aspx', {
          headers: { 'Cookie': cookies },
        });
        const pageHtml = await pageRes.text();

        const extract = (name) => {
          const m = pageHtml.match(new RegExp(`name="${name}"[^>]+value="([^"]*)"`, 'i'));
          return m ? m[1] : '';
        };

        // POST ricerca per questo tracking
        const bodyParams = new URLSearchParams();
        bodyParams.append('ScriptManager1', 'UpdatePanel1|btnSearch');
        bodyParams.append('txtDataDa', '01/01/2026');
        bodyParams.append('txtDataA', '31/12/2026');
        bodyParams.append('TxtSped', trackingNumber);
        bodyParams.append('TIPO', 'rbPartenze');
        bodyParams.append('btnSearch', 'Cerca');
        bodyParams.append('HFCodiceContratto', imp.gls_username);
        bodyParams.append('__VIEWSTATE', extract('__VIEWSTATE'));
        bodyParams.append('__VIEWSTATEGENERATOR', extract('__VIEWSTATEGENERATOR'));
        bodyParams.append('__EVENTVALIDATION', extract('__EVENTVALIDATION'));
        bodyParams.append('__ASYNCPOST', 'true');

        const searchRes = await fetch('https://weblabeling.gls-italy.com/Secure_Page/TrackTrace.aspx', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
            'Cookie': cookies,
            'X-Requested-With': 'XMLHttpRequest',
            'X-MicrosoftAjax': 'Delta=true',
          },
          body: bodyParams.toString(),
        });

        const text = await searchRes.text();

        // Estrai lo stato
        let nuovoStato = sped.stato;
        if (text.includes('Consegnata')) {
          nuovoStato = 'Consegnata';
        } else if (text.includes('In transito')) {
          nuovoStato = 'In transito';
        } else if (text.includes('In attesa')) {
          nuovoStato = 'In attesa';
        } else if (text.includes('In consegna')) {
          nuovoStato = 'In consegna';
        }

        if (nuovoStato !== sped.stato) {
          await supabase
            .from('spedizioni')
            .update({ stato: nuovoStato })
            .eq('tracking_id', sped.tracking_id);
          aggiornate++;
        }
      } catch (err) {
        console.error('Errore tracking:', trackingNumber, err.message);
      }
    }

    return res.status(200).json({
      success: true,
      controllate: spedizioni.length,
      aggiornate: aggiornate,
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}