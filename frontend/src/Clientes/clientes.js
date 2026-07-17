import './clientes.css';
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from "react-router-dom";
import Modal from 'react-modal';
import axios from 'axios';

function Clientes() {
  const navigate = useNavigate();
  const [clientes, setClientes] = useState([]);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [selectedCliente, setSelectedCliente] = useState(null);
  const [isSearchVisible, setIsSearchVisible] = useState(false);
  const [busca, setBusca] = useState('');
  const [sortDirection, setSortDirection] = useState('asc');
  const [isFilterMenuVisible, setIsFilterMenuVisible] = useState(false);
  const searchInputRef = useRef(null);
  const [filtroPacote, setFiltroPacote] = useState('');

  useEffect(() => {
    axios.get(`${process.env.REACT_APP_API_URL || `${process.env.REACT_APP_API_URL || 'http://localhost:3001'}`}/`clientes')
      .then(response => {
        setClientes(response.data);
      })
      .catch(error => {
        console.error('Erro ao buscar clientes:', error);
      });
  }, []);

  const showModal = (cliente) => {
    setSelectedCliente(cliente);
    setIsModalVisible(true);
  };

  const hideModal = () => {
    setIsModalVisible(false);
    setSelectedCliente(null);
  };

  const toggleSearch = () => {
    setIsSearchVisible(!isSearchVisible);
    setTimeout(() => {
      if (searchInputRef.current) {
        searchInputRef.current.focus();
      }
    }, 0);
  };

  const toggleFilterMenu = () => {
    setIsFilterMenuVisible(!isFilterMenuVisible);
  };

  const handleSort = (direction) => {
    setSortDirection(direction);
    setIsFilterMenuVisible(false);
  };

  const handleClientClick = (cliente) => {
    navigate(`/visualizarcliente/${cliente.id_cliente}`);
  };

  const handleDelete = async () => {
    try {
      const response = await axios.delete(`${process.env.REACT_APP_API_URL || `${process.env.REACT_APP_API_URL || 'http://localhost:3001'}`}/clientes/${selectedCliente.id_cliente}`);
      if (response.data.success) {
        setClientes(clientes.filter(cliente => cliente.id_cliente !== selectedCliente.id_cliente));
        hideModal();
      } else {
        alert('Erro ao excluir cliente.');
      }
    } catch (error) {
      console.error('Erro ao excluir cliente:', error);
      alert('Erro ao excluir cliente.');
    }
  };

  const normalizeText = (text) => {
    return text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  };

  const clientesFiltrados = useMemo(() => {
    const normalizedBusca = normalizeText(busca);
    return clientes
      .filter((cliente) =>
        normalizeText(cliente.nome).includes(normalizedBusca) &&
        (filtroPacote === '' || cliente.pacote === filtroPacote)
      )
      .sort((a, b) => {
        if (sortDirection === 'asc') {
          return a.nome.localeCompare(b.nome);
        } else {
          return b.nome.localeCompare(a.nome);
        }
      });
  }, [clientes, busca, sortDirection, filtroPacote]);
  
  return (
    <div className="Web-Clientes">
      <header className="Web-header">
        <img src="/logotipo.svg" className="Web-logotipo" alt="Dogvideo Logomarca" />
        <div className="footer-bar"></div>
      </header>

      <div className="header-icons">
        <div className="icon-container" onClick={toggleSearch}>
          <img src="/search.svg" alt="Ícone de busca" className="icon" />
        </div>
        <div className="icon-container" onClick={() => navigate('/criarcliente')}>
          <img src="/add.svg" alt="Ícone de adicionar" className="icon" />
        </div>
        <div className="icon-container" onClick={toggleFilterMenu}>
          <img src="/filter.svg" alt="Ícone de filtro" className="icon" />
        </div>
      </div>

      {isSearchVisible && (
        <div className="search-bar">
          <input
            type="text"
            value={busca}
            ref={searchInputRef}
            onChange={(ev) => setBusca(ev.target.value)}
            placeholder="Pesquisar cliente"
            className="search-input"
          />
        </div>
      )}

      {isFilterMenuVisible && (
        <div className="filter-menu">
          <button onClick={() => handleSort('asc')} className="filter-button">
            Ordenar A-Z
          </button>
          <div className="filter-divider"></div>
          <button onClick={() => handleSort('desc')} className="filter-button">
            Ordenar Z-A
          </button>
          <div className="filter-divider"></div>
          <select
            value={filtroPacote}
            onChange={(e) => setFiltroPacote(e.target.value)}
            className="filter-select"
          >
            <option value="">Pacotes</option>
            <option value="Trimestral">Trimestral</option>
            <option value="Mensal">Mensal</option>
            <option value="Temporario">Temporário</option>
          </select>
        </div>
      )}

      <img
        src="/Back.svg"
        alt="Ícone de voltar"
        className="back-icon"
        onClick={() => navigate("/admin")}
      />

      <div className="client-list">
        {clientesFiltrados.map((cliente) => (
          <div className="client-item" key={cliente.id_cliente}>
            <span onClick={() => handleClientClick(cliente)}>{cliente.nome}</span>
            <button className="delete-button" onClick={() => showModal(cliente)}>
              <img src="/trash.svg" alt="Deletar" />
            </button>
          </div>
        ))}
      </div>

      <Modal
        isOpen={isModalVisible}
        onRequestClose={hideModal}
        className="modal-container"
        overlayClassName="modal-overlay"
        ariaHideApp={false}
      >
        <div className="modal-content">
          <h2 className="modal-title">Deseja mesmo excluir este cliente?</h2>
          <div className="modal-buttons">
            <button className="modal-button no-button" onClick={hideModal}>
              Não
            </button>
            <button className="modal-button yes-button" onClick={handleDelete}>
              Sim
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

export default Clientes;