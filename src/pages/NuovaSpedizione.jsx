import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { trackGLS } from '../services/glsApi';
import './NuovaSpedizione.css';

function NuovaSpedizione({ onAggiungi, onChiudi }) {
  const [tipo, setTipo] = useState('');
  const [destinatari, setDestinatari] = useState([]);
  const [loadingApi, setLoadingApi] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [formData, setFormData] = useState({
    cliente: '',
    corriere: '',
    tracking: '',
    data: new Date().toLocaleDateString('it-IT'),
    ddt: '',
    partenza: '',
    destinazione: '',
    note: '',
    destinatario_id: '',
  });

  useEffect(() => {
    caricaDestinatari();
    caricaApiKey();
  }, []);

  const caricaDestinatari = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from('destinatari')
      .select('*')
      .eq('mittente_id', user.id)
      .order('nome_azienda');

    if (data) setDestinatari(data);
  };

  const caricaApiKey = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from('impostazioni')
      .select('api_key')
      .eq('user_id', user.id)
      .single();

    if (data && data.api_key) {
      setApiKey(data.api_key);
    }
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleApiSearch = async () => {
    if (!formData.tracking) {
      alert('Inserisci un numero tracking');
      return;
    }

    setLoadingApi(true);
    try {
      const result = await trackGLS(formData.tracking);
      console.log('Risultato GLS:', result);

      const parcel = result.parcels?.[0] || result[0];

      if (parcel) {
        setFormData({
          ...formData,
          stato: parcel.status || 'In transito',
          data: new Date().toLocaleDateString('it-IT'),
        });
        alert('Dati recuperati da GLS!');
      } else {
        alert('Nessun dato trovato per questo tracking.');
      }
    } catch (error) {
      console.error('Errore API GLS:', error);
      alert('Errore durante la ricerca: ' + error.message);
    }
    setLoadingApi(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!apiKey) {
      alert('API Key non trovata. Completa la configurazione nelle Impostazioni.');
      return;
    }

    const spedizione = {
      apiKey: apiKey,
      destinatario: formData.cliente,
      corriere: formData.corriere,
      tracking: formData.tracking,
      data: formData.data,
      localita: formData.destinazione || '',
      provincia: '',
      indirizzo: '',
      cap: '',
      note: formData.note || '',
      destinatario_id: formData.destinatario_id || null,
    };

    console.log('📤 Invio a TrackFlow API:', spedizione);

    try {
      const response = await fetch('https://trackflow-phi-red.vercel.app/api/ricevi-spedizione', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(spedizione)
      });

      const result = await response.json();
      console.log('✅ Risposta API:', result);

      if (result.success) {
        alert('Spedizione aggiunta con successo!');
        onChiudi();
        window.location.reload();
      } else {
        alert('Errore: ' + (result.error || 'Errore sconosciuto'));
      }
    } catch (error) {
      console.error('❌ Errore:', error);
      alert('Errore di connessione: ' + error.message);
    }
  };

  return (
    <div className="nuova-spedizione-card">
      <h3>Nuova spedizione</h3>

      {!tipo ? (
        <div className="tipo-buttons">
          <button className="tipo-btn" onClick={() => setTipo('tracking')}>
            📦 Con tracking (API corriere)
          </button>
          <button className="tipo-btn" onClick={() => setTipo('manuale')}>
            🚛 Tratta diretta / Camion
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="nuova-spedizione-form">
          <div className="form-row">
            <div className="form-group">
              <label>Cliente *</label>
              <input
                type="text"
                name="cliente"
                value={formData.cliente}
                onChange={handleChange}
                placeholder="Nome azienda cliente"
                required
              />
            </div>
            <div className="form-group">
              <label>Data</label>
              <input
                type="text"
                name="data"
                value={formData.data}
                onChange={handleChange}
                placeholder="gg/mm/aaaa"
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Assegna a destinatario</label>
              <select
                name="destinatario_id"
                value={formData.destinatario_id}
                onChange={handleChange}
              >
                <option value="">Nessuno (visibile solo a te)</option>
                {destinatari.map((dest) => (
                  <option key={dest.id} value={dest.id}>
                    {dest.nome_azienda} ({dest.email})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {tipo === 'tracking' ? (
            <div className="form-row">
              <div className="form-group">
                <label>Corriere *</label>
                <select name="corriere" value={formData.corriere} onChange={handleChange} required>
                  <option value="">Seleziona corriere</option>
                  <option value="BRT">BRT</option>
                  <option value="DHL">DHL</option>
                  <option value="GLS">GLS</option>
                  <option value="SDA">SDA</option>
                  <option value="SUSA">SUSA Trasporto</option>
                  <option value="Arco">Arco</option>
                </select>
              </div>
              <div className="form-group">
                <label>Numero tracking *</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    type="text"
                    name="tracking"
                    value={formData.tracking}
                    onChange={handleChange}
                    placeholder="Es. BRT123456789"
                    required
                    style={{ flex: 1 }}
                  />
                  {formData.corriere === 'GLS' && (
                    <button
                      type="button"
                      className="api-search-btn"
                      onClick={handleApiSearch}
                      disabled={loadingApi}
                    >
                      {loadingApi ? '🔍...' : '🔍 Cerca'}
                    </button>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <>
              <div className="form-row">
                <div className="form-group">
                  <label>DDT</label>
                  <input
                    type="text"
                    name="ddt"
                    value={formData.ddt}
                    onChange={handleChange}
                    placeholder="Numero DDT"
                  />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Partenza</label>
                  <input
                    type="text"
                    name="partenza"
                    value={formData.partenza}
                    onChange={handleChange}
                    placeholder="Città di partenza"
                  />
                </div>
                <div className="form-group">
                  <label>Destinazione</label>
                  <input
                    type="text"
                    name="destinazione"
                    value={formData.destinazione}
                    onChange={handleChange}
                    placeholder="Città di destinazione"
                  />
                </div>
              </div>
              <div className="form-group">
                <label>Note</label>
                <textarea
                  name="note"
                  value={formData.note}
                  onChange={handleChange}
                  placeholder="Note sulla spedizione..."
                  rows={2}
                />
              </div>
            </>
          )}

          <div className="form-actions">
            <button type="button" className="annulla-btn" onClick={() => setTipo('')}>
              ← Indietro
            </button>
            <button type="submit" className="salva-btn">
              Aggiungi spedizione
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

export default NuovaSpedizione;