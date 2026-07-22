import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Web from './Web';

global.fetch = jest.fn();

import Modal from 'react-modal';
Modal.setAppElement(document.createElement('div'));

const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

describe('Tela Inicial (Web) Component', () => {
  let onLogoutMock;

  beforeEach(() => {
    onLogoutMock = jest.fn();
    fetch.mockClear();
    // Mock padrão para o useEffect de fetchPasseador não estourar erro
    fetch.mockResolvedValue({
      json: jest.fn().mockResolvedValue({ success: false })
    });
    mockNavigate.mockClear();
    localStorage.clear();
  });

  test('Renderiza corretamente os elementos iniciais', async () => {
    localStorage.setItem('id_cliente', '1');
    render(<Web onLogout={onLogoutMock} />, { wrapper: MemoryRouter });

    expect(screen.getByAltText('Dogvideo Logomarca')).toBeInTheDocument();
    expect(screen.getByText('Dados do Cliente')).toBeInTheDocument();
    expect(screen.getByAltText('Ícone de logout')).toBeInTheDocument();
  });

  test('Abre modal de logout e chama onLogout ao confirmar', async () => {
    render(<Web onLogout={onLogoutMock} />, { wrapper: MemoryRouter });

    const logoutIcon = screen.getByAltText('Ícone de logout');
    fireEvent.click(logoutIcon);

    expect(screen.getByText('Deseja mesmo sair do site?')).toBeInTheDocument();

    const yesButton = screen.getByRole('button', { name: /sim/i });
    fireEvent.click(yesButton);

    expect(onLogoutMock).toHaveBeenCalled();
    expect(mockNavigate).toHaveBeenCalledWith('/');
  });

  test('Fecha modal de logout ao cancelar', async () => {
    render(<Web onLogout={onLogoutMock} />, { wrapper: MemoryRouter });

    const logoutIcon = screen.getByAltText('Ícone de logout');
    fireEvent.click(logoutIcon);

    const noButton = screen.getByRole('button', { name: /não/i });
    fireEvent.click(noButton);

    await waitFor(() => {
      expect(screen.queryByText('Deseja mesmo sair do site?')).not.toBeInTheDocument();
    });
  });

  test('Navega para dados do cliente', async () => {
    localStorage.setItem('id_cliente', '1');
    render(<Web onLogout={onLogoutMock} />, { wrapper: MemoryRouter });

    const dadosBtn = screen.getByText('Dados do Cliente');
    fireEvent.click(dadosBtn);

    expect(mockNavigate).toHaveBeenCalledWith('/dados-cliente/1');
  });

  test('Busca passeador com sucesso', async () => {
    localStorage.setItem('id_cliente', '1');
    
    // 1º chamada: buscar id do passeador
    fetch.mockResolvedValueOnce({
      json: jest.fn().mockResolvedValue({ success: true, id_passeador: 2 })
    });
    // 2º chamada: buscar dados do passeador
    fetch.mockResolvedValueOnce({
      json: jest.fn().mockResolvedValue({
        success: true,
        passeador: { id: 2, nome: 'Passeador Teste', imagem: null }
      })
    });

    render(<Web onLogout={onLogoutMock} />, { wrapper: MemoryRouter });

    await waitFor(() => {
      expect(screen.getByText('Passeador Teste')).toBeInTheDocument();
    });
  });
});
