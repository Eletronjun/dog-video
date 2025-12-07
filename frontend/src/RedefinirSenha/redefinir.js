import React, { useState, useRef, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FaEye, FaEyeSlash, FaExclamationCircle } from 'react-icons/fa';
import './redefinir.css';

function Redefinir() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [alterarSenha, setAlterarSenha] = useState(null);
  const [termoAceito, setTermoAceito] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState({ newPassword: false, confirmPassword: false });
  const passwordInputRef = useRef(null);

  useEffect(() => {
    const id_cliente = localStorage.getItem('id_cliente');
    if (!id_cliente) {
      navigate('/login');
      return;
    }

    const fetchPasswordType = async () => {
      try {
        const response = await fetch(`http://localhost:3001/clientes/${id_cliente}`);
        if (!response.ok) throw new Error('Erro na resposta da API');
        
        const data = await response.json();
        if (data?.cliente?.alterar_senha !== undefined) {
          setAlterarSenha(data.cliente.alterar_senha);
        } else {
          setError('Erro ao carregar configurações de senha');
        }
      } catch (error) {
        console.error('Erro ao buscar cliente:', error);
        setError('Falha na conexão com o servidor');
      }
    };
    
    fetchPasswordType();
  }, [navigate]);

  const handlePasswordChange = async () => {
    if (!newPassword || !confirmPassword) {
      setError('Todos os campos são obrigatórios.');
      return;
    }

    if (newPassword.length < 6) {
      setError('Sua senha deve ter pelo menos 6 caracteres.');
      return;
    }

    if (newPassword === 'dog123') {
      setError('Sua senha deve ser diferente da inicial.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('As senhas não coincidem.');
      return;
    }

    if (alterarSenha === 1 && !termoAceito) {
      setError('Você precisa aceitar a Política de Privacidade antes de redefinir a senha.');
      return;
    }

    try {
      

      // Envia a nova senha e o aceite dos termos
      const id_cliente = localStorage.getItem('id_cliente');

      const response = await fetch('http://localhost:3001/alterar-senha', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          novaSenha: newPassword,
          id_cliente: id_cliente, 
          aceitou_termos: termoAceito,
        }),
      });


      const data = await response.json();

      if (data.success) {
        setError('');
        navigate('/');
      } else {
        setError(data.message);
      }
    } catch (error) {
      console.error('Erro ao redefinir a senha:', error);
    }
  };

  const handleKeyDown = (event, field) => {
    if (event.key === 'Enter') {
      if (field === 'newPassword') {
        passwordInputRef.current.focus();
      } else if (field === 'confirmPassword') {
        handlePasswordChange();
      }
    }
  };

  const togglePasswordVisibility = (field) => {
    setShowPassword((prevState) => ({
      ...prevState,
      [field]: !prevState[field],
    }));
  };

  return (
    <div className="Redefinir">
      {alterarSenha === 0 && (
        <header className="redefinir-header">
          <img
            src="/Back.svg"
            alt="Ícone de voltar"
            className="back-icon"
            onClick={() => navigate(-1)}
          />
        </header>
      )}
      <div className="warning-text">
        <FaExclamationCircle className="icon" />
        <p style={{ fontWeight: 'bold' }}>
          Cadastre sua nova senha. Por segurança, use pelo menos 6 caracteres.
        </p>
      </div>

      <label htmlFor="newPassword">Nova senha</label>
      <div className="password-container">
        <input
          type={showPassword.newPassword ? 'text' : 'password'}
          placeholder="Insira a sua nova senha"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          onKeyDown={(e) => handleKeyDown(e, 'newPassword')}
        />
        <span
          className="password-toggle-icon"
          onClick={() => togglePasswordVisibility('newPassword')}
          style={{ color: 'black' }}
        >
          {showPassword.newPassword ? <FaEye /> : <FaEyeSlash />}
        </span>
      </div>

      <label htmlFor="confirmPassword">Confirme sua senha</label>
      <div className="password-container">
        <input
          type={showPassword.confirmPassword ? 'text' : 'password'}
          placeholder="Confirme sua nova senha"
          value={confirmPassword}
          ref={passwordInputRef}
          onChange={(e) => setConfirmPassword(e.target.value)}
          onKeyDown={(e) => handleKeyDown(e, 'confirmPassword')}
        />
        <span
          className="password-toggle-icon"
          onClick={() => togglePasswordVisibility('confirmPassword')}
          style={{ color: 'black' }}
        >
          {showPassword.confirmPassword ? <FaEye /> : <FaEyeSlash />}
        </span>
      </div>

      {/* Checkbox dos Termos de Uso */}
      {alterarSenha === 1 && (
        <div className="checkbox-termos">
          <input
            type="checkbox"
            id="termoUso"
            checked={termoAceito}
            onChange={(e) => setTermoAceito(e.target.checked)}
          />
          <label htmlFor="termoUso">
            Eu li e aceito os{" "}
            <a
              href={`${process.env.PUBLIC_URL}/termos-de-uso.html`}
              target="_blank"
              rel="noopener noreferrer"
            >
              Termos de Uso
            </a>
          </label>
        </div>
      )}

      {error && <p className="error">{error}</p>}
      <button onClick={handlePasswordChange}>Redefinir</button>
    </div>
  );
}

export default Redefinir;
