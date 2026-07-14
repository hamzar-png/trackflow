import { Routes, Route, Navigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import Home from './pages/Home';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import DettaglioSpedizione from './pages/DettaglioSpedizione';
import Registrazione from './pages/Registrazione';

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [ruolo, setRuolo] = useState('');
  const [azienda, setAzienda] = useState('');
  const [spedizioni, setSpedizioni] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        const ruoloUtente = session.user.user_metadata?.ruolo || 'mittente';
        setRuolo(ruoloUtente);
        setAzienda(session.user.user_metadata?.nome_azienda || session.user.email.split('@')[0]);
        setIsLoggedIn(true);
        if (ruoloUtente === 'mittente') {
          caricaSpedizioniMittente(session.user.id);
        } else {
          caricaSpedizioniDestinatario(session.user.email);
        }
      } else {
        setLoading(false);
      }
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        const ruoloUtente = session.user.user_metadata?.ruolo || 'mittente';
        setRuolo(ruoloUtente);
        setAzienda(session.user.user_metadata?.nome_azienda || session.user.email.split('@')[0]);
        setIsLoggedIn(true);
        if (ruoloUtente === 'mittente') {
          caricaSpedizioniMittente(session.user.id);
        } else {
          caricaSpedizioniDestinatario(session.user.email);
        }
      } else {
        setIsLoggedIn(false);
        setRuolo('');
        setAzienda('');
        setSpedizioni([]);
      }
    });

    return () => listener?.subscription.unsubscribe();
  }, []);

  const caricaSpedizioniMittente = async (userId) => {
    const { data } = await supabase
      .from('spedizioni')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (data) setSpedizioni(data);
    setLoading(false);
  };

  const caricaSpedizioniDestinatario = async (email) => {
    const { data: dest } = await supabase
      .from('destinatari')
      .select('id')
      .eq('email', email)
      .single();

    if (dest) {
      const { data } = await supabase
        .from('spedizioni')
        .select('*')
        .eq('destinatario_id', dest.id)
        .order('created_at', { ascending: false });

      if (data) setSpedizioni(data);
    }
    setLoading(false);
  };

  const handleLogin = async (email, password, tipo) => {
    if (tipo === 'mittente') {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        return { success: false, message: error.message };
      }
      if (data.user) {
        setRuolo('mittente');
        setAzienda(data.user.user_metadata?.nome_azienda || email.split('@')[0]);
        setIsLoggedIn(true);
        caricaSpedizioniMittente(data.user.id);
      }
      return { success: true };
    } else {
      const { data: dest, error } = await supabase
        .from('destinatari')
        .select('*')
        .eq('email', email)
        .single();

      if (error || !dest) {
        return { success: false, message: 'Credenziali non valide.' };
      }

      if (dest.password_hash !== password) {
        return { success: false, message: 'Password non valida.' };
      }

      localStorage.setItem('destinatario', JSON.stringify({
        email: dest.email,
        nome_azienda: dest.nome_azienda,
        id: dest.id,
      }));

      setRuolo('destinatario');
      setAzienda(dest.nome_azienda);
      setIsLoggedIn(true);
      caricaSpedizioniDestinatario(dest.email);
      return { success: true };
    }
  };

  const handleLogout = async () => {
    if (ruolo === 'destinatario') {
      localStorage.removeItem('destinatario');
    }
    await supabase.auth.signOut();
    setIsLoggedIn(false);
    setRuolo('');
    setAzienda('');
    setSpedizioni([]);
  };

  const aggiungiSpedizione = async (nuovaSpedizione) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const spedizioneCompleta = {
      tracking_id: nuovaSpedizione.id,
      cliente: nuovaSpedizione.cliente,
      corriere: nuovaSpedizione.corriere,
      tracking: nuovaSpedizione.tracking,
      stato: nuovaSpedizione.stato,
      data: nuovaSpedizione.data,
      tipo: nuovaSpedizione.tipo,
      ddt: nuovaSpedizione.ddt || '',
      partenza: nuovaSpedizione.partenza || '',
      destinazione: nuovaSpedizione.destinazione || '',
      note: nuovaSpedizione.note || '',
      user_id: user.id,
      destinatario_id: nuovaSpedizione.destinatario_id || null,
    };

    const { data, error } = await supabase
      .from('spedizioni')
      .insert([spedizioneCompleta])
      .select()
      .single();

    if (error) {
      console.error('Errore inserimento:', error);
      alert('Errore durante il salvataggio: ' + error.message);
      return;
    }

    if (data) {
      setSpedizioni([data, ...spedizioni]);
    }
  };

  const importaDaGLS = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

     const { data: imp } = await supabase
  .from('impostazioni')
  .select('gls_username, gls_password, gls_sede')
  .eq('user_id', user.id)
  .single();

