import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import './Login.css';
import Footer from '../components/Footer';

function Login({ onLogin }) {
  const { tipo } = useParams(); // 'mittente' o 'destinatario'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const isMittente = tipo === 'mittente';

const handleSubmit = async (e) => {
  e.preventDefault();
  setError('');
  setLoading(true);

  if (!email || !password) {
    setError('Inserisci email e password.');
    setLoading(false);
    return;
  }

  const result = await onLogin(email, password, tipo);
  if (!result.success) {
    setError(result.message || 'Credenziali non valide.');
  }
  // Se successo, App.jsx si occuperà del redirect
  setLoading(false);
};

  return (
    <div className="login-container">
      <div className="login-box">
        <h1 className="login-logo">TrackFlow</h1>
        <p className="login-subtitle">
          {isMittente ? 'Accesso Mittente' : 'Accesso Destinatario'}
        </p>

        {error && <div className="login-error">{error}</div>}

        <form className="login-form" onSubmit={handleSubmit}>
          <label htmlFor="email">{isMittente ? 'Email' : 'Username'}</label>
<input
  type={isMittente ? 'email' : 'text'}
  id="email"
  placeholder={isMittente ? 'nome@azienda.it' : 'Il tuo username'}
  value={email}
  onChange={(e) => setEmail(e.target.value)}
  required
/>

          <label htmlFor="password">Password</label>
          <input
            type="password"
            id="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          <button type="submit" className="login-button" disabled={loading}>
            {loading ? 'Accesso in corso...' : 'Accedi'}
          </button>
        </form>

        <p className="login-register">
          {isMittente ? (
            <>
              Non hai un account?{' '}
              <span onClick={() => navigate('/register')} className="login-link">
                Registra la tua azienda
              </span>
            </>
          ) : (
            <>
              <span onClick={() => navigate('/')} className="login-link">
                ← Torna alla home
              </span>
            </>
          )}
        </p>
      </div>

      <Footer />
    </div>
  );
}

export default Login;