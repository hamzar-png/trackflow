import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import './Registrazione.css';
import Footer from '../components/Footer';

function Registrazione() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    nomeAzienda: '',
    email: '',
    password: '',
    confermaPassword: '',
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (!formData.nomeAzienda || !formData.email || !formData.password) {
      setError('Compila tutti i campi obbligatori.');
      setLoading(false);
      return;
    }

    if (formData.password !== formData.confermaPassword) {
      setError('Le password non corrispondono.');
      setLoading(false);
      return;
    }

    if (formData.password.length < 6) {
      setError('La password deve essere di almeno 6 caratteri.');
      setLoading(false);
      return;
    }

    const { data, error: signUpError } = await supabase.auth.signUp({
      email: formData.email,
      password: formData.password,
      options: {
        data: {
          nome_azienda: formData.nomeAzienda,
        },
      },
    });

    if (signUpError) {
      setError(signUpError.message);
      setLoading(false);
      return;
    }

    if (data?.user) {
      setSuccess(true);
      setTimeout(() => {
        navigate('/');
      }, 3000);
    }

    setLoading(false);
  };

  if (success) {
    return (
      <>
        <div className="registrazione-container">
          <div className="registrazione-box">
            <h1 className="registrazione-logo">TrackFlow</h1>
            <div className="success-message">
              <span className="success-icon">✅</span>
              <h2>Registrazione completata!</h2>
              <p>Controlla la tua email per verificare l'account.</p>
              <p className="redirect-text">Verrai reindirizzato al login...</p>
            </div>
          </div>
        </div>
        <Footer />
      </>
    );
  }

  return (
    <>
      <div className="registrazione-container">
        <div className="registrazione-box">
          <h1 className="registrazione-logo">TrackFlow</h1>
          <p className="registrazione-subtitle">Registra la tua azienda</p>

          {error && <div className="error-message">{error}</div>}

          <form className="registrazione-form" onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="nomeAzienda">Nome azienda *</label>
              <input type="text" id="nomeAzienda" name="nomeAzienda" value={formData.nomeAzienda} onChange={handleChange} placeholder="Nome della tua azienda" required />
            </div>
            <div className="form-group">
              <label htmlFor="email">Email *</label>
              <input type="email" id="email" name="email" value={formData.email} onChange={handleChange} placeholder="nome@azienda.it" required />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="password">Password *</label>
                <input type="password" id="password" name="password" value={formData.password} onChange={handleChange} placeholder="Minimo 6 caratteri" required />
              </div>
              <div className="form-group">
                <label htmlFor="confermaPassword">Conferma password *</label>
                <input type="password" id="confermaPassword" name="confermaPassword" value={formData.confermaPassword} onChange={handleChange} placeholder="Ripeti la password" required />
              </div>
            </div>
            <button type="submit" className="registrazione-button" disabled={loading}>
              {loading ? 'Registrazione in corso...' : 'Registra azienda'}
            </button>
          </form>

          <p className="registrazione-login">
            Hai già un account?{' '}
            <span onClick={() => navigate('/')} className="link">Accedi</span>
          </p>
        </div>
      </div>
      <Footer />
    </>
  );
}

export default Registrazione;