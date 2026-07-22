import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import './Dashboard.css';
import NuovaSpedizione from './NuovaSpedizione';
import Impostazioni from './Impostazioni';
import Footer from '../components/Footer';

function Dashboard({ azienda, onLogout, spedizioni, onAggiungiSpedizione, onEliminaSpedizione, onImportaGLS, ruolo }) {
  const navigate = useNavigate();
  const [mostraForm, setMostraForm] = useState(false);
  const [mostraImpostazioni, setMostraImpostazioni] = useState(false);
  const [logoAzienda, setLogoAzienda] = useState('');
  const [logoSfondo, setLogoSfondo] = useState('');

  useEffect(() => { caricaImpostazioni(); }, []);

  const caricaImpostazioni = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase.from('impostazioni').select('logo_azienda, logo_sfondo').eq('user_id', user.id).single();
    if (data) { setLogoAzienda(data.logo_azienda || ''); setLogoSfondo(data.logo_sfondo || ''); }
  };

  const handleImpostazioniClose = () => { setMostraImpostazioni(false); caricaImpostazioni(); };

  return (
    <div className="dashboard-container">
      {logoSfondo && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundImage: `url(${logoSfondo})`, backgroundSize: '50%', backgroundPosition: 'center', backgroundRepeat: 'no-repeat', opacity: 0.15, zIndex: 0, pointerEvents: 'none' }} />
      )}
      <header className="dashboard-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <h1>TrackFlow</h1>
          {logoAzienda && <><span style={{ color: '#64748b', fontSize: '1.2rem' }}>×</span><img src={logoAzienda} alt="Logo" style={{ height: '40px', maxWidth: '160px', objectFit: 'contain' }} /></>}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <span style={{ color: '#94a3b8', fontSize: '0.875rem' }}>{azienda}</span>
          <button className="impostazioni-btn" onClick={() => setMostraImpostazioni(true)} title="Impostazioni">⚙️</button>
          <button className="logout-button" onClick={onLogout}>Esci</button>
        </div>
      </header>

      <main className="dashboard-main" style={{ position: 'relative', zIndex: 1 }}>
        <div className="dashboard-top">
          <div>
            <h2>Le tue spedizioni</h2>
            <p className="dashboard-subtitle">Monitora in tempo reale tutte le spedizioni dei tuoi clienti</p>
          </div>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            {ruolo === 'mittente' && (
              <>
                <button className="nuova-spedizione-button" onClick={() => setMostraForm(!mostraForm)}>{mostraForm ? '✕ Chiudi' : '+ Nuova spedizione'}</button>
                <button className="nuova-spedizione-button" onClick={() => navigate('/destinatari')} style={{ background: '#0f172a', color: '#38bdf8', border: '1px solid #38bdf8' }}>👥 Gestione Destinatari</button>
                <button className="nuova-spedizione-button"
                  onClick={async () => {
                    const { data: { user } } = await supabase.auth.getUser();
                    const { data: imp } = await supabase.from('impostazioni').select('arco_username, arco_password').eq('user_id', user.id).single();
                    if (!imp?.arco_username) { alert('Inserisci credenziali Arco in ⚙️ Impostazioni'); return; }
                    const res = await fetch('/api/import-arco', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: imp.arco_username, password: imp.arco_password, user_id: user.id }) });
                    const data = await res.json();
                    if (data.error) alert('Errore: ' + data.error);
                    else alert(`Importate ${data.spedizioni?.length || 0} spedizioni Arco! Ricarica la pagina.`);
                  }}
                  style={{ background: '#0f172a', color: '#f59e0b', border: '1px solid #f59e0b' }}>
                  📥 Importa da Arco
                </button>
                <button className="nuova-spedizione-button"
                  onClick={async () => {
                    const { data: { user } } = await supabase.auth.getUser();
                    const { data: imp } = await supabase.from('impostazioni').select('susa_username, susa_password').eq('user_id', user.id).single();
                    if (!imp?.susa_username) { alert('Inserisci credenziali SUSA in ⚙️ Impostazioni'); return; }
                    const res = await fetch('/api/import-susa', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: imp.susa_username, password: imp.susa_password, user_id: user.id }) });
                    const data = await res.json();
                    if (data.error) alert('Errore: ' + data.error);
                    else alert(`Importate ${data.importate || 0} spedizioni SUSA! Ricarica la pagina.`);
                  }}
                  style={{ background: '#0f172a', color: '#f59e0b', border: '1px solid #f59e0b' }}>
                  📥 Importa da SUSA
                </button>
              </>
            )}
          </div>
        </div>

        {mostraForm && (<NuovaSpedizione onAggiungi={onAggiungiSpedizione} onChiudi={() => setMostraForm(false)} />)}

        <div className="table-wrapper">
          <table className="spedizioni-table">
            <thead>
              <tr><th>ID</th><th>Cliente</th><th>Corriere</th><th>Tracking</th><th>Stato</th><th>Data</th>{ruolo === 'mittente' && <th></th>}</tr>
            </thead>
            <tbody>
              {spedizioni.map((spedizione) => (
                <tr key={spedizione.tracking_id}>
                  <td className="id-cell" onClick={() => navigate(`/dettaglio/${spedizione.tracking_id}`)} style={{ cursor: 'pointer' }}>{spedizione.tracking_id}</td>
                  <td onClick={() => navigate(`/dettaglio/${spedizione.tracking_id}`)} style={{ cursor: 'pointer' }}>{spedizione.cliente}</td>
                  <td onClick={() => navigate(`/dettaglio/${spedizione.tracking_id}`)} style={{ cursor: 'pointer' }}>{spedizione.corriere}</td>
                  <td className="tracking-cell" onClick={() => navigate(`/dettaglio/${spedizione.tracking_id}`)} style={{ cursor: 'pointer' }}>{spedizione.tracking}</td>
                  <td onClick={() => navigate(`/dettaglio/${spedizione.tracking_id}`)} style={{ cursor: 'pointer' }}><span className={`stato ${spedizione.stato.toLowerCase().replace(' ', '-')}`}>{spedizione.stato}</span></td>
                  <td onClick={() => navigate(`/dettaglio/${spedizione.tracking_id}`)} style={{ cursor: 'pointer' }}>{spedizione.data}</td>
                  {ruolo === 'mittente' && (
                    <td><button className="elimina-btn" onClick={(e) => { e.stopPropagation(); if (window.confirm(`Eliminare la spedizione ${spedizione.tracking_id}?`)) { onEliminaSpedizione(spedizione.tracking_id); } }} title="Elimina spedizione">🗑️</button></td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>

      {mostraImpostazioni && <Impostazioni onClose={handleImpostazioniClose} />}
      <Footer />
    </div>
  );
}

export default Dashboard;