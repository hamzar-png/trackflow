import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import './DettaglioSpedizione.css';

function DettaglioSpedizione({ spedizioni, onElimina, onModifica, ruolo }) {
  const { trackingId } = useParams();
  const navigate = useNavigate();
  const [inModifica, setInModifica] = useState(false);
  const [formData, setFormData] = useState({});

  const spedizione = spedizioni.find(s => s.tracking_id === trackingId);

  if (!spedizione) {
    return (
      <div className="dettaglio-container">
        <header className="dettaglio-header">
          <button className="back-button" onClick={() => navigate('/dashboard')}>
            ← Torna alla dashboard
          </button>
          <h1>TrackFlow</h1>
        </header>
        <div style={{ padding: '32px', textAlign: 'center' }}>
          <p>Spedizione non trovata.</p>
        </div>
      </div>
    );
  }

  const handleElimina = () => {
    if (window.confirm(`Eliminare definitivamente la spedizione ${spedizione.tracking_id}?`)) {
      onElimina(spedizione.tracking_id);
      navigate('/dashboard');
    }
  };

  const iniziaModifica = () => {
    setFormData({
      cliente: spedizione.cliente || '',
      corriere: spedizione.corriere || '',
      tracking: spedizione.tracking || '',
      stato: spedizione.stato || '',
      data: spedizione.data || '',
      ddt: spedizione.ddt || '',
      partenza: spedizione.partenza || '',
      destinazione: spedizione.destinazione || '',
      note: spedizione.note || '',
    });
    setInModifica(true);
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSalva = () => {
    const datiDaSalvare = {
      cliente: formData.cliente,
      corriere: formData.corriere,
      tracking: formData.tracking,
      stato: formData.stato,
      data: formData.data,
      ddt: formData.ddt || '',
      partenza: formData.partenza || '',
      destinazione: formData.destinazione || '',
      note: formData.note || '',
    };
    onModifica(spedizione.tracking_id, datiDaSalvare);
    setInModifica(false);
  };

  const dettaglioExtra = {
    contatto: 'Contatto cliente',
    email: 'cliente@esempio.it',
    dataSpedizione: inModifica ? formData.data : spedizione.data,
    dataConsegna: 'Da definire',
    ddt: inModifica ? formData.ddt : (spedizione.ddt || 'Non specificato'),
    note: inModifica ? formData.note : (spedizione.note || 'Nessuna nota'),
    posizione: spedizione.stato === 'In transito' ? 'In transito verso destinazione' :
               spedizione.stato === 'Consegnato' ? 'Consegnato al destinatario' :
               spedizione.stato === 'In attesa' ? 'In attesa di presa in carico' :
               'In partenza',
    aggiornamenti: [
      { data: (inModifica ? formData.data : spedizione.data) + ' 10:00', stato: 'Spedizione creata' },
    ],
  };

  return (
    <div className="dettaglio-container">
      <header className="dettaglio-header">
        <button className="back-button" onClick={() => navigate('/dashboard')}>
          ← Torna alla dashboard
        </button>
        <h1>TrackFlow</h1>
      </header>

      <div className="dettaglio-title">
        <h2>Spedizione {spedizione.tracking_id}</h2>
        {inModifica ? (
          <select
            name="stato"
            value={formData.stato}
            onChange={handleChange}
            className="stato-select"
          >
            <option value="In attesa">In attesa</option>
            <option value="In transito">In transito</option>
            <option value="Consegnato">Consegnato</option>
            <option value="In partenza">In partenza</option>
          </select>
        ) : (
          <span className={`stato ${spedizione.stato.toLowerCase().replace(' ', '-')}`}>
            {spedizione.stato}
          </span>
        )}
      </div>

      <div className="dettaglio-grid">
        <div className="info-card">
          <h3>Cliente</h3>
          {inModifica ? (
            <input
              type="text"
              name="cliente"
              value={formData.cliente}
              onChange={handleChange}
              className="edit-input"
            />
          ) : (
            <>
              <p className="info-value">{spedizione.cliente}</p>
              <p className="info-sub">{dettaglioExtra.contatto}</p>
              <p className="info-sub">{dettaglioExtra.email}</p>
            </>
          )}
        </div>

        <div className="info-card">
          <h3>Corriere</h3>
          {inModifica ? (
            <>
              <select
                name="corriere"
                value={formData.corriere}
                onChange={handleChange}
                className="edit-input"
              >
                <option value="BRT">BRT</option>
                <option value="DHL">DHL</option>
                <option value="GLS">GLS</option>
                <option value="SDA">SDA</option>
                <option value="SUSA">SUSA Trasporto</option>
                <option value="Arco">Arco</option>
                <option value="Tratta diretta">Tratta diretta</option>
              </select>
              <p className="info-label">Tracking</p>
              <input
                type="text"
                name="tracking"
                value={formData.tracking}
                onChange={handleChange}
                className="edit-input"
              />
            </>
          ) : (
            <>
              <p className="info-value">{spedizione.corriere}</p>
              <p className="info-label">Tracking</p>
              <p className="info-sub tracking-code">{spedizione.tracking}</p>
            </>
          )}
        </div>

        <div className="info-card">
          <h3>DDT</h3>
          {inModifica ? (
            <>
              <input
                type="text"
                name="ddt"
                value={formData.ddt}
                onChange={handleChange}
                className="edit-input"
              />
              <p className="info-label">Data spedizione</p>
              <input
                type="text"
                name="data"
                value={formData.data}
                onChange={handleChange}
                className="edit-input"
              />
            </>
          ) : (
            <>
              <p className="info-value">{dettaglioExtra.ddt}</p>
              <p className="info-label">Data spedizione</p>
              <p className="info-sub">{dettaglioExtra.dataSpedizione}</p>
            </>
          )}
          <p className="info-label">Consegna prevista</p>
          <p className="info-sub">{dettaglioExtra.dataConsegna}</p>
        </div>

        <div className="info-card">
          <h3>Posizione attuale</h3>
          <p className="info-value posizione">{dettaglioExtra.posizione}</p>
          <p className="info-label">Note</p>
          {inModifica ? (
            <textarea
              name="note"
              value={formData.note}
              onChange={handleChange}
              className="edit-input"
              rows={2}
            />
          ) : (
            <p className="info-sub">{dettaglioExtra.note}</p>
          )}
        </div>
      </div>

      <div className="timeline-card">
        <h3>Cronologia aggiornamenti</h3>
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
      </div>

      {ruolo === 'mittente' && (
        <div className="dettaglio-actions">
          {inModifica ? (
            <>
              <button className="azione-btn annulla" onClick={() => setInModifica(false)}>
                Annulla
              </button>
              <button className="azione-btn salva" onClick={handleSalva}>
                Salva modifiche
              </button>
            </>
          ) : (
            <>
              <button className="azione-btn elimina" onClick={handleElimina}>
                🗑️ Elimina spedizione
              </button>
              <button className="azione-btn modifica" onClick={iniziaModifica}>
                ✏️ Modifica spedizione
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

export default DettaglioSpedizione;