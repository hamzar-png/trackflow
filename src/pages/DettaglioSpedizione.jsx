import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import './DettaglioSpedizione.css';
import Footer from '../components/Footer';

function DettaglioSpedizione({ spedizioni, onElimina, onModifica, ruolo }) {
  const { trackingId } = useParams();
  const navigate = useNavigate();
  const [inModifica, setInModifica] = useState(false);
  const [formData, setFormData] = useState({});
  const [ddtUrl, setDdtUrl] = useState('');
  const [trackingData, setTrackingData] = useState(null);
  const [loadingTracking, setLoadingTracking] = useState(false);

  const spedizione = spedizioni.find(s => s.tracking_id === trackingId);
// Tracciamento GLS e Arco
useEffect(() => {
  if (spedizione && spedizione.tracking) {
    const trackingNumber = spedizione.tracking;
    let apiUrl = '';

    if (spedizione.corriere === 'GLS') {
      apiUrl = `/api/tracciamento-gls?trackingNumber=${trackingNumber.replace('AK', '')}`;
    } else if (spedizione.corriere === 'Arco') {
      apiUrl = `/api/tracciamento-arco?trackingNumber=${trackingNumber}`;
    }

    if (apiUrl) {
      setLoadingTracking(true);
      fetch(apiUrl)
        .then(r => r.json())
        .then(data => {
          if (data.success) setTrackingData(data);
        })
        .catch(console.error)
        .finally(() => setLoadingTracking(false));
    }
  }
}, [spedizione]);
  useEffect(() => {
    if (spedizione && spedizione.corriere === 'GLS' && spedizione.tracking) {
      const trackingNumber = spedizione.tracking.replace('AK', '');
      if (trackingNumber) {
        setLoadingTracking(true);
        fetch(`/api/tracciamento-gls?trackingNumber=${trackingNumber}`)
          .then(r => r.json())
          .then(data => {
            if (data.success) setTrackingData(data);
          })
          .catch(console.error)
          .finally(() => setLoadingTracking(false));
      }
    }
  }, [spedizione]);

  useEffect(() => { setDdtUrl(''); setInModifica(false); }, [trackingId]);

  useEffect(() => {
    setDdtUrl(spedizione?.ddt_url || '');
  }, [spedizione]);

  if (!spedizione) {
    return (
      <div className="dettaglio-container">
        <header className="dettaglio-header">
          <button className="back-button" onClick={() => navigate('/dashboard')}>← Torna alla dashboard</button>
          <h1>TrackFlow</h1>
        </header>
        <div style={{ padding: '32px', textAlign: 'center' }}><p>Spedizione non trovata.</p></div>
      </div>
    );
  }

  const handleElimina = () => {
    if (window.confirm(`Eliminare la spedizione ${spedizione.tracking_id}?`)) {
      onElimina(spedizione.tracking_id);
      navigate('/dashboard');
    }
  };

  const iniziaModifica = () => {
    setFormData({
      cliente: spedizione.cliente || '', corriere: spedizione.corriere || '',
      tracking: spedizione.tracking || '', stato: spedizione.stato || '',
      data: spedizione.data || '', ddt: spedizione.ddt || '',
      partenza: spedizione.partenza || '', destinazione: spedizione.destinazione || '',
      note: spedizione.note || '',
    });
    setInModifica(true);
  };

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });
  const handleSalva = () => { onModifica(spedizione.tracking_id, formData); setInModifica(false); };

  const dettaglioExtra = {
    contatto: 'Contatto cliente', email: 'cliente@esempio.it',
    dataSpedizione: inModifica ? formData.data : spedizione.data,
    dataConsegna: 'Da definire',
    ddt: inModifica ? formData.ddt : (spedizione.ddt || 'Non specificato'),
    note: inModifica ? formData.note : (spedizione.note || 'Nessuna nota'),
    posizione: spedizione.stato === 'In transito' ? 'In transito verso destinazione' :
               spedizione.stato === 'Consegnato' ? 'Consegnato al destinatario' :
               spedizione.stato === 'In attesa' ? 'In attesa di presa in carico' : 'In partenza',
    aggiornamenti: [
      { data: (inModifica ? formData.data : spedizione.data) + ' 10:00', stato: 'Spedizione creata' },
    ],
  };

  return (
    <div className="dettaglio-container">
      <header className="dettaglio-header">
        <button className="back-button" onClick={() => navigate('/dashboard')}>← Torna alla dashboard</button>
        <h1>TrackFlow</h1>
      </header>

      <div className="dettaglio-title">
        <h2>Spedizione {spedizione.tracking_id}</h2>
        {inModifica ? (
          <select name="stato" value={formData.stato} onChange={handleChange} className="stato-select">
            <option value="In attesa">In attesa</option>
            <option value="In transito">In transito</option>
            <option value="Consegnato">Consegnato</option>
            <option value="In partenza">In partenza</option>
          </select>
        ) : (
          <span className={`stato ${spedizione.stato.toLowerCase().replace(' ', '-')}`}>{spedizione.stato}</span>
        )}
      </div>

      <div className="dettaglio-grid">
        <div className="info-card"><h3>Cliente</h3>{inModifica ? <input type="text" name="cliente" value={formData.cliente} onChange={handleChange} className="edit-input" /> : <><p className="info-value">{spedizione.cliente}</p><p className="info-sub">{dettaglioExtra.contatto}</p><p className="info-sub">{dettaglioExtra.email}</p></>}</div>
        <div className="info-card"><h3>Corriere</h3>{inModifica ? <><select name="corriere" value={formData.corriere} onChange={handleChange} className="edit-input"><option value="BRT">BRT</option><option value="DHL">DHL</option><option value="GLS">GLS</option><option value="SDA">SDA</option><option value="SUSA">SUSA</option><option value="Arco">Arco</option><option value="Tratta diretta">Tratta diretta</option></select><p className="info-label">Tracking</p><input type="text" name="tracking" value={formData.tracking} onChange={handleChange} className="edit-input" /></> : <><p className="info-value">{spedizione.corriere}</p><p className="info-label">Tracking</p><p className="info-sub tracking-code">{spedizione.tracking}</p></>}</div>
        <div className="info-card"><h3>DDT</h3>{inModifica ? <><input type="text" name="ddt" value={formData.ddt} onChange={handleChange} className="edit-input" /><p className="info-label">Data spedizione</p><input type="text" name="data" value={formData.data} onChange={handleChange} className="edit-input" /></> : <><p className="info-value">{dettaglioExtra.ddt}</p><p className="info-label">Data spedizione</p><p className="info-sub">{dettaglioExtra.dataSpedizione}</p></>}<p className="info-label">Consegna prevista</p><p className="info-sub">{dettaglioExtra.dataConsegna}</p></div>
        <div className="info-card"><h3>Posizione attuale</h3><p className="info-value posizione">{dettaglioExtra.posizione}</p><p className="info-label">Note</p>{inModifica ? <textarea name="note" value={formData.note} onChange={handleChange} className="edit-input" rows={2} /> : <p className="info-sub">{dettaglioExtra.note}</p>}</div>
      </div>

      {/* TRACCIAMENTO REALE */}
      <div className="timeline-card">
        <h3>Tracciamento reale</h3>
        {loadingTracking ? (
          <p style={{ color: '#94a3b8' }}>Caricamento...</p>
        ) : trackingData?.events?.length > 0 ? (
          <>
            <div style={{ background: '#0f172a', padding: '12px 16px', borderRadius: '8px', marginBottom: '16px', border: '1px solid #334155' }}>
              <span style={{ color: '#94a3b8', fontSize: '0.75rem' }}>Stato attuale: </span>
              <span style={{ color: '#fbbf24', fontWeight: 'bold', fontSize: '0.85rem' }}>{trackingData.statoAttuale || 'In elaborazione'}</span>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', marginBottom: '16px' }}>
              {trackingData.references?.map((ref, i) => (
                <div key={i} style={{ background: '#0f172a', padding: '8px 12px', borderRadius: '6px', border: '1px solid #334155' }}>
                  <span style={{ color: '#64748b', fontSize: '0.65rem' }}>{ref.tipo}: </span>
                  <span style={{ color: '#cbd5e1', fontSize: '0.8rem', fontWeight: 'bold' }}>{ref.valore}</span>
                </div>
              ))}
            </div>
            <div className="timeline">
              {trackingData.events.map((event, index) => (
                <div key={index} className="timeline-item">
                  <div className="timeline-dot" style={{ background: index === 0 ? '#fbbf24' : '#38bdf8' }}></div>
                  <div className="timeline-content">
                    <p className="timeline-data">{event.data}</p>
                    <p className="timeline-stato">{event.stato}</p>
                    {event.luogo && <p style={{ fontSize: '0.7rem', color: '#64748b' }}>📍 {event.luogo}</p>}
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="timeline">
            {dettaglioExtra.aggiornamenti.map((agg, index) => (
              <div key={index} className="timeline-item">
                <div className="timeline-dot"></div>
                <div className="timeline-content">
                  <p className="timeline-data">{agg.data}</p>
                  <p className="timeline-stato">{agg.stato}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {ruolo === 'mittente' && (
        <div className="dettaglio-actions">
          {inModifica ? (
            <>
              <button className="azione-btn annulla" onClick={() => setInModifica(false)}>Annulla</button>
              <button className="azione-btn salva" onClick={handleSalva}>Salva modifiche</button>
            </>
          ) : (
            <>
              <button className="azione-btn elimina" onClick={handleElimina}>🗑️ Elimina spedizione</button>
              <button className="azione-btn modifica" onClick={iniziaModifica}>✏️ Modifica spedizione</button>
              <label className="azione-btn ddt-upload">
                📄 Carica DDT
                <input type="file" accept=".pdf" style={{ display: 'none' }}
                  onChange={async (e) => {
                    const file = e.target.files[0];
                    if (!file) return;
                    const { data: { user } } = await supabase.auth.getUser();
                    const reader = new FileReader();
                    reader.onload = async () => {
                      const base64 = reader.result.split(',')[1];
                      const r = await fetch('/api/upload-ddt', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'upload', trackingId: spedizione.tracking_id, userId: user.id, fileData: base64, fileName: file.name }) });
                      const result = await r.json();
                      if (result.error) alert('Errore: ' + result.error);
                      else { setDdtUrl(result.url); alert('✅ DDT caricato!'); }
                    };
                    reader.readAsDataURL(file);
                  }}
                />
              </label>
              {ddtUrl && (
                <>
                  <button onClick={() => window.open(ddtUrl, '_blank')} className="azione-btn ddt-view">👁️ Vedi DDT</button>
                  <button onClick={async () => {
                    if (!window.confirm('Eliminare il DDT?')) return;
                    const { data: { user } } = await supabase.auth.getUser();
                    const r = await fetch('/api/upload-ddt', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'delete', trackingId: spedizione.tracking_id, userId: user.id }) });
                    const result = await r.json();
                    if (result.error) alert('Errore: ' + result.error);
                    else { setDdtUrl(''); alert('DDT eliminato!'); }
                  }} className="azione-btn ddt-delete">🗑️ Elimina DDT</button>
                </>
              )}
            </>
          )}
        </div>
      )}

      {ruolo === 'destinatario' && ddtUrl && (
        <div className="dettaglio-actions">
          <button onClick={() => window.open(ddtUrl, '_blank')} className="azione-btn ddt-view">👁️ Vedi DDT</button>
        </div>
      )}

      <Footer />
    </div>
  );
}

export default DettaglioSpedizione;