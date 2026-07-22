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
    fetch.mockResolvedValueOnce(new Promise(() => {})); // Never resolves
    render(<VisualizarPasseador />, { wrapper: MemoryRouter });
    expect(screen.getByText('Carregando...')).toBeInTheDocument();
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

  test('Navega de volta para passeadores', async () => {
    fetch.mockResolvedValueOnce({
      json: jest.fn().mockResolvedValue(mockPasseadorData)
    });
    fetch.mockResolvedValueOnce({
      json: jest.fn().mockResolvedValue(mockHorariosData)
    });

    render(<VisualizarPasseador />, { wrapper: MemoryRouter });

    await waitFor(() => screen.getByText('Ana Passeadora'));

    fireEvent.click(screen.getByAltText('Ícone de voltar'));
    expect(mockNavigate).toHaveBeenCalledWith('/passeadores');
  });
});
