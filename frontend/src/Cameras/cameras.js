import './cameras.css';
import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Modal from 'react-modal';
import { FaLocationArrow, FaRegCommentAlt } from 'react-icons/fa';
import Chat from "./chat";
import Map from "./Map";

function Cameras({ onLogout }) {
  const navigate = useNavigate();
  const { passeadorId } = useParams();

  //const [passeador, setPasseador] = useState(null);  //era usado para exibir o nome da live
  const [live, setLive] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const [horarioPasseio, setHorarioPasseio] = useState(null);
  const [isWithinTime, setIsWithinTime] = useState(false); 

  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isMapVisible, setIsMapVisible] = useState(false);
  const [isChatVisible, setIsChatVisible] = useState(false);

  useEffect(() => {
    if (!passeadorId) {
      setLoading(false);
      setError("ID do passeador não fornecido na URL.");
      return;
    }
    
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const idCliente = localStorage.getItem('id_cliente');
        if (!idCliente) throw new Error("Cliente não logado.");

        const [passeadorResponse, clienteResponse] = await Promise.all([
          fetch(`http://localhost:3001/passeadores/${passeadorId}`),
          fetch(`http://localhost:3001/clientes/${idCliente}`)
        ]);

        if (!passeadorResponse.ok) throw new Error("Passeador não encontrado.");
        const passeadorData = await passeadorResponse.json();
        //setPasseador(passeadorData.passeador);  //era usado para exibir o noeme da live
        const modulo = passeadorData.passeador.modulo;
        
        const liveResponse = await fetch(`http://localhost:3001/api/lives/modulo/${modulo}`);
        if (liveResponse.ok) {
          const liveData = await liveResponse.json();
          setLive(liveData.live);
        } else {
          setLive(null);
        }

        if (!clienteResponse.ok) throw new Error("Dados do cliente não encontrados.");
        const clienteData = await clienteResponse.json();
        if (clienteData.success && clienteData.cliente.horario_passeio) {
          setHorarioPasseio(clienteData.cliente.horario_passeio);
        }

      } catch (err) {
        console.error("Erro ao buscar dados:", err);
        setError(err.message || "Não foi possível carregar as informações.");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [passeadorId]);

  useEffect(() => {
    const intervalId = setInterval(() => {
      if (!horarioPasseio) {
        setIsWithinTime(false);
        return;
      }

      const now = new Date();
      const [startHour, startMinute] = horarioPasseio.split(':').map(Number);
      
      const startTime = new Date();
      startTime.setHours(startHour, startMinute, 0, 0);

      const endTime = new Date(startTime.getTime() + 90 * 60 * 1000); 

      if (now >= startTime && now <= endTime) {
        setIsWithinTime(true);
      } else {
        setIsWithinTime(false);
      }
    }, 1000); 

    return () => clearInterval(intervalId);
  }, [horarioPasseio]);


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
    const idCliente = localStorage.getItem('id_cliente');
    if (idCliente) navigate(`/dados-cliente/${idCliente}`);
    else console.error('ID do cliente não encontrado no localStorage.');
  };

  const renderContent = () => {
    if (loading) {
      return <p style={{ color: 'white', fontSize: '1.5rem', fontFamily: 'Glacial Indifference, sans-serif' }}>Carregando...</p>;
    }
    if (error) {
      return <p style={{ color: 'white', fontSize: '1.5rem', fontFamily: 'Glacial Indifference, sans-serif' }}>Erro: {error}</p>;
    }

    if (live && isWithinTime) {
      const videoSrc = `https://www.youtube.com/embed/${live.youtube_id}?autoplay=1&mute=1&playsinline=1`;
      return (
        <>
          <div className="camera-box">
            <iframe 
              src={videoSrc} 
              title="Transmissão ao vivo da Câmera 1" 
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
              allowFullScreen
            ></iframe>
            <p style={{ fontWeight: 'bold', color: 'white' }}>CÂMERA 01</p>
          </div>
          
          <button className="location-button" onClick={showMap}><FaLocationArrow size={20} /></button>
          <button className="chat-button" onClick={showChat}><FaRegCommentAlt size={20} /></button>
        </>
      );
    }
    
    if (!live && isWithinTime) {
        return <p style={{ color: 'white', fontSize: '1.5rem', fontFamily: 'Glacial Indifference, sans-serif' }}>Estamos no horário do seu passeio. Aguardando o passeador iniciar a transmissão...</p>;
    }
    
    return <p style={{ color: 'white', fontSize: '1.5rem', fontFamily: 'Glacial Indifference, sans-serif' }}>A transmissão estará disponível no seu horário agendado ({horarioPasseio || "..."}).</p>;
  };

  return (
    <div className="Web">
      <header className="Web-header">
        <img src="/logotipo.svg" className="Web-logotipo" alt="Dogvideo Logomarca" />
        <div className="tabbar-title" onClick={handleDadosClienteClick} style={{ cursor: 'pointer' }}>
          <img src="/user.svg" alt="Ícone do Usuário" className="user-icon" />
          Dados do Cliente
        </div>
        <Modal isOpen={isModalVisible} onRequestClose={hideModal} className="modal-container" overlayClassName="modal-overlay" ariaHideApp={false}>
          <div className="modal-content">
            <h2 className="modal-title">Deseja mesmo sair do site?</h2>
            <div className="modal-buttons">
              <button className="modal-button no-button" onClick={hideModal}>Não</button>
              <button className="modal-button yes-button" onClick={handleLogout}>Sim</button>
            </div>
          </div>
        </Modal>
        <img src="/logout.svg" alt="Ícone de logout" className="user-icon" onClick={showModal}/>
      </header>
      <div className="cameras-container">
        {renderContent()}
      </div>
      <Modal isOpen={isMapVisible} onRequestClose={hideMap} className="modal-map-container" overlayClassName="modal-map-overlay">
        <Map onClose={hideMap} />
      </Modal>
      <Modal isOpen={isChatVisible} onRequestClose={hideChat} className="modal-chat-container" overlayClassName="modal-chat-overlay">
        <Chat userId={localStorage.getItem('id_cliente')} receiverId={passeadorId} onClose={hideChat} />
      </Modal>
      <div className="footer-bar"></div>
    </div>
  );
}

export default Cameras;