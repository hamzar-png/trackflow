import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import './Impostazioni.css';

function Impostazioni({ onClose }) {
  const [logoAzienda, setLogoAzienda] = useState('');
  const [logoSfondo, setLogoSfondo] = useState('');
  const [glsSede, setGlsSede] = useState('');
  const [glsCodiceCliente, setGlsCodiceCliente] = useState('');
  const [glsPassword, setGlsPassword] = useState('');
  const [salvato, setSalvato] = useState(false);
  const [loading, setLoading] = useState(true);

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
    }
    setLoading(false);
  };

const handleSalva = async () => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    alert('Utente non trovato');
    return;
  }

  const { error } = await supabase
    .from('impostazioni')
    .upsert({
      user_id: user.id,
      logo_azienda: logoAzienda,
      logo_sfondo: logoSfondo,
      gls_username: glsCodiceCliente,
      gls_password: glsPassword,
      gls_sede: glsSede,
    });

  if (error) {
    alert('Errore salvataggio: ' + error.message);
  } else {
    setSalvato(true);
    setTimeout(() => setSalvato(false), 2000);
  }
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
          {/* Sezione GLS WebLabeling */}
          <div className="imp-section">
            <h3>📦 Account GLS WebLabeling</h3>
            <p className="imp-desc">Inserisci le credenziali del portale WebLabeling per l'import automatico.</p>
            <div className="imp-row">
              <div className="imp-group">
                <label>Sigla sede</label>
                <input type="text" value={glsSede} onChange={(e) => setGlsSede(e.target.value)} placeholder="es. AK" />
              </div>
              <div className="imp-group">
                <label>Codice cliente</label>
                <input type="text" value={glsCodiceCliente} onChange={(e) => setGlsCodiceCliente(e.target.value)} placeholder="es. 4859" />
              </div>
              <div className="imp-group">
                <label>Password</label>
                <input type="password" value={glsPassword} onChange={(e) => setGlsPassword(e.target.value)} placeholder="Password WebLabeling" />
              </div>
            </div>
          </div>

          {/* Sezione Branding */}
          <div className="imp-section">
            <h3>🎨 Branding</h3>
            <p className="imp-desc">Personalizza TrackFlow con il tuo logo.</p>
            <div className="imp-row">
              <div className="imp-group">
                <label>Logo in alto (URL)</label>
                <input type="text" value={logoAzienda} onChange={(e) => setLogoAzienda(e.target.value)} placeholder="https://esempio.com/logo.png" />
                {logoAzienda && <img src={logoAzienda} alt="Anteprima" className="imp-preview" />}
              </div>
              <div className="imp-group">
                <label>Logo sfondo (URL)</label>
                <input type="text" value={logoSfondo} onChange={(e) => setLogoSfondo(e.target.value)} placeholder="https://esempio.com/sfondo.png" />
                {logoSfondo && <img src={logoSfondo} alt="Anteprima" className="imp-preview" />}
              </div>
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