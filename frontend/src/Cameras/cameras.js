import './cameras.css';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Modal from 'react-modal';
import { FaLocationArrow, FaRegCommentAlt } from 'react-icons/fa';
import Chat from "./chat";
import Map from "./Map";

function Cameras({ onLogout }) {
  const navigate = useNavigate();
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isMapVisible, setIsMapVisible] = useState(false);
  const [isChatVisible, setIsChatVisible] = useState(false);
  const [isCameraVisible, setIsCameraVisible] = useState(false);
  
  // Estados para armazenar horário de abertura e fechamento
  const [openTime, setOpenTime] = useState({ hour: 0, minute: 0 });
  const [closeTime, setCloseTime] = useState({ hour: 0, minute: 0 });

  const showModal = () => setIsModalVisible(true);
  const hideModal = () => setIsModalVisible(false);
  const showMap = () => setIsMapVisible(true);
  const hideMap = () => setIsMapVisible(false);
  const showChat = () => setIsChatVisible(true);
  const hideChat = () => setIsChatVisible(false);

  const handleLogout = () => {
    onLogout();
    hideModal();
    navigate('/');
  };

  const handleDadosClienteClick = () => {
    const idCliente = localStorage.getItem('id_cliente'); // Recupera o ID do cliente logado
    if (idCliente) {
      navigate(`/dados-cliente/${idCliente}`); // Redireciona para a página do cliente logado
    } else {
      console.error('ID do cliente não encontrado no localStorage.');
    }
  };

  // Buscar o horário de passeio do cliente no backend usando o id_cliente armazenado no localStorage
  useEffect(() => {
    const id_cliente = localStorage.getItem('id_cliente');
    if (!id_cliente) return;

    const fetchHorario = async () => {
      try {
        const response = await fetch(`${process.env.REACT_APP_API_URL || `${process.env.REACT_APP_API_URL || 'http://localhost:3001'}`}/clientes/${id_cliente}`);
        const data = await response.json();
        if (data.success && data.cliente && data.cliente.horario_passeio) {
          // Considerando que o horário está no formato "HH:MM:SS" e queremos "HH:MM"
          const horarioStr = data.cliente.horario_passeio.substring(0, 5); // "HH:MM"
          const [openHourStr, openMinuteStr] = horarioStr.split(':');
          const openHourNum = parseInt(openHourStr, 10);
          const openMinuteNum = parseInt(openMinuteStr, 10);
          setOpenTime({ hour: openHourNum, minute: openMinuteNum });
          
          // Calcula o horário de fechamento adicionando 1 hora e 30 minutos
          let closeHourNum = openHourNum;
          let closeMinuteNum = openMinuteNum + 30;
          if (closeMinuteNum >= 60) {
            closeMinuteNum -= 60;
            closeHourNum += 1;
          }
          closeHourNum += 1; // Adiciona a hora extra
          // Caso ultrapasse 24 horas, ajusta para o formato 24h
          if (closeHourNum >= 24) {
            closeHourNum = closeHourNum % 24;
          }
          setCloseTime({ hour: closeHourNum, minute: closeMinuteNum });
        } else {
          console.error('Horário de passeio não encontrado ou formato inválido.');
        }
      } catch (error) {
        console.error('Erro ao buscar horário do cliente:', error);
      }
    };

    fetchHorario();
  }, []);

  // Verifica a visibilidade das câmeras com base no horário atual
  useEffect(() => {
    const checkCameraVisibility = () => {
      const now = new Date();
      const currentHour = now.getHours();
      const currentMinute = now.getMinutes();

      const isAfterOpen =
        currentHour > openTime.hour ||
        (currentHour === openTime.hour && currentMinute >= openTime.minute);
      const isBeforeClose =
        currentHour < closeTime.hour ||
        (currentHour === closeTime.hour && currentMinute < closeTime.minute);

      setIsCameraVisible(isAfterOpen && isBeforeClose);
    };

    const intervalId = setInterval(checkCameraVisibility, 1000);
    return () => clearInterval(intervalId);
  }, [openTime, closeTime]);

  return (
    <div className="Web">
      <header className="Web-header">
        <img src="/logotipo.svg" className="Web-logotipo" alt="Dogvideo Logomarca" />
        <div className="tabbar-title" onClick={handleDadosClienteClick} style={{ cursor: 'pointer' }}>
          <img src="/user.svg" alt="Ícone do Usuário" className="user-icon" />
          Dados do Cliente
        </div>
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
          src="/logout.svg"
          alt="Ícone de logout"
          className="user-icon"
          onClick={showModal}
        />
      </header>

      <div className="cameras-container">
        {isCameraVisible ? (
          <>
            <div className="camera-box">
              <video id="camera1" autoPlay playsInline></video>
              <p style={{ fontWeight: 'bold', color: 'white' }}>CAMERA 01</p>
            </div>
            <div className="camera-box">
              <video id="camera2" autoPlay playsInline></video>
              <p style={{ fontWeight: 'bold', color: 'white' }}>CAMERA 02</p>
            </div>
            <button className="location-button" onClick={showMap}>
              <FaLocationArrow size={20} />
            </button>
            <button className="chat-button" onClick={showChat}>
              <FaRegCommentAlt size={20} />
            </button>
          </>
        ) : (
          <p style={{ color: 'white' }}>As câmeras estarão disponíveis no horário programado.</p>
        )}
      </div>

      <Modal
        isOpen={isMapVisible}
        onRequestClose={hideMap}
        className="modal-map-container"
        overlayClassName="modal-map-overlay"
      >
        <Map onClose={hideMap} />
      </Modal>

      <Modal
        isOpen={isChatVisible}
        onRequestClose={hideChat}
        className="modal-chat-container"
        overlayClassName="modal-chat-overlay"
      >
        <Chat 
          userId={localStorage.getItem('id_cliente')} // ID do cliente logado
          receiverId={'id_passeador'}                // Substitua pelo ID do passeador correspondente
          onClose={hideChat} 
        />
      </Modal>



      <div className="footer-bar"></div>
    </div>
  );
}

export default Cameras;