    // Step 0: GET pagina login per VIEWSTATE
    const initRes = await fetch('https://weblabeling.gls-italy.com/Home/Login');
    let cookieJar = [...(initRes.headers.getSetCookie?.() || [])];
    const loginPage = await initRes.text();

    // Estrai VIEWSTATE dalla pagina di login
    const vsMatch = loginPage.match(/name="__VIEWSTATE"[^>]+value="([^"]*)"/i);
    const evMatch = loginPage.match(/name="__EVENTVALIDATION"[^>]+value="([^"]*)"/i);
    const vgMatch = loginPage.match(/name="__VIEWSTATEGENERATOR"[^>]+value="([^"]*)"/i);

    const viewstate = vsMatch ? vsMatch[1] : '';
    const eventvalidation = evMatch ? evMatch[1] : '';
    const viewstategenerator = vgMatch ? vgMatch[1] : '';

    // Step 1: Login con TUTTI i parametri del form
    const loginParams = new URLSearchParams();
    loginParams.append('__VIEWSTATE', viewstate);
    loginParams.append('__VIEWSTATEGENERATOR', viewstategenerator);
    loginParams.append('__EVENTVALIDATION', eventvalidation);
    loginParams.append('Sede', sede.toLowerCase());
    loginParams.append('UserName', codiceCliente);
    loginParams.append('Password', password);
    loginParams.append('LoginButton', 'Log In');
    loginParams.append('__EVENTTARGET', 'LoginButton');
    loginParams.append('__EVENTARGUMENT', '');

    const loginRes = await fetch('https://weblabeling.gls-italy.com/Home/Login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Cookie': mergeCookies(cookieJar),
      },
      body: loginParams.toString(),
      redirect: 'manual',
    });

    console.log("LOGIN STATUS:", loginRes.status);
    console.log("LOGIN LOCATION:", loginRes.headers.get("location"));

    cookieJar.push(...(loginRes.headers.getSetCookie?.() || []));