import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import './Impostazioni.css';

function Impostazioni({ onClose }) {
  const [logoAzienda, setLogoAzienda] = useState('');
  const [logoSfondo, setLogoSfondo] = useState('');
  const [glsSede, setGlsSede] = useState('');
  const [glsCodiceCliente, setGlsCodiceCliente] = useState('');
  const [glsPassword, setGlsPassword] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [salvato, setSalvato] = useState(false);
  const [loading, setLoading] = useState(true);
  const [arcoUsername, setArcoUsername] = useState('');
  const [arcoPassword, setArcoPassword] = useState('');

  useEffect(() => {
    caricaImpostazioni();
  }, []);

  const caricaImpostazioni = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from('impostazioni')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (data) {
      setLogoAzienda(data.logo_azienda || '');
      setLogoSfondo(data.logo_sfondo || '');
      setGlsSede(data.gls_sede || '');
      setGlsCodiceCliente(data.gls_username || '');
      setGlsPassword(data.gls_password || '');
      setApiKey(data.api_key || '');
      setArcoUsername(data.arco_username || '');
      setArcoPassword(data.arco_password || '');
    }
    setLoading(false);
  };

  const handleSalva = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { alert('Utente non trovato'); return; }

    const { data: esistente } = await supabase
      .from('impostazioni')
      .select('id')
      .eq('user_id', user.id)
      .single();

    let error;
    const dati = {
      user_id: user.id,
      logo_azienda: logoAzienda,
      logo_sfondo: logoSfondo,
      gls_username: glsCodiceCliente,
      gls_password: glsPassword,
      gls_sede: glsSede,
      api_key: apiKey,
      arco_username: arcoUsername,
      arco_password: arcoPassword,
    };

    if (esistente) {
      const { error: updateError } = await supabase
        .from('impostazioni').update(dati).eq('user_id', user.id);
      error = updateError;
    } else {
      const { error: insertError } = await supabase
        .from('impostazioni').insert(dati);
      error = insertError;
    }

    if (error) { alert('Errore: ' + error.message); }
    else { setSalvato(true); setTimeout(() => setSalvato(false), 2000); }
  };

  if (loading) return <div className="imp-overlay"><p>Caricamento...</p></div>;

  return (
    <div className="imp-overlay" onClick={onClose}>
      <div className="imp-panel" onClick={(e) => e.stopPropagation()}>
        <div className="imp-header">
          <h2>⚙️ Impostazioni</h2>
          <button className="imp-close" onClick={onClose}>✕</button>
        </div>
        <div className="imp-body">
          <div className="imp-section">
            <h3>📦 Account GLS WebLabeling</h3>
            <p className="imp-desc">Inserisci le credenziali del portale WebLabeling per l'import automatico.</p>
            <div className="imp-row">
              <div className="imp-group"><label>Sigla sede</label><input type="text" value={glsSede} onChange={(e) => setGlsSede(e.target.value)} placeholder="es. AK" /></div>
              <div className="imp-group"><label>Codice cliente</label><input type="text" value={glsCodiceCliente} onChange={(e) => setGlsCodiceCliente(e.target.value)} placeholder="es. 4859" /></div>
              <div className="imp-group"><label>Password</label><input type="password" value={glsPassword} onChange={(e) => setGlsPassword(e.target.value)} placeholder="Password WebLabeling" /></div>
            </div>
          </div>
          <div className="imp-section">
            <h3>📦 Account Arco Spedizioni</h3>
            <p className="imp-desc">Inserisci le credenziali del portale Arco.</p>
            <div className="imp-row">
              <div className="imp-group"><label>Username / Codice cliente</label><input type="text" value={arcoUsername} onChange={(e) => setArcoUsername(e.target.value)} placeholder="es. 069077" /></div>
              <div className="imp-group"><label>Password</label><input type="password" value={arcoPassword} onChange={(e) => setArcoPassword(e.target.value)} placeholder="Password Arco" /></div>
            </div>
          </div>
          <div className="imp-section">
            <h3>🔑 API Key TrackFlow</h3>
            <p className="imp-desc">Usa questa chiave per collegare lo script Tampermonkey a TrackFlow.</p>
            <div className="imp-row">
              <div className="imp-group">
                <label>API Key</label>
                <input type="text" value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder="Genera una chiave unica" />
                {!apiKey && (
                  <button type="button" onClick={() => setApiKey('tf-' + Math.random().toString(36).substring(2, 10))}
                    style={{marginTop:'8px', padding:'6px 12px', background:'#38bdf8', color:'#0f172a', border:'none', borderRadius:'6px', cursor:'pointer'}}>
                    Genera chiave
                  </button>
                )}
              </div>
            </div>
          </div>
          <div className="imp-section">
            <h3>🎨 Branding</h3>
            <p className="imp-desc">Personalizza TrackFlow con il tuo logo.</p>
            <div className="imp-row">
              <div className="imp-group"><label>Logo in alto (URL)</label><input type="text" value={logoAzienda} onChange={(e) => setLogoAzienda(e.target.value)} placeholder="https://esempio.com/logo.png" /></div>
              <div className="imp-group"><label>Logo sfondo (URL)</label><input type="text" value={logoSfondo} onChange={(e) => setLogoSfondo(e.target.value)} placeholder="https://esempio.com/sfondo.png" /></div>
            </div>
          </div>
        </div>
        <div className="imp-footer">
          {salvato && <span className="imp-success">✅ Salvato!</span>}
          <button className="imp-save-btn" onClick={handleSalva}>Salva impostazioni</button>
        </div>
      </div>
    </div>
  );
}

export default Impostazioni;