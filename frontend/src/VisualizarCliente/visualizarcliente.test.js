import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import VisualizarCliente from './visualizarcliente';

// Mocks the global fetch
global.fetch = jest.fn();

const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
  useParams: () => ({ id: '1' }),
}));

describe('VisualizarCliente Component', () => {
  beforeEach(() => {
    mockNavigate.mockClear();
    fetch.mockClear();
  });

  const mockClienteData = {
    success: true,
    cliente: {
      nome: 'Ana',
      email: 'ana@teste.com',
      cpf: '11111111111',
      telefone: '11999999999',
      caes: ['Rex'],
      pacote: 'Mensal',
      endereco: 'Rua A',
      anotacoes: 'Sem anotação',
      passeador: 'Passeador Z'
    }
  };

  const mockPasseioData = {
    success: true,
    horario_passeio: '10:00:00'
  };

  test('Renderiza carregando inicialmente', () => {
    fetch.mockResolvedValueOnce(new Promise(() => {})); // Never resolves
    render(<VisualizarCliente />, { wrapper: MemoryRouter });
    expect(screen.getByText('Carregando...')).toBeInTheDocument();
  });

  test('Renderiza os dados do cliente com sucesso', async () => {
    fetch.mockResolvedValueOnce({
      json: jest.fn().mockResolvedValue(mockClienteData)
    });
    fetch.mockResolvedValueOnce({
      json: jest.fn().mockResolvedValue(mockPasseioData)
    });

    render(<VisualizarCliente />, { wrapper: MemoryRouter });

    await waitFor(() => {
      expect(screen.getByText('Ana')).toBeInTheDocument();
      expect(screen.getByText('ana@teste.com')).toBeInTheDocument();
      expect(screen.getByText('10:00')).toBeInTheDocument();
    });
  });

  test('Navega para editarcliente', async () => {
    fetch.mockResolvedValueOnce({
      json: jest.fn().mockResolvedValue(mockClienteData)
    });
    fetch.mockResolvedValueOnce({
      json: jest.fn().mockResolvedValue(mockPasseioData)
    });

    render(<VisualizarCliente />, { wrapper: MemoryRouter });

    await waitFor(() => screen.getByText('Ana'));

    fireEvent.click(screen.getByRole('button', { name: /editar/i }));
    expect(mockNavigate).toHaveBeenCalledWith('/editarcliente/1');
  });

  test('Navega de volta para clientes', async () => {
    fetch.mockResolvedValueOnce({
      json: jest.fn().mockResolvedValue(mockClienteData)
    });
    fetch.mockResolvedValueOnce({
      json: jest.fn().mockResolvedValue(mockPasseioData)
    });

    render(<VisualizarCliente />, { wrapper: MemoryRouter });

    await waitFor(() => screen.getByText('Ana'));

    fireEvent.click(screen.getByAltText('Ícone de voltar'));
    expect(mockNavigate).toHaveBeenCalledWith('/clientes');
  });
});
