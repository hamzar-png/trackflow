import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import './GestioneDestinatari.css';

function GestioneDestinatari() {
  const [destinatari, setDestinatari] = useState([]);
  const [mostraForm, setMostraForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    nome_azienda: '',
    email: '',
    password: '',
    confermaPassword: '',
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

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
      .order('created_at', { ascending: false });

    if (data) setDestinatari(data);
    setLoading(false);
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!formData.nome_azienda || !formData.email || !formData.password) {
      setError('Compila tutti i campi obbligatori.');
      return;
    }

    if (formData.password !== formData.confermaPassword) {
      setError('Le password non corrispondono.');
      return;
    }

    if (formData.password.length < 6) {
      setError('La password deve essere di almeno 6 caratteri.');
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error: insertError } = await supabase
      .from('destinatari')
      .insert([{
        nome_azienda: formData.nome_azienda,
        email: formData.email,
        password_hash: formData.password,
        mittente_id: user.id,
      }]);

    if (insertError) {
      setError('Errore: ' + insertError.message);
      return;
    }

    setSuccess('Destinatario creato con successo!');
    setFormData({ nome_azienda: '', email: '', password: '', confermaPassword: '' });
    setMostraForm(false);
    caricaDestinatari();
  };

  const eliminaDestinatario = async (id) => {
    if (!window.confirm('Eliminare questo destinatario? Non potrà più accedere.')) return;

    await supabase.from('destinatari').delete().eq('id', id);
    setDestinatari(destinatari.filter(d => d.id !== id));
  };

  if (loading) return <p style={{ color: '#94a3b8', padding: '20px' }}>Caricamento...</p>;

  return (
    <div className="gestione-container">
      <div className="gestione-header">
        <h3>Gestione Destinatari</h3>
        <p className="gestione-subtitle">
          Crea account per i tuoi clienti. Potranno accedere e vedere solo le spedizioni che gli assegnerai.
        </p>
      </div>

      <button
        className="gestione-add-btn"
        onClick={() => {
          setMostraForm(!mostraForm);
          setError('');
          setSuccess('');
        }}
      >
        {mostraForm ? '✕ Chiudi' : '+ Nuovo destinatario'}
      </button>

      {success && <div className="gestione-success">{success}</div>}
      {error && <div className="gestione-error">{error}</div>}

      {mostraForm && (
        <form className="gestione-form" onSubmit={handleSubmit}>
          <div className="gestione-form-row">
            <div className="gestione-form-group">
              <label>Nome azienda *</label>
              <input
                type="text"
                name="nome_azienda"
                value={formData.nome_azienda}
                onChange={handleChange}
                placeholder="Es. Loccioni"
                required
              />
            </div>
            <div className="gestione-form-group">
              <label>Email *</label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="cliente@azienda.it"
                required
              />
            </div>
          </div>
          <div className="gestione-form-row">
            <div className="gestione-form-group">
              <label>Password *</label>
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="Minimo 6 caratteri"
                required
              />
            </div>
            <div className="gestione-form-group">
              <label>Conferma password *</label>
              <input
                type="password"
                name="confermaPassword"
                value={formData.confermaPassword}
                onChange={handleChange}
                placeholder="Ripeti la password"
                required
              />
            </div>
          </div>
          <div className="gestione-form-actions">
            <button type="submit" className="gestione-salva-btn">Crea destinatario</button>
          </div>
        </form>
      )}

      <div className="gestione-table-wrapper">
        <table className="gestione-table">
          <thead>
            <tr>
              <th>Azienda</th>
              <th>Email</th>
              <th>Creato il</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {destinatari.length === 0 ? (
              <tr>
                <td colSpan="4" style={{ textAlign: 'center', color: '#64748b', padding: '20px' }}>
                  Nessun destinatario creato.
                </td>
              </tr>
            ) : (
              destinatari.map((dest) => (
                <tr key={dest.id}>
                  <td>{dest.nome_azienda}</td>
                  <td>{dest.email}</td>
                  <td>{new Date(dest.created_at).toLocaleDateString('it-IT')}</td>
                  <td>
                    <button
                      className="gestione-elimina-btn"
                      onClick={() => eliminaDestinatario(dest.id)}
                    >
                      🗑️
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default GestioneDestinatari;