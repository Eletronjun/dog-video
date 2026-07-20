import './editarcliente.css';
import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from "react-router-dom";
import { FaUser, FaEnvelope, FaAddressCard, FaDog, FaPhone, FaHome, FaCalendarAlt, FaClock, FaBook, FaUserAlt } from "react-icons/fa";
import CustomSelect from '../utils/CustomSelect';

function EditarCliente() {
  const navigate = useNavigate();
  const { id } = useParams(); // Captura o ID da URL
  const [cliente, setCliente] = useState({
    nome: '',
    email: '',
    cpf: '',
    telefone: '',
    endereco: '',
    anotacoes: '',
    caes: '',
    horario_passeio: '',
    pacote: '',
    dias_teste: '',
  }); // Estado para armazenar os dados do cliente
  const [loading, setLoading] = useState(true); // Controla o estado de carregamento
  const [passeadores, setPasseadores] = useState([]); // Lista de passeadores
  const [selectedPasseadorId, setSelectedPasseadorId] = useState(""); // Passeador selecionado
  
  // Estados para validação
  const [nomeError, setNomeError] = useState('');
  const [emailError, setEmailError] = useState('');
  const [cpfError, setCpfError] = useState('');
  const [telefoneError, setTelefoneError] = useState('');
  const [horarioError, setHorarioError] = useState('');

  // Formatando dados para o componente CustomSelect
  const passeadoresOptions = Array.isArray(passeadores)
    ? passeadores.map((p) => ({ value: p.id, label: p.nome }))
    : [];

  const pacoteOptions = [
    { value: 'Trimestral', label: 'Trimestral' },
    { value: 'Mensal', label: 'Mensal' },
    { value: 'Temporario', label: 'Temporário' },
  ];

  const validateNome = (nome) => {
    if (!/^[A-ZÀ-Ÿ][a-zà-ÿ]{1,}/.test(nome)) {
      setNomeError('O nome deve começar com letra maiúscula e ter pelo menos 2 caracteres');
      return false;
    }
    setNomeError('');
    return true;
  };

  const validateEmail = (email) => {
    if (!/\S+@\S+\.\S+/.test(email)) {
      setEmailError('Email inválido');
      return false;
    }
    setEmailError('');
    return true;
  };

  const validateCPF = (cpf) => {
    const cleaned = cpf.replace(/\D/g, '');
    if (cleaned.length !== 11 || /^(\d)\1+$/.test(cleaned)) {
      setCpfError('CPF inválido');
      return false;
    }
    setCpfError('');
    return true;
  };

  const validateTelefone = (telefone) => {
    const cleaned = telefone.replace(/\D/g, '');
    if (!/^\d{11}$/.test(cleaned)) {
      setTelefoneError('Telefone deve ter DDD e 9 dígitos');
      return false;
    }
    setTelefoneError('');
    return true;
  };

  const validateHorario = (horario) => {
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(horario)) {
      setHorarioError('Horário inválido (use o formato HH:MM)');
      return false;
    }
    setHorarioError('');
    return true;
  };

  const formatCPF = (cpf) => {
    const cleaned = cpf.replace(/\D/g, '');
    const match = cleaned.match(/^(\d{3})(\d{3})(\d{3})(\d{2})$/);
    if (match) {
      return `${match[1]}.${match[2]}.${match[3]}-${match[4]}`;
    }
    return cpf;
  };

  const formatTelefone = (telefone) => {
    const cleaned = telefone.replace(/\D/g, '');
    const match = cleaned.match(/^(\d{2})(\d{5})(\d{4})$/);
    if (match) {
      return `(${match[1]}) ${match[2]}-${match[3]}`;
    }
    return telefone;
  };

  const formatHorario = (horario) => {
    const cleaned = horario.replace(/\D/g, '');
    const match = cleaned.match(/^(\d{2})(\d{2})$/);
    if (match) {
      return `${match[1]}:${match[2]}`;
    }
    return horario;
  };

  const handleResetPassword = async (e) => {
    e.preventDefault(); 
  
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:3001'}/clientes/${id}/reset-senha`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
      });
  
      const data = await response.json();
  
      if (data.success) {
        alert('Senha redefinida com sucesso!');
      } else {
        console.error('Erro ao resetar senha:', data.message);
        alert('Erro ao resetar senha.');
      }
    } catch (error) {
      console.error('Erro ao processar reset de senha:', error);
      alert('Erro ao processar reset de senha.');
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        // Busca os dados do cliente
        const clienteResponse = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:3001'}/clientes/${id}`);
        const clienteData = await clienteResponse.json();

        if (clienteData.success && clienteData.cliente) {
          const { nome, email, cpf, telefone, endereco, anotacoes, caes, horario_passeio, pacote, dias_teste, passeador } = clienteData.cliente;

          // Atualiza o estado do cliente
          setCliente({
            nome: nome || '',
            email: email || '',
            cpf: formatCPF(cpf) || '',
            telefone: formatTelefone(telefone) || '',
            endereco: endereco || '',
            anotacoes: anotacoes || '',
            caes: caes ? caes.join(', ') : '',
            horario_passeio: horario_passeio || '',
            pacote: pacote || '',
            dias_teste: dias_teste || '',
          });

          // Define o passeador selecionado
          const passeadorId = passeador ? passeadores.find(p => p.nome === passeador)?.id : '';
          setSelectedPasseadorId(passeadorId || '');
        } else {
          console.error('Erro: Cliente não encontrado ou resposta inesperada', clienteData);
        }

        // Busca a lista de passeadores
        const passeadoresResponse = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:3001'}/passeadores`);
        const passeadoresData = await passeadoresResponse.json();

        if (passeadoresData.success && Array.isArray(passeadoresData.passeadores)) {
          setPasseadores(passeadoresData.passeadores);

          // Atualiza o passeador selecionado após carregar a lista de passeadores
          const passeadorId = clienteData.cliente.passeador
            ? passeadoresData.passeadores.find(p => p.nome === clienteData.cliente.passeador)?.id
            : '';
          setSelectedPasseadorId(passeadorId || '');
        } else {
          console.error('Erro ao buscar passeadores ou resposta inesperada', passeadoresData);
        }
      } catch (error) {
        console.error('Erro ao buscar dados:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (loading) {
    return <div>Carregando...</div>;
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    
    // Aplica formatação automaticamente para alguns campos
    let formattedValue = value;
    if (name === 'cpf') {
      formattedValue = formatCPF(value);
      validateCPF(value);
    } else if (name === 'telefone') {
      formattedValue = formatTelefone(value);
      validateTelefone(value);
    } else if (name === 'horario_passeio') {
      formattedValue = formatHorario(value);
      validateHorario(value);
    } else if (name === 'nome') {
      validateNome(value);
    } else if (name === 'email') {
      validateEmail(value);
    }

    setCliente((prevCliente) => ({
      ...prevCliente,
      [name]: formattedValue,
    }));
  };

  const handleSave = async (e) => {
    e.preventDefault();

    // Validações antes de salvar
    const isNomeValid = validateNome(cliente.nome);
    const isEmailValid = validateEmail(cliente.email);
    const isCPFValid = validateCPF(cliente.cpf);
    const isTelefoneValid = validateTelefone(cliente.telefone);
    const isHorarioValid = validateHorario(cliente.horario_passeio);

    if (!isNomeValid || !isEmailValid || !isCPFValid || !isTelefoneValid || !isHorarioValid) {
      alert('Por favor, corrija os erros destacados antes de salvar.');
      return;
    }

    try {
      const updatedCliente = {
        ...cliente,
        cpf: cliente.cpf.replace(/\D/g, ''),
        telefone: cliente.telefone.replace(/\D/g, ''),
        caes: cliente.caes.split(',').map((cao) => cao.trim()),
        id_passeador: selectedPasseadorId || null,
      };

      console.log('Enviando dados para atualização:', updatedCliente);

      // Atualiza os dados do cliente
      const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:3001'}/clientes/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updatedCliente),
      });

      if (!response.ok) {
        const data = await response.json();
        if (data.message) {
          alert('Erro: ' + data.message); // Mensagem detalhada
        } else {
          alert('Erro ao atualizar cliente: ' + (data.message || 'Erro desconhecido'));
        }
        return;
      }

      // Atualiza o horário de passeio na tabela passeios
      const passeioResponse = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:3001'}/passeios/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ horario_passeio: cliente.horario_passeio, id_passeador: selectedPasseadorId }),
      });

      if (!passeioResponse.ok) {
        const passeioData = await passeioResponse.json();
        console.error('Erro ao atualizar horário de passeio:', passeioData);
        alert('Erro ao atualizar horário de passeio: ' + (passeioData.message || 'Erro desconhecido'));
        return;
      }

      navigate(`/visualizarcliente/${id}`);
    } catch (error) {
      console.error('Erro ao enviar os dados do cliente:', error);
      alert('Erro ao conectar com o servidor. Tente novamente mais tarde.');
    }
  };

  return (
    <div className="Web-Editar-Cliente">
      <header className="Web-header">
        <img src="/logotipo.svg" className="Web-logotipo" alt="Dogvideo Logomarca" />
        <button type="button" className="r-password-button" onClick={handleResetPassword}>
          Resetar Senha
        </button>
        <div className="footer-bar"></div>
      </header>

      <div className="form-container">
        <form className="client-form" onSubmit={handleSave}>
          <div className="input-container">
            <FaUser className="input-icon" />
            <input
              name="nome"
              type="text"
              placeholder="Nome do cliente"
              className="form-input"
              value={cliente.nome}
              onChange={handleInputChange}
            />
          </div>
          {nomeError && <div className="error-message">{nomeError}</div>}
          
          <div className="input-container">
            <FaEnvelope className="input-icon" />
            <input
              name="email"
              type="email"
              placeholder="Email"
              className="form-input"
              value={cliente.email}
              onChange={handleInputChange}
            />
          </div>
          {emailError && <div className="error-message">{emailError}</div>}
          
          <div className="input-container">
            <FaAddressCard className="input-icon" />
            <input
              name="cpf"
              type="text"
              placeholder="CPF"
              className="form-input"
              value={cliente.cpf}
              onChange={handleInputChange}
            />
          </div>
          {cpfError && <div className="error-message">{cpfError}</div>}
          
          <div className="input-container">
            <FaDog className="input-icon" />
            <input
              name="caes"
              type="text"
              placeholder="Cães"
              className="form-input"
              value={cliente.caes}
              onChange={handleInputChange}
            />
          </div>
          
          <div className="input-container">
            <FaPhone className="input-icon" />
            <input
              name="telefone"
              type="tel"
              placeholder="Telefone"
              className="form-input"
              value={cliente.telefone}
              onChange={handleInputChange}
            />
          </div>
          {telefoneError && <div className="error-message">{telefoneError}</div>}
          
          <div className="input-container">
            <FaHome className="input-icon" />
            <input
              name="endereco"
              type="text"
              placeholder="Endereço"
              className="form-input"
              value={cliente.endereco}
              onChange={handleInputChange}
            />
          </div>
          
          <CustomSelect
            icon={<FaUserAlt />}
            placeholder="Selecione o Passeador"
            options={passeadoresOptions}
            value={selectedPasseadorId}
            onChange={(value) => setSelectedPasseadorId(value)}
          />

          <div className="input-container">
            <CustomSelect
              icon={<FaCalendarAlt />}
              placeholder="Selecione o Pacote"
              options={pacoteOptions}
              value={cliente.pacote}
              onChange={(value) => setCliente(prev => ({ ...prev, pacote: value }))}
            />
            {cliente.pacote === 'Temporario' && (
              <div className="input-container temporary-days-input">
                <input
                  name="dias_teste"
                  type="number"
                  placeholder="Dias de teste"
                  className="form-input"
                  min="1"
                  value={cliente.dias_teste}
                  onChange={handleInputChange}
                />
              </div>
            )}
          </div>
          
          <div className="input-container">
            <FaClock className="input-icon" />
            <input
              name="horario_passeio"
              type="text"
              placeholder="Horário de passeio"
              className="form-input"
              value={cliente.horario_passeio}
              onChange={handleInputChange}
            />
          </div>
          {horarioError && <div className="error-message">{horarioError}</div>}
          
          <div className="input-container">
            <FaBook className="input-icon" />
            <textarea
              name="anotacoes"
              placeholder="Anotações"
              className="form-textarea"
              value={cliente.anotacoes}
              onChange={handleInputChange}
            />
          </div>

          <div className="button-group">
            <button type="button" className="cancel-button" onClick={() => navigate(`/visualizarcliente/${id}`)}>
              Cancelar
            </button>
            <button type="submit" className="create-button">
              Salvar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default EditarCliente;