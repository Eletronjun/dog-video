import React from 'react';
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Cameras from './cameras';

global.fetch = jest.fn();

const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
  useParams: () => ({ passeadorId: '10' }),
}));

jest.mock('./Map', () => () => <div data-testid="map-component">Mapa</div>);
jest.mock('./chat', () => () => <div data-testid="chat-component">Chat</div>);

jest.mock('react-modal', () => {
  const React = require('react');
  return ({ isOpen, children }) => (isOpen ? <div>{children}</div> : null);
});

describe('Cameras Component', () => {
  const mockOnLogout = jest.fn();

  beforeEach(() => {
    mockNavigate.mockClear();
    fetch.mockClear();
    mockOnLogout.mockClear();
    localStorage.clear();
  });

  test('Exibe erro quando passeadorId é inválido ou id_cliente não está no localStorage', async () => {
    render(<Cameras onLogout={mockOnLogout} />, { wrapper: MemoryRouter });

    await waitFor(() => {
      expect(screen.getByText(/Erro: Cliente não logado./i)).toBeInTheDocument();
    });
  });

  test('Carrega dados do passeador, cliente e exibe live quando dentro do horário de passeio', async () => {
    localStorage.setItem('id_cliente', '5');

    const now = new Date();
    const currentHour = String(now.getHours()).padStart(2, '0');
    const currentMinute = String(now.getMinutes()).padStart(2, '0');
    const horarioAtual = `${currentHour}:${currentMinute}`;

    fetch.mockResolvedValueOnce({
      ok: true,
      json: jest.fn().mockResolvedValue({
        passeador: { modulo: '1' }
      })
    });
    fetch.mockResolvedValueOnce({
      ok: true,
      json: jest.fn().mockResolvedValue({
        success: true,
        cliente: { horario_passeio: horarioAtual }
      })
    });
    fetch.mockResolvedValueOnce({
      ok: true,
      json: jest.fn().mockResolvedValue({
        live: { youtube_id: 'sample_yt_id' }
      })
    });

    render(<Cameras onLogout={mockOnLogout} />, { wrapper: MemoryRouter });

    await waitFor(() => {
      expect(screen.getByText('CÂMERA 01')).toBeInTheDocument();
    }, { timeout: 3000 });

    // Abrir Mapa e Chat
    fireEvent.click(document.querySelector('.location-button'));
    expect(screen.getByTestId('map-component')).toBeInTheDocument();

    fireEvent.click(document.querySelector('.chat-button'));
    expect(screen.getByTestId('chat-component')).toBeInTheDocument();
  });

  test('Exibe mensagem de aguardando quando no horário mas sem live ativa', async () => {
    localStorage.setItem('id_cliente', '5');

    const now = new Date();
    const currentHour = String(now.getHours()).padStart(2, '0');
    const currentMinute = String(now.getMinutes()).padStart(2, '0');
    const horarioAtual = `${currentHour}:${currentMinute}`;

    fetch.mockResolvedValueOnce({
      ok: true,
      json: jest.fn().mockResolvedValue({
        passeador: { modulo: '1' }
      })
    });
    fetch.mockResolvedValueOnce({
      ok: true,
      json: jest.fn().mockResolvedValue({
        success: true,
        cliente: { horario_passeio: horarioAtual }
      })
    });
    fetch.mockResolvedValueOnce({
      ok: false,
      json: jest.fn().mockResolvedValue({})
    });

    render(<Cameras onLogout={mockOnLogout} />, { wrapper: MemoryRouter });

    await waitFor(() => {
      expect(screen.getByText(/Aguardando o passeador iniciar a transmissão/i)).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  test('Exibe mensagem fora do horário agendado', async () => {
    localStorage.setItem('id_cliente', '5');

    fetch.mockResolvedValueOnce({
      ok: true,
      json: jest.fn().mockResolvedValue({
        passeador: { modulo: '1' }
      })
    });
    fetch.mockResolvedValueOnce({
      ok: true,
      json: jest.fn().mockResolvedValue({
        success: true,
        cliente: { horario_passeio: '03:00' }
      })
    });
    fetch.mockResolvedValueOnce({
      ok: false,
      json: jest.fn().mockResolvedValue({})
    });

    render(<Cameras onLogout={mockOnLogout} />, { wrapper: MemoryRouter });

    await waitFor(() => {
      expect(screen.getByText(/A transmissão estará disponível no seu horário agendado/i)).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  test('Abre modal de logout e faz logout ao clicar em Sim', async () => {
    localStorage.setItem('id_cliente', '5');

    fetch.mockResolvedValueOnce({ ok: false });
    fetch.mockResolvedValueOnce({ ok: false });

    render(<Cameras onLogout={mockOnLogout} />, { wrapper: MemoryRouter });

    await waitFor(() => expect(fetch).toHaveBeenCalled());

    const logoutIcons = screen.getAllByAltText('Ícone de logout');
    fireEvent.click(logoutIcons[0]);

    expect(screen.getByText('Deseja mesmo sair do site?')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /sim/i }));

    expect(mockOnLogout).toHaveBeenCalled();
    expect(mockNavigate).toHaveBeenCalledWith('/');
  });

  test('Navega para dados do cliente ao clicar no título ou exibe erro se sem localStorage', async () => {
    localStorage.setItem('id_cliente', '5');

    fetch.mockResolvedValueOnce({ ok: false });
    fetch.mockResolvedValueOnce({ ok: false });

    render(<Cameras onLogout={mockOnLogout} />, { wrapper: MemoryRouter });

    await waitFor(() => expect(fetch).toHaveBeenCalled());

    fireEvent.click(screen.getByText('Dados do Cliente'));
    expect(mockNavigate).toHaveBeenCalledWith('/dados-cliente/5');

    localStorage.removeItem('id_cliente');
    fireEvent.click(screen.getByText('Dados do Cliente'));
  });
});
