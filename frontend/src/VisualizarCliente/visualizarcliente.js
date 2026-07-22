import './visualizarcliente.css';
import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from "react-router-dom";
import { FaUser, FaEnvelope, FaAddressCard, FaDog, FaPhone, FaHome, FaCalendarAlt, FaClock, FaBook, FaUserAlt, FaCalendarDay } from "react-icons/fa";

function VisualizarCliente() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [cliente, setCliente] = useState(null);
  const [loading, setLoading] = useState(true);
  const [diasRestantes, setDiasRestantes] = useState(null);
  const [dataTermino, setDataTermino] = useState(null);

  useEffect(() => {
    const fetchCliente = async () => {
      try {
        const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:3001'}/clientes/${id}`);
        const data = await response.json();
  
        if (data.success) {
          setCliente(data.cliente);
          
          if (data.cliente.pacote === 'Temporario' && data.cliente.dias_teste) {
            const dataInicio = new Date(data.cliente.criado_em); // Data de início do teste
            if (!isNaN(dataInicio.getTime())) { // Verifica se a data é válida
              const dataTermino = new Date(dataInicio);
              dataTermino.setDate(dataInicio.getDate() + parseInt(data.cliente.dias_teste, 10)); // Adiciona os dias de teste

              const hoje = new Date();
              const diffTime = dataTermino.getTime() - hoje.getTime(); // Diferença em milissegundos
              const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); // Converte para dias

              setDiasRestantes(diffDays > 0 ? diffDays : 0); // Define dias restantes (0 se já expirou)
              setDataTermino(dataTermino.toLocaleDateString('pt-BR')); // Formata a data de término
            } else {
              console.error('Data inválida em criado_em:', data.cliente.criado_em);
              setDiasRestantes(0);
              setDataTermino('Data inválida');
            }
          }

          if (data.cliente.id_passeador) {
            localStorage.setItem('passeadorId', data.cliente.id_passeador);
          }

          // Busca o horário de passeio da tabela passeios
          const passeioResponse = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:3001'}/passeios/${id}`);
          const passeioData = await passeioResponse.json();
          if (passeioData.success) {
            setCliente((prevCliente) => ({
              ...prevCliente,
              horario_passeio: passeioData.horario_passeio.slice(0, 5), // Apenas horas e minutos
            }));
          }
        } else {
          console.error('Erro no servidor:', data.message);
        }
      } catch (error) {
        console.error('Erro ao buscar cliente:', error);
      } finally {
        setLoading(false);
      }
    };
  
    fetchCliente();
  }, [id]);
  
  if (loading) {
    return <div>Carregando...</div>; // Mensagem enquanto carrega
  }

  if (!cliente) {
    return <div>Cliente não encontrado</div>; // Caso o cliente não seja encontrado
  }

  return (
    <div className="Web-Visualizar-Cliente">
      <header className="Web-header">
        <img src="/logotipo.svg" className="Web-logotipo" alt="Dogvideo Logomarca" />
        <div className="footer-bar"></div>
      </header>

      <img
        src="/Back.svg"
        alt="Ícone de voltar"
        className="back-icon"
        onClick={() => navigate("/clientes")}
      />

      <div className="form-container">
        <div className="client-form">
          <div className="input-container">
            <FaUser className="input-icon" />
            <span className="form-input">{cliente.nome}</span> {/* Nome do cliente */}
          </div>
          <div className="input-container">
            <FaEnvelope className="input-icon" />
            <span className="form-input">{cliente.email}</span> {/* Email do cliente */}
          </div>
          <div className="input-container">
            <FaAddressCard className="input-icon" />
            <span className="form-input">{cliente.cpf}</span> {/* CPF do cliente */}
          </div>
          <div className="input-container">
            <FaDog className="input-icon" />
            <span className="form-input">{cliente.caes.join(', ')}</span> {/* Lista de cães */}
          </div>
          <div className="input-container">
            <FaPhone className="input-icon" />
            <span className="form-input">{cliente.telefone}</span> {/* Telefone do cliente */}
          </div>
          <div className="input-container">
            <FaHome className="input-icon" />
            <span className="form-input">{cliente.endereco}</span> {/* Endereço do cliente */}
          </div>
          <div className="input-container">
            <FaUserAlt className="input-icon" />
            <span className="form-input">{cliente.passeador}</span> {/* Passeador do cliente */}
          </div>
          <div className="input-container">
            <FaCalendarAlt className="input-icon" />
            <span className="form-input">{cliente.pacote}</span> {/* Pacote do cliente */}
          </div>
          {cliente.pacote === 'Temporario' && cliente.dias_teste && (
            <div className="input-container">
              <FaCalendarDay className="input-icon" />
              <span className="form-input">
                {diasRestantes !== null && diasRestantes > 0 ? (
                  `Faltam ${diasRestantes} dias (termina em ${dataTermino})`
                ) : diasRestantes === 0 ? (
                  `Termina hoje (${dataTermino})`
                ) : (
                  `Teste expirado (terminou em ${dataTermino})`
                )}
              </span>
            </div>
          )}
          <div className="input-container">
            <FaClock className="input-icon" />
            <span className="form-input">{cliente.horario_passeio || 'Horário não definido'}</span> {/* Horário de passeio */}
          </div>
          <div className="input-container">
            <FaBook className="input-icon" />
            <span className="form-textarea">{cliente.anotacoes}</span> {/* Anotações */}
          </div>

          <div className="button-group">
            <button
              type="button"
              className="edit-button"
              onClick={() => navigate(`/editarcliente/${id}`)} // Navegar para a tela de edição
            >
              Editar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default VisualizarCliente;