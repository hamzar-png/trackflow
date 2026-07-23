export default async function handler(req, res) {
  try {
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(
      'https://wogthnhzdzgblqghwvja.supabase.co',
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndvZ3Robmh6ZHpnYmxxZ2h3dmphIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4Mzc3NjgyNSwiZXhwIjoyMDk5MzUyODI1fQ.P05KHCAjHwQ9OkT-GTuLp8_85FtM_1A0LANX7dwdUa4'
    );

    let totaleControllate = 0;
    let totaleAggiornate = 0;

    // ========== GLS ==========
    const { data: imp } = await supabase
      .from('impostazioni')
      .select('user_id, gls_sede, gls_username, gls_password')
      .not('gls_username', 'is', null)
      .single();

    if (imp) {
      const { data: spedizioni } = await supabase
        .from('spedizioni')
        .select('*')
        .eq('user_id', imp.user_id)
        .eq('corriere', 'GLS')
        .not('stato', 'eq', 'Consegnata')
        .not('stato', 'eq', 'Consegnato');

      if (spedizioni && spedizioni.length > 0) {
        // Login GLS
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

        if (sessionId && formsAuth) {
          const cookies = `ASP.NET_SessionId=${sessionId}; .ASPXFORMSAUTH=${formsAuth}`;

          for (const sped of spedizioni) {
            const trackingNumber = sped.tracking?.replace('AK', '') || '';
            if (!trackingNumber) continue;
            try {
              const pageRes = await fetch('https://weblabeling.gls-italy.com/Secure_Page/TrackTrace.aspx', { headers: { 'Cookie': cookies } });
              const pageHtml = await pageRes.text();
              const extract = (name) => { const m = pageHtml.match(new RegExp(`name="${name}"[^>]+value="([^"]*)"`, 'i')); return m ? m[1] : ''; };
              const bodyParams = new URLSearchParams();
              bodyParams.append('ScriptManager1', 'UpdatePanel1|btnSearch');
              bodyParams.append('TxtSped', trackingNumber);
              bodyParams.append('TIPO', 'rbPartenze');
              bodyParams.append('btnSearch', 'Cerca');
              bodyParams.append('HFCodiceContratto', imp.gls_username);
              bodyParams.append('__VIEWSTATE', extract('__VIEWSTATE'));
              bodyParams.append('__VIEWSTATEGENERATOR', extract('__VIEWSTATEGENERATOR'));
              bodyParams.append('__EVENTVALIDATION', extract('__EVENTVALIDATION'));
              bodyParams.append('__ASYNCPOST', 'true');
              const searchRes = await fetch('https://weblabeling.gls-italy.com/Secure_Page/TrackTrace.aspx', {
                method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8', 'Cookie': cookies, 'X-Requested-With': 'XMLHttpRequest', 'X-MicrosoftAjax': 'Delta=true' }, body: bodyParams.toString()
              });
              const text = await searchRes.text();
              let nuovoStato = sped.stato;
              if (text.includes('Consegnata')) nuovoStato = 'Consegnata';
              else if (text.includes('In transito')) nuovoStato = 'In transito';
              else if (text.includes('In attesa')) nuovoStato = 'In attesa';
              else if (text.includes('In consegna')) nuovoStato = 'In consegna';
              if (nuovoStato !== sped.stato) {
                await supabase.from('spedizioni').update({ stato: nuovoStato }).eq('tracking_id', sped.tracking_id);
                totaleAggiornate++;
              }
              totaleControllate++;
            } catch (e) { console.error('GLS error:', e.message); }
          }
        }
      }
    }

    // ========== SUSA ==========
    const { data: cookieData } = await supabase
      .from('cookies_corrieri')
      .select('cookies')
      .eq('corriere', 'SUSA')
      .order('updated_at', { ascending: false })
      .limit(1)
      .single();

    if (cookieData && cookieData.cookies) {
      const { data: spedizioniSUSA } = await supabase
        .from('spedizioni')
        .select('*')
        .eq('corriere', 'SUSA')
        .not('stato', 'ilike', 'Consegnata%');

      if (spedizioniSUSA) {
        for (const sped of spedizioniSUSA) {
          try {
            const key = Buffer.from(sped.tracking).toString('base64');
            const res = await fetch(
              `https://flex.susa.it/FixedPages/Common/tracking/tracking_bolle.php/L/IT/data_ini/-1/data_fin/-1/rif_mit/-1/rif_mit2/-1/dest/-1/loc/-1/anno_form/-1/fil/MQ==/pro/-1/p_ass/-1/p_fra/-1/anno/MjAyNg==/key/${key}/cod_cli/-1`,
              { headers: { 'Cookie': cookieData.cookies, 'User-Agent': 'Mozilla/5.0' } }
            );
            const html = await res.text();
            const statoMatch = html.match(/<div class='box-step-nome'>([^<]+)<\/div>/);
            const filMatch = html.match(/<div class='box-step-fil'>([^<]+)<\/div>/);
            const nuovoStato = statoMatch ? (statoMatch[1].trim() + (filMatch ? ' - ' + filMatch[1].trim() : '')) : '';
            if (nuovoStato && nuovoStato !== sped.stato) {
              await supabase.from('spedizioni').update({ stato: nuovoStato }).eq('tracking_id', sped.tracking_id);
              totaleAggiornate++;
            }
            totaleControllate++;
          } catch (e) { console.error('SUSA error:', e.message); }
        }
      }
    }

    return res.status(200).json({
      success: true,
      controllate: totaleControllate,
      aggiornate: totaleAggiornate,
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}