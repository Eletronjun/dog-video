import './criarpasseador.css';
import React, { useRef, useState } from 'react';
import { useNavigate } from "react-router-dom";
import { FaUser, FaEnvelope, FaAddressCard, FaPhone, FaHome, FaCamera, FaSignal} from "react-icons/fa";

function CriarPasseador() {
  const navigate = useNavigate();

  // Referências para os inputs
  const nomeRef = useRef(null);
  const emailRef = useRef(null);
  const cpfRef = useRef(null);
  const telefoneRef = useRef(null);
  const enderecoRef = useRef(null);
  const moduloRef = useRef(null); 
  const modulo2Ref = useRef(null); 

  // Estado para armazenar a imagem em base64
  const [selectedImage, setSelectedImage] = useState(null);

  // Estados para armazenar mensagens de erro
  const [nomeError, setNomeError] = useState('');
  const [emailError, setEmailError] = useState('');
  const [cpfError, setCpfError] = useState('');
  const [telefoneError, setTelefoneError] = useState('');
  const [moduloError, setModuloError] = useState('');
  const [modulo2Error, setModulo2Error] = useState('');

  // Funções de validação
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

  const validateModulo = (modulo) => {
    if (!/^\d+$/.test(modulo)) {
      setModuloError('O módulo deve conter apenas números');
      return false;
    }
    setModuloError('');
    return true;
  };  

  const validateModulo2 = (modulo2) => {
    if (!/^\d+$/.test(modulo2)) {
      setModulo2Error('O módulo 2 deve conter apenas números');
      return false;
    }
    setModulo2Error('');
    return true;
  };

  // Funções de formatação
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

  // Função para lidar com a seleção de imagem
  const handleImageChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onloadend = () => {
        setSelectedImage(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  // Função para enviar os dados para criação do passeador
  const handleSubmit = async (e) => {
    e.preventDefault();

    const isNomeValid = validateNome(nomeRef.current.value);
    const isEmailValid = validateEmail(emailRef.current.value);
    const isCPFValid = validateCPF(cpfRef.current.value);
    const isTelefoneValid = validateTelefone(telefoneRef.current.value);
    const isModuloValid = validateModulo(moduloRef.current.value);
    const isModulo2Valid = validateModulo2(modulo2Ref.current.value);

    if (isNomeValid && isEmailValid && isCPFValid && isTelefoneValid && isModuloValid && isModulo2Valid) {
      const newPasseador = {
        nome: nomeRef.current.value,
        email: emailRef.current.value,
        cpf: cpfRef.current.value.replace(/\D/g, ''),
        telefone: telefoneRef.current.value.replace(/\D/g, ''),
        endereco: enderecoRef.current.value,
        imagem: selectedImage,
        modulo: moduloRef.current.value, 
        modulo2: modulo2Ref.current.value,
      };

      try {
        const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:3001'}/criarpasseador`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(newPasseador),
        });

        if (response.ok) {
          navigate("/passeadores");
        } else {
          console.error('Erro ao criar passeador');
        }
      } catch (error) {
        console.error('Erro ao enviar dados:', error);
      }
    } else {
      console.error('Formulário contém erros');
    }
  };

  return (
    <div className="Web-Criar-Passeador">
      <header className="Web-header">
        <img src="/logotipo.svg" className="Web-logotipo" alt="Dogvideo Logomarca" />
        <div className="footer-bar"></div>
      </header>

      <div className="form-container">
        <form className="passeador-form" onSubmit={handleSubmit}>
          <div className="image-container">
            <label htmlFor="image-upload" className="image-upload-label">
              {selectedImage ? (
                <img src={selectedImage} alt="Imagem Selecionada" className="image-preview" />
              ) : (
                <div className="placeholder-container">
                  <FaCamera className="camera-icon" />
                </div>
              )}
            </label>
            <input
              id="image-upload"
              type="file"
              accept="image/*"
              onChange={handleImageChange}
              className="image-input"
            />
          </div>

          <div className="input-container">
            <FaUser className="input-icon" />
            <input 
              ref={nomeRef} 
              type="text" 
              placeholder="Nome do passeador" 
              className="form-input"
              onChange={(e) => validateNome(e.target.value)}
            />
            </div>
            {nomeError && <div className="error-message">{nomeError}</div>}
          <div className="input-container">
            <FaEnvelope className="input-icon" />
            <input 
              ref={emailRef} 
              type="email" 
              placeholder="Email" 
              className="form-input"
              onChange={(e) => validateEmail(e.target.value)}
            />
            </div>
            {emailError && <div className="error-message">{emailError}</div>}
          <div className="input-container">
            <FaAddressCard className="input-icon" />
            <input 
              ref={cpfRef} 
              type="text" 
              placeholder="CPF" 
              className="form-input"
              onChange={(e) => {
                const formatted = formatCPF(e.target.value);
                e.target.value = formatted;
                validateCPF(formatted);
              }}
            />
            </div>
            {cpfError && <div className="error-message">{cpfError}</div>}
          <div className="input-container">
            <FaPhone className="input-icon" />
            <input 
              ref={telefoneRef} 
              type="tel" 
              placeholder="Telefone" 
              className="form-input"
              onChange={(e) => {
                const formatted = formatTelefone(e.target.value);
                e.target.value = formatted;
                validateTelefone(formatted);
              }}
            />
            </div>
            {telefoneError && <div className="error-message">{telefoneError}</div>}
          <div className="input-container">
            <FaHome className="input-icon" />
            <input ref={enderecoRef} type="text" placeholder="Endereço" className="form-input" />
          </div>
          <div className="input-container-row">
            <div className="input-container">
              <FaSignal className="input-icon" />
              <input 
                ref={moduloRef} 
                type="text" 
                placeholder="Módulo 1" 
                className="form-input"
                onChange={(e) => validateModulo(e.target.value)}
              />
            </div>
            <div className="input-container">
              <FaSignal className="input-icon" />
              <input 
                ref={modulo2Ref} 
                type="text" 
                placeholder="Módulo 2" 
                className="form-input"
                onChange={(e) => validateModulo2(e.target.value)}
              />
            </div>
          </div>
          {(moduloError || modulo2Error) && (
            <div className="error-message">
              {moduloError || modulo2Error}
            </div>
          )}
          <div className="button-group">
            <button
              type="button"
              className="cancel-button"
              onClick={() => navigate("/passeadores")}
            >
              Cancelar
            </button>
            <button type="submit" className="create-button">
              Criar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default CriarPasseador;
