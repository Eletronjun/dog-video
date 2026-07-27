import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import VisualizarPasseador from './visualizarpasseador';

global.fetch = jest.fn();

const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
  useParams: () => ({ id: '1' }),
}));

describe('VisualizarPasseador Component', () => {
  beforeEach(() => {
    mockNavigate.mockClear();
    fetch.mockClear();
  });

  const mockPasseadorData = {
    success: true,
    passeador: {
      nome: 'Ana Passeadora',
      email: 'ana@teste.com',
      cpf: '11111111111',
      telefone: '11999999999',
      endereco: 'Rua B',
      modulo: '1',
      modulo2: '2'
    },
    clientes: 'Cliente 1, Cliente 2'
  };

  const mockHorariosData = {
    success: true,
    horarios: ['10:00:00', '14:00:00']
  };

  test('Renderiza carregando inicialmente', () => {
    fetch.mockResolvedValueOnce(new Promise(() => {}));
    render(<VisualizarPasseador />, { wrapper: MemoryRouter });
    expect(screen.getByText('Carregando...')).toBeInTheDocument();
  });

  test('Renderiza "Passeador não encontrado" em caso de data.success false ou erro no fetch', async () => {
    // 1. data.success false
    fetch.mockResolvedValueOnce({
      json: jest.fn().mockResolvedValue({ success: false, message: 'Não encontrado' })
    });

    render(<VisualizarPasseador />, { wrapper: MemoryRouter });

    await waitFor(() => {
      expect(screen.getByText('Passeador não encontrado')).toBeInTheDocument();
    });

    // 2. Exceção no fetch
    fetch.mockRejectedValueOnce(new Error('Erro de Conexão'));

    render(<VisualizarPasseador />, { wrapper: MemoryRouter });

    await waitFor(() => {
      expect(screen.getByText('Passeador não encontrado')).toBeInTheDocument();
    });
  });

  test('Renderiza os dados do passeador com sucesso', async () => {
    fetch.mockResolvedValueOnce({
      json: jest.fn().mockResolvedValue(mockPasseadorData)
    });
    fetch.mockResolvedValueOnce({
      json: jest.fn().mockResolvedValue(mockHorariosData)
    });

    render(<VisualizarPasseador />, { wrapper: MemoryRouter });

    await waitFor(() => {
      expect(screen.getByText('Ana Passeadora')).toBeInTheDocument();
      expect(screen.getByText('ana@teste.com')).toBeInTheDocument();
      expect(screen.getByText('Cliente 1, Cliente 2')).toBeInTheDocument();
      expect(screen.getByText('10:00:00, 14:00:00')).toBeInTheDocument();
    });
  });

  test('Navega para editarpasseador', async () => {
    fetch.mockResolvedValueOnce({
      json: jest.fn().mockResolvedValue(mockPasseadorData)
    });
    fetch.mockResolvedValueOnce({
      json: jest.fn().mockResolvedValue(mockHorariosData)
    });

    render(<VisualizarPasseador />, { wrapper: MemoryRouter });

    await waitFor(() => screen.getByText('Ana Passeadora'));

    fireEvent.click(screen.getByRole('button', { name: /editar/i }));
    expect(mockNavigate).toHaveBeenCalledWith('/editarpasseador/1');
  });

  test('Navega de volta para passeadores via clique e via teclado onKeyDown', async () => {
    fetch.mockResolvedValueOnce({
      json: jest.fn().mockResolvedValue(mockPasseadorData)
    });
    fetch.mockResolvedValueOnce({
      json: jest.fn().mockResolvedValue(mockHorariosData)
    });

    render(<VisualizarPasseador />, { wrapper: MemoryRouter });

    await waitFor(() => screen.getByText('Ana Passeadora'));

    const backIcon = screen.getByAltText('Ícone de voltar');
    fireEvent.click(backIcon);
    expect(mockNavigate).toHaveBeenCalledWith('/passeadores');

    fireEvent.keyDown(backIcon, { key: 'Enter' });
    expect(mockNavigate).toHaveBeenCalledWith('/passeadores');

    fireEvent.keyDown(backIcon, { key: ' ' });
    expect(mockNavigate).toHaveBeenCalledWith('/passeadores');
  });
});
