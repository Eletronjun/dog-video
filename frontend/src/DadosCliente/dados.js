import "./dados.css";
import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Modal from "react-modal";

function Dados({ onLogout }) {
  const navigate = useNavigate();
  const { id } = useParams(); // Obtém o ID do cliente logado da URL
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [dadosCliente, setDadosCliente] = useState(null);

  const hideModal = () => setIsModalVisible(false);

  const handleLogout = () => {
    onLogout();
    hideModal();
    navigate("/");
  };

  const handleResetPassword = () => {
    navigate(`/redefinir/${id}`);
  };

  useEffect(() => {
    // Busca os dados do cliente no backend
    const fetchDadosCliente = async () => {
      try {
        const response = await fetch(`http://localhost:3001/clientes/${id}`);
        const data = await response.json();

        if (data.success) {
          const cliente = data.cliente;

          // Busca o horário de passeio do cliente
          const passeioResponse = await fetch(`http://localhost:3001/passeios/${id}`);
          const passeioData = await passeioResponse.json();

          if (passeioData.success) {
            cliente.horario_passeio = passeioData.horario_passeio;
          } else {
            cliente.horario_passeio = "Horário não encontrado";
          }

          setDadosCliente(cliente);
        } else {
          console.error("Erro ao buscar dados do cliente:", data.message);
        }
      } catch (error) {
        console.error("Erro ao conectar ao servidor:", error);
      }
    };

    fetchDadosCliente();
  }, [id]);

  if (!dadosCliente) {
    return <div>Carregando dados do cliente...</div>;
  }

  return (
    <div className="Dados">
      <header className="Web-header">
        <Modal
          isOpen={isModalVisible}
          onRequestClose={hideModal}
          className="modal-container"
          overlayClassName="modal-overlay"
          ariaHideApp={false}
        >
          <div className="modal-content">
            <h2 className="modal-title">Deseja mesmo sair do site?</h2>
            <div className="modal-buttons">
              <button className="modal-button no-button" onClick={hideModal}>
                Não
              </button>
              <button className="modal-button yes-button" onClick={handleLogout}>
                Sim
              </button>
            </div>
          </div>
        </Modal>

        <img
          src="/Back.svg"
          alt="Ícone de voltar"
          className="back-icon"
          onClick={() => navigate("/")}
        />
        <img
          src="/logotipo.svg"
          className="Web-logotipo"
          alt="Dogvideo Logotipo"
        />

        <button className="reset-password-button" onClick={handleResetPassword}>
          Redefinir Senha
        </button>

        <div className="footer-bar"></div>
      </header>

      <main className="Main-content">
        <h1>{dadosCliente.nome}</h1>

        {/* Primeira linha de cards */}
        <div className="Dados-grid">
          <div className="Card">
            <div className="Card-header-bg">
              <div className="Card-header">CACHORRO</div>
            </div>
            <div className="Card-content">
              <ul>
                {dadosCliente.caes.map((cachorro, index) => (
                  <li key={index}>{cachorro}</li>
                ))}
              </ul>
            </div>
          </div>

          <div className="Card">
            <div className="Card-header-bg">
              <div className="Card-header">ASSINATURA</div>
            </div>
            <div className="Card-content">{dadosCliente.pacote}</div>
          </div>

          <div className="Card">
            <div className="Card-header-bg">
              <div className="Card-header">HORÁRIO</div>
            </div>
            <div className="Card-content">{dadosCliente.horario_passeio}</div>
          </div>
        </div>

        {/* Segunda linha de cards */}
        <div className="Dados-grid">
          <div className="Card">
            <div className="Card-header-bg">
              <div className="Card-header">PESSOAL</div>
            </div>
            <div className="Card-content">
              <ul>
                <li>{dadosCliente.email}</li>
                <li>CPF: {dadosCliente.cpf}</li>
                <li>{dadosCliente.telefone}</li>
              </ul>
            </div>
          </div>

          <div className="Card">
            <div className="Card-header-bg">
              <div className="Card-header">PASSEADOR</div>
            </div>
            <div className="Card-content">{dadosCliente.passeador || "Nenhum passeador"}</div>
          </div>

          <div className="Card">
            <div className="Card-header-bg">
              <div className="Card-header">ENDEREÇO</div>
            </div>
            <div className="Card-content">{dadosCliente.endereco}</div>
          </div>
        </div>
      </main>

      {/* Link fixo para Política de Privacidade */}
      <a
        href={`${process.env.PUBLIC_URL}/termos-de-uso.html`}
        target="_blank"
        rel="noopener noreferrer"
        className="link-termos"
      >
        Política de Privacidade
      </a>
    </div>
  );
}

export default Dados;
