import { useNavigate } from 'react-router-dom';
import './Home.css';
import Footer from '../components/Footer';

function Home() {
  const navigate = useNavigate();

  return (
    <div className="home-container">
      <h1 className="home-logo">TrackFlow</h1>
      <p className="home-subtitle">Scegli come accedere</p>

      <div className="home-grid">
        <div className="home-card" onClick={() => navigate('/login/mittente')}>
          <div className="home-icon">📦</div>
          <h2>Mittente</h2>
          <p>Sei un'azienda che spedisce merce?<br />Accedi o registrati per gestire le tue spedizioni.</p>
          <span className="home-link">Accedi / Registrati →</span>
        </div>

        <div className="home-card" onClick={() => navigate('/login/destinatario')}>
          <div className="home-icon">🏠</div>
          <h2>Destinatario</h2>
          <p>Aspetti una consegna?<br />Accedi con le credenziali fornite dal tuo mittente.</p>
          <span className="home-link">Accedi →</span>
        </div>
      <Footer />
      </div>
    </div>
  );
}

export default Home;