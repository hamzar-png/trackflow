import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { trackGLS } from '../services/glsApi';
import './NuovaSpedizione.css';

function NuovaSpedizione({ onAggiungi, onChiudi }) {
  const [tipo, setTipo] = useState('');
  const [destinatari, setDestinatari] = useState([]);
  const [loadingApi, setLoadingApi] = useState(false);
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

      // Prendi il primo pacco
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

  const handleSubmit = (e) => {
    e.preventDefault();

    const id = 'TRK-' + String(Math.floor(Math.random() * 1000)).padStart(3, '0');

    let nuovaSpedizione;

    if (tipo === 'tracking') {
      nuovaSpedizione = {
        id,
        cliente: formData.cliente,
        corriere: formData.corriere,
        tracking: formData.tracking,
        stato: formData.stato || 'In attesa',
        data: formData.data,
        tipo: 'tracking',
        ddt: '',
        partenza: '',
        destinazione: '',
        note: '',
        destinatario_id: formData.destinatario_id || null,
      };
    } else {
      nuovaSpedizione = {
        id,
        cliente: formData.cliente,
        corriere: 'Tratta diretta',
        tracking: '',
        stato: 'In partenza',
        data: formData.data,
        tipo: 'manuale',
        ddt: formData.ddt || '',
        partenza: formData.partenza || '',
        destinazione: formData.destinazione || '',
        note: formData.note || '',
        destinatario_id: formData.destinatario_id || null,
      };
    }

    onAggiungi(nuovaSpedizione);
    onChiudi();
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