if (!imp || !imp.gls_sede || !imp.gls_username || !imp.gls_password) {
  alert('Inserisci tutte le credenziali GLS nelle impostazioni (⚙️)');
  return;
}

      const response = await fetch('/api/gls-import', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    sede: imp.gls_sede,
    codiceCliente: imp.gls_username,
    password: imp.gls_password,
  }),
});

      const data = await response.json();
if (!response.ok || data.error) {
  alert('Errore: ' + (data.error || 'Sconosciuto'));
  return;
}

if (data.spedizioni && data.spedizioni.length > 0) {
  const { data: { user } } = await supabase.auth.getUser();

  for (const item of data.spedizioni) {
    const nuovaSpedizione = {
      tracking_id: 'TRK-' + String(Math.floor(Math.random() * 1000)).padStart(3, '0'),
      cliente: item.cliente,
      corriere: 'GLS',
      tracking: item.tracking,
      stato: item.stato || 'In transito',
      data: item.data || new Date().toLocaleDateString('it-IT'),
      tipo: 'tracking',
      ddt: '',
      partenza: '',
      destinazione: '',
      note: '',
      user_id: user.id,
    };

    await supabase.from('spedizioni').insert([nuovaSpedizione]);
  }

  caricaSpedizioniMittente(user.id);
  alert('Importazione completata! ' + data.spedizioni.length + ' spedizioni importate.');
} else {
  alert('Login riuscito ma nessuna spedizione trovata. Dati: ' + JSON.stringify(data).substring(0, 300));
}
    } catch (error) {
      console.error('Errore import GLS:', error);
      alert('Errore: ' + error.message);
    }
  };

  const eliminaSpedizione = async (trackingId) => {
    await supabase.from('spedizioni').delete().eq('tracking_id', trackingId);
    setSpedizioni(spedizioni.filter(s => s.tracking_id !== trackingId));
  };

  const modificaSpedizione = async (trackingId, datiAggiornati) => {
    const { data } = await supabase
      .from('spedizioni')
      .update(datiAggiornati)
      .eq('tracking_id', trackingId)
      .select()
      .single();

    if (data) {
      setSpedizioni(spedizioni.map(s => s.tracking_id === trackingId ? data : s));
    }
  };

  if (loading) {
    return (
      <div style={{
        background: '#0f172a', minHeight: '100vh', display: 'flex',
        justifyContent: 'center', alignItems: 'center', color: '#94a3b8', fontSize: '1.2rem',
      }}>
        Caricamento...
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/register" element={<Registrazione />} />
      <Route
        path="/login/:tipo"
        element={
          isLoggedIn ? (
            <Navigate to="/dashboard" />
          ) : (
            <Login onLogin={handleLogin} />
          )
        }
      />
      <Route
        path="/dashboard"
        element={
          isLoggedIn ? (
            <Dashboard
              azienda={azienda}
              onLogout={handleLogout}
              spedizioni={spedizioni}
              onAggiungiSpedizione={ruolo === 'mittente' ? aggiungiSpedizione : null}
              onEliminaSpedizione={ruolo === 'mittente' ? eliminaSpedizione : null}
              onImportaGLS={ruolo === 'mittente' ? importaDaGLS : null}
              ruolo={ruolo}
            />
          ) : (
            <Navigate to="/" />
          )
        }
      />
      <Route
        path="/dettaglio/:trackingId"
        element={
          isLoggedIn ? (
            <DettaglioSpedizione
              spedizioni={spedizioni}
              onElimina={ruolo === 'mittente' ? eliminaSpedizione : null}
              onModifica={ruolo === 'mittente' ? modificaSpedizione : null}
              ruolo={ruolo}
            />
          ) : (
            <Navigate to="/" />
          )
        }
      />
    </Routes>
  );
}

export default App;