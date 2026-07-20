import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Web from './TelaInicial/Web';
import Login from './Login/login';
import DadosCliente from './DadosCliente/dados';
import Admin from './TelaInicialAdmin/admin';
import Clientes from './Clientes/clientes';
import Passeadores from './Passeadores/passeadores';
import CriarCliente from './CriarCliente/criarcliente';
import VisualizarCliente from './VisualizarCliente/visualizarcliente';
import CriarPasseador from './CriarPasseador/criarpasseador';
import EditarCliente from './EditarCliente/editarcliente';
import Cameras from './Cameras/cameras';
import VisualizarPasseador from './VisualizarPasseador/visualizarpasseador';
import EditarPasseador from './EditarPasseador/editarpasseador';
import RedefinirSenha from './RedefinirSenha/redefinir';
import reportWebVitals from './reportWebVitals';
import Modal from 'react-modal';
import ProtectedRoute from './ProtectedRoute';

const root = ReactDOM.createRoot(document.getElementById('root'));
Modal.setAppElement('#root');

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userRole, setUserRole] = useState('');

  // Verifica se há dados de autenticação válidos no localStorage (dentro de 1 hora)
  useEffect(() => {
    const storedData = localStorage.getItem('authData');
    if (storedData) {
      const authData = JSON.parse(storedData);
      const currentTime = Date.now();
      if (currentTime - authData.timestamp < 3600000) { // 1 hora = 3600000 ms
        setIsLoggedIn(true);
        setUserRole(authData.userType);
      } else {
        localStorage.removeItem('authData');
      }
    }
  }, []);

  // Função chamada após login bem-sucedido
  const handleLogin = (role, id_cliente) => {
    setIsLoggedIn(true);
    setUserRole(role);
    const authData = { id_cliente, userType: role, timestamp: Date.now() };
    localStorage.setItem('authData', JSON.stringify(authData));
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setUserRole('');
    localStorage.removeItem('authData');
  };

  useEffect(() => {
    const constraints = { video: true, audio: false };
    navigator.mediaDevices.getUserMedia(constraints).then((stream) => {
      const video1 = document.getElementById('camera1');
      const video2 = document.getElementById('camera2');
      if (video1) video1.srcObject = stream;
      if (video2) video2.srcObject = stream;
    });
  }, []);

  return (
    <React.StrictMode>
      <Router>
        <Routes>
          {/* Página inicial - Decide se exibe Web ou Admin dependendo do usuário */}
          <Route 
            path="/" 
            element={isLoggedIn ? (userRole === 'admin' ? <Admin onLogout={handleLogout} /> : <Web onLogout={handleLogout} />) : <Login onLogin={handleLogin} />}
          />

          {/* Áreas acessíveis APENAS para clientes */}
          <Route path="/Web" element={<ProtectedRoute element={<Web onLogout={handleLogout} />} allowedRoles={['user']} />} />
          <Route path="/dados-cliente/:id" element={<ProtectedRoute element={<DadosCliente />} allowedRoles={['user']} />} />
          <Route path="/cameras" element={<ProtectedRoute element={<Cameras onLogout={handleLogout} />} allowedRoles={['user']} />} />
          <Route path="/redefinir/:id" element={<ProtectedRoute element={<RedefinirSenha />} allowedRoles={['user']} />} />

          {/* Áreas acessíveis APENAS para admins */}
          <Route path="/admin" element={<ProtectedRoute element={<Admin onLogout={handleLogout} />} allowedRoles={['admin']} />} />
          <Route path="/clientes" element={<ProtectedRoute element={<Clientes />} allowedRoles={['admin']} />} />
          <Route path="/passeadores" element={<ProtectedRoute element={<Passeadores />} allowedRoles={['admin']} />} />
          <Route path="/criarcliente" element={<ProtectedRoute element={<CriarCliente />} allowedRoles={['admin']} />} />
          <Route path="/visualizarcliente/:id" element={<ProtectedRoute element={<VisualizarCliente />} allowedRoles={['admin']} />} />
          <Route path="/editarcliente/:id" element={<ProtectedRoute element={<EditarCliente />} allowedRoles={['admin']} />} />
          <Route path="/criarpasseador" element={<ProtectedRoute element={<CriarPasseador />} allowedRoles={['admin']} />} />
          <Route path="/visualizarpasseador/:id" element={<ProtectedRoute element={<VisualizarPasseador />} allowedRoles={['admin']} />} />
          <Route path="/editarpasseador/:id" element={<ProtectedRoute element={<EditarPasseador />} allowedRoles={['admin']} />} />
        </Routes>
      </Router>
    </React.StrictMode>
  );
}

root.render(<App />);
reportWebVitals();

async function subscribeUser(idCliente = null, idPasseador = null) {
  if ('serviceWorker' in navigator) {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey:
        'BBH2oyhNjmKPnyR140S375tVHFM1wuSd7GW7ijm90Ja7NB2eX67YQRbDLVyW_QrLqiDpbIy9QecaBDC_K1AWCro',
    });

    await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:3001'}/subscribe`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        subscription,
        id_cliente: idCliente,
        id_passeador: idPasseador,
      }),
    });
  }
}

// Solicitar permissão para notificações e registrar o Service Worker
if ('Notification' in window && 'serviceWorker' in navigator) {
  Notification.requestPermission().then((permission) => {
    if (permission === 'granted') {
      console.log('Permissão para notificações concedida.');
      navigator.serviceWorker
        .register('/sw.js')
        .then((registration) => {
          console.log('Service Worker registrado:', registration);
          const authData = localStorage.getItem('authData');
          const idCliente = authData ? JSON.parse(authData).id_cliente : null;
          subscribeUser(idCliente);
        })
        .catch((err) => {
          console.error('Erro ao registrar Service Worker:', err);
        });
    } else {
      console.log('Permissão para notificações negada.');
    }
  });
}