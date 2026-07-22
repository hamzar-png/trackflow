export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const { trackingNumber } = req.query || {};
    if (!trackingNumber) {
      return res.status(400).json({ error: 'Tracking mancante' });
    }

    const key = Buffer.from(trackingNumber).toString('base64');

    const response = await fetch(
      `https://flex.susa.it/FixedPages/Common/tracking/tracking_dettaglio_articoli.php/L/IT/data_ini/-1/data_fin/-1/rif_mit/-1/rif_mit2/-1/dest/-1/loc/-1/anno_form/-1/fil_form/-1/pro/-1/p_ass/-1/p_fra/-1/cod_cli/-1/codclicol/-1/anno/MjAyNg==/fil/MQ==/key/${key}/psw/-`,
      {
        headers: { 'Accept': 'text/html', 'User-Agent': 'Mozilla/5.0' },
      }
    );

    const html = await response.text();

   const middle = Math.floor(html.length / 2);
return res.status(200).json({
  success: true,
  tracking: trackingNumber,
  htmlPreview: html.substring(middle - 1500, middle + 1500),
  htmlLength: html.length,
  events: [],
});
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}