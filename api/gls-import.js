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
        Sede: sede,
        Cliente: codiceCliente,
        Password: password,
      }),
      redirect: 'manual',
    });

    const cookies = loginResponse.headers.get('set-cookie') || '';

    if (!cookies) {
      return res.status(500).json({ error: 'Login fallito. Verifica le credenziali.' });
    }

    // Step 2: Recupera lista spedizioni
    const spedizioniResponse = await fetch('https://weblabeling.gls-italy.com/Spedizioni/Lista', {
      method: 'GET',
      headers: {
        'Cookie': cookies,
        'Accept': 'text/html',
      },
    });

    const html = await spedizioniResponse.text();

    if (html.includes('Login') || html.includes('login')) {
      return res.status(500).json({ error: 'Sessione scaduta.' });
    }

    // Step 3: Estrai i dati dall'HTML (parsing semplice)
    const spedizioni = [];
    
    // Cerca righe della tabella
    const tableMatch = html.match(/<table[^>]*>([\s\S]*?)<\/table>/gi);
    
    if (tableMatch) {
      for (const table of tableMatch) {
        const rows = table.match(/<tr[^>]*>([\s\S]*?)<\/tr>/gi);
        if (rows) {
          for (let i = 1; i < rows.length; i++) { // Salta header
            const cells = rows[i].match(/<td[^>]*>([\s\S]*?)<\/td>/gi);
            if (cells && cells.length >= 3) {
              const cleanCell = (cell) => cell.replace(/<[^>]*>/g, '').trim();
              
              spedizioni.push({
                tracking: cleanCell(cells[0]) || 'N/D',
                cliente: cleanCell(cells[1]) || 'Da assegnare',
                stato: cleanCell(cells[2]) || 'In transito',
                data: new Date().toLocaleDateString('it-IT'),
              });
            }
          }
        }
      }
    }

    // Se non trova nulla, restituisci tutto l'HTML per debug
    if (spedizioni.length === 0) {
      return res.status(200).json({
        success: true,
        message: 'Login OK ma nessuna spedizione trovata nella tabella.',
        htmlPreview: html.substring(0, 1000),
      });
    }

    return res.status(200).json({
      success: true,
      spedizioni: spedizioni,
      totale: spedizioni.length,
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}