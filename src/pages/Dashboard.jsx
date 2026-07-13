import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './Dashboard.css';
import NuovaSpedizione from './NuovaSpedizione';
import GestioneDestinatari from './GestioneDestinatari';
import Footer from '../components/Footer';

function Dashboard({ azienda, onLogout, spedizioni, onAggiungiSpedizione, onEliminaSpedizione, ruolo }) {
  const navigate = useNavigate();
  const [mostraForm, setMostraForm] = useState(false);

  return (
    <div className="dashboard-container">
      <header className="dashboard-header">
        <h1>TrackFlow</h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <span style={{ color: '#94a3b8', fontSize: '0.875rem' }}>
            {azienda}
          </span>
          <button className="logout-button" onClick={onLogout}>Esci</button>
        </div>
      </header>

      <main className="dashboard-main">
        <div className="dashboard-top">
          <div>
            <h2>Le tue spedizioni</h2>
            <p className="dashboard-subtitle">
              Monitora in tempo reale tutte le spedizioni dei tuoi clienti
            </p>
          </div>
          {ruolo === 'mittente' && (
            <button
              className="nuova-spedizione-button"
              onClick={() => setMostraForm(!mostraForm)}
            >
              {mostraForm ? '✕ Chiudi' : '+ Nuova spedizione'}
            </button>
          )}
        </div>

        {ruolo === 'mittente' && <GestioneDestinatari />}

        {mostraForm && (
          <NuovaSpedizione
            onAggiungi={onAggiungiSpedizione}
            onChiudi={() => setMostraForm(false)}
          />
        )}

        <div className="table-wrapper">
          <table className="spedizioni-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Cliente</th>
                <th>Corriere</th>
                <th>Tracking</th>
                <th>Stato</th>
                <th>Data</th>
                {ruolo === 'mittente' && <th></th>}
              </tr>
            </thead>
            <tbody>
              {spedizioni.map((spedizione) => (
                <tr key={spedizione.tracking_id}>
                  <td
                    className="id-cell"
                    onClick={() => navigate(`/dettaglio/${spedizione.tracking_id}`)}
                    style={{ cursor: 'pointer' }}
                  >{spedizione.tracking_id}</td>
                  <td
                    onClick={() => navigate(`/dettaglio/${spedizione.tracking_id}`)}
                    style={{ cursor: 'pointer' }}
                  >{spedizione.cliente}</td>
                  <td
                    onClick={() => navigate(`/dettaglio/${spedizione.tracking_id}`)}
                    style={{ cursor: 'pointer' }}
                  >{spedizione.corriere}</td>
                  <td
                    className="tracking-cell"
                    onClick={() => navigate(`/dettaglio/${spedizione.tracking_id}`)}
                    style={{ cursor: 'pointer' }}
                  >{spedizione.tracking}</td>
                  <td
                    onClick={() => navigate(`/dettaglio/${spedizione.tracking_id}`)}
                    style={{ cursor: 'pointer' }}
                  >
                    <span className={`stato ${spedizione.stato.toLowerCase().replace(' ', '-')}`}>
                      {spedizione.stato}
                    </span>
                  </td>
                  <td
                    onClick={() => navigate(`/dettaglio/${spedizione.tracking_id}`)}
                    style={{ cursor: 'pointer' }}
                  >{spedizione.data}</td>
                  {ruolo === 'mittente' && (
                    <td>
                      <button
                        className="elimina-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (window.confirm(`Eliminare la spedizione ${spedizione.tracking_id}?`)) {
                            onEliminaSpedizione(spedizione.tracking_id);
                          }
                        }}
                        title="Elimina spedizione"
                      >
                        🗑️
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>
      <Footer />
    </div>
  );
}

export default Dashboard;