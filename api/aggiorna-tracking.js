export default async function handler(req, res) {
  try {
    // Import Supabase
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(
      'https://wogthnhzdzgblqghwvja.supabase.co',
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndvZ3Robmh6ZHpnYmxxZ2h3dmphIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4Mzc3NjgyNSwiZXhwIjoyMDk5MzUyODI1fQ.P05KHCAjHwQ9OkT-GTuLp8_85FtM_1A0LANX7dwdUa4'
    );

    // Prendi tutte le spedizioni GLS non consegnate
    const { data: spedizioni } = await supabase
      .from('spedizioni')
      .select('*')
      .eq('corriere', 'GLS')
      .not('stato', 'eq', 'Consegnata')
      .not('stato', 'eq', 'Consegnato');

    if (!spedizioni || spedizioni.length === 0) {
      return res.status(200).json({ message: 'Nessuna spedizione da aggiornare' });
    }

    let aggiornate = 0;

    for (const sped of spedizioni) {
      // Estrai il numero tracking (senza prefisso AK)
      const trackingNumber = sped.tracking?.replace('AK', '') || '';
      if (!trackingNumber || trackingNumber.length < 8) continue;

      try {
        // Chiama GLS Track & Trace API
        const tokenRes = await fetch('https://api.gls-group.com/oauth/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            grant_type: 'client_credentials',
            client_id: 'nFVvJqAffA6KTEmffqON9WlfMTuoBie2',
            client_secret: '7zZfF8KBSKMuAHJI',
          }),
        });

        if (!tokenRes.ok) continue;
        const tokenData = await tokenRes.json();
        const token = tokenData.access_token;

        const trackRes = await fetch(
          `https://api-sandbox.gls-group.net/track-and-trace-v1/tracking/simple/trackids/${trackingNumber}`,
          {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Accept': 'application/json',
            },
          }
        );

        if (!trackRes.ok) continue;
        const trackData = await trackRes.json();

        // Estrai lo stato
        let nuovoStato = sped.stato;
        const parcels = trackData.parcels || trackData || [];
        if (parcels.length > 0) {
          const parcel = parcels[0];
          const status = parcel.status || '';
          
          if (status.toLowerCase().includes('delivered') || status.toLowerCase().includes('consegn')) {
            nuovoStato = 'Consegnata';
          } else if (status.toLowerCase().includes('transit')) {
            nuovoStato = 'In transito';
          } else if (status.toLowerCase().includes('waiting') || status.toLowerCase().includes('attesa')) {
            nuovoStato = 'In attesa';
          }

          // Aggiorna se cambiato
          if (nuovoStato !== sped.stato) {
            await supabase
              .from('spedizioni')
              .update({ stato: nuovoStato })
              .eq('tracking_id', sped.tracking_id);
            aggiornate++;
          }
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